import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ForecastAccuracyQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}
