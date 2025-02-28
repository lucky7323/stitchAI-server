/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { LoggerService } from '~/modules/_common/logger/services/logger.service';
import { formatErrorStack } from '~/utils/format-error-stack';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly loggerService = new LoggerService('Error');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    const _response = (exception as any)?.response;
    const response = _response
      ? {
          status: _response?.status || 0,
          statusText: _response?.statusText || '',
          headers: _response?.headers || {},
          data: _response?.data || {},
        }
      : {};
    const message = (exception as any)?.message ?? '';
    const stack = (exception as any)?.stack ? formatErrorStack((exception as any).stack) : '';

    this.loggerService.error({
      type: 'error',
      ...responseBody,
      response,
      message,
      stack,
    });

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
