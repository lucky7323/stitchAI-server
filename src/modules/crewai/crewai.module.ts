import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrewAiController } from './controllers/crewai.controller';
import { CrewAiService } from './services/crewai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [CrewAiController],
  providers: [CrewAiService],
  exports: [CrewAiService],
})
export class CrewAiModule {}