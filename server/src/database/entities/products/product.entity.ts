import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  VersionColumn,
  Check,
} from 'typeorm';
import { Brand } from './brand.entity';
import { ProductType } from './product-type.entity';

@Entity({ name: 'products' })
@Index('idx_products_price_cents', ['priceCents'])
@Index('idx_products_quantity_in_stock', ['quantityInStock'])
@Check(`"priceCents" >= 0`)
@Check(`"quantityInStock" >= 0`)
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // searchable primary metadata
  @Column({ type: 'varchar', length: 255 })
  @Index({ fulltext: true }) // TypeORM won't create tsvector for you; we'll create a GIN index in migration
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  // price stored as cents to avoid floating point issues (bigint for large catalogs)
  @Column({ name: 'price_cents', type: 'bigint', default: 0 })
  priceCents!: string; // TypeORM maps bigint to string in JS; convert in service

  // canonical image URL
  @Column({ name: 'picture_url', type: 'text' })
  pictureUrl!: string;

  // denormalized brand/type names for fast reads and for historical immutability
  @Column({ name: 'brand_name', type: 'varchar', length: 128, nullable: true })
  brandName?: string | null;

  @Column({ name: 'type_name', type: 'varchar', length: 128, nullable: true })
  typeName?: string | null;

  // optional FK relations to normalized tables
  @ManyToOne(() => Brand, (b) => b.products, { nullable: true })
  brand?: Brand | null;

  @ManyToOne(() => ProductType, (t) => t.products, { nullable: true })
  type?: ProductType | null;

  @Column({ name: 'quantity_in_stock', type: 'int', default: 0 })
  quantityInStock!: number;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId?: string | null;

  // full-text search vector stored for fast search
  @Column({
    name: 'search_vector',
    type: 'tsvector',
    select: false,
    nullable: true,
  })
  searchVector?: string | null;

  // optimistic locking
  @VersionColumn()
  version!: number;

  // auditing
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;
}
