import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CrewAiService } from '../services/crewai.service';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddRagDataDto {
  @IsString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

@ApiTags('crewai')
@Controller('api/crewai')
export class CrewAiController {
  private readonly logger = new Logger(CrewAiController.name);

  constructor(private readonly crewAiService: CrewAiService) {}

  @Post('add')
  @ApiOperation({ summary: 'Add RAG data to the CrewAI VM instance' })
  @ApiBody({ 
    type: AddRagDataDto,
    description: 'Text data to be saved as rag.txt on the VM',
    examples: {
      'Sample Data': {
        value: { data: 'This is sample text data for the RAG system.' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Data successfully added to the VM' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Failed to upload data to the VM' })
  async addRagData(@Body() ragDataDto: AddRagDataDto) {
    try {
      this.logger.debug(`Received request body: ${JSON.stringify(ragDataDto)}`);
      this.logger.debug(`Data type: ${typeof ragDataDto.data}`);
      this.logger.debug(`Data value: ${ragDataDto.data}`);

      if (!ragDataDto.data || typeof ragDataDto.data !== 'string') {
        this.logger.debug('Validation failed: data is invalid');
        throw new HttpException(
          `Invalid data format. "data" field must be a non-empty string. Received: ${JSON.stringify(ragDataDto)}`, 
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.crewAiService.uploadRagData(ragDataDto.data, ragDataDto.walletAddress);
      
      return {
        success: true,
        message: 'RAG data uploaded successfully',
        timestamp: new Date().toISOString(),
        fileSize: Buffer.from(ragDataDto.data).length,
        ...result
      };
    } catch (error) {
      this.logger.error(`Failed to upload RAG data: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to upload RAG data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}