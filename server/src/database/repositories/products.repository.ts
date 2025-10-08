import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/products/product.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsRepository extends Repository<Product> {
  constructor(private readonly dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }

  async findByIdsOptimized(ids: string[]): Promise<Product[]> {
    return this.createQueryBuilder('p')
      .where('p.id IN (:...ids)', { ids })
      .andWhere('p.deleted_at IS NULL')
      .cache(true)
      .getMany();
  }

  async findWithPaginationOptimized(
    page: number,
    limit: number,
  ): Promise<[Product[], number]> {
    return this.createQueryBuilder('p')
      .select([
        'p.id',
        'p.name',
        'p.priceCents',
        'p.pictureUrl',
        'p.quantityInStock',
      ])
      .where('p.deleted_at IS NULL')
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(true)
      .getManyAndCount();
  }

  async bulkInsert(products: Partial<Product>[]): Promise<void> {
    if (!products.length) return;
    await this.createQueryBuilder()
      .insert()
      .into(Product)
      .values(products)
      .orIgnore()
      .execute();
  }

  async updatePricesInBatch(
    updates: Array<{ id: string; priceCents: number }>,
  ): Promise<void> {
    if (!updates.length) return;

    const ids = updates.map((u) => u.id);
    const caseSql = updates
      .map((u) => `WHEN '${u.id}' THEN ${u.priceCents}`)
      .join(' ');

    await this.createQueryBuilder()
      .update(Product)
      .set({ priceCents: () => `CASE id ${caseSql} END` })
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  async searchWithFullText(query: string, limit = 20): Promise<Product[]> {
    return this.createQueryBuilder('p')
      .where(`p.search_vector @@ plainto_tsquery('simple', :query)`, { query })
      .addSelect(
        `ts_rank(p.search_vector, plainto_tsquery('simple', :query))`,
        'rank',
      )
      .andWhere('p.deleted_at IS NULL')
      .orderBy('rank', 'DESC')
      .limit(limit)
      .getMany();
  }
}
