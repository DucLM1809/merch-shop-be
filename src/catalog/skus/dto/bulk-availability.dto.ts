import { IsBoolean, IsIn, IsString } from 'class-validator';

export class BulkAvailabilityDto {
  @IsIn(['game', 'team', 'character'])
  facet!: 'game' | 'team' | 'character';

  @IsString()
  facetId!: string;

  @IsBoolean()
  available!: boolean;
}
