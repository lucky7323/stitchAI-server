import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

import { AppModule } from '~/app.module';
import setupDocs from '~/configs/docs';
import { validationPipe } from '~/configs/pipeline/validation.pipeline';
import { corsOrigins } from '~/utils/cors-origins';

const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('Unable to map')) {
    return;
  }

  originalConsoleWarn.apply(console, args);
};

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: corsOrigins, credentials: true },
  });

  app.use(cookieParser());
  app.useGlobalPipes(validationPipe);

  app.enableShutdownHooks();

  setupDocs(app);

  await app.listen(3000);
};

bootstrap();
