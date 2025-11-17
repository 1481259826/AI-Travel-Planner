/**
 * Expense Service
 * 封装费用相关的业务逻辑
 */

import { BaseService } from './base.service'
import { ExpenseRepository } from '@/lib/repositories/expense.repository'
import { ValidationError, NotFoundError } from '@/lib/errors'
import type { Expense, ExpenseInsert, ExpenseUpdate } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export class ExpenseService extends BaseService<Expense, ExpenseInsert, ExpenseUpdate> {
  protected serviceName = 'ExpenseService'
  protected repository: ExpenseRepository

  constructor(supabaseClient: SupabaseClient) {
    super()
    this.repository = new ExpenseRepository(supabaseClient)
  }

  /**
   * 获取行程的所有费用
   */
  async getTripExpenses(tripId: string): Promise<Expense[]> {
    this.logger.debug(`${this.serviceName}: Getting expenses for trip`, { tripId })

    try {
      const expenses = await this.repository.findByTripId(tripId)
      this.logger.debug(`${this.serviceName}: Found ${expenses.length} expenses`)
      return expenses
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get trip expenses`, error as Error, {
        tripId,
      })
      throw error
    }
  }

  /**
   * 搜索费用
   */
  async searchExpenses(tripId: string, query: string): Promise<Expense[]> {
    this.logger.debug(`${this.serviceName}: Searching expenses`, { tripId, query })

    try {
      if (!query || query.trim().length === 0) {
        return this.getTripExpenses(tripId)
      }

      const expenses = await this.repository.search(tripId, query.trim())
      this.logger.debug(`${this.serviceName}: Found ${expenses.length} expenses matching query`)
      return expenses
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to search expenses`, error as Error, {
        tripId,
        query,
      })
      throw error
    }
  }

  /**
   * 获取费用统计
   */
  async getExpenseStatistics(tripId: string): Promise<{
    total: number
    byCategory: Record<Expense['category'], number>
    count: number
    average: number
  }> {
    this.logger.debug(`${this.serviceName}: Getting expense statistics`, { tripId })

    try {
      const [total, byCategory, expenses] = await Promise.all([
        this.repository.getTotalAmount(tripId),
        this.repository.getAmountByCategory(tripId),
        this.repository.findByTripId(tripId),
      ])

      const count = expenses.length
      const average = count > 0 ? total / count : 0

      return {
        total,
        byCategory,
        count,
        average,
      }
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get expense statistics`, error as Error, {
        tripId,
      })
      throw error
    }
  }

  /**
   * 按分类获取费用
   */
  async getExpensesByCategory(
    tripId: string,
    category: Expense['category']
  ): Promise<Expense[]> {
    this.logger.debug(`${this.serviceName}: Getting expenses by category`, { tripId, category })

    try {
      const expenses = await this.repository.findByCategory(tripId, category)
      this.logger.debug(`${this.serviceName}: Found ${expenses.length} expenses in category`)
      return expenses
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get expenses by category`, error as Error, {
        tripId,
        category,
      })
      throw error
    }
  }

  /**
   * 按日期范围获取费用
   */
  async getExpensesByDateRange(
    tripId: string,
    startDate: string,
    endDate: string
  ): Promise<Expense[]> {
    this.logger.debug(`${this.serviceName}: Getting expenses by date range`, {
      tripId,
      startDate,
      endDate,
    })

    try {
      const expenses = await this.repository.findByDateRange(tripId, startDate, endDate)
      this.logger.debug(`${this.serviceName}: Found ${expenses.length} expenses in date range`)
      return expenses
    } catch (error) {
      this.logger.error(
        `${this.serviceName}: Failed to get expenses by date range`,
        error as Error,
        { tripId, startDate, endDate }
      )
      throw error
    }
  }

  /**
   * 获取最近的费用记录
   */
  async getRecentExpenses(tripId: string, limit: number = 10): Promise<Expense[]> {
    this.logger.debug(`${this.serviceName}: Getting recent expenses`, { tripId, limit })

    try {
      const expenses = await this.repository.findRecent(tripId, limit)
      this.logger.debug(`${this.serviceName}: Found ${expenses.length} recent expenses`)
      return expenses
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get recent expenses`, error as Error, {
        tripId,
        limit,
      })
      throw error
    }
  }

  /**
   * 批量创建费用
   */
  async createBulkExpenses(expenses: ExpenseInsert[]): Promise<Expense[]> {
    this.logger.debug(`${this.serviceName}: Creating bulk expenses`, {
      count: expenses.length,
    })

    try {
      // 验证所有费用
      for (const expense of expenses) {
        await this.validateCreate(expense)
      }

      const created = await this.repository.createMany(expenses)

      this.logger.info(`${this.serviceName}: Bulk expenses created successfully`, {
        count: created.length,
      })

      return created
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to create bulk expenses`, error as Error, {
        count: expenses.length,
      })
      throw error
    }
  }

  /**
   * 创建前验证
   */
  protected async validateCreate(data: ExpenseInsert): Promise<void> {
    // 验证必填字段
    if (!data.trip_id) {
      throw new ValidationError('行程 ID 不能为空')
    }

    if (!data.category) {
      throw new ValidationError('费用分类不能为空')
    }

    if (data.amount === undefined || data.amount === null) {
      throw new ValidationError('金额不能为空')
    }

    if (!data.date) {
      throw new ValidationError('日期不能为空')
    }

    // 验证金额（允许负数，表示退款）
    if (typeof data.amount !== 'number') {
      throw new ValidationError('金额必须是数字')
    }

    // 验证日期格式
    const date = new Date(data.date)
    if (isNaN(date.getTime())) {
      throw new ValidationError('日期格式无效')
    }

    // 验证分类
    const validCategories: Expense['category'][] = [
      'accommodation',
      'transportation',
      'food',
      'attractions',
      'shopping',
      'other',
    ]

    if (!validCategories.includes(data.category)) {
      throw new ValidationError('费用分类无效')
    }

    // 验证描述长度
    if (data.description && data.description.length > 500) {
      throw new ValidationError('描述不能超过 500 个字符')
    }
  }

  /**
   * 更新前验证
   */
  protected async validateUpdate(id: string, data: ExpenseUpdate): Promise<void> {
    // 验证费用是否存在
    const exists = await this.repository.exists(id)
    if (!exists) {
      throw new NotFoundError('费用记录不存在')
    }

    // 验证金额
    if (data.amount !== undefined && typeof data.amount !== 'number') {
      throw new ValidationError('金额必须是数字')
    }

    // 验证日期
    if (data.date) {
      const date = new Date(data.date)
      if (isNaN(date.getTime())) {
        throw new ValidationError('日期格式无效')
      }
    }

    // 验证分类
    if (data.category) {
      const validCategories: Expense['category'][] = [
        'accommodation',
        'transportation',
        'food',
        'attractions',
        'shopping',
        'other',
      ]

      if (!validCategories.includes(data.category)) {
        throw new ValidationError('费用分类无效')
      }
    }

    // 验证描述长度
    if (data.description && data.description.length > 500) {
      throw new ValidationError('描述不能超过 500 个字符')
    }
  }
}
