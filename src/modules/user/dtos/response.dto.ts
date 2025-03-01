import { ApiProperty } from '@nestjs/swagger';
import { DeploymentStatus, MemoryPlatform, MemoryType } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  walletAddress: string;

  @ApiProperty({ description: 'The agent of the user' })
  agent: AgentResponseDto[];

  @ApiProperty({ description: 'The memory of the user' })
  memory: MemoryResponseDto[];
}

export class AgentResponseDto {
  @ApiProperty({ description: 'The id of the agent' })
  id: string;

  @ApiProperty({ description: 'The name of the agent' })
  name: string;

  @ApiProperty({ description: 'The description of the agent' })
  description: string;

  @ApiProperty({ description: 'The social link of the agent' })
  socialLink: string;

  @ApiProperty({ description: 'The memory of the agent' })
  memory: string;

  @ApiProperty({ description: 'The status of the agent' })
  status: DeploymentStatus;

  @ApiProperty({ description: 'The platform of the agent' })
  platform: MemoryPlatform;
}

export class MemoryResponseDto {
  @ApiProperty({ description: 'The id of the memory' })
  id: string;

  @ApiProperty({ description: 'The title of the memory' })
  title: string;

  @ApiProperty({ description: 'The description of the memory' })
  description: string;

  @ApiProperty({ description: 'The data url of the memory' })
  dataUrl: string;

  @ApiProperty({ description: 'The price of the memory' })
  price: number;

  @ApiProperty({ description: 'The type of the memory' })
  type: MemoryType;

  @ApiProperty({ description: 'The platform of the memory' })
  platform: MemoryPlatform;

  @ApiProperty({ description: 'The updated at of the memory' })
  updatedAt: Date;
}
