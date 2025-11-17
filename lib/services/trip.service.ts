/**
 * Trip Service
 * 封装行程相关的业务逻辑
 */

import { BaseService } from './base.service'
import { TripRepository } from '@/lib/repositories/trip.repository'
import { ExpenseRepository } from '@/lib/repositories/expense.repository'
import { ValidationError, NotFoundError } from '@/lib/errors'
import type { Trip, TripInsert, TripUpdate } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export class TripService extends BaseService<Trip, TripInsert, TripUpdate> {
  protected serviceName = 'TripService'
  protected repository: TripRepository
  private expenseRepository: ExpenseRepository

  constructor(supabaseClient: SupabaseClient) {
    super()
    this.repository = new TripRepository(supabaseClient)
    this.expenseRepository = new ExpenseRepository(supabaseClient)
  }

  /**
   * 获取用户的所有行程
   */
  async getUserTrips(userId: string): Promise<Trip[]> {
    this.logger.debug(`${this.serviceName}: Getting trips for user`, { userId })

    try {
      const trips = await this.repository.findByUserId(userId)
      this.logger.debug(`${this.serviceName}: Found ${trips.length} trips for user`)
      return trips
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get user trips`, error as Error, { userId })
      throw error
    }
  }

  /**
   * 根据分享 token 获取行程
   */
  async getTripByShareToken(token: string): Promise<Trip> {
    this.logger.debug(`${this.serviceName}: Getting trip by share token`, { token })

    try {
      const trip = await this.repository.findByShareToken(token)

      if (!trip) {
        throw new NotFoundError('分享的行程不存在或已被取消分享')
      }

      return trip
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get trip by share token`, error as Error, {
        token,
      })
      throw error
    }
  }

  /**
   * 搜索行程
   */
  async searchTrips(userId: string, query: string): Promise<Trip[]> {
    this.logger.debug(`${this.serviceName}: Searching trips`, { userId, query })

    try {
      if (!query || query.trim().length === 0) {
        return this.getUserTrips(userId)
      }

      const trips = await this.repository.search(userId, query.trim())
      this.logger.debug(`${this.serviceName}: Found ${trips.length} trips matching query`)
      return trips
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to search trips`, error as Error, {
        userId,
        query,
      })
      throw error
    }
  }

  /**
   * 获取正在进行的行程
   */
  async getOngoingTrips(userId: string): Promise<Trip[]> {
    this.logger.debug(`${this.serviceName}: Getting ongoing trips`, { userId })

    try {
      const trips = await this.repository.findOngoingTrips(userId)
      this.logger.debug(`${this.serviceName}: Found ${trips.length} ongoing trips`)
      return trips
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get ongoing trips`, error as Error, {
        userId,
      })
      throw error
    }
  }

  /**
   * 获取即将开始的行程
   */
  async getUpcomingTrips(userId: string, limit: number = 10): Promise<Trip[]> {
    this.logger.debug(`${this.serviceName}: Getting upcoming trips`, { userId, limit })

    try {
      const trips = await this.repository.findUpcomingTrips(userId, limit)
      this.logger.debug(`${this.serviceName}: Found ${trips.length} upcoming trips`)
      return trips
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get upcoming trips`, error as Error, {
        userId,
        limit,
      })
      throw error
    }
  }

  /**
   * 获取行程统计信息
   */
  async getTripStatistics(userId: string): Promise<{
    total: number
    byStatus: Record<Trip['status'], number>
    ongoing: number
    upcoming: number
  }> {
    this.logger.debug(`${this.serviceName}: Getting trip statistics`, { userId })

    try {
      const [byStatus, ongoing, upcoming] = await Promise.all([
        this.repository.countByStatus(userId),
        this.repository.findOngoingTrips(userId),
        this.repository.findUpcomingTrips(userId),
      ])

      const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0)

      return {
        total,
        byStatus,
        ongoing: ongoing.length,
        upcoming: upcoming.length,
      }
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to get trip statistics`, error as Error, {
        userId,
      })
      throw error
    }
  }

  /**
   * 更新行程状态
   */
  async updateTripStatus(id: string, status: Trip['status']): Promise<Trip> {
    this.logger.debug(`${this.serviceName}: Updating trip status`, { id, status })

    try {
      const trip = await this.repository.updateStatus(id, status)
      this.logger.info(`${this.serviceName}: Trip status updated successfully`, { id, status })
      return trip
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to update trip status`, error as Error, {
        id,
        status,
      })
      throw error
    }
  }

  /**
   * 生成分享链接
   */
  async generateShareLink(id: string): Promise<{ token: string; url: string; trip: Trip }> {
    this.logger.debug(`${this.serviceName}: Generating share link`, { id })

    try {
      const { token, trip } = await this.repository.generateShareToken(id)

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3008'
      const url = `${baseUrl}/share/${token}`

      this.logger.info(`${this.serviceName}: Share link generated successfully`, { id, token })

      return { token, url, trip }
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to generate share link`, error as Error, {
        id,
      })
      throw error
    }
  }

  /**
   * 取消分享
   */
  async revokeShare(id: string): Promise<Trip> {
    this.logger.debug(`${this.serviceName}: Revoking share`, { id })

    try {
      const trip = await this.repository.revokeShareToken(id)
      this.logger.info(`${this.serviceName}: Share revoked successfully`, { id })
      return trip
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to revoke share`, error as Error, { id })
      throw error
    }
  }

  /**
   * 删除行程及其所有费用
   */
  async deleteTripWithExpenses(id: string): Promise<void> {
    this.logger.debug(`${this.serviceName}: Deleting trip with expenses`, { id })

    try {
      // 先删除所有费用
      await this.expenseRepository.deleteByTripId(id)

      // 再删除行程
      await this.repository.delete(id)

      this.logger.info(`${this.serviceName}: Trip and expenses deleted successfully`, { id })
    } catch (error) {
      this.logger.error(`${this.serviceName}: Failed to delete trip with expenses`, error as Error, {
        id,
      })
      throw error
    }
  }

  /**
   * 获取行程详情（包含费用统计）
   */
  async getTripWithExpenseSummary(id: string): Promise<{
    trip: Trip
    totalExpense: number
    expensesByCategory: Record<string, number>
    expenseCount: number
  }> {
    this.logger.debug(`${this.serviceName}: Getting trip with expense summary`, { id })

    try {
      const [trip, totalExpense, expensesByCategory, expenses] = await Promise.all([
        this.repository.findById(id),
        this.expenseRepository.getTotalAmount(id),
        this.expenseRepository.getAmountByCategory(id),
        this.expenseRepository.findByTripId(id),
      ])

      if (!trip) {
        throw new NotFoundError('行程不存在')
      }

      return {
        trip,
        totalExpense,
        expensesByCategory,
        expenseCount: expenses.length,
      }
    } catch (error) {
      this.logger.error(
        `${this.serviceName}: Failed to get trip with expense summary`,
        error as Error,
        { id }
      )
      throw error
    }
  }

  /**
   * 创建前验证
   */
  protected async validateCreate(data: TripInsert): Promise<void> {
    // 验证必填字段
    if (!data.user_id) {
      throw new ValidationError('用户 ID 不能为空')
    }

    if (!data.destination) {
      throw new ValidationError('目的地不能为空')
    }

    if (!data.start_date || !data.end_date) {
      throw new ValidationError('开始日期和结束日期不能为空')
    }

    // 验证日期有效性
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('日期格式无效')
    }

    if (endDate < startDate) {
      throw new ValidationError('结束日期不能早于开始日期')
    }

    // 验证预算
    if (data.budget !== undefined && data.budget < 0) {
      throw new ValidationError('预算不能为负数')
    }

    // 验证人数
    if (data.travelers !== undefined && data.travelers < 1) {
      throw new ValidationError('旅行人数至少为 1 人')
    }
  }

  /**
   * 更新前验证
   */
  protected async validateUpdate(id: string, data: TripUpdate): Promise<void> {
    // 验证行程是否存在
    const exists = await this.repository.exists(id)
    if (!exists) {
      throw new NotFoundError('行程不存在')
    }

    // 验证日期
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)

      if (endDate < startDate) {
        throw new ValidationError('结束日期不能早于开始日期')
      }
    }

    // 验证预算
    if (data.budget !== undefined && data.budget < 0) {
      throw new ValidationError('预算不能为负数')
    }

    // 验证人数
    if (data.travelers !== undefined && data.travelers < 1) {
      throw new ValidationError('旅行人数至少为 1 人')
    }
  }
}
