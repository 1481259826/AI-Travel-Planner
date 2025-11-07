import config from './config'
import https from 'https'

/**
 * 高德地图地理编码/逆地理编码 API
 * 文档：https://lbs.amap.com/api/webservice/guide/api/georegeo
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

/**
 * 地理编码返回的地点信息
 */
export interface GeocodedLocation {
  formatted_address: string // 结构化地址信息
  province: string          // 省
  city: string              // 市
  district: string          // 区
  adcode: string            // 区域编码
  location: string          // 经纬度（格式："lng,lat"）
  level: string             // 匹配级别
}

/**
 * 地理编码 API 响应
 */
export interface GeocodeResponse {
  status: string
  info: string
  infocode: string
  count: string
  geocodes: GeocodedLocation[]
}

/**
 * 地理编码：根据地址获取经纬度（GCJ-02坐标）
 * @param address 地址字符串，例如："北京市朝阳区阜通东大街6号"
 * @param city 可选，城市名称，用于提高精度
 * @returns 经纬度坐标或null
 */
export async function geocodeAddress(
  address: string,
  city?: string
): Promise<{ lng: number; lat: number; formattedAddress: string } | null> {
  const apiKey = config.map.webServiceKey

  if (!apiKey) {
    console.error('Amap Web Service API key not configured')
    return null
  }

  try {
    let url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}`

    if (city) {
      url += `&city=${encodeURIComponent(city)}`
    }

    console.log('Geocoding address:', address, city ? `in ${city}` : '')

    const data: GeocodeResponse = await fetchWithoutProxy(url)

    if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
      console.error('Geocoding failed:', address, 'Response:', data.info)
      return null
    }

    // 返回第一个匹配的结果
    const location = data.geocodes[0]
    const [lng, lat] = location.location.split(',').map(Number)

    if (isNaN(lng) || isNaN(lat)) {
      console.error('Invalid coordinates from geocoding:', location.location)
      return null
    }

    console.log('Geocoded successfully:', address, '→', lng, lat)

    return {
      lng,
      lat,
      formattedAddress: location.formatted_address,
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * 批量地理编码（带有速率限制）
 * @param addresses 地址列表
 * @param city 城市名称
 * @param delayMs 每次请求间隔（毫秒），默认300ms
 * @returns 坐标列表
 */
export async function batchGeocodeAddresses(
  addresses: string[],
  city?: string,
  delayMs: number = 300
): Promise<Array<{ lng: number; lat: number; formattedAddress: string } | null>> {
  const results: Array<{ lng: number; lat: number; formattedAddress: string } | null> = []

  for (let i = 0; i < addresses.length; i++) {
    if (i > 0) {
      // 添加延迟避免 API 限流
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const result = await geocodeAddress(addresses[i], city)
    results.push(result)
  }

  return results
}

/**
 * POI 搜索返回的地点信息
 */
export interface PoiLocation {
  id: string                // POI ID
  name: string              // 名称
  type: string              // 类型
  address: string           // 地址
  location: string          // 经纬度（格式："lng,lat"）
  pname: string             // 省份
  cityname: string          // 城市
  adname: string            // 区域
  tel?: string              // 电话
  distance?: string         // 距离中心点的距离（米）
  business_area?: string    // 商圈
}

/**
 * POI 搜索 API 响应
 */
export interface PoiSearchResponse {
  status: string
  info: string
  infocode: string
  count: string
  pois: PoiLocation[]
}

/**
 * POI 搜索：根据关键词搜索地点
 * @param keyword 关键词，例如："北京大学"
 * @param city 城市名称或城市编码
 * @param types 类型，例如："190000"（景点）
 * @returns 搜索结果列表
 */
export async function searchPoi(
  keyword: string,
  city?: string,
  types?: string
): Promise<Array<{ name: string; address: string; lng: number; lat: number }> | null> {
  const apiKey = config.map.webServiceKey

  if (!apiKey) {
    console.error('Amap Web Service API key not configured')
    return null
  }

  try {
    let url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&key=${apiKey}`

    if (city) {
      url += `&city=${encodeURIComponent(city)}`
    }

    if (types) {
      url += `&types=${types}`
    }

    console.log('Searching POI:', keyword, city ? `in ${city}` : '')

    const data: PoiSearchResponse = await fetchWithoutProxy(url)

    if (data.status !== '1' || !data.pois || data.pois.length === 0) {
      console.error('POI search failed:', keyword, 'Response:', data.info)
      return null
    }

    // 返回所有匹配的结果
    const results = data.pois.map(poi => {
      const [lng, lat] = poi.location.split(',').map(Number)
      return {
        name: poi.name,
        address: poi.address,
        lng,
        lat,
      }
    })

    console.log(`POI search found ${results.length} results for:`, keyword)

    return results
  } catch (error) {
    console.error('Error searching POI:', error)
    return null
  }
}

/**
 * 智能地理编码：优先使用 POI 搜索，失败则使用地址编码
 * @param query 地点名称或地址
 * @param city 城市名称
 * @returns 经纬度坐标或null
 */
export async function smartGeocode(
  query: string,
  city?: string
): Promise<{ lng: number; lat: number; formattedAddress: string } | null> {
  // 先尝试 POI 搜索（对于景点、餐厅等更准确）
  const poiResults = await searchPoi(query, city)

  if (poiResults && poiResults.length > 0) {
    const firstResult = poiResults[0]
    return {
      lng: firstResult.lng,
      lat: firstResult.lat,
      formattedAddress: firstResult.address || firstResult.name,
    }
  }

  // POI 搜索失败，尝试地址编码
  return await geocodeAddress(query, city)
}
