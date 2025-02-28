import { LoggerService as LS } from '@nestjs/common';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

import { ENABLE_LOG } from '~/constants';

const { combine, timestamp } = winston.format;

export class LoggerService implements LS {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console({
          level: 'debug',
          format: combine(
            timestamp({ format: 'isoDateTime' }),
            nestWinstonModuleUtilities.format.nestLike(service, {
              prettyPrint: true,
            })
          ),
        }),
        /*
        new winston.transports.File({
          level: 'error',
          filename: `error-${format(new Date(), 'yyyy-MM-dd')}.log`,
          dirname: 'logs',
          maxsize: 5000000,
          format: combine(
            errors({ stack: true }),
            timestamp({ format: 'isoDateTime' }),
            nestWinstonModuleUtilities.format.nestLike(service, {
              prettyPrint: true,
            })
          ),
        }),
        */

        /*
        new winston.transports.File({
          filename: `application-${format(new Date(), 'yyyy-MM-dd')}.log`,
          dirname: 'logs',
          maxsize: 5000000,
          format: combine(
            timestamp({ format: 'isoDateTime' }),
            nestWinstonModuleUtilities.format.nestLike(service, {
              prettyPrint: true,
            })
          ),
        }),
        */
      ],
    });
  }

  log(message: Record<string, any>) {
    if (!ENABLE_LOG) return;
    this.logger.log({
      level: 'info',
      message: JSON.stringify(message, null, 2),
    });
  }
  info(message: Record<string, any>) {
    if (!ENABLE_LOG) return;
    this.logger.info(JSON.stringify(message, null, 2));
  }
  error(message: Record<string, any>) {
    if (!ENABLE_LOG) return;
    this.logger.error(JSON.stringify(message, null, 2));
  }
  warn(message: Record<string, any>) {
    if (!ENABLE_LOG) return;
    this.logger.warning(JSON.stringify(message, null, 2));
  }
  debug(message: Record<string, any>) {
    if (!ENABLE_LOG) return;
    this.logger.debug(JSON.stringify(message, null, 2));
  }
  verbose(message: Record<string, any>) {
    if (!ENABLE_LOG) return;
    this.logger.verbose(JSON.stringify(message, null, 2));
  }
}
