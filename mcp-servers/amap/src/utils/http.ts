/**
 * HTTP 请求工具
 * 使用 Node.js 原生 https 模块，绕过代理
 */

import https from 'node:https'
import http from 'node:http'

/**
 * HTTP 请求选项
 */
export interface HttpRequestOptions {
  timeout?: number
  headers?: Record<string, string>
}

/**
 * 绕过代理发送 HTTP/HTTPS GET 请求
 * @param url 请求 URL
 * @param options 请求选项
 * @returns JSON 响应
 */
export function httpGet<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const httpModule = isHttps ? https : http

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AMap-MCP-Server/1.0',
        ...options.headers,
      },
      agent: false, // 不使用代理
    }

    const req = httpModule.request(requestOptions, (res) => {
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
          const json = JSON.parse(data) as T
          resolve(json)
        } catch {
          reject(new Error(`Failed to parse JSON: ${data.substring(0, 200)}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(options.timeout || 10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

/**
 * 构建带查询参数的 URL
 * @param baseUrl 基础 URL
 * @param params 查询参数
 * @returns 完整 URL
 */
export function buildUrl(baseUrl: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(baseUrl)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value))
    }
  }

  return url.toString()
}

/**
 * 高德 API 基础 URL
 */
export const AMAP_API_BASE = 'https://restapi.amap.com'

/**
 * 高德 API 端点
 */
export const AMAP_ENDPOINTS = {
  // 行政区查询
  district: `${AMAP_API_BASE}/v3/config/district`,
  // 天气查询
  weather: `${AMAP_API_BASE}/v3/weather/weatherInfo`,
  // POI 搜索（v5 版本，支持更多字段）
  poiSearch: `${AMAP_API_BASE}/v5/place/text`,
  // 周边搜索
  poiAround: `${AMAP_API_BASE}/v5/place/around`,
  // 驾车路线规划
  drivingRoute: `${AMAP_API_BASE}/v3/direction/driving`,
  // 步行路线规划
  walkingRoute: `${AMAP_API_BASE}/v3/direction/walking`,
  // 公交路线规划
  transitRoute: `${AMAP_API_BASE}/v3/direction/transit/integrated`,
  // 地理编码
  geocode: `${AMAP_API_BASE}/v3/geocode/geo`,
  // 逆地理编码
  reverseGeocode: `${AMAP_API_BASE}/v3/geocode/regeo`,
  // 距离计算
  distance: `${AMAP_API_BASE}/v3/distance`,
} as const
