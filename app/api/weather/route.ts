import { NextRequest, NextResponse } from 'next/server'
import { getWeatherByCityName, AmapWeatherForecast } from '@/lib/amap-weather'
import { WeatherDaily } from '@/lib/weather'

/**
 * 将高德地图天气数据转换为统一的WeatherDaily格式
 */
function convertAmapToWeatherDaily(amapData: AmapWeatherForecast): WeatherDaily {
  return {
    fxDate: amapData.date,
    tempMax: amapData.daytemp,
    tempMin: amapData.nighttemp,
    textDay: amapData.dayweather,
    textNight: amapData.nightweather,
    iconDay: '', // 高德地图不提供图标代码，使用空字符串
    iconNight: '',
    wind360Day: '',
    windDirDay: amapData.daywind,
    windScaleDay: amapData.daypower,
    windSpeedDay: '',
    humidity: '', // 高德地图预报数据不含湿度
    precip: '',
    pressure: '',
    uvIndex: '',
    vis: '',
  }
}

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

    // 转换为统一格式
    if (weatherData.forecasts && weatherData.forecasts.length > 0) {
      const forecast = weatherData.forecasts[0]
      const daily = forecast.casts.map(convertAmapToWeatherDaily)

      return NextResponse.json({
        code: '200',
        updateTime: forecast.reporttime,
        fxLink: '',
        daily,
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
