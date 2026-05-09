import { ApiProperty } from '@nestjs/swagger';
import { CompanyStatus, CustomerType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ enum: CustomerType, required: false })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty()
  @IsString()
  businessUnitId!: string;

  @ApiProperty({ enum: CompanyStatus })
  @IsEnum(CompanyStatus)
  status!: CompanyStatus;
}
