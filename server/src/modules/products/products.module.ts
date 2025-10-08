import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from 'src/database/entities/products/product.entity';
import { Brand } from 'src/database/entities/products/brand.entity';
import { ProductType } from 'src/database/entities/products/product-type.entity';
import { ProductsCacheService } from './products.cache.service';
import { ProductsRepository } from 'src/database/repositories/products.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductType, Brand])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsCacheService, ProductsRepository],
})
export class ProductsModule {}
