import { NextRequest, NextResponse } from 'next/server'
import { getWeatherByCityName } from '@/lib/weather'

/**
 * GET /api/weather?city=北京
 * 获取指定城市的7天天气预报
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

    // 获取天气数据
    const weatherData = await getWeatherByCityName(city)

    if (!weatherData) {
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      )
    }

    return NextResponse.json(weatherData)
  } catch (error) {
    console.error('Error in GET /api/weather:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
