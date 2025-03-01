import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigService } from '@nestjs/config';

const execAsync = promisify(exec);

@Injectable()
export class SilentSshService implements OnModuleInit {
  private readonly logger = new Logger(SilentSshService.name);
  private sshConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * 모듈 초기화 시 SSH 인증 설정
   */
  async onModuleInit() {
    try {
      this.logger.log('SSH 인증 초기화 중...');
      await this.setupSilentSshAuth();
    } catch (error) {
      this.logger.error(`SSH 인증 초기화 실패: ${error.message}`);
    }
  }

  /**
   * 비밀번호 없는 SSH 인증 설정
   * 서버 시작 시 자동으로 실행됨
   */
  async setupSilentSshAuth(): Promise<void> {
    try {
      // 1. 비밀번호 없는 새 SSH 키 생성 (서비스 전용)
      const sshDir = path.join(os.homedir(), '.ssh');
      const serviceKeyPath = path.join(sshDir, 'eliza_service_key');
      
      // SSH 디렉토리가 없으면 생성
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { mode: 0o700 });
      }
      
      // 서비스용 키가 없으면 생성
      if (!fs.existsSync(serviceKeyPath)) {
        this.logger.log('서비스용 SSH 키를 생성합니다...');
        await execAsync(`ssh-keygen -t rsa -b 4096 -f ${serviceKeyPath} -N "" -C "eliza-service-key"`);
      }
      
      // 2. gcloud 설정에 키 등록
      this.logger.log('gcloud에 서비스 키를 등록합니다...');
      await execAsync(`gcloud compute config-ssh --ssh-key-file=${serviceKeyPath}`);
      
      // 3. 권한 설정
      await execAsync(`chmod 600 ${serviceKeyPath}`);
      await execAsync(`chmod 600 ${serviceKeyPath}.pub`);
      
      // 4. ssh config 파일 업데이트
      const sshConfigPath = path.join(sshDir, 'config');
      let sshConfigContent = '';
      
      if (fs.existsSync(sshConfigPath)) {
        sshConfigContent = fs.readFileSync(sshConfigPath, 'utf8');
      }
      
      // 이미 설정되어 있는지 확인
      if (!sshConfigContent.includes('IdentityFile ~/.ssh/eliza_service_key')) {
        // 기존 설정 유지하면서 추가
        sshConfigContent += `\n# Eliza 서비스용 SSH 설정\nHost compute.googleapis.com\n  IdentityFile ~/.ssh/eliza_service_key\n  UserKnownHostsFile=/dev/null\n  StrictHostKeyChecking=no\n`;
        fs.writeFileSync(sshConfigPath, sshConfigContent, { mode: 0o600 });
      }
      
      // 5. 환경 변수 설정 (프로세스 내에서만 유효)
      process.env.GIT_SSH_COMMAND = `ssh -i ${serviceKeyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
      
      // SSH 에이전트 시작
      const sshAgentOutput = await execAsync('ssh-agent -s');
      const match = sshAgentOutput.stdout.match(/SSH_AUTH_SOCK=([^;]+)/);
      if (match) {
        process.env.SSH_AUTH_SOCK = match[1];
      }
      
      // 키를 SSH 에이전트에 추가
      await execAsync(`ssh-add ${serviceKeyPath}`);
      
      this.sshConfigured = true;
      this.logger.log('비밀번호 없는 SSH 인증이 성공적으로 설정되었습니다.');
    } catch (error) {
      this.logger.error(`SSH 인증 설정 실패: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 특정 인스턴스에 대한 SSH 접속 테스트
   * @param instanceName 인스턴스 이름
   * @returns 성공 여부
   */
  async testSshConnection(instanceName: string): Promise<boolean> {
    try {
      const zone = this.configService.get('ZONE') || 'us-central1-f';
      const sshDir = path.join(os.homedir(), '.ssh');
      const serviceKeyPath = path.join(sshDir, 'eliza_service_key');
      
      const testCommand = `gcloud compute ssh ubuntu@${instanceName} --zone=${zone} --ssh-key-file=${serviceKeyPath} --command="echo 'SSH 연결 테스트 성공'" --quiet`;
      
      const { stdout } = await execAsync(testCommand);
      return stdout.includes('SSH 연결 테스트 성공');
    } catch (error) {
      this.logger.error(`SSH 연결 테스트 실패 (${instanceName}): ${error.message}`);
      return false;
    }
  }
  
  /**
   * SSH 인증이 설정되었는지 확인
   */
  isSshConfigured(): boolean {
    return this.sshConfigured;
  }
}