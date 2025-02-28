import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { ExceptionModule } from './modules/_common/exception/exception.module';
import { LoggerModule } from './modules/_common/logger/logger.module';
import { DeploymentModule } from './modules/deployment/deployment.module';
import { EnvModule } from './modules/env/env.module';
import { PingModule } from './modules/ping/ping.module';
import { PrismaModule } from './providers/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // base modules
    ExceptionModule,
    LoggerModule,
    PingModule,

    // scheduler
    ScheduleModule.forRoot(),

    // deploy agent
    DeploymentModule,

    EnvModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
