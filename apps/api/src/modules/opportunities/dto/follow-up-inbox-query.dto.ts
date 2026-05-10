import { LeadSource, OpportunityStage } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const followUpInboxBuckets = [
  'overdue',
  'today',
  'upcoming',
  'no_next_activity',
  'no_recent_contact',
  'no_response',
  'stale',
  'new_leads',
  'mine',
  'high_priority',
] as const;

export type FollowUpInboxBucket = (typeof followUpInboxBuckets)[number];

export class FollowUpInboxQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  businessUnitId?: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsIn(followUpInboxBuckets)
  bucket?: FollowUpInboxBucket;

  @IsOptional()
  @IsBoolean()
  onlyPriority?: boolean;
}
