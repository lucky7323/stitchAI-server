import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/providers/prisma/services/prisma.service';
import { CreateAgentRequestDto } from '../dtos/request.dto';

@Injectable()
export class UserAgentService {
  constructor(private readonly prisma: PrismaService) {}

  async createAgent({
    userWalletAddress,
    name,
    description,
    socialLink,
    memoryId,
    deploymentId,
  }: CreateAgentRequestDto): Promise<void> {
    await this.prisma.agent.create({
      data: {
        name,
        description,
        socialLink,
        memoryId,
        userWalletAddress,
        deploymentId,
      },
    });
  }
}