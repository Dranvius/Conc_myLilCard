import { ApiProperty } from '@nestjs/swagger';
import { SaleStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSaleStatusDto {
  @ApiProperty({ enum: SaleStatus })
  @IsEnum(SaleStatus)
  status!: SaleStatus;
}
