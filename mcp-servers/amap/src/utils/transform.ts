/**
 * 数据转换工具
 * 处理高德 API 返回的数据，转换为统一格式
 */

import type {
  Coordinate,
  CoordinateString,
  AmapPOIResponse,
  POIInfo,
  AmapGeocodeResponse,
  GeocodeResult,
  AmapReverseGeocodeResponse,
  ReverseGeocodeResult,
} from '../types.js'

/**
 * 坐标字符串转坐标对象
 * @param coordStr 坐标字符串 "lng,lat"
 * @returns 坐标对象
 */
export function parseCoordinate(coordStr: CoordinateString): Coordinate {
  const [lng, lat] = coordStr.split(',').map(Number)
  return { lng, lat }
}

/**
 * 坐标对象转坐标字符串
 * @param coord 坐标对象
 * @returns 坐标字符串 "lng,lat"
 */
export function formatCoordinate(coord: Coordinate): CoordinateString {
  return `${coord.lng},${coord.lat}`
}

/**
 * 处理高德 API 返回的字符串或数组字段
 * 有些字段可能返回字符串或空数组
 */
export function normalizeStringField(value: string | string[] | undefined | null): string {
  if (!value) return ''
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : ''
  }
  return value
}

/**
 * 转换 POI 搜索响应
 */
export function transformPOIResponse(response: AmapPOIResponse): POIInfo[] {
  if (!response.pois || !Array.isArray(response.pois)) {
    return []
  }

  return response.pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    type: poi.type,
    typecode: poi.typecode,
    address: normalizeStringField(poi.address),
    location: poi.location,
    tel: normalizeStringField(poi.tel),
    distance: poi.distance,
    rating: poi.biz_ext?.rating,
    cost: poi.biz_ext?.cost,
    opentime: poi.biz_ext?.opentime,
    photos: poi.photos?.map((photo) => ({
      title: photo.title || '',
      url: photo.url,
    })),
    cityname: poi.cityname,
    adname: poi.adname,
  }))
}

/**
 * 转换地理编码响应
 */
export function transformGeocodeResponse(response: AmapGeocodeResponse): GeocodeResult[] {
  if (!response.geocodes || !Array.isArray(response.geocodes)) {
    return []
  }

  return response.geocodes.map((geo) => ({
    formatted_address: geo.formatted_address,
    country: geo.country,
    province: geo.province,
    city: normalizeStringField(geo.city),
    citycode: normalizeStringField(geo.citycode),
    district: normalizeStringField(geo.district),
    adcode: geo.adcode,
    street: normalizeStringField(geo.street),
    number: normalizeStringField(geo.number),
    location: geo.location,
    level: geo.level,
  }))
}

/**
 * 转换逆地理编码响应
 */
export function transformReverseGeocodeResponse(
  response: AmapReverseGeocodeResponse
): ReverseGeocodeResult | null {
  const regeo = response.regeocode
  if (!regeo) {
    return null
  }

  const addr = regeo.addressComponent

  return {
    formatted_address: regeo.formatted_address,
    country: addr.country,
    province: addr.province,
    city: normalizeStringField(addr.city),
    citycode: addr.citycode,
    district: addr.district,
    adcode: addr.adcode,
    township: addr.township,
    neighborhood: {
      name: normalizeStringField(addr.neighborhood?.name),
      type: normalizeStringField(addr.neighborhood?.type),
    },
    building: {
      name: normalizeStringField(addr.building?.name),
      type: normalizeStringField(addr.building?.type),
    },
    streetNumber: {
      street: addr.streetNumber?.street || '',
      number: addr.streetNumber?.number || '',
      location: addr.streetNumber?.location || '',
      direction: addr.streetNumber?.direction || '',
      distance: addr.streetNumber?.distance || '',
    },
    pois: regeo.pois || [],
  }
}

/**
 * 验证坐标字符串格式
 * @param coordStr 坐标字符串
 * @returns 是否有效
 */
export function isValidCoordinateString(coordStr: string): boolean {
  if (!coordStr || typeof coordStr !== 'string') {
    return false
  }

  const parts = coordStr.split(',')
  if (parts.length !== 2) {
    return false
  }

  const [lng, lat] = parts.map(Number)

  // 检查是否是有效数字
  if (isNaN(lng) || isNaN(lat)) {
    return false
  }

  // 检查经纬度范围（中国范围）
  if (lng < 73 || lng > 136 || lat < 3 || lat > 54) {
    return false
  }

  return true
}

/**
 * 格式化距离显示
 * @param meters 米数
 * @returns 格式化后的字符串
 */
export function formatDistance(meters: number | string): string {
  const m = typeof meters === 'string' ? parseInt(meters) : meters

  if (isNaN(m)) {
    return '未知'
  }

  if (m < 1000) {
    return `${m}米`
  }

  return `${(m / 1000).toFixed(1)}公里`
}

/**
 * 格式化时间显示
 * @param seconds 秒数
 * @returns 格式化后的字符串
 */
export function formatDuration(seconds: number | string): string {
  const s = typeof seconds === 'string' ? parseInt(seconds) : seconds

  if (isNaN(s)) {
    return '未知'
  }

  if (s < 60) {
    return `${s}秒`
  }

  if (s < 3600) {
    const minutes = Math.floor(s / 60)
    return `${minutes}分钟`
  }

  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)

  if (minutes === 0) {
    return `${hours}小时`
  }

  return `${hours}小时${minutes}分钟`
}
