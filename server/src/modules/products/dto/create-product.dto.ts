import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  // major currency units (e.g., 12.34)
  @IsNotEmpty()
  @Type(() => Number)
  price!: number;

  @IsNotEmpty()
  @IsUrl()
  pictureUrl!: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantityInStock?: number;

  @IsOptional()
  @IsString()
  publicId?: string;
}
