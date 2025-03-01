import { ApiProperty } from '@nestjs/swagger';
import { MemoryType } from '@prisma/client';

import { MemoryPlatform } from '@prisma/client';

export class MarketResponseDto {
  @ApiProperty({ description: 'The id of the memory' })
  id: number;

  @ApiProperty({ description: 'The title of the memory' })
  title: string;

  @ApiProperty({ description: 'The description of the memory' })
  description: string;

  @ApiProperty({ description: 'The data url of the memory' })
  dataUrl: string;

  @ApiProperty({ description: 'The price of the memory' })
  price: number;

  @ApiProperty({ description: 'The metadata of the memory' })
  metadata: any;

  @ApiProperty({ description: 'The type of the memory' })
  type: MemoryType;

  @ApiProperty({ description: 'The platform of the memory' })
  platform: MemoryPlatform;

  @ApiProperty({ description: 'The updated at of the memory' })
  updatedAt: Date;

  @ApiProperty({ description: 'The curator of the memory' })
  curator: string;
}
