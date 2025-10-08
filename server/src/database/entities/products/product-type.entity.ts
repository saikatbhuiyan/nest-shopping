import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'product_types' })
@Index(['name'], { unique: true })
export class ProductType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @OneToMany(() => Product, (p) => p.type)
  products?: Product[];
}
