import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketService } from '../services/market.service';
import { MarketRequestQueryDto } from '../dtos/request.dto';

@ApiTags('market')
@Controller('api/market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('memories')
  @ApiOperation({ summary: '메모리 목록 조회' })
  @ApiResponse({ status: 200, description: '메모리 목록 반환' })
  async getMemory(@Query() query: MarketRequestQueryDto) {
    const memory = await this.marketService.getMemory(query);

    return memory;
  }
}
