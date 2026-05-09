import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignServiceOrderDto {
  @ApiProperty()
  @IsString()
  assignedOperatorId!: string;
}
