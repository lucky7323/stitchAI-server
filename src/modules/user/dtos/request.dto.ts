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
