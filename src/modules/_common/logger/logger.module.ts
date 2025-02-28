import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { LoggingInterceptor } from '~/interceptors/logger.interceptors';
import { LoggerService } from '~/modules/_common/logger/services/logger.service';

@Module({
  providers: [LoggerService, { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
  exports: [LoggerService],
})
export class LoggerModule {}
