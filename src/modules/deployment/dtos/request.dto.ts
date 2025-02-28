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
}