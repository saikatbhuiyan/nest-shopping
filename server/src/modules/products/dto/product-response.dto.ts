export class ProductResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  pictureUrl!: string;
  brandName?: string | null;
  typeName?: string | null;
  quantityInStock!: number;
  publicId?: string | null;
}
