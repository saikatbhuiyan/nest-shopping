import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { priceToCents, centsToPrice } from '../../common/utils/price.util';
import { ProductsCacheService } from './products.cache.service';
import { Product } from 'src/database/entities/products/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly cacheService: ProductsCacheService,
  ) {}

  async create(dto: CreateProductDto, actorId?: string): Promise<Product> {
    const product = this.repo.create({
      name: dto.name,
      description: dto.description,
      priceCents: priceToCents(dto.price),
      pictureUrl: dto.pictureUrl,
      quantityInStock: dto.quantityInStock ?? 0,
      publicId: dto.publicId ?? null,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
      brand: dto.brandId ? ({ id: dto.brandId } as { id: string }) : null,
      type: dto.typeId ? ({ id: dto.typeId } as { id: string }) : null,
    });

    const saved = await this.dataSource.transaction(async (manager) => {
      return manager.save(Product, product);
    });

    // Invalidate list caches
    await this.cacheService.invalidateAllLists();

    return saved;
  }

  async findOne(id: string, useCache = true): Promise<Product> {
    if (useCache) {
      const cached = await this.cacheService.getProduct(id);
      if (cached) return cached;
    }

    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');

    if (useCache) {
      await this.cacheService.setProduct(id, p);
    }

    return p;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    actorId?: string,
  ): Promise<Product> {
    const p = await this.findOne(id, false);

    if (dto.price !== undefined) p.priceCents = priceToCents(dto.price);
    if (dto.name !== undefined) p.name = dto.name;
    if (dto.description !== undefined) p.description = dto.description;
    if (dto.pictureUrl !== undefined) p.pictureUrl = dto.pictureUrl;
    if (dto.quantityInStock !== undefined)
      p.quantityInStock = dto.quantityInStock;
    if (dto.publicId !== undefined) p.publicId = dto.publicId;
    p.updatedBy = actorId ?? p.updatedBy;

    const updated = await this.dataSource.transaction(async (manager) => {
      return manager.save(p);
    });

    // Invalidate caches
    await Promise.all([
      this.cacheService.invalidateProduct(id),
      this.cacheService.invalidateAllLists(),
    ]);

    return updated;
  }

  async reserveStock(productId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new BadRequestException('invalid amount');

    await this.dataSource.transaction(async (manager) => {
      const prod = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!prod) throw new NotFoundException('Product not found');
      if (prod.quantityInStock < amount) {
        throw new BadRequestException('insufficient stock');
      }

      prod.quantityInStock -= amount;
      await manager.save(prod);
    });

    // Invalidate product cache after stock change
    await this.cacheService.invalidateProduct(productId);
  }

  async search(opts: {
    q?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    useCache?: boolean;
  }) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const cacheKey = { ...opts, page, limit };

    // Check cache first
    if (opts.useCache !== false) {
      const cached: {
        items: Product[];
        total: number;
        page: number;
        limit: number;
      } | null = await this.cacheService.getList(cacheKey);
      if (cached) return cached;
    }

    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');

    if (opts.q) {
      // For production: use tsvector search
      qb.andWhere(`p.search_vector @@ plainto_tsquery('simple', :q)`, {
        q: opts.q,
      })
        .addSelect(
          `ts_rank(p.search_vector, plainto_tsquery('simple', :q))`,
          'rank',
        )
        .orderBy('rank', 'DESC');
    }

    if (opts.brand) qb.andWhere('p.brand_name = :brand', { brand: opts.brand });
    if (opts.minPrice !== undefined) {
      qb.andWhere('p.price_cents >= :min', {
        min: Math.round(opts.minPrice * 100),
      });
    }
    if (opts.maxPrice !== undefined) {
      qb.andWhere('p.price_cents <= :max', {
        max: Math.round(opts.maxPrice * 100),
      });
    }

    if (!opts.q) {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const mapped = items.map((i) => ({
      ...i,
      price: centsToPrice(i.priceCents),
    }));

    const result = { items: mapped, total, page, limit };

    // Cache the result
    await this.cacheService.setList(cacheKey, result);

    return result;
  }

  async bulkUpdatePrices(
    updates: Array<{ id: string; price: number }>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const update of updates) {
        await manager.update(Product, update.id, {
          priceCents: priceToCents(update.price),
        });
      }
    });

    // Invalidate all affected caches
    await Promise.all([
      ...updates.map((u) => this.cacheService.invalidateProduct(u.id)),
      this.cacheService.invalidateAllLists(),
    ]);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.softRemove(p);
    });
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Product not found');
    }

    await Promise.all([
      this.cacheService.invalidateProduct(id),
      this.cacheService.invalidateAllLists(),
    ]);
  }
}
