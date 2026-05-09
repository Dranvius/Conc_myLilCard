import { ServiceOrderPriority, ServiceOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ServiceOrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @IsOptional()
  @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  @IsOptional()
  @IsString()
  assignedOperatorId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
