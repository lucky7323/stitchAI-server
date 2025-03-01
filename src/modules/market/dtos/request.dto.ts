import { ApiProperty } from '@nestjs/swagger';
import { MemoryType } from '@prisma/client';

export class MarketRequestQueryDto {
  @ApiProperty({ description: 'type of the memory' })
  type: MemoryType;
}
