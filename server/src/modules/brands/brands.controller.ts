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
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { ApiMetrics } from '../../common/decorators/api-metrics.decorator';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';

@Controller('brands')
@UseGuards(ThrottlerGuard)
@UseInterceptors(ClassSerializerInterceptor, LoggingInterceptor)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiMetrics('brands.create')
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandsService.create(createBrandDto);
  }

  @Get()
  @ApiMetrics('brands.findAll')
  findAll(@Query() query: QueryBrandDto) {
    return this.brandsService.findAll(query);
  }

  @Get(':id')
  @ApiMetrics('brands.findOne')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiMetrics('brands.statistics')
  getStatistics(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.getStatistics(id);
  }

  @Patch(':id')
  @ApiMetrics('brands.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiMetrics('brands.remove')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.remove(id);
  }

  @Post(':id/restore')
  @ApiMetrics('brands.restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.restore(id);
  }
}
