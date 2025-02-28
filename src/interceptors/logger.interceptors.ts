/* eslint-disable @typescript-eslint/no-explicit-any */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { ENABLE_LOG } from '~/constants';
import { LoggerService } from '~/modules/_common/logger/services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly loggerService = new LoggerService('Log');

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>
  ): Observable<any> | Promise<Observable<any>> {
    if (!ENABLE_LOG) return next.handle();

    const { method, url, cookies, headers, body } = context.getArgByIndex(0);

    this.loggerService.info({
      type: 'request',
      timestamp: new Date().toISOString(),
      method,
      url,
      cookies,
      authorization: headers['authorization'],
      body,
    });

    return next.handle().pipe(
      tap(data =>
        this.loggerService.info({
          type: 'response',
          timestamp: new Date().toISOString(),
          method,
          url,
          data,
        })
      )
    );
  }
}
