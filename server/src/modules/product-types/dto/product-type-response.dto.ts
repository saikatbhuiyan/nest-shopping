import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ProductTypeResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  iconUrl?: string;

  @Expose()
  displayOrder!: number;

  @Expose()
  isActive!: boolean;

  @Expose()
  productCount?: number;
}
