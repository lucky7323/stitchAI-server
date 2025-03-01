import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { GetUserRequestDto } from '../dtos/request.dto';

@ApiTags('user')
@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @ApiOperation({ summary: '유저 정보 조회' })
  @ApiResponse({ status: 200, description: '유저 정보 반환' })
  async getUser(@Query() query: GetUserRequestDto) {
    const user = await this.userService.getUser(query);

    return user;
  }
}
