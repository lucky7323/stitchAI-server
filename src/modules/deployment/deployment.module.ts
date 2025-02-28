import { Module } from '@nestjs/common';

import { DeploymentController } from './controllers/deployment.controller';
import { DeploymentService } from './services/deployment.service';
import { PrismaModule } from 'src/providers/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeploymentController],
  providers: [DeploymentService],
  exports: [DeploymentService],
})
export class DeploymentModule {}
