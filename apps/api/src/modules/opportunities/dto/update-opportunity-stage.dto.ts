import { ApiProperty } from '@nestjs/swagger';
import { OpportunityStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOpportunityStageDto {
  @ApiProperty({ enum: OpportunityStage })
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;
}
