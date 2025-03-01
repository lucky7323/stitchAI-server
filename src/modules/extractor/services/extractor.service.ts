import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '../../../providers/prisma/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class ExtractorService {
  private readonly logger = new Logger(ExtractorService.name);
  private readonly zone: string;
  private readonly sshKeyFile: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.zone = this.configService.get('ZONE') || 'us-central1-f';
    this.sshKeyFile = this.configService.get('SSH_KEY_PATH') || '~/.ssh/google_compute_engine';
  }

  /**
   * VM 인스턴스의 SQLite 데이터베이스에서 memories 테이블 데이터를 CSV로 추출
   * @param instanceName 데이터를 추출할 VM 인스턴스 이름
   * @returns CSV 데이터 문자열
   */
  async extractMemoriesAsCSV(instanceName: string): Promise<{ csv: string, filename: string }> {
    // 임시 디렉토리 생성
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-extract-'));
    const localDbPath = path.join(tmpDir, 'db.sqlite');
    const outputCsvPath = path.join(tmpDir, 'memories.csv');
    
    try {
      // 인스턴스가 존재하고 실행 중인지 확인
      this.logger.log(`인스턴스 ${instanceName} 상태 확인 중...`);
      const { stdout: instanceStatus } = await execAsync(
        `gcloud compute instances describe ${instanceName} --zone=${this.zone} --format="json(status)"`
      );
      
      const status = JSON.parse(instanceStatus);
      if (status?.status !== 'RUNNING') {
        throw new NotFoundException(`인스턴스 ${instanceName}이(가) 실행 중이 아니거나 존재하지 않습니다.`);
      }
      
      // 데이터베이스 파일 다운로드 (SCP 사용)
      this.logger.log(`인스턴스 ${instanceName}에서 SQLite 데이터베이스 다운로드 중...`);
      
      try {
        await execAsync(
          `gcloud compute scp ubuntu@${instanceName}:/home/ubuntu/eliza/agent/data/db.sqlite ${localDbPath} --zone=${this.zone} --quiet`
        );
      } catch (scpError) {
        throw new Error(`SQLite 데이터베이스 다운로드 실패: ${scpError.message}`);
      }
      
      // 로컬에서 SQLite 명령 실행
      this.logger.log('SQLite 데이터베이스에서 memories 테이블 추출 중...');
      await execAsync(
        `sqlite3 -header -csv ${localDbPath} "SELECT * FROM memories;" > ${outputCsvPath}`
      );
      
      // CSV 파일 읽기
      const csvData = fs.readFileSync(outputCsvPath, 'utf8');
      
      return {
        csv: csvData,
        filename: `${instanceName}_memories_${new Date().toISOString().slice(0, 10)}.csv`
      };
    } catch (error) {
      this.logger.error(`${instanceName}에서 memories 추출 실패: ${error.message}`);
      throw error;
    } finally {
      // 임시 파일 정리
      try {
        this.logger.debug('임시 파일 정리 중...');
        if (fs.existsSync(localDbPath)) fs.unlinkSync(localDbPath);
        if (fs.existsSync(outputCsvPath)) fs.unlinkSync(outputCsvPath);
        fs.rmdirSync(tmpDir);
      } catch (cleanupError) {
        this.logger.warn(`임시 파일 정리 실패: ${cleanupError.message}`);
      }
    }
  }
  
  /**
   * 예비 추출 방법 - 데이터베이스 복사 없이 VM에서 직접 수행
   */
  async extractMemoriesDirectly(instanceName: string): Promise<{ csv: string, filename: string }> {
    try {
      // 임시 스크립트 파일 생성
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-script-'));
      const scriptPath = path.join(tmpDir, 'extract-memories.sh');
      const localOutputPath = path.join(tmpDir, 'memories.csv');
      
      // 스크립트 내용 작성
      fs.writeFileSync(scriptPath, `#!/bin/bash
cd /home/ubuntu/eliza/agent/data
sqlite3 -header -csv db.sqlite "SELECT * FROM memories;"
`, { mode: 0o755 });
      
      // 스크립트 업로드
      await execAsync(
        `gcloud compute scp ${scriptPath} ubuntu@${instanceName}:/home/ubuntu/extract-memories.sh --zone=${this.zone} --quiet`
      );
      
      // 스크립트 실행 및 결과 캡처
      const { stdout } = await execAsync(
        `gcloud compute ssh ubuntu@${instanceName} --zone=${this.zone} --command="bash /home/ubuntu/extract-memories.sh" --quiet`
      );
      
      // 정리
      await execAsync(
        `gcloud compute ssh ubuntu@${instanceName} --zone=${this.zone} --command="rm /home/ubuntu/extract-memories.sh" --quiet`
      );
      
      // 임시 파일 정리
      fs.unlinkSync(scriptPath);
      fs.rmdirSync(tmpDir);
      
      return {
        csv: stdout,
        filename: `${instanceName}_memories_${new Date().toISOString().slice(0, 10)}.csv`
      };
    } catch (error) {
      this.logger.error(`직접 추출 실패: ${error.message}`);
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
   * SQLite 테이블 목록 가져오기
   */
  async getTableList(instanceName: string): Promise<string[]> {
    try {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-tables-'));
      const scriptPath = path.join(tmpDir, 'list-tables.sh');
      
      // 스크립트 내용 작성
      fs.writeFileSync(scriptPath, `#!/bin/bash
cd /home/ubuntu/eliza/agent/data
sqlite3 db.sqlite ".tables"
`, { mode: 0o755 });
      
      // 스크립트 업로드 및 실행
      await execAsync(
        `gcloud compute scp ${scriptPath} ubuntu@${instanceName}:/home/ubuntu/list-tables.sh --zone=${this.zone} --quiet`
      );
      
      const { stdout } = await execAsync(
        `gcloud compute ssh ubuntu@${instanceName} --zone=${this.zone} --command="bash /home/ubuntu/list-tables.sh" --quiet`
      );
      
      // 정리
      await execAsync(
        `gcloud compute ssh ubuntu@${instanceName} --zone=${this.zone} --command="rm /home/ubuntu/list-tables.sh" --quiet`
      );
      fs.unlinkSync(scriptPath);
      fs.rmdirSync(tmpDir);
      
      // 공백으로 구분된 테이블 이름을 배열로 변환
      return stdout.trim().split(/\s+/);
    } catch (error) {
      this.logger.error(`테이블 목록 가져오기 실패: ${error.message}`);
      throw error;
    }
  }
}