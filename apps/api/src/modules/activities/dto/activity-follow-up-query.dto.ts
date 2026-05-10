import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const followUpBuckets = [
  'open',
  'overdue',
  'today',
  'upcoming',
] as const;
export type FollowUpBucket = (typeof followUpBuckets)[number];

export class ActivityFollowUpQueryDto {
  @IsOptional()
  @IsIn(followUpBuckets)
  status?: FollowUpBucket;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;
}
