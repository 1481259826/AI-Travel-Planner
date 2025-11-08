import { NextRequest, NextResponse } from 'next/server'
import { getWeatherByCityName } from '@/lib/amap-weather'

/**
 * GET /api/weather?city=北京
 * 获取指定城市的天气预报（使用高德地图API）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')

    if (!city) {
      return NextResponse.json(
        { error: 'Missing city parameter' },
        { status: 400 }
      )
    }

    // 获取天气数据（使用高德地图API）
    const weatherData = await getWeatherByCityName(city)

    if (!weatherData) {
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      )
    }

    // 返回高德地图天气数据
    if (weatherData.forecasts && weatherData.forecasts.length > 0) {
      const forecast = weatherData.forecasts[0]

      return NextResponse.json({
        code: '200',
        updateTime: forecast.reporttime,
        city: forecast.city,
        province: forecast.province,
        casts: forecast.casts,
      })
    }

    return NextResponse.json(
      { error: 'No forecast data available' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error in GET /api/weather:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
