/**
 * 对话 Agent 工具执行器
 * 实现各工具的具体执行逻辑
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { MCPClient, getMCPClient } from '../agents/mcp-client'
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
} from './types'

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
}

// ============================================================================
// 导出
// ============================================================================

export default ToolExecutor
