import { LeadSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AdvancedForecastQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  businessUnitId?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;
}
