import { ApiProperty } from '@nestjs/swagger';
import { OpportunityStage } from '@prisma/client';
import {
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
  @IsString()
  ownerId!: string;

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
}
