import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class CrewAiService {
  private readonly logger = new Logger(CrewAiService.name);
  private readonly instanceName: string;
  private readonly zone: string;

  constructor(private readonly configService: ConfigService) {
    this.instanceName = this.configService.get('CREWAI_INSTANCE_NAME') || 'crewai-agent-server';
    this.zone = this.configService.get('ZONE') || 'us-central1-f';
  }

  /**
   * Upload RAG data to the CrewAI VM instance
   * @param data Text data to be saved as rag.txt
   * @returns Object containing the upload result information
   */
  async uploadRagData(data: string): Promise<any> {
    try {
      // First, check if the instance exists and is running
      const { stdout: instanceStatus } = await execAsync(
        `gcloud compute instances describe ${this.instanceName} --zone=${this.zone} --format="json(status)"`
      );
      
      const status = JSON.parse(instanceStatus);
      if (status?.status !== 'RUNNING') {
        throw new NotFoundException(
          `Instance ${this.instanceName} is not running or does not exist`
        );
      }

      // Create a temporary file with the RAG data
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crewai-rag-'));
      const ragFilePath = path.join(tmpDir, 'rag.txt');
      
      // Write the data to the temporary file
      fs.writeFileSync(ragFilePath, data);
      
      try {
        // Upload the file to the VM using gcloud compute scp
        await execAsync(
          `gcloud compute scp ${ragFilePath} ubuntu@${this.instanceName}:/home/ubuntu/mycrew/rag.txt --zone=${this.zone} --quiet`
        );
        
        // Verify the file was uploaded successfully
        const { stdout: verifyOutput } = await execAsync(
          `gcloud compute ssh ubuntu@${this.instanceName} --zone=${this.zone} --command="ls -la /home/ubuntu/mycrew/rag.txt" --quiet`
        );
        
        this.logger.log(`RAG data successfully uploaded to ${this.instanceName}: ${verifyOutput.trim()}`);
        
        return {
          instanceName: this.instanceName,
          filePath: '/home/ubuntu/mycrew/rag.txt',
          uploadVerification: verifyOutput.trim()
        };
      } finally {
        // Clean up temporary files
        try {
          fs.unlinkSync(ragFilePath);
          fs.rmdirSync(tmpDir);
        } catch (cleanupError) {
          this.logger.warn(`Failed to clean up temporary files: ${cleanupError.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to upload RAG data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if the CrewAI directory exists on the VM
   * If not, create it
   */
  async ensureCrewAiDirectoryExists(): Promise<boolean> {
    try {
      // Check if the directory exists
      const { stdout } = await execAsync(
        `gcloud compute ssh ubuntu@${this.instanceName} --zone=${this.zone} --command="if [ -d /home/ubuntu/mycrew ]; then echo 'exists'; else echo 'not_exists'; fi" --quiet`
      );
      
      if (stdout.trim() === 'not_exists') {
        // Create the directory
        await execAsync(
          `gcloud compute ssh ubuntu@${this.instanceName} --zone=${this.zone} --command="mkdir -p /home/ubuntu/mycrew" --quiet`
        );
        this.logger.log('Created /home/ubuntu/mycrew directory on the VM');
        return true;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to ensure CrewAI directory exists: ${error.message}`);
      throw error;
    }
  }
}