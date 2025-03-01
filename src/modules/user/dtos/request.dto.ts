import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetUserRequestDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  @IsString()
  walletAddress: string;
}

export class CreateUserRequestDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  @IsString()
  walletAddress: string;
}
