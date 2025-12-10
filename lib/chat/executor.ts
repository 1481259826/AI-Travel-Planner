/**
 * 对话 Agent 工具执行器
 * 实现各工具的具体执行逻辑
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { MCPClient, getMCPClient } from '../agents/mcp-client'
import { modificationCache, generateModificationId, calculateExpiresAt } from './modification-cache'
import {
  optimizeRoute,
  replanDay,
  adjustForWeather,
  type ReplanConstraints,
} from './modification-workflow'
import type {
  ToolCall,
  ToolResult,
  ToolExecutionContext,
  SearchAttractionsParams,
  SearchHotelsParams,
  SearchRestaurantsParams,
  GetWeatherParams,
  ModifyItineraryParams,
  CreateTripParams,
  CalculateRouteParams,
  GetRecommendationsParams,
  TripFormData,
  TripFormValidation,
  TripFormState,
  PrepareItineraryModificationParams,
  ConfirmItineraryModificationParams,
  ModificationPreview,
  ModificationChange,
  DayPlanSummary,
} from './types'
import type { Itinerary, DayPlan, Activity } from '@/types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * prepare_trip_form 工具参数
 */
interface PrepareTripFormParams {
  destination?: string
  start_date?: string
  end_date?: string
  budget?: number
  travelers?: number
  origin?: string
  preferences?: string[]
  accommodation_preference?: 'budget' | 'mid' | 'luxury'
  transport_preference?: 'public' | 'driving' | 'mixed'
  special_requirements?: string
}

/**
 * confirm_and_generate_trip 工具参数
 */
interface ConfirmAndGenerateTripParams {
  form_data: {
    destination: string
    start_date: string
    end_date: string
    budget: number
    travelers: number
    origin?: string
    preferences?: string[]
    accommodation_preference?: string
    transport_preference?: string
    special_requirements?: string
  }
  session_id?: string
}

// ============================================================================
// 工具执行器类
// ============================================================================

/**
 * 工具执行器
 * 负责执行各种工具调用并返回结果
 */
export class ToolExecutor {
  private mcpClient: MCPClient
  private supabase: SupabaseClient | null
  private userId: string

  constructor(options: {
    mcpClient?: MCPClient
    supabase?: SupabaseClient
    userId: string
  }) {
    this.mcpClient = options.mcpClient || getMCPClient()
    this.supabase = options.supabase || null
    this.userId = options.userId
  }

