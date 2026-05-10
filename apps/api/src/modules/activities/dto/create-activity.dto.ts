import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export const activityEntryStatuses = ['PLANNED', 'COMPLETED'] as const;
export type ActivityEntryStatus = (typeof activityEntryStatuses)[number];

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

  @ApiProperty({ required: false, enum: activityEntryStatuses })
  @IsOptional()
  @IsIn(activityEntryStatuses)
  status?: ActivityEntryStatus;

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
