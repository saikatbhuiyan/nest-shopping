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
import { Product } from 'src/database/entities/products/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly dataSource: DataSource,
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

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(Product, product);
      return saved;
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    actorId?: string,
  ): Promise<Product> {
    const p = await this.findOne(id);

    if (dto.price !== undefined) p.priceCents = priceToCents(dto.price);
    if (dto.name !== undefined) p.name = dto.name;
    if (dto.description !== undefined) p.description = dto.description;
    if (dto.pictureUrl !== undefined) p.pictureUrl = dto.pictureUrl;
    if (dto.quantityInStock !== undefined)
      p.quantityInStock = dto.quantityInStock;
    if (dto.publicId !== undefined) p.publicId = dto.publicId;
    p.updatedBy = actorId ?? p.updatedBy;

    return this.dataSource.transaction(async (manager) => {
      return manager.save(p);
    });
  }

  async reserveStock(productId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new BadRequestException('invalid amount');
    await this.dataSource.transaction(async (manager) => {
      const prod = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!prod) throw new NotFoundException('Product not found');
      if (prod.quantityInStock < amount)
        throw new BadRequestException('insufficient stock');
      prod.quantityInStock -= amount;
      await manager.save(prod);
    });
  }

  // search + pagination example (basic)
  async search(opts: {
    q?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');

    if (opts.q) {
      // basic ILIKE fallback; for production prefer to use tsvector and to_tsquery
      qb.andWhere('(p.name ILIKE :q OR p.description ILIKE :q)', {
        q: `%${opts.q}%`,
      });
    }
    if (opts.brand) qb.andWhere('p.brand_name = :brand', { brand: opts.brand });
    if (opts.minPrice !== undefined)
      qb.andWhere('p.price_cents >= :min', {
        min: Math.round(opts.minPrice * 100),
      });
    if (opts.maxPrice !== undefined)
      qb.andWhere('p.price_cents <= :max', {
        max: Math.round(opts.maxPrice * 100),
      });

    qb.orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const mapped = items.map((i) => ({
      ...i,
      price: centsToPrice(i.priceCents),
    }));

    return { items: mapped, total, page, limit };
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.softRemove(p);
    });
  }
}
