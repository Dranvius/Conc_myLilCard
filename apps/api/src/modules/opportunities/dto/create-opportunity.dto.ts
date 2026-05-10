import { ApiProperty } from '@nestjs/swagger';
import { OpportunityStage, LeadSource, LostReason } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateOpportunityDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty()
  @IsString()
  businessUnitId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: OpportunityStage })
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  estimatedValue!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: LeadSource, required: false })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiProperty({ enum: LostReason, required: false })
  @IsOptional()
  @IsEnum(LostReason)
  lostReason?: LostReason;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lostReasonNotes?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  allowPotentialDuplicate?: boolean;
}
