import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductType } from 'src/database/entities/products/product-type.entity';
import { QueryProductTypeDto } from './dto/query-product-type.dto';

@Injectable()
export class ProductTypesService {
  constructor(
    @InjectRepository(ProductType)
    private readonly productTypesRepository: Repository<ProductType>,
  ) {}

  async create(
    createProductTypeDto: CreateProductTypeDto,
    userId?: string,
  ): Promise<ProductType> {
    // Check for duplicate name
    const existingType = await this.productTypesRepository.findOne({
      where: { name: createProductTypeDto.name },
      withDeleted: true,
    });

    if (existingType) {
      if (existingType.deletedAt) {
        throw new ConflictException(
          'A product type with this name exists but is deleted. Please restore it instead.',
        );
      }
      throw new ConflictException('Product type with this name already exists');
    }

    const productType = this.productTypesRepository.create({
      ...createProductTypeDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.productTypesRepository.save(productType);
  }

  async findAll(query: QueryProductTypeDto) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'displayOrder',
      sortOrder = 'ASC',
    } = query;

    const qb = this.productTypesRepository
      .createQueryBuilder('productType')
      .leftJoinAndSelect(
        'productType.products',
        'product',
        'product.deletedAt IS NULL',
      )
      .where('productType.deletedAt IS NULL');

    // Search filter
    if (search) {
      qb.andWhere(
        'productType.name ILIKE :search OR productType.description ILIKE :search',
        { search: `%${search}%` },
      );
    }

    // Active filter
    if (isActive !== undefined) {
      qb.andWhere('productType.isActive = :isActive', { isActive });
    }

    // Sorting
    const allowedSortFields = [
      'name',
      'displayOrder',
      'createdAt',
      'updatedAt',
    ];
    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'displayOrder';
    qb.orderBy(`productType.${sortField}`, sortOrder);

    // Secondary sort by name for consistent ordering
    if (sortField !== 'name') {
      qb.addOrderBy('productType.name', 'ASC');
    }

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Add product count to each type
    const itemsWithCount = items.map((type) => ({
      ...type,
      productCount: type.products?.length || 0,
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

  async findOne(id: string): Promise<ProductType> {
    const productType = await this.productTypesRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!productType) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    return productType;
  }

  async findByName(name: string): Promise<ProductType | null> {
    return this.productTypesRepository.findOne({
      where: { name },
    });
  }

  async update(
    id: string,
    updateProductTypeDto: UpdateProductTypeDto,
    userId?: string,
  ): Promise<ProductType> {
    const productType = await this.findOne(id);

    // Check for duplicate name if name is being updated
    if (
      updateProductTypeDto.name &&
      updateProductTypeDto.name !== productType.name
    ) {
      const existingType = await this.findByName(updateProductTypeDto.name);
      if (existingType) {
        throw new ConflictException(
          'Product type with this name already exists',
        );
      }
    }

    Object.assign(productType, {
      ...updateProductTypeDto,
      updatedBy: userId,
    });

    return this.productTypesRepository.save(productType);
  }

  async remove(id: string): Promise<void> {
    const productType = await this.findOne(id);

    // Check if product type has products
    const productCount = productType.products?.length || 0;
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete product type with ${productCount} associated products. Please remove or reassign products first.`,
      );
    }

    const result = await this.productTypesRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }
  }

  async restore(id: string): Promise<ProductType> {
    const productType = await this.productTypesRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!productType) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    if (!productType.deletedAt) {
      throw new BadRequestException('Product type is not deleted');
    }

    await this.productTypesRepository.restore(id);
    return this.findOne(id);
  }

  async reorderTypes(orderedIds: string[]): Promise<void> {
    const types = await this.productTypesRepository.findBy({
      id: In(orderedIds),
    });

    if (types.length !== orderedIds.length) {
      throw new BadRequestException('Some product type IDs are invalid');
    }

    // Update display order based on position in array
    const updates = orderedIds.map((id, index) => {
      const type = types.find((t) => t.id === id);
      if (type) {
        type.displayOrder = index;
      }
      return type;
    });

    await this.productTypesRepository.save(updates.filter(Boolean));
  }

  async getStatistics(id: string) {
    const productType = await this.findOne(id);

    const stats: {
      productCount: string;
      totalStock: string;
      averagePrice: string;
      minPrice: string;
      maxPrice: string;
    } = await this.productTypesRepository
      .createQueryBuilder('productType')
      .leftJoin('productType.products', 'product')
      .where('productType.id = :id', { id })
      .andWhere('product.deletedAt IS NULL')
      .select([
        'COUNT(product.id) as productCount',
        'SUM(product.quantityInStock) as totalStock',
        'AVG(CAST(product.priceCents AS DECIMAL) / 100) as averagePrice',
        'MIN(CAST(product.priceCents AS DECIMAL) / 100) as minPrice',
        'MAX(CAST(product.priceCents AS DECIMAL) / 100) as maxPrice',
      ])
      .getRawOne();

    return {
      id: productType.id,
      name: productType.name,
      productCount: parseInt(stats.productCount) || 0,
      totalStock: parseInt(stats.totalStock) || 0,
      averagePrice: parseFloat(stats.averagePrice) || 0,
      minPrice: parseFloat(stats.minPrice) || 0,
      maxPrice: parseFloat(stats.maxPrice) || 0,
    };
  }

  async getPopularTypes(limit: number = 10) {
    const types: {
      productType_id: string;
      productType_name: string;
      productType_iconUrl: string;
      productCount: string;
    }[] = await this.productTypesRepository
      .createQueryBuilder('productType')
      .leftJoin('productType.products', 'product', 'product.deletedAt IS NULL')
      .where('productType.deletedAt IS NULL')
      .andWhere('productType.isActive = :isActive', { isActive: true })
      .groupBy('productType.id')
      .select([
        'productType.id',
        'productType.name',
        'productType.iconUrl',
        'COUNT(product.id) as productCount',
      ])
      .orderBy('productCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return types.map((type) => ({
      id: type.productType_id,
      name: type.productType_name,
      iconUrl: type.productType_iconUrl,
      productCount: parseInt(type.productCount) || 0,
    }));
  }
}
