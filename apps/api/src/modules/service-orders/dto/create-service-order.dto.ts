import { ApiProperty } from '@nestjs/swagger';
import { ServiceOrderPriority, ServiceOrderStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateServiceOrderDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedOperatorId?: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  type!: string;

  @ApiProperty({ enum: ServiceOrderPriority })
  @IsEnum(ServiceOrderPriority)
  priority!: ServiceOrderPriority;

  @ApiProperty({ enum: ServiceOrderStatus, required: false })
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
