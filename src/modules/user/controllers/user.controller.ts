import { Body, Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateAgentRequestDto, CreateMemoryRequestDto, GetUserRequestDto } from '../dtos/request.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserMemoryService } from '../services/user-memory.service';
import { UserAgentService } from '../services/user-agent.service';

@ApiTags('user')
@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userMemoryService: UserMemoryService,
    private readonly userAgentService: UserAgentService,
  ) {}

  @Get('')
  @ApiOperation({ summary: '유저 정보 조회' })
  @ApiResponse({ status: 200, description: '유저 정보 반환' })
  async getUser(@Query() query: GetUserRequestDto) {
    const user = await this.userService.getUser(query);

    return user;
  }

  @Post('import-memory')
  @ApiOperation({ summary: '메모리 생성' })
  @ApiResponse({ status: 200, description: '메모리 생성 완료' })
  @UseInterceptors(FileInterceptor('file'))
  async createMemory(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateMemoryRequestDto
  ) {
    await this.userMemoryService.createMemory(file, body);
  }

  @Post('create-agent')
  @ApiOperation({ summary: '에이전트 생성' })
  @ApiResponse({ status: 200, description: '에이전트 생성 완료' })
  async createAgent(@Body() body: CreateAgentRequestDto) {
    await this.userAgentService.createAgent(body);
  }
}
