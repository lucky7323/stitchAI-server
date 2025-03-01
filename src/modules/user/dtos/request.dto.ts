import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MemoryPlatform, MemoryType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetUserRequestDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  @IsString()
  walletAddress: string;
}

export class CreateUserRequestDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  @IsString()
  walletAddress: string;
}

export class CreateMemoryRequestDto {
  @ApiProperty({ description: 'The user wallet address' })
  @IsString()
  userWalletAddress: string;

  @ApiProperty({ description: 'The memory type' })
  @IsEnum(MemoryType)
  type: MemoryType;

  @ApiProperty({ description: 'The memory platform' })
  @IsEnum(MemoryPlatform)
  platform: MemoryPlatform;

  @ApiProperty({ description: 'The memory title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'The memory description' })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({ description: 'The memory price' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price: number;
}

export class CreateAgentRequestDto {
  @ApiProperty({ description: 'The name of the agent' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The description of the agent', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The social link of the agent', required: false })
  @IsString()
  @IsOptional()
  socialLink?: string;

  @ApiProperty({ description: 'The memory ID associated with the agent', required: false })
  @IsString()
  @IsOptional()
  memoryId?: string;

  @ApiProperty({ description: 'The wallet address of the user who owns the agent' })
  @IsString()
  userWalletAddress: string;

  @ApiProperty({ description: 'The deployment ID associated with the agent', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  deploymentId?: number;

  @ApiProperty({ description: 'The platform of the agent' })
  @IsEnum(MemoryPlatform)
  platform: MemoryPlatform;
}
