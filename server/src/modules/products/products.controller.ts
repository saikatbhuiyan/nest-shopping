import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

@ApiTags('Products')
@Controller('products')
@UsePipes(new ValidationPipe({ transform: true }))
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Create a product
  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto);
    return { success: true, data: product };
  }

  // Get all products (with search, filters, pagination)
  @Get()
  @ApiOperation({
    summary: 'List products with optional search, filters, and pagination',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({
    name: 'brand',
    required: false,
    description: 'Filter by brand name',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'List of products with pagination' })
  async findAll(
    @Query('q') q?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.productsService.search({
      q,
      brand,
      minPrice,
      maxPrice,
      page,
      limit,
    });
    return { success: true, ...result };
  }

  // Get a single product by ID
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single product by its ID' })
  @ApiParam({ name: 'id', description: 'UUID of the product' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const product = await this.productsService.findOne(id);
    return { success: true, data: product };
  }

  // Update a product by ID
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing product by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the product to update' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const updated = await this.productsService.update(id, dto);
    return { success: true, data: updated };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product by ID (soft delete ready)' })
  @ApiParam({ name: 'id', description: 'UUID of the product to delete' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.productsService.remove(id);
    return { success: true };
  }
}
