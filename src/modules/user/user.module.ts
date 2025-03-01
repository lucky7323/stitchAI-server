import { Module } from '@nestjs/common';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserMemoryService } from './services/user-memory.service';
import { UserAgentService } from './services/user-agent.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [UserController],
  providers: [UserService, UserMemoryService, UserAgentService],
  exports: [UserService, UserMemoryService, UserAgentService],
})
export class UserModule {}
