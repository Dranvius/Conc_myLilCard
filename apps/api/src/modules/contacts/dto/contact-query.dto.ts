import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;
}
