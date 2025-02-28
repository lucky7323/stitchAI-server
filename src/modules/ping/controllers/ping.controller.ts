import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { PongDto } from '../dtos/response.dto';
import { PingService } from '../services/ping.service';

@ApiExcludeController()
@Controller('/ping')
export class PingController {
  constructor(private readonly pingService: PingService) {}

  @Get()
  ping(): PongDto {
    return { data: 'pong' };
  }
}
