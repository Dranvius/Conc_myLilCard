import { ApiProperty } from '@nestjs/swagger';
import { OpportunityStage, LostReason } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOpportunityStageDto {
  @ApiProperty({ enum: OpportunityStage })
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;

  @ApiProperty({ enum: LostReason, required: false })
  @IsOptional()
  @IsEnum(LostReason)
  lostReason?: LostReason;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lostReasonNotes?: string;
}
