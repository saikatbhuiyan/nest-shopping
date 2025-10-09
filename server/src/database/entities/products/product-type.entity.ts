import { AbstractEntity } from 'src/database/abstract.entity';
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'product_types' })
@Index(['name'], { unique: true })
@Index(['createdAt'])
export class ProductType extends AbstractEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 500, nullable: true })
  iconUrl?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Product, (p) => p.type)
  products?: Product[];
}
