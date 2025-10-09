import { Entity, Column, OneToMany, Index } from 'typeorm';
import { Product } from './product.entity';
import { AbstractEntity } from 'src/database/abstract.entity';

/**
 * Brand entity representing product brands.
 */
@Entity({ name: 'brands' })
@Index(['name'], { unique: true })
@Index(['createdAt'])
export class Brand extends AbstractEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ name: 'website_url', type: 'varchar', length: 500, nullable: true })
  websiteUrl?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Product, (p) => p.brand)
  products?: Product[];
}
