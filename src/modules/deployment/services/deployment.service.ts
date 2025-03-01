import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { DeploymentStatusResponseDto } from '../dtos/response.dto';
import { CreateElizaRequestDto } from '../dtos/request.dto';
import { PrismaService } from '../../../providers/prisma/services/prisma.service';
import { DeploymentStatus, MemoryPlatform } from '@prisma/client';

const execAsync = promisify(exec);

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);
  private readonly statusCheckIntervals: Record<string, NodeJS.Timeout> = {}; // 상태 확인 인터벌 타이머

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 새로운 Eliza 배포 작업을 시작합니다.
   * @param dto 배포 요청 DTO
   * @returns 생성된 작업 ID
   */
  async createElizaDeployment(dto: CreateElizaRequestDto): Promise<string> {
    // 작업 ID 생성 (타임스탬프 + 랜덤값)
    const jobId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

    // DB에 작업 상태 생성
    const deployment = await this.prisma.deployment.create({
      data: {
        jobId,
        status: 'PENDING',
        message: '배포 작업이 시작되었습니다.',
        startTime: new Date(),
      },
    });

    // Agent 생성
    await this.prisma.agent.create({
      data: {
        name: dto.agentName,
        description: dto.description,
        socialLink: dto.socialLink,
        userWalletAddress: dto.walletAddress,
        memoryId: dto.memoryId,
        deploymentId: deployment.id,
        platform: MemoryPlatform.ELIZA_OS,
      },
    });

    // 비동기로 배포 스크립트 실행
    this.runDeploymentScript(jobId, dto.telegram, dto.agentName, dto.description, dto.socialLink);

    return jobId;
  }

  /**
   * 배포 작업 상태를 조회합니다.
   * @param jobId 작업 ID
   * @returns 작업 상태 정보
   */
  async getDeploymentStatus(jobId: string): Promise<DeploymentStatusResponseDto> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { jobId },
    });

    if (!deployment) {
      throw new NotFoundException(`작업 ID(${jobId})를 찾을 수 없습니다.`);
    }

    // Prisma 모델을 DTO로 변환
    return {
      status: deployment.status as DeploymentStatus,
      message: deployment.message,
      startTime: deployment.startTime.toISOString(),
      completedTime: deployment.completedTime?.toISOString() || null,
      error: deployment.error || null,
      output: deployment.output || null,
    };
  }

  /**
   * 배포 스크립트를 실행합니다.
   * @param jobId 작업 ID
   * @param telegramToken Telegram Bot Token
   * @param agentName Agent Name
   * @param description Agent Description
   * @param socialLink Agent Social Link
   */
  private async runDeploymentScript(jobId: string, telegramToken: string, agentName: string, description: string, socialLink: string): Promise<void> {
    try {
      // 상태 업데이트: 진행 중
      await this.prisma.deployment.update({
        where: { jobId },
        data: {
          status: 'IN_PROGRESS',
          message: '배포 스크립트 실행 중...',
        },
      });

      // 스크립트 경로
      const scriptPath = path.resolve(process.cwd(), 'deploy.sh');
      this.logger.log(`스크립트 실행: ${scriptPath} ${telegramToken}`);

      // 스크립트 실행
      const { stdout, stderr } = await execAsync(`"${scriptPath}" "${telegramToken}" "${agentName}" "${description}" "${socialLink}"`);
      
      // 인스턴스 이름 추출 (stdout에서 정규식으로 추출)
      const instanceNameMatch = stdout.match(/인스턴스 (eliza-agent-\d+)를 생성합니다/);
      const instanceName = instanceNameMatch ? instanceNameMatch[1] : null;
      
      if (instanceName) {
        // 인스턴스 이름 DB에 저장
        await this.prisma.deployment.update({
          where: { jobId },
          data: {
            instanceName,
            status: 'IN_PROGRESS',
            message: `VM 인스턴스(${instanceName})가 생성되었습니다. Eliza가 초기화 중입니다...`,
            output: stdout,
          },
        });
        
        // VM 인스턴스 상태 주기적으로 확인 시작
        this.startInstanceStatusCheck(jobId, instanceName);
      } else {
        await this.prisma.deployment.update({
          where: { jobId },
          data: {
            status: 'IN_PROGRESS',
            message: 'VM 인스턴스가 생성되었지만, 이름을 확인할 수 없습니다. 초기화가 진행 중입니다...',
            output: stdout,
          },
        });
        
        // 인스턴스 이름을 찾지 못했더라도 상태 확인 시작 (기본 2시간 타임아웃)
        setTimeout(async () => {
          const deployment = await this.prisma.deployment.findUnique({
            where: { jobId },
          });
          
          if (deployment && deployment.status === 'IN_PROGRESS') {
            await this.prisma.deployment.update({
              where: { jobId },
              data: {
                status: 'COMPLETED',
                message: '배포가 완료된 것으로 간주합니다. 인스턴스 상태를 직접 확인해 주세요.',
                completedTime: new Date(),
              },
            });
          }
        }, 2 * 60 * 60 * 1000); // 2시간 타임아웃
      }
    } catch (error) {
      // 상태 업데이트: 실패
      await this.prisma.deployment.update({
        where: { jobId },
        data: {
          status: 'FAILED',
          message: '배포 중 오류가 발생했습니다.',
          error: error.message || '알 수 없는 오류',
          completedTime: new Date(),
        },
      });

      this.logger.error(`배포 실패 (JobId: ${jobId}): ${error.message}`);
    }
  }

  /**
   * VM 인스턴스의 상태를 주기적으로 확인합니다.
   * @param jobId 작업 ID
   * @param instanceName VM 인스턴스 이름
   */
  private startInstanceStatusCheck(jobId: string, instanceName: string): void {
    // VM 상태 확인을 위한 gcloud 명령어
    const checkCommand = `gcloud compute instances describe ${instanceName} --format="json(status,metadata.items[0].value)"`;
    
    // 배포 진행 단계를 나타내는 변수
    let deploymentPhase = 'vm_creation';
    
    // 30초마다 상태 확인
    const interval = setInterval(async () => {
      try {
        const { stdout } = await execAsync(checkCommand);
        const instanceInfo = JSON.parse(stdout);
        
        // VM 상태 확인
        if (instanceInfo.status !== 'RUNNING') {
          this.logger.log(`VM 인스턴스(${instanceName}) 상태: ${instanceInfo.status}`);
          return;
        }
        
        // startup-script 로그 확인
        const checkStartupScriptLog = `gcloud compute instances get-serial-port-output ${instanceName} --port=1 | grep -E "Eliza agent service is running|systemctl start eliza|systemd"`;
        
        try {
          const { stdout: logOutput } = await execAsync(checkStartupScriptLog);
          
          // Eliza 서비스 실행 확인
          if (logOutput.includes('Eliza agent service is running on ports 3000 and 5173')) {
            // 배포 완료
            clearInterval(interval);
            delete this.statusCheckIntervals[jobId];
            
            await this.prisma.deployment.update({
              where: { jobId },
              data: {
                status: 'COMPLETED',
                message: `배포가 완료되었습니다. Eliza가 VM 인스턴스(${instanceName})에서 실행 중입니다.`,
                completedTime: new Date(),
              },
            });
            
            this.logger.log(`배포 완료 (JobId: ${jobId}, Instance: ${instanceName})`);
          } else if (logOutput.includes('systemctl start eliza') && deploymentPhase === 'vm_creation') {
            // Eliza 서비스 시작 중
            deploymentPhase = 'service_starting';
            
            await this.prisma.deployment.update({
              where: { jobId },
              data: {
                message: `Eliza 서비스를 시작하는 중입니다...`,
              },
            });
          }
        } catch (logError) {
          // 로그 확인 오류는 무시하고 계속 진행
          this.logger.debug(`로그 확인 오류 (무시됨): ${logError.message}`);
        }
        
        // 1시간 후에도 완료되지 않으면 타임아웃
        const deployment = await this.prisma.deployment.findUnique({
          where: { jobId },
        });
        
        if (!deployment) {
          clearInterval(interval);
          delete this.statusCheckIntervals[jobId];
          return;
        }
        
        const startTime = deployment.startTime.getTime();
        const elapsedTime = Date.now() - startTime;
        
        if (elapsedTime > 60 * 60 * 1000) {  // 1시간
          clearInterval(interval);
          delete this.statusCheckIntervals[jobId];
          
          await this.prisma.deployment.update({
            where: { jobId },
            data: {
              status: 'COMPLETED',
              message: `배포 시간이 초과되었지만, VM 인스턴스(${instanceName})는 실행 중입니다. 인스턴스에 직접 접속하여 상태를 확인해 주세요.`,
              completedTime: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(`VM 상태 확인 오류: ${error.message}`);
      }
    }, 30000);  // 30초마다 확인
    
    // 인터벌 저장 (나중에 정리할 수 있도록)
    this.statusCheckIntervals[jobId] = interval;
  }

  /**
   * 오래된 작업 상태 정보를 정리합니다.
   * (주기적으로 실행할 수 있는 작업)
   * @param ageInHours 정리할 작업의 경과 시간 (시간 단위)
   */
  async cleanupOldDeployments(ageInHours = 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - ageInHours * 60 * 60 * 1000);

    // 상태 인터벌 정리를 위해 오래된 작업 조회
    const oldDeployments = await this.prisma.deployment.findMany({
      where: {
        startTime: {
          lt: cutoffDate,
        },
      },
    });

    // 인터벌 정리
    for (const deployment of oldDeployments) {
      if (this.statusCheckIntervals[deployment.jobId]) {
        clearInterval(this.statusCheckIntervals[deployment.jobId]);
        delete this.statusCheckIntervals[deployment.jobId];
      }
    }

    // 데이터베이스에서는 삭제하지 않고 보관 (감사 및 이력 관리를 위해)
    // 필요하다면 아래 코드로 삭제할 수 있음
    /*
    await this.prisma.deployment.deleteMany({
      where: {
        startTime: {
          lt: cutoffDate,
        },
      },
    });
    */
  }

  /**
   * 서비스가 종료될 때 모든 인터벌을 정리합니다.
   */
  onApplicationShutdown(): void {
    Object.values(this.statusCheckIntervals).forEach((interval) => {
      clearInterval(interval);
    });
  }

  /**
   * 배포 작업 목록 조회
   * @returns 배포 작업 목록
   */
  async listDeployments(): Promise<{ jobId: string; status: string; instanceName?: string; startTime: string }[]> {
    const deployments = await this.prisma.deployment.findMany({
      orderBy: {
        startTime: 'desc',
      },
    });

    return deployments.map(deployment => ({
      jobId: deployment.jobId,
      status: deployment.status.toLowerCase(),
      instanceName: deployment.instanceName || undefined,
      startTime: deployment.startTime.toISOString(),
    }));
  }
}