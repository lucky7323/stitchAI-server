import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/providers/prisma/services/prisma.service';
import { CreateUserRequestDto, GetUserRequestDto } from '../dtos/request.dto';
import { UserResponseDto } from '../dtos/response.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser({ walletAddress }: GetUserRequestDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { walletAddress: { equals: walletAddress, mode: 'insensitive' } },
      select: {
        walletAddress: true,
        agent: {
          select: {
            id: true,
            name: true,
            description: true,
            socialLink: true,
            memory: {
              select: {
                title: true,
              },
            },
            deployment: {
              select: {
                status: true,
              },
            },
          },
        },
        memory: {
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
          },
        },
      },
    });

    if (user) {
      const agent =
        user.agent?.map(agent => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          socialLink: agent.socialLink,
          memory: agent.memory.title,
          status: agent.deployment.status,
        })) || [];
      const memory = user.memory?.map(memory => memory) || [];
      return {
        walletAddress: user.walletAddress,
        agent,
        memory,
      };
    } else return await this.createUser({ walletAddress });
  }

  async createUser({ walletAddress }: CreateUserRequestDto): Promise<UserResponseDto> {
    const created = await this.prisma.user.create({
      data: {
        walletAddress,
      },
    });

    return {
      walletAddress: created.walletAddress,
      agent: [],
      memory: [],
    };
  }
}
