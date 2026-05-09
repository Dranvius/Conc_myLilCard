import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@respiracrm.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin12345!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'dev-token' })
  @IsString()
  @IsNotEmpty()
  captchaToken!: string;
}
