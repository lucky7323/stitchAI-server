import { ApiProperty } from '@nestjs/swagger';
import { MemoryType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class MarketRequestQueryDto {
  @ApiProperty({ description: 'type of the memory' })
  @IsEnum(MemoryType)
  type: MemoryType;
}
