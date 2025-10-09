import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandsService } from './brands.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Brand } from 'src/database/entities/products/brand.entity';

describe('BrandsService', () => {
  let service: BrandsService;
  let repository: Repository<Brand>;

  const mockBrand: Brand = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Brand',
    description: 'Test Description',
    logoUrl: 'https://example.com/logo.png',
    websiteUrl: 'https://example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getRawOne: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: getRepositoryToken(Brand),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
    repository = module.get<Repository<Brand>>(getRepositoryToken(Brand));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a brand successfully', async () => {
      const createDto = {
        name: 'Test Brand',
        description: 'Test Description',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockBrand as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockBrand);

      const result = await service.create(createDto);

      expect(result).toEqual(mockBrand);
    });

    it('should throw ConflictException if brand name exists', async () => {
      const createDto = {
        name: 'Test Brand',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockBrand);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a brand', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockBrand);

      const result = await service.findOne(mockBrand.id);

      expect(result).toEqual(mockBrand);
    });

    it('should throw NotFoundException if brand not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a brand', async () => {
      const updateDto = { name: 'Updated Brand' };
      const updatedBrand = { ...mockBrand, ...updateDto };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockBrand);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedBrand);

      const result = await service.update(mockBrand.id, updateDto);

      expect(result.name).toBe('Updated Brand');
    });
  });

  describe('remove', () => {
    it('should soft delete a brand', async () => {
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue({ ...mockBrand, products: [] });
      jest
        .spyOn(repository, 'softDelete')
        .mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.remove(mockBrand.id);
    });
  });
});
