/**
 * 基础 Service 抽象类
 * 提供通用的业务逻辑层接口
 */

import { logger } from '@/lib/logger'
import type { IRepository } from '@/lib/repositories/base.repository'

/**
 * 基础 Service 接口
 * 所有具体 Service 都应实现此接口的子集
 */
export interface IService<T, TInsert = Partial<T>, TUpdate = Partial<T>> {
  /**
   * 根据 ID 获取实体
   */
  getById(id: string): Promise<T | null>

  /**
   * 获取所有实体（支持过滤）
   */
  getAll(filters?: Record<string, unknown>): Promise<T[]>

  /**
   * 创建新实体
   */
  create(data: TInsert): Promise<T>

  /**
   * 更新实体
   */
  update(id: string, data: TUpdate): Promise<T>

  /**
   * 删除实体
   */
  delete(id: string): Promise<void>
}

/**
 * 基础 Service 抽象类
 * 封装了 Repository 调用和日志记录
 */
export abstract class BaseService<T, TInsert = Partial<T>, TUpdate = Partial<T>>
  implements IService<T, TInsert, TUpdate>
{
  protected abstract repository: IRepository<T, TInsert, TUpdate>
  protected abstract serviceName: string
  protected logger = logger

  /**
   * 根据 ID 获取实体
   */
  async getById(id: string): Promise<T | null> {
    this.logger.debug(`${this.serviceName}: Getting entity by id`, { id })

    try {
      const entity = await this.repository.findById(id)

      if (!entity) {
        this.logger.debug(`${this.serviceName}: Entity not found`, { id })
      }

      return entity
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get entity by id`, error as Error, { id })
      throw error
    }
  }

  /**
   * 获取所有实体
   */
  async getAll(filters?: Record<string, unknown>): Promise<T[]> {
    this.logger.debug(`${this.serviceName}: Getting all entities`, { filters })

    try {
      const entities = await this.repository.findAll(filters)
      this.logger.debug(`${this.serviceName}: Found ${entities.length} entities`)
      return entities
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get all entities`, error as Error, { filters })
      throw error
    }
  }

  /**
   * 创建新实体
   */
  async create(data: TInsert): Promise<T> {
    this.logger.debug(`${this.serviceName}: Creating new entity`, { data })

    try {
      // 调用子类的验证方法（如果存在）
      await this.validateCreate?.(data)

      const entity = await this.repository.create(data)

      this.logger.info(`${this.serviceName}: Entity created successfully`, {
        id: (entity as { id?: string }).id,
      })

      // 调用子类的后置处理方法（如果存在）
      await this.afterCreate?.(entity)

      return entity
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to create entity`, error as Error, { data })
      throw error
    }
  }

  /**
   * 更新实体
   */
  async update(id: string, data: TUpdate): Promise<T> {
    this.logger.debug(`${this.serviceName}: Updating entity`, { id, data })

    try {
      // 调用子类的验证方法（如果存在）
      await this.validateUpdate?.(id, data)

      const entity = await this.repository.update(id, data)

      this.logger.info(`${this.serviceName}: Entity updated successfully`, { id })

      // 调用子类的后置处理方法（如果存在）
      await this.afterUpdate?.(entity)

      return entity
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to update entity`, error as Error, { id, data })
      throw error
    }
  }

  /**
   * 删除实体
   */
  async delete(id: string): Promise<void> {
    this.logger.debug(`${this.serviceName}: Deleting entity`, { id })

    try {
      // 调用子类的验证方法（如果存在）
      await this.validateDelete?.(id)

      await this.repository.delete(id)

      this.logger.info(`${this.serviceName}: Entity deleted successfully`, { id })

      // 调用子类的后置处理方法（如果存在）
      await this.afterDelete?.(id)
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to delete entity`, error as Error, { id })
      throw error
    }
  }

  /**
   * 钩子方法：创建前验证（子类可选实现）
   */
  protected validateCreate?(data: TInsert): Promise<void>

  /**
   * 钩子方法：更新前验证（子类可选实现）
   */
  protected validateUpdate?(id: string, data: TUpdate): Promise<void>

  /**
   * 钩子方法：删除前验证（子类可选实现）
   */
  protected validateDelete?(id: string): Promise<void>

  /**
   * 钩子方法：创建后处理（子类可选实现）
   */
  protected afterCreate?(entity: T): Promise<void>

  /**
   * 钩子方法：更新后处理（子类可选实现）
   */
  protected afterUpdate?(entity: T): Promise<void>

  /**
   * 钩子方法：删除后处理（子类可选实现）
   */
  protected afterDelete?(id: string): Promise<void>
}
