/**
 * API: /api/generate-itinerary
 * AI 智能生成旅行行程
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import {
  createAIClient,
  buildItineraryPrompt,
  generateItinerary,
  correctItineraryCoordinates,
} from '@/app/api/_utils'
import { ApiKeyClient } from '@/lib/api-keys'
import { getModelById } from '@/lib/models'
import { getWeatherByCityName } from '@/lib/amap-weather'
import { optimizeItineraryByClustering } from '@/lib/geo-clustering'
import config from '@/lib/config'
import type { TripFormData, Itinerary } from '@/types'
import { ValidationError, ConfigurationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * 获取天气信息（可选，失败不影响主流程）
 */
async function fetchWeatherInfo(destination: string, days: number): Promise<string> {
  try {
    const weatherData = await getWeatherByCityName(destination)

    if (weatherData?.forecasts?.[0]?.casts) {
      const casts = weatherData.forecasts[0].casts
      let weatherInfo = '\n天气预报信息：\n'

      casts.slice(0, days).forEach((day) => {
        weatherInfo += `${day.date} ${day.week}: 白天${day.dayweather}，${day.daytemp}°C，${day.daywind}风${day.daypower}级；`
        weatherInfo += `晚上${day.nightweather}，${day.nighttemp}°C，${day.nightwind}风${day.nightpower}级\n`
      })

      weatherInfo += '\n请根据天气情况合理安排活动，如遇雨天建议安排室内活动，晴天适合户外游览。\n'
      return weatherInfo
    }
  } catch (error) {
    logger.warn('获取天气信息失败，继续生成行程', { error })
  }

  return ''
}

/**
 * 确保用户 profile 存在
 */
async function ensureUserProfile(supabase: any, userId: string, email?: string): Promise<void> {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingProfile) {
    logger.info('创建用户 profile', { userId })

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email || '',
        name: email?.split('@')[0] || 'User',
      })

    if (profileError) {
      logger.error('创建 profile 失败', profileError as Error)
      throw new ConfigurationError('无法创建用户配置，请检查数据库 RLS 策略')
    }
  }
}

/**
 * 保存行程到数据库
 */
async function saveTripToDatabase(
  supabase: any,
  userId: string,
  formData: TripFormData,
  itinerary: Itinerary
) {
  const tripData: any = {
    user_id: userId,
    destination: formData.destination,
    start_date: formData.start_date,
    end_date: formData.end_date,
    budget: formData.budget,
    travelers: formData.travelers,
    adult_count: formData.adult_count,
    child_count: formData.child_count,
    preferences: formData.preferences,
    itinerary,
    status: 'planned',
  }

  // 添加可选字段
  if (formData.origin) tripData.origin = formData.origin
  if (formData.start_time) tripData.start_time = formData.start_time
  if (formData.end_time) tripData.end_time = formData.end_time

  const { data: trip, error } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single()

  if (error) {
    logger.error('保存行程失败', error as Error)
    throw error
  }

  return trip
}

/**
 * POST /api/generate-itinerary
 * 生成 AI 旅行行程
 */
export async function POST(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析请求体
    const formData: TripFormData = await request.json()

    // 验证必填字段
    if (!formData.destination || !formData.start_date || !formData.end_date) {
      throw new ValidationError('缺少必填字段：目的地、开始日期或结束日期')
    }

    // 获取选择的模型配置
    const selectedModel = formData.model || 'claude-haiku-4-5'
    const modelConfig = getModelById(selectedModel)

    if (!modelConfig) {
      throw new ValidationError('无效的模型选择')
    }

    logger.info('开始生成行程', {
      userId: user.id,
      destination: formData.destination,
      model: selectedModel,
    })

    // 计算行程天数
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 获取天气信息（可选）
    const weatherInfo = await fetchWeatherInfo(formData.destination, days)

    // 检查用户 API Key 配置
    const userApiKeyConfig = await ApiKeyClient.getUserConfig(
      user.id,
      modelConfig.provider as 'deepseek' | 'modelscope',
      supabase
    )

    // 确定使用的 API Key
    const apiKey = userApiKeyConfig?.apiKey ||
      (modelConfig.provider === 'deepseek' ? config.deepseek.apiKey : config.modelscope.apiKey)

    const baseURL = userApiKeyConfig?.baseUrl ||
      (modelConfig.provider === 'deepseek' ? config.deepseek.baseURL : config.modelscope.baseURL)

    if (!apiKey) {
      throw new ConfigurationError(
        `未配置 ${modelConfig.provider === 'deepseek' ? 'DeepSeek' : 'ModelScope'} API Key。` +
        '请在"设置 → API Key 管理"中添加，或在环境变量中配置。'
      )
    }

    logger.info('使用 API Key', {
      provider: modelConfig.provider,
      source: userApiKeyConfig ? '用户自定义' : '系统默认',
    })

    // 创建 AI 客户端
    const aiClient = createAIClient({ apiKey, baseURL })

    // 构建提示词
    const prompt = buildItineraryPrompt(formData, weatherInfo)

    // 调用 AI 生成行程
    logger.info('调用 AI 生成行程...')
    let itinerary = await generateItinerary(
      aiClient,
      modelConfig.provider === 'deepseek' ? config.deepseek.model : selectedModel,
      prompt,
      modelConfig.maxTokens
    )

    // 修正坐标：WGS84 → GCJ-02
    logger.info('修正坐标...')
    itinerary = await correctItineraryCoordinates(itinerary, formData.destination)

    // 地理位置聚类优化
    logger.info('应用地理聚类优化...')
    itinerary = optimizeItineraryByClustering(itinerary, 1000)

    // 确保 profile 存在
    await ensureUserProfile(supabase, user.id, user.email)

    // 保存到数据库
    logger.info('保存行程到数据库...')
    const trip = await saveTripToDatabase(supabase, user.id, formData, itinerary)

    logger.info('行程生成成功', {
      tripId: trip.id,
      days: itinerary.days?.length || 0,
    })

    return successResponse(
      {
        trip_id: trip.id,
        itinerary,
      },
      '行程生成成功'
    )
  } catch (error) {
    return handleApiError(error, 'POST /api/generate-itinerary')
  }
}
