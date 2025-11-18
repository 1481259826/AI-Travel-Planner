import { appConfig } from './config'
import https from 'https'

/**
 * 高德地图天气API集成
 * 文档：https://lbs.amap.com/api/webservice/guide/api/weatherinfo
 */

/**
 * 绕过代理发送 HTTPS GET 请求
 */
function fetchWithoutProxy(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Travel-Planner/1.0',
      },
      agent: false, // 不使用代理
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data || 'Empty response'}`))
          return
        }

        if (!data) {
          reject(new Error('Empty response body'))
          return
        }

        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${data.substring(0, 200)}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

// 高德天气数据类型
export interface AmapWeatherLive {
  province: string       // 省份
  city: string          // 城市
  adcode: string        // 区域编码
  weather: string       // 天气现象（中文描述）
  temperature: string   // 实时气温
  winddirection: string // 风向
  windpower: string     // 风力级别
  humidity: string      // 空气湿度
  reporttime: string    // 数据发布时间
}

export interface AmapWeatherForecast {
  date: string          // 日期
  week: string          // 星期几
  dayweather: string    // 白天天气现象
  nightweather: string  // 晚上天气现象
  daytemp: string       // 白天温度
  nighttemp: string     // 晚上温度
  daywind: string       // 白天风向
  nightwind: string     // 晚上风向
  daypower: string      // 白天风力
  nightpower: string    // 晚上风力
}

export interface AmapWeatherResponse {
  status: string        // 返回状态（1=成功，0=失败）
  count: string         // 返回结果数目
  info: string          // 返回状态说明
  infocode: string      // 返回状态码
  lives?: AmapWeatherLive[]        // 实况天气数据
  forecasts?: Array<{               // 预报天气数据
    city: string
    adcode: string
    province: string
    reporttime: string
    casts: AmapWeatherForecast[]   // 未来天气预报
  }>
}

export interface AmapDistrictResponse {
  status: string
  info: string
  infocode: string
  count: string
  suggestion?: any
  districts: Array<{
    citycode: string
    adcode: string      // 区域编码
    name: string        // 行政区名称
    center: string      // 区域中心点
    level: string       // 行政区级别
    districts?: any[]
  }>
}

/**
 * 根据城市名称获取 Adcode（行政区划代码）
 * @param cityName 城市名称
 * @returns Adcode 或 null
 */
export async function getCityAdcode(cityName: string): Promise<string | null> {
  const apiKey = appConfig.map.webServiceKey

  if (!apiKey) {
    console.error('Amap Web Service API key not configured')
    return null
  }

  try {
    const url = `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(cityName)}&key=${apiKey}&subdistrict=0`
    console.log('Fetching adcode for:', cityName)

    const data: AmapDistrictResponse = await fetchWithoutProxy(url)

    if (data.status !== '1' || !data.districts || data.districts.length === 0) {
      console.error('City not found:', cityName, 'Response:', data.info)
      return null
    }

    // 返回第一个匹配的城市 adcode
    const adcode = data.districts[0].adcode
    console.log('Found adcode:', adcode, 'for city:', cityName)
    return adcode
  } catch (error) {
    console.error('Error fetching adcode:', error)
    return null
  }
}

/**
 * 获取天气预报（包含实况和未来3天）
 * @param adcode 城市的行政区划代码
 * @returns 天气数据或 null
 */
export async function getWeatherByAdcode(adcode: string): Promise<AmapWeatherResponse | null> {
  const apiKey = appConfig.map.webServiceKey

  if (!apiKey) {
    console.error('Amap Web Service API key not configured')
    return null
  }

  try {
    // extensions=all 获取预报天气，extensions=base 获取实况天气
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${apiKey}&extensions=all`

    const data: AmapWeatherResponse = await fetchWithoutProxy(url)

    if (data.status !== '1') {
      console.error('Weather API error:', data.info)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

/**
 * 标准化城市名称（去除市/区/县后缀）
 * @param cityName 原始城市名称
 * @returns 标准化后的城市名称
 */
function normalizeCityName(cityName: string): string {
  // 去除常见的行政区划后缀
  return cityName
    .replace(/市$/, '')
    .replace(/区$/, '')
    .replace(/县$/, '')
    .trim()
}

/**
 * 根据城市名称获取天气预报（组合函数）
 * @param cityName 城市名称
 * @returns 天气数据或 null
 */
export async function getWeatherByCityName(cityName: string): Promise<AmapWeatherResponse | null> {
  // 标准化城市名称
  const normalizedCity = normalizeCityName(cityName)

  console.log(`Fetching weather for: ${cityName} (normalized: ${normalizedCity})`)

  // 先尝试原始名称
  let adcode = await getCityAdcode(cityName)

  // 如果原始名称失败，尝试标准化后的名称
  if (!adcode && normalizedCity !== cityName) {
    console.log(`Retrying with normalized city name: ${normalizedCity}`)
    adcode = await getCityAdcode(normalizedCity)
  }

  if (!adcode) {
    console.error(`Failed to get adcode for city: ${cityName} (also tried: ${normalizedCity})`)
    return null
  }

  // 再获取天气数据
  return await getWeatherByAdcode(adcode)
}

/**
 * 获取天气图标（根据天气描述返回emoji）
 * @param weatherText 天气描述
 * @returns emoji图标
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
 * @param weatherText 天气描述
 * @returns 出行建议
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
