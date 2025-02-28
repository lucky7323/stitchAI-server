import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { DeploymentStatusResponseDto } from '../dtos/response.dto';
import { CreateElizaRequestDto } from '../dtos/request.dto';

const execAsync = promisify(exec);

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);
  private readonly deploymentStatus: Record<string, DeploymentStatusResponseDto> = {};
  private readonly deploymentInstances: Record<string, string> = {}; // jobId -> instanceName 매핑
  private readonly statusCheckIntervals: Record<string, NodeJS.Timeout> = {}; // 상태 확인 인터벌 타이머

  /**
   * 새로운 Eliza 배포 작업을 시작합니다.
   * @param telegramToken Telegram Bot Token
   * @returns 생성된 작업 ID
   */
  async createElizaDeployment(dto: CreateElizaRequestDto): Promise<string> {
    // 작업 ID 생성 (타임스탬프 + 랜덤값)
    const jobId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

    // 작업 상태 초기화
    this.deploymentStatus[jobId] = {
      status: 'pending',
      message: '배포 작업이 시작되었습니다.',
      startTime: new Date().toISOString(),
    };

    // 비동기로 배포 스크립트 실행
    this.runDeploymentScript(jobId, dto.telegram, dto.agentName, dto.description, dto.socialLink);

    return jobId;
  }

  /**
   * 배포 작업 상태를 조회합니다.
   * @param jobId 작업 ID
   * @returns 작업 상태 정보
   */
  getDeploymentStatus(jobId: string): DeploymentStatusResponseDto {
    const status = this.deploymentStatus[jobId];
    if (!status) {
      throw new NotFoundException(`작업 ID(${jobId})를 찾을 수 없습니다.`);
    }
    return status;
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
      this.deploymentStatus[jobId] = {
        ...this.deploymentStatus[jobId],
        status: 'in_progress',
        message: '배포 스크립트 실행 중...',
      };

      // 스크립트 경로
      const scriptPath = path.resolve(process.cwd(), 'deploy.sh');
      this.logger.log(`스크립트 실행: ${scriptPath} ${telegramToken}`);

      // 스크립트 실행
      const { stdout, stderr } = await execAsync(`"${scriptPath}" "${telegramToken}" "${agentName}" "${description}" "${socialLink}"`);
      
      // 인스턴스 이름 추출 (stdout에서 정규식으로 추출)
      const instanceNameMatch = stdout.match(/인스턴스 (eliza-agent-\d+)를 생성합니다/);
      const instanceName = instanceNameMatch ? instanceNameMatch[1] : null;
      
      if (instanceName) {
        this.deploymentInstances[jobId] = instanceName;
        
        this.deploymentStatus[jobId] = {
          ...this.deploymentStatus[jobId],
          status: 'in_progress',
          message: `VM 인스턴스(${instanceName})가 생성되었습니다. Eliza가 초기화 중입니다...`,
          output: stdout,
        };
        
        // VM 인스턴스 상태 주기적으로 확인 시작
        this.startInstanceStatusCheck(jobId, instanceName);
      } else {
        this.deploymentStatus[jobId] = {
          ...this.deploymentStatus[jobId],
          status: 'in_progress',
          message: 'VM 인스턴스가 생성되었지만, 이름을 확인할 수 없습니다. 초기화가 진행 중입니다...',
          output: stdout,
        };
        
        // 인스턴스 이름을 찾지 못했더라도 상태 확인 시작 (기본 2시간 타임아웃)
        setTimeout(() => {
          if (this.deploymentStatus[jobId].status === 'in_progress') {
            this.deploymentStatus[jobId] = {
              ...this.deploymentStatus[jobId],
              status: 'completed',
              message: '배포가 완료된 것으로 간주합니다. 인스턴스 상태를 직접 확인해 주세요.',
              completedTime: new Date().toISOString(),
            };
          }
        }, 2 * 60 * 60 * 1000); // 2시간 타임아웃
      }
    } catch (error) {
      // 상태 업데이트: 실패
      this.deploymentStatus[jobId] = {
        ...this.deploymentStatus[jobId],
        status: 'failed',
        message: '배포 중 오류가 발생했습니다.',
        error: error.message || '알 수 없는 오류',
        completedTime: new Date().toISOString(),
      };

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
            
            this.deploymentStatus[jobId] = {
              ...this.deploymentStatus[jobId],
              status: 'completed',
              message: `배포가 완료되었습니다. Eliza가 VM 인스턴스(${instanceName})에서 실행 중입니다.`,
              completedTime: new Date().toISOString(),
            };
            
            this.logger.log(`배포 완료 (JobId: ${jobId}, Instance: ${instanceName})`);
          } else if (logOutput.includes('systemctl start eliza') && deploymentPhase === 'vm_creation') {
            // Eliza 서비스 시작 중
            deploymentPhase = 'service_starting';
            this.deploymentStatus[jobId] = {
              ...this.deploymentStatus[jobId],
              message: `Eliza 서비스를 시작하는 중입니다...`,
            };
          }
        } catch (logError) {
          // 로그 확인 오류는 무시하고 계속 진행
          this.logger.debug(`로그 확인 오류 (무시됨): ${logError.message}`);
        }
        
        // 1시간 후에도 완료되지 않으면 타임아웃
        const startTime = new Date(this.deploymentStatus[jobId].startTime).getTime();
        const elapsedTime = Date.now() - startTime;
        
        if (elapsedTime > 60 * 60 * 1000) {  // 1시간
          clearInterval(interval);
          delete this.statusCheckIntervals[jobId];
          
          this.deploymentStatus[jobId] = {
            ...this.deploymentStatus[jobId],
            status: 'completed',
            message: `배포 시간이 초과되었지만, VM 인스턴스(${instanceName})는 실행 중입니다. 인스턴스에 직접 접속하여 상태를 확인해 주세요.`,
            completedTime: new Date().toISOString(),
          };
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
  cleanupOldDeployments(ageInHours = 24): void {
    const now = Date.now();
    const hoursInMs = ageInHours * 60 * 60 * 1000;

    Object.keys(this.deploymentStatus).forEach((jobId) => {
      const status = this.deploymentStatus[jobId];
      const startTime = new Date(status.startTime).getTime();
      
      if (now - startTime > hoursInMs) {
        // 상태 확인 인터벌이 있으면 정리
        if (this.statusCheckIntervals[jobId]) {
          clearInterval(this.statusCheckIntervals[jobId]);
          delete this.statusCheckIntervals[jobId];
        }
        
        delete this.deploymentStatus[jobId];
        delete this.deploymentInstances[jobId];
        this.logger.log(`오래된 작업 정리 (JobId: ${jobId})`);
      }
    });
  }

  /**
   * 서비스가 종료될 때 모든 인터벌을 정리합니다.
   */
  onApplicationShutdown(): void {
    Object.values(this.statusCheckIntervals).forEach((interval) => {
      clearInterval(interval);
    });
  }
}