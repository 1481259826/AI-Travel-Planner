/**
 * Geocoding Service
 * 统一管理地理编码、POI 搜索、坐标转换等功能
 */

import { logger } from '@/lib/logger'
import config from '@/lib/config'
import { wgs84ToGcj02, gcj02ToWgs84 } from '@/lib/coordinate-converter'
import https from 'https'

/**
 * 地理编码结果
 */
export interface GeocodingResult {
  lng: number
  lat: number
  formattedAddress: string
  province?: string
  city?: string
  district?: string
  adcode?: string
}

/**
 * POI 搜索结果
 */
export interface PoiResult {
  id: string
  name: string
  type: string
  address: string
  lng: number
  lat: number
  province?: string
  city?: string
  district?: string
  tel?: string
  distance?: number
  businessArea?: string
}

/**
 * 批量地理编码选项
 */
export interface BatchGeocodingOptions {
  city?: string
  delayMs?: number
  maxRetries?: number
}

/**
 * 地理编码服务类
 */
export class GeocodingService {
  private apiKey: string
  private serviceName = 'GeocodingService'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.map.webServiceKey || ''

    if (!this.apiKey) {
      logger.warn(`${this.serviceName}: No API key configured`)
    }
  }

  /**
   * 绕过代理发送 HTTPS GET 请求
   */
  private fetchWithoutProxy(url: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url)

      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          Accept: 'application/json',
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
   * 地理编码：根据地址获取经纬度（GCJ-02坐标）
   */
  async geocodeAddress(address: string, city?: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      logger.error(`${this.serviceName}: API key not configured`)
      return null
    }

    logger.debug(`${this.serviceName}: Geocoding address`, { address, city })

    try {
      let url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${this.apiKey}`

      if (city) {
        url += `&city=${encodeURIComponent(city)}`
      }

      const data = (await this.fetchWithoutProxy(url)) as {
        status: string
        info: string
        geocodes?: Array<{
          formatted_address: string
          province: string
          city: string
          district: string
          adcode: string
          location: string
        }>
      }

      if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
        logger.warn(`${this.serviceName}: Geocoding failed`, { address, info: data.info })
        return null
      }

      const location = data.geocodes[0]
      const [lng, lat] = location.location.split(',').map(Number)

      if (isNaN(lng) || isNaN(lat)) {
        logger.error(`${this.serviceName}: Invalid coordinates`, { location: location.location })
        return null
      }

      logger.debug(`${this.serviceName}: Geocoded successfully`, { address, lng, lat })

      return {
        lng,
        lat,
        formattedAddress: location.formatted_address,
        province: location.province,
        city: location.city,
        district: location.district,
        adcode: location.adcode,
      }
    } catch (error) {
      logger.error(`${this.serviceName}: Error geocoding address`, error as Error, { address })
      return null
    }
  }

  /**
   * 批量地理编码（带速率限制）
   */
  async batchGeocodeAddresses(
    addresses: string[],
    options: BatchGeocodingOptions = {}
  ): Promise<Array<GeocodingResult | null>> {
    const { city, delayMs = 300, maxRetries = 2 } = options

    logger.debug(`${this.serviceName}: Batch geocoding`, {
      count: addresses.length,
      city,
      delayMs,
    })

    const results: Array<GeocodingResult | null> = []

    for (let i = 0; i < addresses.length; i++) {
      if (i > 0) {
        // 添加延迟避免 API 限流
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      let result: GeocodingResult | null = null
      let retries = 0

      // 重试机制
      while (retries <= maxRetries && !result) {
        result = await this.geocodeAddress(addresses[i], city)

        if (!result && retries < maxRetries) {
          retries++
          logger.debug(`${this.serviceName}: Retrying geocoding`, {
            address: addresses[i],
            attempt: retries + 1,
          })
          await new Promise((resolve) => setTimeout(resolve, delayMs * 2))
        }
      }

      results.push(result)
    }

    const successCount = results.filter((r) => r !== null).length
    logger.info(`${this.serviceName}: Batch geocoding completed`, {
      total: addresses.length,
      success: successCount,
      failed: addresses.length - successCount,
    })

    return results
  }

  /**
   * POI 搜索：根据关键词和城市搜索地点
   */
  async searchPoi(
    keywords: string,
    city?: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PoiResult[]> {
    if (!this.apiKey) {
      logger.error(`${this.serviceName}: API key not configured`)
      return []
    }

    const { limit = 10, offset = 0 } = options

    logger.debug(`${this.serviceName}: Searching POI`, { keywords, city, limit })

    try {
      let url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keywords)}&key=${this.apiKey}&offset=${limit}&page=${Math.floor(offset / limit) + 1}`

      if (city) {
        url += `&city=${encodeURIComponent(city)}`
      }

      const data = (await this.fetchWithoutProxy(url)) as {
        status: string
        info: string
        count: string
        pois?: Array<{
          id: string
          name: string
          type: string
          address: string
          location: string
          pname: string
          cityname: string
          adname: string
          tel?: string
          distance?: string
          business_area?: string
        }>
      }

      if (data.status !== '1' || !data.pois || data.pois.length === 0) {
        logger.warn(`${this.serviceName}: POI search failed`, { keywords, info: data.info })
        return []
      }

      const results: PoiResult[] = data.pois.map((poi) => {
        const [lng, lat] = poi.location.split(',').map(Number)
        return {
          id: poi.id,
          name: poi.name,
          type: poi.type,
          address: poi.address,
          lng,
          lat,
          province: poi.pname,
          city: poi.cityname,
          district: poi.adname,
          tel: poi.tel,
          distance: poi.distance ? parseInt(poi.distance) : undefined,
          businessArea: poi.business_area,
        }
      })

      logger.debug(`${this.serviceName}: Found ${results.length} POIs`)

      return results
    } catch (error) {
      logger.error(`${this.serviceName}: Error searching POI`, error as Error, { keywords })
      return []
    }
  }

  /**
   * 智能地理编码：优先使用 POI 搜索，回退到地理编码
   */
  async smartGeocode(
    query: string,
    city?: string
  ): Promise<GeocodingResult | PoiResult | null> {
    logger.debug(`${this.serviceName}: Smart geocoding`, { query, city })

    // 先尝试 POI 搜索（更精确）
    const pois = await this.searchPoi(query, city, { limit: 1 })
    if (pois.length > 0) {
      logger.debug(`${this.serviceName}: Found POI match`)
      return pois[0]
    }

    // 回退到地理编码
    logger.debug(`${this.serviceName}: Falling back to geocoding`)
    return await this.geocodeAddress(query, city)
  }

  /**
   * WGS84 转 GCJ-02（中国坐标系转换）
   */
  convertWgs84ToGcj02(lng: number, lat: number): { lng: number; lat: number } {
    logger.debug(`${this.serviceName}: Converting WGS84 to GCJ-02`, { lng, lat })
    return wgs84ToGcj02(lng, lat)
  }

  /**
   * GCJ-02 转 WGS84
   */
  convertGcj02ToWgs84(lng: number, lat: number): { lng: number; lat: number } {
    logger.debug(`${this.serviceName}: Converting GCJ-02 to WGS84`, { lng, lat })
    return gcj02ToWgs84(lng, lat)
  }

  /**
   * 批量坐标转换（WGS84 → GCJ-02）
   */
  batchConvertWgs84ToGcj02(
    coordinates: Array<{ lng: number; lat: number }>
  ): Array<{ lng: number; lat: number }> {
    logger.debug(`${this.serviceName}: Batch converting coordinates`, {
      count: coordinates.length,
    })

    return coordinates.map((coord) => wgs84ToGcj02(coord.lng, coord.lat))
  }

  /**
   * 计算两点之间的距离（米）
   */
  calculateDistance(
    point1: { lng: number; lat: number },
    point2: { lng: number; lat: number }
  ): number {
    const R = 6371000 // 地球半径（米）
    const lat1Rad = (point1.lat * Math.PI) / 180
    const lat2Rad = (point2.lat * Math.PI) / 180
    const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180
    const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * 验证坐标是否在中国境内
   */
  isInChina(lng: number, lat: number): boolean {
    return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271
  }
}
