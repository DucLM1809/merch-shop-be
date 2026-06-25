import { IsString, IsEmail, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  line1!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsEmail()
  buyerEmail!: string;

  @ApiProperty()
  @IsString()
  stripePaymentIntentId!: string;

  @ApiProperty()
  @IsObject()
  shippingAddress!: ShippingAddressDto;
}
