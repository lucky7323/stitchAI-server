import { ApiProperty } from '@nestjs/swagger';

export class InstanceListItemDto {
  @ApiProperty({ description: 'The job ID for the deployment' })
  jobId: string;

  @ApiProperty({ description: 'The instance name of the VM' })
  instanceName: string;

  @ApiProperty({ description: 'The deployment status' })
  status: string;

  @ApiProperty({ description: 'Whether the instance is currently running' })
  isRunning: boolean;
}

export class InstanceListResponseDto {
  @ApiProperty({ type: [InstanceListItemDto], description: 'List of deployments with instance information' })
  deployments: InstanceListItemDto[];

  @ApiProperty({ type: [String], description: 'List of all available VM instances' })
  availableInstances: string[];
}

export class MemoriesCsvResponseDto {
  @ApiProperty({ description: 'The CSV content of memories' })
  csv: string;

  @ApiProperty({ description: 'Suggested filename for the CSV file' })
  filename: string;
}