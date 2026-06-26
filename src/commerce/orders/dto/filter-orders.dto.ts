import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FilterOrdersDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
