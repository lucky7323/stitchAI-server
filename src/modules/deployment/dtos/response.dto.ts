import { ApiProperty } from '@nestjs/swagger';

export class DeploymentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the deployment job',
    example: '1642512345',
  })
  jobId: string;

  @ApiProperty({
    description: 'Status message about the deployment process',
    example: '배포 작업이 시작되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: 'Endpoint to check deployment status',
    example: '/api/deployment/status/1642512345',
  })
  statusEndpoint: string;
}

export class DeploymentStatusResponseDto {
  @ApiProperty({
    description: 'Current status of the deployment',
    example: 'pending',
    enum: ['pending', 'in_progress', 'completed', 'failed'],
  })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Status message with details',
    example: '배포가 진행 중입니다. VM 인스턴스 생성 완료.',
  })
  message: string;

  @ApiProperty({
    description: 'Start time of the deployment job',
    example: '2023-05-01T12:00:00.000Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'Completion time of the deployment job (if completed/failed)',
    example: '2023-05-01T12:10:00.000Z',
    required: false,
  })
  completedTime?: string;

  @ApiProperty({
    description: 'Error message if the deployment failed',
    example: '인스턴스 생성 중 오류가 발생했습니다.',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Output from the deployment script (if available)',
    example: '인스턴스 생성 및 startup script 설정 완료.',
    required: false,
  })
  output?: string;
  
  @ApiProperty({
    description: 'VM 인스턴스 이름 (if available)',
    example: 'eliza-agent-1642512345',
    required: false,
  })
  instanceName?: string;
  
  @ApiProperty({
    description: '배포 단계에 대한 추가 정보',
    example: '서비스 시작 중',
    required: false,
  })
  phase?: string;
}