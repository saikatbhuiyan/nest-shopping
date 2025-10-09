import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsUrl,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBrandDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  websiteUrl?: string;
}
