import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Put,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { QueryProductTypeDto } from './dto/query-product-type.dto';
import { ApiMetrics } from '../../common/decorators/api-metrics.decorator';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';

@Controller('product-types')
@UseGuards(ThrottlerGuard)
@UseInterceptors(ClassSerializerInterceptor, LoggingInterceptor)
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiMetrics('productTypes.create')
  create(@Body() createProductTypeDto: CreateProductTypeDto) {
    return this.productTypesService.create(createProductTypeDto);
  }

  @Get()
  @ApiMetrics('productTypes.findAll')
  findAll(@Query() query: QueryProductTypeDto) {
    return this.productTypesService.findAll(query);
  }

  @Get('popular')
  @ApiMetrics('productTypes.popular')
  getPopular(@Query('limit') limit?: number) {
    return this.productTypesService.getPopularTypes(limit);
  }

  @Get(':id')
  @ApiMetrics('productTypes.findOne')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productTypesService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiMetrics('productTypes.statistics')
  getStatistics(@Param('id', ParseUUIDPipe) id: string) {
    return this.productTypesService.getStatistics(id);
  }

  @Patch(':id')
  @ApiMetrics('productTypes.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductTypeDto: UpdateProductTypeDto,
  ) {
    return this.productTypesService.update(id, updateProductTypeDto);
  }

  @Put('reorder')
  @ApiMetrics('productTypes.reorder')
  reorder(@Body('orderedIds') orderedIds: string[]) {
    return this.productTypesService.reorderTypes(orderedIds);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiMetrics('productTypes.remove')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productTypesService.remove(id);
  }

  @Post(':id/restore')
  @ApiMetrics('productTypes.restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.productTypesService.restore(id);
  }
}
