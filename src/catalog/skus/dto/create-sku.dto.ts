import { IsString, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkuDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  price!: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @ApiProperty({ example: { size: 'L', color: 'Black' } })
  @IsObject()
  attributes!: Record<string, unknown>;
}
