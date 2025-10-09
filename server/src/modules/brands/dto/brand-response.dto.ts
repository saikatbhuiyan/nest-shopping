import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BrandResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  logoUrl?: string;

  @Expose()
  websiteUrl?: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  productCount?: number;
}
