import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateElizaRequestDto {
  @ApiProperty({
    description: 'Telegram Bot Token to be used for Eliza deployment',
    example: '1234567890:ABCDefGhIJklMNoPQRstUVwxYZ',
  })
  @IsNotEmpty()
  @IsString()
  telegram: string;

  @ApiProperty({
    description: 'Agent name',
    example: 'Dobby',
  })
  @IsNotEmpty()
  @IsString()
  agentName: string;

  @ApiProperty({
    description: 'Agent description',
    example: 'Dobby is a free assistant who chooses to help because of his enormous heart.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Agent social link',
    example: 'https://t.me/dobby_bot',
  })
  @IsNotEmpty()
  @IsString()
  socialLink: string;

  @ApiProperty({
    description: 'Wallet address',
    example: '0x1234567890ABCDEF1234567890ABCDEF12345678',
  })
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty({
    description: 'Memory ID',
    example: '1234567890ABCDEF1234567890ABCDEF12345678',
  })
  @IsNotEmpty()
  @IsString()
  memoryId: string;
}
