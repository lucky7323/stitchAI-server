import { ApiProperty } from '@nestjs/swagger';

export class GetUserRequestDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  walletAddress: string;
}

export class CreateUserRequestDto {
  @ApiProperty({ description: 'The wallet address of the user' })
  walletAddress: string;
}
