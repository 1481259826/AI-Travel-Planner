import config from './config'

/**
 * 和风天气 API 集成
 * 文档：https://dev.qweather.com/docs/api/
 */

// 天气数据类型
export interface WeatherDaily {
  fxDate: string // 预报日期 YYYY-MM-DD
  tempMax: string // 最高温度
  tempMin: string // 最低温度
  textDay: string // 白天天气状况
  textNight: string // 夜间天气状况
  iconDay: string // 白天天气图标代码
  iconNight: string // 夜间天气图标代码
  wind360Day: string // 白天风向角度
  windDirDay: string // 白天风向
  windScaleDay: string // 白天风力等级
  windSpeedDay: string // 白天风速
  humidity: string // 相对湿度
  precip: string // 降水量
  pressure: string // 大气压强
  uvIndex: string // 紫外线强度指数
  vis: string // 能见度
}

export interface WeatherResponse {
  code: string // 状态码
  updateTime: string // 数据更新时间
  fxLink: string // 和风天气详情链接
  daily: WeatherDaily[] // 逐天预报数据
}

export interface LocationInfo {
  name: string // 地点名称
  id: string // Location ID
  lat: string // 纬度
  lon: string // 经度
  adm2: string // 地区/城市的上级行政区划
  adm1: string // 地区/城市所属一级行政区域
  country: string // 地区/城市所属国家名称
  tz: string // 地区/城市所在时区
  utcOffset: string // 地区/城市目前与UTC时间偏移的小时数
  isDst: string // 地区/城市是否当前处于夏令时
  type: string // 地区/城市的属性
  rank: string // 地区评分
  fxLink: string // 和风天气详情链接
}

export interface LocationResponse {
  code: string
  location: LocationInfo[]
}

/**
 * 根据城市名称获取 Location ID
 * @param cityName 城市名称（支持中文）
 * @returns Location ID 或 null
 */
export async function getCityLocationId(cityName: string): Promise<string | null> {
  const apiKey = config.qweather.apiKey

  if (!apiKey) {
    console.error('QWeather API key not configured')
    return null
  }

  try {
    const url = `${config.qweather.baseURL}/v2/city/lookup?location=${encodeURIComponent(cityName)}&key=${apiKey}&lang=zh`

    const response = await fetch(url)

    if (!response.ok) {
      console.error('Failed to fetch location:', response.statusText)
      return null
    }

    const data: LocationResponse = await response.json()

    if (data.code !== '200' || !data.location || data.location.length === 0) {
      console.error('Location not found:', cityName)
      return null
    }

    // 返回第一个匹配的城市 ID（通常是最相关的）
    return data.location[0].id
  } catch (error) {
    console.error('Error fetching location ID:', error)
    return null
  }
}

/**
 * 获取7天天气预报
 * @param location Location ID 或 经纬度（格式：116.41,39.92）
 * @returns 天气预报数据或 null
 */
export async function get7DayWeather(location: string): Promise<WeatherResponse | null> {
  const apiKey = config.qweather.apiKey

  if (!apiKey) {
    console.error('QWeather API key not configured')
    return null
  }

  try {
    const url = `${config.qweather.baseURL}/v7/weather/7d?location=${location}&key=${apiKey}&lang=zh&unit=m`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch weather:', response.statusText)
      return null
    }

    const data: WeatherResponse = await response.json()

    if (data.code !== '200') {
      console.error('Weather API error:', data.code)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

/**
 * 根据城市名称获取7天天气预报（组合函数）
 * @param cityName 城市名称
 * @returns 天气预报数据或 null
 */
export async function getWeatherByCityName(cityName: string): Promise<WeatherResponse | null> {
  // 先获取 Location ID
  const locationId = await getCityLocationId(cityName)

  if (!locationId) {
    return null
  }

  // 再获取天气数据
  return await get7DayWeather(locationId)
}

/**
 * 获取天气图标 URL
 * @param iconCode 天气图标代码
 * @returns 图标 URL
 */
export function getWeatherIconUrl(iconCode: string): string {
  // 和风天气提供的免费图标
  return `https://cdn.qweather.com/img/plugin/190516/i${iconCode}.svg`
}

/**
 * 将天气状况转换为建议
 * @param weatherText 天气状况文本
 * @returns 出行建议
 */
export function getWeatherAdvice(weatherText: string): string {
  const text = weatherText.toLowerCase()

  if (text.includes('雨') || text.includes('rain')) {
    return '建议携带雨具，优先安排室内活动'
  } else if (text.includes('雪') || text.includes('snow')) {
    return '注意保暖防滑，道路可能湿滑'
  } else if (text.includes('雾') || text.includes('霾') || text.includes('fog')) {
    return '能见度较低，注意交通安全'
  } else if (text.includes('晴') || text.includes('sunny') || text.includes('clear')) {
    return '天气晴朗，适合户外活动'
  } else if (text.includes('云') || text.includes('cloudy')) {
    return '天气适宜，适合出行'
  } else if (text.includes('风') || text.includes('wind')) {
    return '风力较大，注意防风'
  } else {
    return '请根据实际天气情况做好准备'
  }
}
