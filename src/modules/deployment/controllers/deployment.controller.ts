import { Body, Controller, Get, Param, Post, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../../interceptors/logger.interceptors';
import { CreateElizaRequestDto } from '../dtos/request.dto';
import { DeploymentResponseDto, DeploymentStatusResponseDto } from '../dtos/response.dto';
import { DeploymentService } from '../services/deployment.service';

@ApiTags('deployment')
@Controller('api/deployment')
@UseInterceptors(LoggingInterceptor)
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('create-eliza')
  @ApiOperation({ summary: 'Eliza 배포 시작' })
  @ApiResponse({
    status: 202,
    description: '배포 작업이 시작되었습니다.',
    type: DeploymentResponseDto,
  })
  async createEliza(@Body() dto: CreateElizaRequestDto): Promise<DeploymentResponseDto> {
    const jobId = await this.deploymentService.createElizaDeployment(dto);
    
    return {
      jobId,
      message: '배포 작업이 시작되었습니다.',
      statusEndpoint: `/api/deployment/status/${jobId}`,
    };
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: '배포 상태 확인' })
  @ApiResponse({
    status: 200,
    description: '배포 상태를 반환합니다.',
    type: DeploymentStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '찾을 수 없는 작업 ID입니다.',
  })
  getStatus(@Param('jobId') jobId: string): DeploymentStatusResponseDto {
    return this.deploymentService.getDeploymentStatus(jobId);
  }
}