import { Module } from '@nestjs/common';

import { DeploymentController } from './controllers/deployment.controller';
import { DeploymentService } from './services/deployment.service';

@Module({
  imports: [],
  controllers: [DeploymentController],
  providers: [DeploymentService],
  exports: [DeploymentService],
})
export class DeploymentModule {}
