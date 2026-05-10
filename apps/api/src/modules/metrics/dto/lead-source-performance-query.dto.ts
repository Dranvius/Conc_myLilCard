import { LeadSource, OpportunityStage } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class LeadSourcePerformanceQueryDto {
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

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;
}
