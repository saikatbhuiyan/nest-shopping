import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { Brand } from 'src/database/entities/products/brand.entity';
import { BrandStatsRaw } from './interface/brand.interface';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
  ) {}

  async create(
    createBrandDto: CreateBrandDto,
    userId?: string,
  ): Promise<Brand> {
    // Check for duplicate name
    const existingBrand = await this.brandsRepository.findOne({
      where: { name: createBrandDto.name },
      withDeleted: true,
    });

    if (existingBrand) {
      if (existingBrand.deletedAt) {
        throw new ConflictException(
          'A brand with this name exists but is deleted. Please restore it instead.',
        );
      }
      throw new ConflictException('Brand with this name already exists');
    }

    const brand = this.brandsRepository.create({
      ...createBrandDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.brandsRepository.save(brand);
  }

  async findAll(query: QueryBrandDto) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = query;

    const qb = this.brandsRepository
      .createQueryBuilder('brand')
      .leftJoinAndSelect(
        'brand.products',
        'product',
        'product.deletedAt IS NULL',
      )
      .where('brand.deletedAt IS NULL');

    // Search filter
    if (search) {
      qb.andWhere(
        'brand.name ILIKE :search OR brand.description ILIKE :search',
        {
          search: `%${search}%`,
        },
      );
    }

    // Active filter
    if (isActive !== undefined) {
      qb.andWhere('brand.isActive = :isActive', { isActive });
    }

    // Sorting
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    qb.orderBy(`brand.${sortField}`, sortOrder);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Add product count to each brand
    const itemsWithCount = items.map((brand) => ({
      ...brand,
      productCount: brand.products?.length || 0,
      products: undefined, // Remove products array from response
    }));

    return {
      items: itemsWithCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }

  async findByName(name: string): Promise<Brand | null> {
    return this.brandsRepository.findOne({
      where: { name },
    });
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    userId?: string,
  ): Promise<Brand> {
    const brand = await this.findOne(id);

    // Check for duplicate name if name is being updated
    if (updateBrandDto.name && updateBrandDto.name !== brand.name) {
      const existingBrand = await this.findByName(updateBrandDto.name);
      if (existingBrand) {
        throw new ConflictException('Brand with this name already exists');
      }
    }

    Object.assign(brand, {
      ...updateBrandDto,
      updatedBy: userId,
    });

    return this.brandsRepository.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);

    // Check if brand has products
    const productCount = brand.products?.length || 0;
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete brand with ${productCount} associated products. Please remove or reassign products first.`,
      );
    }

    const result = await this.brandsRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
  }

  async restore(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (!brand.deletedAt) {
      throw new BadRequestException('Brand is not deleted');
    }

    await this.brandsRepository.restore(id);
    return this.findOne(id);
  }

  async getStatistics(id: string) {
    const brand = await this.findOne(id);

    const stats: BrandStatsRaw = await this.brandsRepository
      .createQueryBuilder('brand')
      .leftJoin('brand.products', 'product')
      .where('brand.id = :id', { id })
      .andWhere('product.deletedAt IS NULL')
      .select([
        'COUNT(product.id) as productCount',
        'SUM(product.quantityInStock) as totalStock',
        'AVG(CAST(product.priceCents AS DECIMAL) / 100) as averagePrice',
      ])
      .getRawOne();

    return {
      id: brand.id,
      name: brand.name,
      productCount: parseInt(stats.productCount) || 0,
      totalStock: parseInt(stats.totalStock) || 0,
      averagePrice: parseFloat(stats.averagePrice) || 0,
    };
  }
}
