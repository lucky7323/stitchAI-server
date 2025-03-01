import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/providers/prisma/services/prisma.service';
import { CreateMemoryRequestDto } from '../dtos/request.dto';
import { CloudStorage } from '~/utils/cloud-storage';

@Injectable()
export class UserMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createMemory(
    file: Express.Multer.File,
    { userWalletAddress, type, platform, title, description, price }: CreateMemoryRequestDto
  ): Promise<void> {
    const dataUrl = await CloudStorage.getInstance().upload(
      file.buffer,
      `${userWalletAddress}--${type.toLowerCase()}--${platform.toLowerCase()}--${title}`
    );

    await this.prisma.memory.create({
      data: {
        type,
        platform,

        title,
        description,
        dataUrl,

        ownerId: userWalletAddress,

        updatedAt: new Date(),

        price,
      },
    });
  }
}
