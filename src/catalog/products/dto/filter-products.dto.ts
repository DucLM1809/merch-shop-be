import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterProductsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gameId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  characterId?: string;

  // Admin-only: includes skus with available: false in the response. Ignored
  // (treated as false) for unauthenticated or non-admin callers — see
  // ProductsController#findAll.
  @ApiPropertyOptional({
    description: 'Include unavailable SKUs in the response. Requires an admin session.',
  })
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  includeUnavailable?: boolean;
}
