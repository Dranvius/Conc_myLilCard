import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  saleId!: string;

  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty()
  @IsString()
  invoiceNumber!: string;

  @ApiProperty({ enum: InvoiceStatus })
  @IsEnum(InvoiceStatus)
  status!: InvoiceStatus;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  tax!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total!: number;

  @ApiProperty()
  @IsDateString()
  issuedAt!: string;

  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
