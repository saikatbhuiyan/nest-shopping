import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Delete,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { MetricsInterceptor } from '../../common/interceptors/metrics.interceptor';
import { ApiMetrics } from '../../common/decorators/api-metrics.decorator';

@Controller('products')
@UseInterceptors(LoggingInterceptor, MetricsInterceptor)
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiMetrics('products.create')
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  @Get(':id')
  @ApiMetrics('products.findOne')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiMetrics('products.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiMetrics('products.softDelete')
  async softDelete(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.svc.softDelete(id);
  }

  @Post(':id/reserve')
  @ApiMetrics('products.reserve')
  async reserveStock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('amount') amount: number,
  ) {
    await this.svc.reserveStock(id, amount);
    return { success: true };
  }

  @Get()
  @ApiMetrics('products.search')
  list(
    @Query('q') q?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.search({
      q,
      brand,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }
}
