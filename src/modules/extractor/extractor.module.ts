import { Module } from '@nestjs/common';
import { ExtractorService } from './services/extractor.service';
import { ExtractorController } from './controllers/extractor.controller';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { SilentSshService } from './services/silent-ssh.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [ExtractorController],
  providers: [ExtractorService, SilentSshService],
  exports: [ExtractorService, SilentSshService],
})
export class ExtractorModule {}