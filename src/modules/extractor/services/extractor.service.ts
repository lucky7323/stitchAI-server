import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '../../../providers/prisma/services/prisma.service';
import { SilentSshService } from './silent-ssh.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class ExtractorService {
  private readonly logger = new Logger(ExtractorService.name);
  private readonly zone: string;
  private readonly sshKeyPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly silentSshService: SilentSshService,
    private readonly configService: ConfigService
  ) {
    this.zone = this.configService.get('ZONE') || 'us-central1-f';
    this.sshKeyPath = path.join(os.homedir(), '.ssh', 'eliza_service_key');
  }

  /**
   * VM 인스턴스의 SQLite 데이터베이스에서 memories 테이블 데이터를 CSV로 추출
   * @param instanceName 데이터를 추출할 VM 인스턴스 이름
   * @returns CSV 데이터 문자열
   */
  async extractMemoriesAsCSV(instanceName: string): Promise<{ csv: string, filename: string }> {
    try {
      // 인스턴스가 존재하고 실행 중인지 확인
      const { stdout: instanceStatus } = await execAsync(
        `gcloud compute instances describe ${instanceName} --zone=${this.zone} --format="json(status)"`
      );
      
      const status = JSON.parse(instanceStatus);
      if (status?.status !== 'RUNNING') {
        throw new NotFoundException(`인스턴스 ${instanceName}이(가) 실행 중이 아니거나 존재하지 않습니다.`);
      }

      // SSH 인증이 설정되어 있는지 확인
      if (!this.silentSshService.isSshConfigured()) {
        await this.silentSshService.setupSilentSshAuth();
      }

      // VM에서 직접 SQLite 명령 실행
      const sqliteCommand = `
        sqlite3 -header -csv /home/ubuntu/eliza/agent/data/db.sqlite "SELECT * FROM memories;"
      `;
      
      // 비밀번호 없는 SSH 키를 사용하여 명령 실행
      const { stdout } = await execAsync(
        `gcloud compute ssh ubuntu@${instanceName} --zone=${this.zone} --ssh-key-file=${this.sshKeyPath} --command="${sqliteCommand}" --quiet`
      );
      
      // CSV 데이터 반환
      return { 
        csv: stdout,
        filename: `${instanceName}_memories_${new Date().toISOString().slice(0, 10)}.csv`
      };
    } catch (error) {
      this.logger.error(`${instanceName}에서 memories 추출 실패: ${error.message}`);
      
      // SSH 인증 오류가 발생한 경우 재설정 시도
      if (error.message.includes('Permission denied') || 
          error.message.includes('passphrase') || 
          error.message.includes('authentication')) {
        try {
          this.logger.log('SSH 인증 오류 발생, 재설정 시도 중...');
          await this.silentSshService.setupSilentSshAuth();
          throw new Error('SSH 인증을 재설정했습니다. 다시 시도해주세요.');
        } catch (retryError) {
          throw new Error(`SSH 인증 재설정 실패: ${retryError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * 사용 가능한 모든 VM 인스턴스 목록 가져오기
   * @returns 인스턴스 이름 배열
   */
  async listAvailableInstances(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `gcloud compute instances list --format="json(name)"`
      );
      
      const instances = JSON.parse(stdout);
      return instances.map(instance => instance.name);
    } catch (error) {
      this.logger.error(`인스턴스 목록 조회 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 모든 배포와 연결된 VM 인스턴스 가져오기
   * @returns 인스턴스 이름이 포함된 배포 배열
   */
  async getDeploymentsWithInstances(): Promise<Array<{ jobId: string; instanceName: string; status: string; }>> {
    const deployments = await this.prisma.deployment.findMany({
      where: {
        instanceName: {
          not: null
        }
      },
      select: {
        jobId: true,
        instanceName: true,
        status: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    return deployments;
  }
  
  /**
   * 특정 VM 인스턴스의 SQLite 스키마 정보 가져오기
   * @param instanceName VM 인스턴스 이름
   * @returns SQLite 데이터베이스의 테이블과 스키마 정보
   */
  async getSqliteSchema(instanceName: string): Promise<any> {
    try {
      // 인스턴스가 존재하고 실행 중인지 확인
      const { stdout: instanceStatus } = await execAsync(
        `gcloud compute instances describe ${instanceName} --zone=${this.zone} --format="json(status)"`
      );
      
      const status = JSON.parse(instanceStatus);
      if (status?.status !== 'RUNNING') {
        throw new NotFoundException(`인스턴스 ${instanceName}이(가) 실행 중이 아니거나 존재하지 않습니다.`);
      }

      // SQLite 스키마 정보를 가져오는 명령
      const schemaCommand = `
        sqlite3 /home/ubuntu/eliza/agent/data/db.sqlite ".schema memories"
      `;
      
      // 비밀번호 없는 SSH 키를 사용하여 명령 실행
      const { stdout } = await execAsync(
        `gcloud compute ssh ubuntu@${instanceName} --zone=${this.zone} --ssh-key-file=${this.sshKeyPath} --command="${schemaCommand}" --quiet`
      );
      
      return { schema: stdout };
    } catch (error) {
      this.logger.error(`${instanceName}에서 스키마 정보 가져오기 실패: ${error.message}`);
      throw error;
    }
  }
}