  /**
   * 执行工具调用
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const { id, function: func } = toolCall
    const { name, arguments: argsStr } = func

    try {
      // 解析参数
      const args = JSON.parse(argsStr)

      // 根据工具名称分发执行
      let result: unknown
      switch (name) {
        case 'search_attractions':
          result = await this.searchAttractions(args)
          break
        case 'search_hotels':
          result = await this.searchHotels(args)
          break
        case 'search_restaurants':
          result = await this.searchRestaurants(args)
          break
        case 'get_weather':
          result = await this.getWeather(args)
          break
        case 'modify_itinerary':
          result = await this.modifyItinerary(args)
          break
        case 'get_trip_details':
          result = await this.getTripDetails(args.trip_id)
          break
        case 'create_trip':
          result = await this.createTrip(args)
          break
        case 'prepare_trip_form':
          result = await this.prepareTripForm(args)
          break
        case 'confirm_and_generate_trip':
          result = await this.confirmAndGenerateTrip(args)
          break
        case 'calculate_route':
          result = await this.calculateRoute(args)
          break
        case 'get_recommendations':
          result = await this.getRecommendations(args)
          break
        case 'prepare_itinerary_modification':
          result = await this.prepareItineraryModification(args)
          break
        case 'confirm_itinerary_modification':
          result = await this.confirmItineraryModification(args)
          break
        case 'cancel_itinerary_modification':
          result = await this.cancelItineraryModification(args)
          break
        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        toolCallId: id,
        name,
        result,
      }
    } catch (error) {
      console.error(`[ToolExecutor] Error executing ${name}:`, error)
      return {
        toolCallId: id,
        name,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // --------------------------------------------------------------------------
  // 景点搜索
  // --------------------------------------------------------------------------

  private async searchAttractions(params: SearchAttractionsParams) {
    const { city, keywords, type, limit = 10 } = params

    // 根据类型确定 POI 类型代码
    const typeCode = this.getAttractionTypeCode(type)

    const result = await this.mcpClient.searchPOI({
      keywords: keywords || '景点',
      city,
      types: typeCode,
      cityLimit: true,
      pageSize: limit,
    })

    if (!result || result.pois.length === 0) {
      return { success: false, message: `未找到${city}的相关景点` }
    }

    // 格式化结果
    const attractions = result.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address,
      location: this.parseLocation(poi.location),
      rating: poi.rating ? parseFloat(poi.rating) : null,
      photos: poi.photos?.slice(0, 3) || [],
    }))

    return {
      success: true,
      count: attractions.length,
      attractions,
    }
  }

  private getAttractionTypeCode(type?: string): string {
    const typeMap: Record<string, string> = {
      '景点': '110000|110100|110200|110300', // 风景名胜
      '美食': '050000', // 餐饮服务
      '购物': '060000', // 购物服务
      '娱乐': '080000', // 休闲娱乐
      '文化': '140000', // 科教文化服务
    }
    return typeMap[type || '景点'] || '110000'
  }

  // --------------------------------------------------------------------------
  // 酒店搜索
  // --------------------------------------------------------------------------

  private async searchHotels(params: SearchHotelsParams) {
    const { city, priceRange, type, limit = 10 } = params

    // 酒店类型代码：100100 星级酒店，100200 快捷酒店
    let keywords = '酒店'
    if (type) {
      const typeNames: Record<string, string> = {
        hotel: '酒店',
        hostel: '青年旅社',
        apartment: '公寓',
        resort: '度假村',
      }
      keywords = typeNames[type] || '酒店'
    }

    const result = await this.mcpClient.searchPOI({
      keywords,
      city,
      types: '100000', // 住宿服务
      cityLimit: true,
      pageSize: limit * 2, // 获取更多以便筛选
    })

    if (!result || result.pois.length === 0) {
      return { success: false, message: `未找到${city}的酒店` }
    }

    // 格式化结果
    let hotels = result.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address,
      location: this.parseLocation(poi.location),
      rating: poi.rating ? parseFloat(poi.rating) : null,
      tel: poi.tel,
      photos: poi.photos?.slice(0, 3) || [],
    }))

    // 简单的价格筛选（基于名称中的关键词）
    if (priceRange) {
      hotels = this.filterHotelsByPrice(hotels, priceRange)
    }

    return {
      success: true,
      count: hotels.slice(0, limit).length,
      hotels: hotels.slice(0, limit),
    }
  }

  private filterHotelsByPrice(
    hotels: any[],
    priceRange: 'budget' | 'mid' | 'luxury'
  ) {
    const budgetKeywords = ['快捷', '经济', '如家', '汉庭', '7天', '速8']
    const luxuryKeywords = ['五星', '豪华', '希尔顿', '万豪', '洲际', '香格里拉', '丽思', '威斯汀']

    return hotels.filter((hotel) => {
      const name = hotel.name
      const isBudget = budgetKeywords.some((k) => name.includes(k))
      const isLuxury = luxuryKeywords.some((k) => name.includes(k))

      switch (priceRange) {
        case 'budget':
          return isBudget
        case 'luxury':
          return isLuxury
        case 'mid':
          return !isBudget && !isLuxury
        default:
          return true
      }
    })
  }

  // --------------------------------------------------------------------------
  // 餐厅搜索
  // --------------------------------------------------------------------------

  private async searchRestaurants(params: SearchRestaurantsParams) {
    const { city, cuisine, priceRange, limit = 10 } = params

    const keywords = cuisine || '餐厅'

    const result = await this.mcpClient.searchPOI({
      keywords,
      city,
      types: '050000', // 餐饮服务
      cityLimit: true,
      pageSize: limit,
    })

    if (!result || result.pois.length === 0) {
      return { success: false, message: `未找到${city}的${cuisine || '餐厅'}` }
    }

    const restaurants = result.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address,
      location: this.parseLocation(poi.location),
      rating: poi.rating ? parseFloat(poi.rating) : null,
      tel: poi.tel,
      photos: poi.photos?.slice(0, 3) || [],
    }))

    return {
      success: true,
      count: restaurants.length,
      restaurants,
    }
  }

  // --------------------------------------------------------------------------
  // 天气查询
  // --------------------------------------------------------------------------

  private async getWeather(params: GetWeatherParams) {
    const { city, date } = params

    const weather = await this.mcpClient.getWeatherForecast(city)

    if (!weather) {
      return { success: false, message: `无法获取${city}的天气信息` }
    }

    // 如果指定了日期，筛选该日期的天气
    let forecasts = weather.forecasts
    if (date) {
      forecasts = forecasts.filter((f) => f.date === date)
    }

    return {
      success: true,
      city: weather.city,
      province: weather.province,
      reportTime: weather.reporttime,
      forecasts: forecasts.map((f) => ({
        date: f.date,
        week: f.week,
        dayWeather: f.dayweather,
        nightWeather: f.nightweather,
        dayTemp: f.daytemp,
        nightTemp: f.nighttemp,
        dayWind: `${f.daywind}风 ${f.daypower}级`,
        nightWind: `${f.nightwind}风 ${f.nightpower}级`,
      })),
    }
  }

  // --------------------------------------------------------------------------
  // 行程修改
  // --------------------------------------------------------------------------

  private async modifyItinerary(params: ModifyItineraryParams) {
    if (!this.supabase) {
      return { success: false, message: '数据库连接不可用' }
    }

    const { tripId, operation, params: opParams } = params

    // 获取行程
    const { data: trip, error: fetchError } = await this.supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', this.userId)
      .single()

    if (fetchError || !trip) {
      return { success: false, message: '行程不存在或无权访问' }
    }

    const itinerary = trip.itinerary
    if (!itinerary || !itinerary.days) {
      return { success: false, message: '行程数据格式错误' }
    }

    // 执行修改操作
    let modified = false
    let message = ''

    switch (operation) {
      case 'add_attraction': {
        const { dayIndex = 0, attraction } = opParams as any
        if (dayIndex >= 0 && dayIndex < itinerary.days.length && attraction) {
          const newActivity = {
            time: '10:00',
            name: attraction.name,
            type: 'attraction' as const,
            location: {
              name: attraction.name,
              address: attraction.location || '',
              lat: 0,
              lng: 0,
            },
            duration: attraction.duration || '2小时',
            description: attraction.description || '',
          }
          itinerary.days[dayIndex].activities.push(newActivity)
          modified = true
          message = `已将"${attraction.name}"添加到第${dayIndex + 1}天`
        }
        break
      }

      case 'remove_attraction': {
        const { dayIndex, activityIndex } = opParams as any
        if (
          dayIndex >= 0 &&
          dayIndex < itinerary.days.length &&
          activityIndex >= 0 &&
          activityIndex < itinerary.days[dayIndex].activities.length
        ) {
          const removed = itinerary.days[dayIndex].activities.splice(
            activityIndex,
            1
          )[0]
          modified = true
          message = `已从第${dayIndex + 1}天删除"${removed.name}"`
        }
        break
      }

      case 'reorder': {
        const { fromDay, fromIndex, toDay, toIndex } = opParams as any
        if (
          fromDay >= 0 &&
          fromDay < itinerary.days.length &&
          toDay >= 0 &&
          toDay < itinerary.days.length
        ) {
          const [activity] = itinerary.days[fromDay].activities.splice(
            fromIndex,
            1
          )
          if (activity) {
            itinerary.days[toDay].activities.splice(toIndex, 0, activity)
            modified = true
            message = `已将"${activity.name}"移动到第${toDay + 1}天`
          }
        }
        break
      }

      case 'change_time': {
        const { dayIndex, activityIndex, newTime } = opParams as any
        if (
          dayIndex >= 0 &&
          dayIndex < itinerary.days.length &&
          activityIndex >= 0 &&
          activityIndex < itinerary.days[dayIndex].activities.length &&
          newTime
        ) {
          const activity = itinerary.days[dayIndex].activities[activityIndex]
          activity.time = newTime
          modified = true
          message = `已将"${activity.name}"的时间改为${newTime}`
        }
        break
      }

      case 'add_day': {
        const newDay = {
          day: itinerary.days.length + 1,
          date: '', // 需要计算
          activities: [],
          meals: [],
        }
        itinerary.days.push(newDay)
        modified = true
        message = `已添加第${newDay.day}天`
        break
      }

      case 'remove_day': {
        const { dayIndex } = opParams as any
        if (dayIndex >= 0 && dayIndex < itinerary.days.length) {
          itinerary.days.splice(dayIndex, 1)
          // 重新编号
          itinerary.days.forEach((day: any, i: number) => {
            day.day = i + 1
          })
          modified = true
          message = `已删除第${dayIndex + 1}天`
        }
        break
      }

      default:
        return { success: false, message: `不支持的操作: ${operation}` }
    }

    if (!modified) {
      return { success: false, message: '修改失败，请检查参数' }
    }

    // 保存修改
    const { error: updateError } = await this.supabase
      .from('trips')
      .update({
        itinerary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId)

    if (updateError) {
      return { success: false, message: '保存失败: ' + updateError.message }
    }

    return { success: true, message, itinerary }
  }

  // --------------------------------------------------------------------------
  // 获取行程详情
  // --------------------------------------------------------------------------

  private async getTripDetails(tripId: string) {
    if (!this.supabase) {
      return { success: false, message: '数据库连接不可用' }
    }

    const { data: trip, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', this.userId)
      .single()

    if (error || !trip) {
      return { success: false, message: '行程不存在或无权访问' }
    }

    return {
      success: true,
      trip: {
        id: trip.id,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        budget: trip.budget,
        travelers: trip.travelers,
        status: trip.status,
        itinerary: trip.itinerary,
      },
    }
  }

  // --------------------------------------------------------------------------
  // 创建行程
  // --------------------------------------------------------------------------

  private async createTrip(params: CreateTripParams) {
    // 创建行程需要调用行程生成 API
    // 这里返回提示信息，让 Agent 引导用户使用表单或提供更多信息
    return {
      success: false,
      message:
        '创建行程功能正在开发中。请使用"创建行程"页面来规划您的旅行，我可以帮您解答相关问题。',
      suggestion: {
        destination: params.destination,
        startDate: params.startDate,
        endDate: params.endDate,
        budget: params.budget,
        travelers: params.travelers,
        preferences: params.preferences,
      },
    }
  }

  // --------------------------------------------------------------------------
  // 准备行程表单（对话式创建行程 - 第一步）
  // --------------------------------------------------------------------------

  private async prepareTripForm(params: PrepareTripFormParams): Promise<TripFormState> {
    // 构建表单数据
    const formData: Partial<TripFormData> = {}

    if (params.destination) formData.destination = params.destination
    if (params.start_date) formData.startDate = params.start_date
    if (params.end_date) formData.endDate = params.end_date
    if (params.budget) formData.budget = params.budget
    if (params.travelers) formData.travelers = params.travelers
    if (params.origin) formData.origin = params.origin
    if (params.preferences) formData.preferences = params.preferences
    if (params.accommodation_preference) formData.accommodation_preference = params.accommodation_preference
    if (params.transport_preference) formData.transport_preference = params.transport_preference
    if (params.special_requirements) formData.special_requirements = params.special_requirements

    // 验证必填字段
    const validation = this.validateTripForm(formData)

    return {
      formData,
      validation,
    }
  }

  /**
   * 验证行程表单数据
   */
  private validateTripForm(formData: Partial<TripFormData>): TripFormValidation {
    const requiredFields = ['destination', 'startDate', 'endDate', 'budget', 'travelers'] as const
    const optionalFields = ['origin', 'preferences', 'accommodation_preference', 'transport_preference', 'special_requirements'] as const

    const fieldLabels: Record<string, string> = {
      destination: '目的地',
      startDate: '开始日期',
      endDate: '结束日期',
      budget: '预算',
      travelers: '出行人数',
      origin: '出发地',
      preferences: '旅行偏好',
      accommodation_preference: '住宿偏好',
      transport_preference: '交通偏好',
      special_requirements: '特殊要求',
    }

    const missingRequired: string[] = []
    const missingOptional: string[] = []

    // 检查必填字段
    for (const field of requiredFields) {
      const value = formData[field]
      if (value === undefined || value === null || value === '') {
        missingRequired.push(fieldLabels[field])
      }
    }

    // 检查可选字段
    for (const field of optionalFields) {
      const value = formData[field]
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        missingOptional.push(fieldLabels[field])
      }
    }

