import { ApiProperty } from '@nestjs/swagger';
import { SaleStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSaleDto {
  @ApiProperty()
  @IsString()
  opportunityId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({
    required: false,
    enum: SaleStatus,
    default: SaleStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  closedAt?: string;
}
