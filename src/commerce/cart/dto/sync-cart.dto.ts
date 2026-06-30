import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddToCartDto } from './add-to-cart.dto';

export class SyncCartDto {
  @ApiProperty({ type: [AddToCartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddToCartDto)
  items!: AddToCartDto[];
}
