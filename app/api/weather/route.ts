/**
 * API: /api/weather
 * 天气查询服务
 */

import { NextRequest } from 'next/server'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { getWeatherByCityName } from '@/lib/amap-weather'
import { ValidationError, APIError } from '@/lib/errors'

/**
 * GET /api/weather?city=北京
 * 获取指定城市的天气预报（使用高德地图 API）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')

    if (!city) {
      throw new ValidationError('缺少必填参数：city')
    }

    // 获取天气数据（使用高德地图 API）
    const weatherData = await getWeatherByCityName(city)

    if (!weatherData) {
      throw new APIError('天气数据获取失败', 500)
    }

    // 返回高德地图天气数据
    if (weatherData.forecasts && weatherData.forecasts.length > 0) {
      const forecast = weatherData.forecasts[0]

      return successResponse({
        code: '200',
        updateTime: forecast.reporttime,
        city: forecast.city,
        province: forecast.province,
        casts: forecast.casts,
      })
    }

    throw new APIError('暂无天气预报数据', 500)
  } catch (error) {
    return handleApiError(error, 'GET /api/weather')
  }
}
