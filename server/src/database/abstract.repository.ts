import { Logger, NotFoundException } from '@nestjs/common';
import { AbstractEntity } from './abstract.entity';
import {
  EntityManager,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class AbstractRepository<T extends AbstractEntity> {
  protected abstract readonly logger: Logger;

  constructor(
    private readonly itemsRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(entity: T): Promise<T> {
    return this.entityManager.save(entity);
  }

  async findOne(
    where: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
  ): Promise<T> {
    const entity = await this.itemsRepository.findOne({
      where,
      relations,
      withDeleted: false, // exclude soft-deleted by default
    });

    if (!entity) {
      this.logger.warn(`Entity not found with where: ${JSON.stringify(where)}`);
      throw new NotFoundException('Entity not found.');
    }

    return entity;
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<T> {
    const updateResult = await this.itemsRepository.update(
      where,
      partialEntity,
    );

    if (!updateResult.affected) {
      this.logger.warn(`Entity not found with where: ${JSON.stringify(where)}`);
      throw new NotFoundException('Entity not found.');
    }

    return this.findOne(where);
  }

  async find(where: FindOptionsWhere<T>) {
    return this.itemsRepository.findBy(where);
  }

  /**
   * Soft delete instead of hard delete
   */
  async findOneAndDelete(where: FindOptionsWhere<T>): Promise<void> {
    const result = await this.itemsRepository.softDelete(where);

    if (!result.affected) {
      this.logger.warn(`Entity not found with where: ${JSON.stringify(where)}`);
      throw new NotFoundException('Entity not found.');
    }
  }

  /**
   * Restore a soft-deleted entity
   */
  async restore(where: FindOptionsWhere<T>): Promise<void> {
    const result = await this.itemsRepository.restore(where);

    if (!result.affected) {
      this.logger.warn(`Entity not found with where: ${JSON.stringify(where)}`);
      throw new NotFoundException('Entity not found.');
    }
  }
}
