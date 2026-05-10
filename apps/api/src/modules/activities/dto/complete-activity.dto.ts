import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class CompleteActivityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
