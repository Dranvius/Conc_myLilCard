import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type!: ActivityType;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactId?: string;
}
