import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/providers/prisma/services/prisma.service';
import { MarketResponseDto } from '../dtos/response.dto';
import { MarketRequestQueryDto } from '../dtos/request.dto';

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemory({ type }: MarketRequestQueryDto): Promise<MarketResponseDto[]> {
    const memory = await this.prisma.memory.findMany({
      where: { type },
      select: {
        id: true,

        title: true,
        description: true,
        dataUrl: true,

        price: true,
        metadata: true,

        type: true,
        platform: true,

        updatedAt: true,

        owner: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    const res = memory.map(memory => ({
      ...memory,
      curator: memory.owner.walletAddress,
      metadata: memory.metadata as any,
    }));

    return res;
  }
}