    // 额外验证：日期格式和逻辑
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      if (endDate < startDate) {
        missingRequired.push('日期错误：结束日期不能早于开始日期')
      }
    }

    return {
      isValid: missingRequired.length === 0,
      missingRequired,
      missingOptional,
    }
  }

  // --------------------------------------------------------------------------
  // 确认并生成行程（对话式创建行程 - 第二步）
  // --------------------------------------------------------------------------

  private async confirmAndGenerateTrip(params: ConfirmAndGenerateTripParams) {
    const { form_data, session_id } = params

    // 再次验证表单数据
    const formData: Partial<TripFormData> = {
      destination: form_data.destination,
      startDate: form_data.start_date,
      endDate: form_data.end_date,
      budget: form_data.budget,
      travelers: form_data.travelers,
      origin: form_data.origin,
      preferences: form_data.preferences,
      accommodation_preference: form_data.accommodation_preference as TripFormData['accommodation_preference'],
      transport_preference: form_data.transport_preference as TripFormData['transport_preference'],
      special_requirements: form_data.special_requirements,
    }

    const validation = this.validateTripForm(formData)

    if (!validation.isValid) {
      return {
        success: false,
        action: 'validation_failed',
        message: `表单验证失败，缺少以下必填信息：${validation.missingRequired.join('、')}`,
        validation,
      }
    }

    // 返回特殊标记，指示前端触发生成流程
    // 前端接收到这个结果后，应该调用 /api/chat/generate-trip 端点
    return {
      success: true,
      action: 'trigger_generation',
      message: '表单验证通过，正在启动行程生成...',
      formData,
      sessionId: session_id,
    }
  }

  // --------------------------------------------------------------------------
  // 计算路线
  // --------------------------------------------------------------------------

  private async calculateRoute(params: CalculateRouteParams) {
    const { origin, destination, mode = 'driving' } = params

    // 首先需要地理编码获取坐标
    const originGeo = await this.mcpClient.geocode(origin)
    const destGeo = await this.mcpClient.geocode(destination)

    if (!originGeo || !destGeo) {
      return { success: false, message: '无法解析地址' }
    }

    let route
    switch (mode) {
      case 'driving':
        route = await this.mcpClient.getDrivingRoute(
          originGeo.location,
          destGeo.location
        )
        break
      case 'walking':
        route = await this.mcpClient.getWalkingRoute(
          originGeo.location,
          destGeo.location
        )
        break
      case 'transit':
        route = await this.mcpClient.getTransitRoute(
          originGeo.location,
          destGeo.location,
          originGeo.city || destGeo.city
        )
        break
      default:
        route = await this.mcpClient.getDrivingRoute(
          originGeo.location,
          destGeo.location
        )
    }

    if (!route) {
      return { success: false, message: '无法规划路线' }
    }

    return {
      success: true,
      route: {
        origin: originGeo.formatted_address,
        destination: destGeo.formatted_address,
        mode,
        distance: this.formatDistance(route.distance),
        duration: this.formatDuration(route.duration),
        taxiCost: route.taxi_cost ? `约${route.taxi_cost}元` : undefined,
      },
    }
  }

  // --------------------------------------------------------------------------
  // 获取推荐
  // --------------------------------------------------------------------------

  private async getRecommendations(params: GetRecommendationsParams) {
    const { city, category, preferences, limit = 10 } = params

    // 根据类别确定搜索参数
    let keywords = ''
    let types = ''

    switch (category) {
      case 'attractions':
        keywords = preferences?.join(' ') || '热门景点'
        types = '110000|110100|110200'
        break
      case 'restaurants':
        keywords = preferences?.join(' ') || '特色餐厅'
        types = '050000'
        break
      case 'hotels':
        keywords = preferences?.join(' ') || '推荐酒店'
        types = '100000'
        break
      case 'activities':
        keywords = preferences?.join(' ') || '休闲娱乐'
        types = '080000'
        break
    }

    const result = await this.mcpClient.searchPOI({
      keywords,
      city,
      types,
      cityLimit: true,
      pageSize: limit,
    })

    if (!result || result.pois.length === 0) {
      return { success: false, message: `未找到${city}的相关推荐` }
    }

    const recommendations = result.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      category: poi.type,
      address: poi.address,
      location: this.parseLocation(poi.location),
      rating: poi.rating ? parseFloat(poi.rating) : null,
      photos: poi.photos?.slice(0, 2) || [],
    }))

    return {
      success: true,
      category,
      count: recommendations.length,
      recommendations,
    }
  }

  // --------------------------------------------------------------------------
  // 辅助方法
  // --------------------------------------------------------------------------

  private parseLocation(locationStr: string): { lng: number; lat: number } {
    const [lng, lat] = locationStr.split(',').map(Number)
    return { lng: lng || 0, lat: lat || 0 }
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}米`
    }
    return `${(meters / 1000).toFixed(1)}公里`
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}秒`
    }
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)}分钟`
    }
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
  }

  // --------------------------------------------------------------------------
  // 行程修改预览（新增）
  // --------------------------------------------------------------------------

  /**
   * 准备行程修改预览
   * 生成 before/after 对比，等待用户确认
   */
  private async prepareItineraryModification(
    params: PrepareItineraryModificationParams
  ): Promise<ModificationPreview | { success: false; message: string }> {
    if (!this.supabase) {
      return { success: false, message: '数据库连接不可用' }
    }

    const { trip_id, operation, params: opParams, reason } = params

    // 1. 加载当前行程
    const { data: trip, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .eq('user_id', this.userId)
      .single()

    if (error || !trip) {
      return { success: false, message: '行程不存在或无权访问' }
    }

    const itinerary = trip.itinerary as Itinerary
    if (!itinerary || !itinerary.days) {
      return { success: false, message: '行程数据格式错误' }
    }

    // 2. 深拷贝行程作为工作副本
    const beforeItinerary: Itinerary = JSON.parse(JSON.stringify(itinerary))
    const afterItinerary: Itinerary = JSON.parse(JSON.stringify(itinerary))

    // 3. 根据操作类型计算修改
    const changes: ModificationChange[] = []
    let modified = false

    switch (operation) {
      case 'remove_attraction': {
        const { day_index, activity_index } = opParams
        if (
          day_index !== undefined &&
          day_index >= 0 &&
          day_index < afterItinerary.days.length
        ) {
          const day = afterItinerary.days[day_index]
          // 如果没有指定 activity_index，尝试通过名称查找
          let targetIndex = activity_index
          if (targetIndex === undefined && opParams.attraction?.name) {
            targetIndex = day.activities.findIndex(
              (a) => a.name.includes(opParams.attraction!.name) || opParams.attraction!.name.includes(a.name)
            )
          }
          if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < day.activities.length) {
            const removed = day.activities.splice(targetIndex, 1)[0]
            changes.push({
              type: 'remove',
              dayIndex: day_index,
              itemType: 'attraction',
              itemName: removed.name,
              description: `从第 ${day_index + 1} 天删除「${removed.name}」`,
              before: removed,
            })
            modified = true
          }
        }
        break
      }

      case 'add_attraction': {
        const { day_index = 0, attraction } = opParams
        if (attraction && day_index >= 0 && day_index < afterItinerary.days.length) {
          const newActivity: Activity = {
            time: attraction.preferred_time || '10:00',
            name: attraction.name,
            type: 'attraction',
            location: {
              name: attraction.name,
              address: attraction.location || '',
              lat: 0,
              lng: 0,
            },
            duration: attraction.duration || '2小时',
            description: attraction.description || '',
          }
          afterItinerary.days[day_index].activities.push(newActivity)
          changes.push({
            type: 'add',
            dayIndex: day_index,
            itemType: 'attraction',
            itemName: attraction.name,
            description: `添加「${attraction.name}」到第 ${day_index + 1} 天`,
            after: newActivity,
          })
          modified = true
        }
        break
      }

      case 'change_time': {
        const { day_index, activity_index, new_time } = opParams
        if (
          day_index !== undefined &&
          activity_index !== undefined &&
          new_time &&
          day_index >= 0 &&
          day_index < afterItinerary.days.length
        ) {
          const day = afterItinerary.days[day_index]
          if (activity_index >= 0 && activity_index < day.activities.length) {
            const activity = day.activities[activity_index]
            const oldTime = activity.time
            activity.time = new_time
            changes.push({
              type: 'modify',
              dayIndex: day_index,
              itemType: 'attraction',
              itemName: activity.name,
              description: `将「${activity.name}」的时间从 ${oldTime} 改为 ${new_time}`,
              before: oldTime,
              after: new_time,
            })
            modified = true
          }
        }
        break
      }

      case 'change_hotel': {
        // 更换酒店
        const { hotel } = opParams
        if (hotel && afterItinerary.accommodation && afterItinerary.accommodation.length > 0) {
          const oldHotel = afterItinerary.accommodation[0]
          const newHotel = {
            ...oldHotel,
            name: hotel.name || oldHotel.name,
            type: hotel.type || oldHotel.type,
            price_per_night: hotel.price_per_night || oldHotel.price_per_night,
            description: hotel.description || oldHotel.description,
            location: hotel.location || oldHotel.location,
            photos: hotel.photos || oldHotel.photos || [],
          }
          afterItinerary.accommodation[0] = newHotel

          // 计算价格变化
          const oldTotal = oldHotel.price_per_night * (afterItinerary.days?.length || 1)
          const newTotal = newHotel.price_per_night * (afterItinerary.days?.length || 1)
          const priceDiff = newTotal - oldTotal

          changes.push({
            type: 'modify',
            dayIndex: -1, // 酒店不属于特定天数
            itemType: 'hotel',
            itemName: newHotel.name,
            description: `将酒店从「${oldHotel.name}」更换为「${newHotel.name}」${priceDiff !== 0 ? `（${priceDiff > 0 ? '+' : ''}¥${priceDiff}）` : ''}`,
            before: oldHotel,
            after: newHotel,
          })
          modified = true
        }
        break
      }

      case 'change_restaurant': {
        // 更换餐厅
        const { day_index, meal_index, restaurant } = opParams
        if (
          day_index !== undefined &&
          meal_index !== undefined &&
          restaurant &&
          day_index >= 0 &&
          day_index < afterItinerary.days.length
        ) {
          const day = afterItinerary.days[day_index]
          if (day.meals && meal_index >= 0 && meal_index < day.meals.length) {
            const oldMeal = day.meals[meal_index]
            const newMeal = {
              ...oldMeal,
              restaurant: restaurant.name || oldMeal.restaurant,
              cuisine: restaurant.cuisine || oldMeal.cuisine,
              avg_price: restaurant.avg_price || oldMeal.avg_price,
              recommended_dishes: restaurant.recommended_dishes || oldMeal.recommended_dishes,
            }
            day.meals[meal_index] = newMeal

            changes.push({
              type: 'modify',
              dayIndex: day_index,
              itemType: 'meal',
              itemName: newMeal.restaurant,
              description: `将第 ${day_index + 1} 天的「${oldMeal.restaurant}」更换为「${newMeal.restaurant}」`,
              before: oldMeal,
              after: newMeal,
            })
            modified = true
          }
        }
        break
      }

      case 'reorder': {
        const { from_day, from_index, to_day, to_index } = opParams
        if (
          from_day !== undefined &&
          from_index !== undefined &&
          to_day !== undefined &&
          to_index !== undefined &&
          from_day >= 0 &&
          from_day < afterItinerary.days.length &&
          to_day >= 0 &&
          to_day < afterItinerary.days.length
        ) {
          const fromDayPlan = afterItinerary.days[from_day]
          if (from_index >= 0 && from_index < fromDayPlan.activities.length) {
            const [activity] = fromDayPlan.activities.splice(from_index, 1)
            afterItinerary.days[to_day].activities.splice(to_index, 0, activity)
            const moveDesc =
              from_day === to_day
                ? `在第 ${from_day + 1} 天内调整「${activity.name}」的顺序`
                : `将「${activity.name}」从第 ${from_day + 1} 天移动到第 ${to_day + 1} 天`
            changes.push({
              type: 'reorder',
              dayIndex: to_day,
              itemType: 'attraction',
              itemName: activity.name,
              description: moveDesc,
              before: { day: from_day, index: from_index },
              after: { day: to_day, index: to_index },
            })
            modified = true
          }
        }
        break
      }

      case 'add_day': {
        const { day_index } = opParams
        const insertIndex = day_index !== undefined ? day_index : afterItinerary.days.length
        const newDay: DayPlan = {
          day: insertIndex + 1,
          date: '', // 需要根据现有日期计算
          activities: [],
          meals: [],
        }
        afterItinerary.days.splice(insertIndex, 0, newDay)
        // 重新编号
        afterItinerary.days.forEach((day, i) => {
          day.day = i + 1
        })
        changes.push({
          type: 'add',
          dayIndex: insertIndex,
          itemType: 'attraction',
          itemName: `第 ${insertIndex + 1} 天`,
          description: `添加新的一天（第 ${insertIndex + 1} 天）`,
        })
        modified = true
        break
      }

      case 'remove_day': {
        const { day_index } = opParams
        if (day_index !== undefined && day_index >= 0 && day_index < afterItinerary.days.length) {
          const removedDay = afterItinerary.days.splice(day_index, 1)[0]
          // 重新编号
          afterItinerary.days.forEach((day, i) => {
            day.day = i + 1
          })
          changes.push({
            type: 'remove',
            dayIndex: day_index,
            itemType: 'attraction',
            itemName: `第 ${day_index + 1} 天`,
            description: `删除第 ${day_index + 1} 天（包含 ${removedDay.activities.length} 个活动）`,
            before: removedDay,
          })
          modified = true
        }
        break
      }

      // Phase 3: 智能重规划操作
      case 'optimize_route': {
        // 路线优化 - 使用贪心算法最小化交通时间
        const { day_index } = opParams
        if (day_index === undefined || day_index < 0 || day_index >= afterItinerary.days.length) {
          return { success: false, message: '请指定要优化的天数' }
        }

        try {
          const result = await optimizeRoute(
            afterItinerary.days[day_index],
            trip.destination || '',
            { mcpClient: this.mcpClient }
          )

          afterItinerary.days[day_index] = result.optimizedDay

          changes.push({
            type: 'modify',
            dayIndex: day_index,
            itemType: 'attraction',
            itemName: '路线优化',
            description: `优化第 ${day_index + 1} 天路线，节省约 ${Math.round(result.totalDistanceSaved / 1000)} 公里、${Math.round(result.totalTimeSaved)} 分钟`,
          })
          modified = true
        } catch (error) {
          return {
            success: false,
            message: `路线优化失败: ${error instanceof Error ? error.message : '未知错误'}`,
          }
        }
        break
      }

      case 'replan_day': {
        // AI 重新规划某天
        const { day_index, regeneration_hints } = opParams
        if (day_index === undefined || day_index < 0 || day_index >= afterItinerary.days.length) {
          return { success: false, message: '请指定要重新规划的天数' }
        }

        try {
          const constraints: ReplanConstraints = {
            keepAttractions: regeneration_hints?.keep_attractions,
            excludeAttractions: regeneration_hints?.exclude_attractions,
            preferences: regeneration_hints?.preferences,
            budgetAdjustment: regeneration_hints?.budget_adjustment,
            reason: reason,
          }

          const result = await replanDay(
            afterItinerary.days[day_index],
            beforeItinerary,
            constraints
          )

          afterItinerary.days[day_index] = result.replannedDay

          // 记录变更
          if (result.removedActivities.length > 0) {
            changes.push({
              type: 'remove',
              dayIndex: day_index,
              itemType: 'attraction',
              itemName: result.removedActivities.join('、'),
              description: `从第 ${day_index + 1} 天移除: ${result.removedActivities.join('、')}`,
            })
          }

          if (result.newActivities.length > 0) {
            changes.push({
              type: 'add',
              dayIndex: day_index,
              itemType: 'attraction',
              itemName: result.newActivities.map((a) => a.name).join('、'),
              description: `为第 ${day_index + 1} 天添加: ${result.newActivities.map((a) => a.name).join('、')}`,
            })
          }

          if (changes.length === 0) {
            changes.push({
              type: 'modify',
              dayIndex: day_index,
              itemType: 'attraction',
              itemName: '行程重规划',
              description: `重新规划第 ${day_index + 1} 天: ${result.reason}`,
            })
          }

          modified = true
        } catch (error) {
          return {
            success: false,
            message: `重新规划失败: ${error instanceof Error ? error.message : '未知错误'}`,
          }
        }
        break
      }

      case 'adjust_for_weather': {
        // 根据天气调整行程
        const { day_index } = opParams
        if (day_index === undefined || day_index < 0 || day_index >= afterItinerary.days.length) {
          return { success: false, message: '请指定要调整的天数' }
        }

        try {
          const result = await adjustForWeather(
            afterItinerary.days[day_index],
            beforeItinerary
          )

          if (result.replacements.length === 0) {
            return {
              success: false,
              message: `第 ${day_index + 1} 天天气${result.weatherContext.condition}，当前行程无需调整`,
            }
          }

          afterItinerary.days[day_index] = result.adjustedDay

          for (const replacement of result.replacements) {
            changes.push({
              type: 'modify',
              dayIndex: day_index,
              itemType: 'attraction',
              itemName: replacement.original,
              description: `因天气(${result.weatherContext.condition})将「${replacement.original}」替换为「${replacement.replacement}」`,
              before: replacement.original,
              after: replacement.replacement,
            })
          }

          modified = true
        } catch (error) {
          return {
            success: false,
            message: `天气调整失败: ${error instanceof Error ? error.message : '未知错误'}`,
          }
        }
        break
      }

      // Phase 4: 完整重生成操作（暂不支持，需要调用完整 LangGraph 工作流）
      case 'regenerate_day':
      case 'regenerate_trip_segment':
        return {
          success: false,
          message: `「${operation}」操作将在后续版本中支持，敬请期待`,
        }

      default:
        return { success: false, message: `不支持的操作类型: ${operation}` }
    }

    if (!modified) {
      return { success: false, message: '修改失败，请检查参数是否正确' }
    }

    // 4. 生成预览摘要
    const beforeSummary = this.generateDaySummary(beforeItinerary, changes, 'before')
    const afterSummary = this.generateDaySummary(afterItinerary, changes, 'after')

    // 5. 计算影响评估
    const impact = this.calculateModificationImpact(beforeItinerary, afterItinerary, changes)

    // 6. 创建预览对象
    const now = Date.now()
    const preview: ModificationPreview = {
      id: generateModificationId(),
      tripId: trip_id,
      operation,
      before: {
        days: beforeSummary,
        totalCost: this.calculateTotalCost(beforeItinerary),
      },
      after: {
        days: afterSummary,
        totalCost: this.calculateTotalCost(afterItinerary),
      },
      changes,
      impact,
      createdAt: now,
      expiresAt: calculateExpiresAt(now),
      status: 'pending',
    }

    // 7. 缓存 pending 修改
    modificationCache.set(preview.id, {
      preview,
      afterItinerary,
    })

    return preview
  }

  /**
   * 确认并应用行程修改
   */
  private async confirmItineraryModification(
    params: ConfirmItineraryModificationParams
  ): Promise<{
    success: boolean
    message: string
    modificationId?: string
    affectedDays?: number[]
    itinerary?: Itinerary
    tripId?: string
  }> {
    if (!this.supabase) {
      return { success: false, message: '数据库连接不可用' }
    }

    const { modification_id, user_adjustments } = params

    // 1. 从缓存获取 pending 修改
    const cached = modificationCache.get(modification_id)
    if (!cached) {
      return { success: false, message: '修改预览已过期或不存在，请重新发起修改' }
    }

    const { afterItinerary, preview } = cached

    // 2. 应用用户微调（如果有）
    if (user_adjustments?.time_adjustments) {
      for (const adj of user_adjustments.time_adjustments) {
        if (
          adj.day_index >= 0 &&
          adj.day_index < afterItinerary.days.length &&
          adj.activity_index >= 0 &&
          adj.activity_index < afterItinerary.days[adj.day_index].activities.length
        ) {
          afterItinerary.days[adj.day_index].activities[adj.activity_index].time = adj.new_time
        }
      }
    }

    // 3. 保存到数据库
    const { error } = await this.supabase
      .from('trips')
      .update({
        itinerary: afterItinerary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', preview.tripId)
      .eq('user_id', this.userId)

    if (error) {
      return { success: false, message: '保存失败: ' + error.message }
    }

    // 4. 更新缓存状态并清除
    modificationCache.updateStatus(modification_id, 'confirmed')
    modificationCache.delete(modification_id)

    // 5. 生成确认消息
    const changesSummary = preview.changes.map((c) => c.description).join('；')

    return {
      success: true,
      message: `行程修改已保存：${changesSummary}`,
      modificationId: modification_id,
      affectedDays: preview.impact.affectedDays,
      itinerary: afterItinerary,
      tripId: preview.tripId,
    }
  }

  /**
   * 取消行程修改
   */
  private async cancelItineraryModification(params: { modification_id: string }): Promise<{
    success: boolean
    message: string
  }> {
    const { modification_id } = params

    const cached = modificationCache.get(modification_id)
    if (!cached) {
      return { success: false, message: '修改预览已过期或不存在' }
    }

    modificationCache.updateStatus(modification_id, 'cancelled')
    modificationCache.delete(modification_id)

    return {
      success: true,
      message: '已取消修改',
    }
  }

  // --------------------------------------------------------------------------
  // 修改预览辅助方法
  // --------------------------------------------------------------------------

  /**
   * 生成天计划摘要
   */
  private generateDaySummary(
    itinerary: Itinerary,
    changes: ModificationChange[],
    type: 'before' | 'after'
  ): DayPlanSummary[] {
    return itinerary.days.map((day, dayIndex) => {
      const dayChanges = changes.filter((c) => c.dayIndex === dayIndex)

      return {
        day: day.day,
        date: day.date,
        activities: day.activities.map((activity, actIndex) => {
          // 检查该活动是否有变更
          let isChanged = false
          let changeType: 'added' | 'removed' | 'modified' | undefined

          for (const change of dayChanges) {
            if (change.itemName === activity.name) {
              isChanged = true
              if (change.type === 'add' && type === 'after') {
                changeType = 'added'
              } else if (change.type === 'remove' && type === 'before') {
                changeType = 'removed'
              } else if (change.type === 'modify') {
                changeType = 'modified'
              }
            }
          }

          return {
            time: activity.time,
            name: activity.name,
            type: activity.type,
            isChanged,
            changeType,
          }
        }),
      }
    })
  }

  /**
   * 计算修改影响
   */
  private calculateModificationImpact(
    before: Itinerary,
    after: Itinerary,
    changes: ModificationChange[]
  ): ModificationPreview['impact'] {
    // 收集受影响的天数
    const affectedDays = [...new Set(changes.map((c) => c.dayIndex))]

    // 计算成本变化
    const beforeCost = this.calculateTotalCost(before)
    const afterCost = this.calculateTotalCost(after)
    const costDelta = afterCost - beforeCost

    // 计算时间影响
    let timeImpact = ''
    const addedActivities = changes.filter((c) => c.type === 'add').length
    const removedActivities = changes.filter((c) => c.type === 'remove').length
    if (addedActivities > 0) {
      timeImpact += `增加 ${addedActivities} 个活动`
    }
    if (removedActivities > 0) {
      timeImpact += (timeImpact ? '，' : '') + `删除 ${removedActivities} 个活动`
    }
    if (!timeImpact) {
      timeImpact = '时间安排有所调整'
    }

    // 生成警告信息
    const warnings: string[] = []
    for (const dayIndex of affectedDays) {
      const dayAfter = after.days[dayIndex]
      if (dayAfter && dayAfter.activities.length === 0) {
        warnings.push(`第 ${dayIndex + 1} 天将没有任何活动安排`)
      }
      if (dayAfter && dayAfter.activities.length > 6) {
        warnings.push(`第 ${dayIndex + 1} 天活动较多（${dayAfter.activities.length} 个），行程可能较紧张`)
      }
    }

    return {
      affectedDays,
      costDelta,
      timeImpact,
      warnings,
    }
  }

  /**
   * 计算行程总成本（估算）
   */
  private calculateTotalCost(itinerary: Itinerary): number {
    let total = 0

    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        // 使用 ticket_price 字段
        if (activity.ticket_price) {
          total += activity.ticket_price
        }
      }
    }

    return total
  }
}

// ============================================================================
// 导出
// ============================================================================

export default ToolExecutor
