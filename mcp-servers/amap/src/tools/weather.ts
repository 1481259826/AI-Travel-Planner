/**
 * 天气查询工具
 * 使用高德天气 API
 */

import { httpGet, buildUrl, AMAP_ENDPOINTS } from '../utils/http.js'
import type {
  AmapDistrictResponse,
  AmapWeatherResponse,
  WeatherResult,
  WeatherParams,
} from '../types.js'

/**
 * 获取 API Key
 */
function getApiKey(): string {
  const apiKey = process.env.AMAP_API_KEY || process.env.AMAP_WEB_SERVICE_KEY
  if (!apiKey) {
    throw new Error('AMAP_API_KEY or AMAP_WEB_SERVICE_KEY environment variable is required')
  }
  return apiKey
}

/**
 * 根据城市名称获取 Adcode（行政区划代码）
 * @param cityName 城市名称
 * @returns Adcode 或 null
 */
export async function getCityAdcode(cityName: string): Promise<string | null> {
  const apiKey = getApiKey()

  const url = buildUrl(AMAP_ENDPOINTS.district, {
    key: apiKey,
    keywords: cityName,
    subdistrict: 0,
  })

  try {
    const response = await httpGet<AmapDistrictResponse>(url)

    if (response.status !== '1' || !response.districts || response.districts.length === 0) {
      console.error('City not found:', cityName, 'Response:', response.info)
      return null
    }

    return response.districts[0].adcode
  } catch (error) {
    console.error('Error fetching adcode for city:', cityName, error)
    return null
  }
}

/**
 * 标准化城市名称（去除市/区/县后缀）
 */
function normalizeCityName(cityName: string): string {
  return cityName
    .replace(/市$/, '')
    .replace(/区$/, '')
    .replace(/县$/, '')
    .trim()
}

/**
 * 获取天气预报
 * @param params 查询参数
 * @returns 天气结果
 */
export async function getWeatherForecast(params: WeatherParams): Promise<WeatherResult | null> {
  const apiKey = getApiKey()
  const { city, extensions = 'all' } = params

  // 尝试获取城市 adcode
  let adcode = await getCityAdcode(city)

  // 如果原始名称失败，尝试标准化后的名称
  if (!adcode) {
    const normalizedCity = normalizeCityName(city)
    if (normalizedCity !== city) {
      adcode = await getCityAdcode(normalizedCity)
    }
  }

  if (!adcode) {
    console.error('Failed to get adcode for city:', city)
    return null
  }

  const url = buildUrl(AMAP_ENDPOINTS.weather, {
    key: apiKey,
    city: adcode,
    extensions,
  })

  try {
    const response = await httpGet<AmapWeatherResponse>(url)

    if (response.status !== '1') {
      console.error('Weather API error:', response.info)
      return null
    }

    // 根据 extensions 返回不同结构的数据
    if (extensions === 'base' && response.lives && response.lives.length > 0) {
      const live = response.lives[0]
      return {
        city: live.city,
        province: live.province,
        adcode: live.adcode,
        reporttime: live.reporttime,
        live,
      }
    }

    if (extensions === 'all' && response.forecasts && response.forecasts.length > 0) {
      const forecast = response.forecasts[0]
      return {
        city: forecast.city,
        province: forecast.province,
        adcode: forecast.adcode,
        reporttime: forecast.reporttime,
        forecasts: forecast.casts,
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

/**
 * 获取天气图标（根据天气描述返回 emoji）
 */
export function getWeatherIcon(weatherText: string): string {
  if (weatherText.includes('晴')) return '☀️'
  if (weatherText.includes('云') || weatherText.includes('阴')) return '☁️'
  if (weatherText.includes('雨')) return '🌧️'
  if (weatherText.includes('雪')) return '❄️'
  if (weatherText.includes('雷')) return '⛈️'
  if (weatherText.includes('雾') || weatherText.includes('霾')) return '🌫️'
  return '🌤️'
}

/**
 * 获取天气建议
 */
export function getWeatherAdvice(weatherText: string): string {
  if (weatherText.includes('雨')) {
    return '建议携带雨具，优先安排室内活动'
  } else if (weatherText.includes('雪')) {
    return '注意保暖防滑，道路可能湿滑'
  } else if (weatherText.includes('雾') || weatherText.includes('霾')) {
    return '能见度较低，注意交通安全'
  } else if (weatherText.includes('晴')) {
    return '天气晴朗，适合户外活动'
  } else if (weatherText.includes('云') || weatherText.includes('阴')) {
    return '天气适宜，适合出行'
  } else {
    return '请根据实际天气情况做好准备'
  }
}

/**
 * MCP 工具定义
 */
export const weatherToolDefinition = {
  name: 'get_weather_forecast',
  description: '获取城市天气预报（实时天气或未来3天预报）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: '城市名称（如：北京、上海、杭州）',
      },
      extensions: {
        type: 'string',
        enum: ['base', 'all'],
        description: '返回数据类型：base=实时天气，all=未来3天预报（默认）',
        default: 'all',
      },
    },
    required: ['city'],
  },
}

/**
 * MCP 工具处理函数
 */
export async function handleWeatherTool(args: WeatherParams): Promise<string> {
  const result = await getWeatherForecast(args)

  if (!result) {
    return JSON.stringify({
      error: true,
      message: `无法获取 ${args.city} 的天气信息，请检查城市名称是否正确`,
    })
  }

  // 增强输出，添加图标和建议
  const enhanced = {
    ...result,
    forecasts: result.forecasts?.map((f) => ({
      ...f,
      dayIcon: getWeatherIcon(f.dayweather),
      nightIcon: getWeatherIcon(f.nightweather),
      advice: getWeatherAdvice(f.dayweather),
    })),
    live: result.live
      ? {
          ...result.live,
          icon: getWeatherIcon(result.live.weather),
          advice: getWeatherAdvice(result.live.weather),
        }
      : undefined,
  }

  return JSON.stringify(enhanced, null, 2)
}
