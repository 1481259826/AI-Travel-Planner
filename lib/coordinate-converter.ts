/**
 * 坐标系转换工具
 * WGS84（GPS坐标） -> GCJ-02（高德/火星坐标）
 *
 * 参考：https://github.com/wandergis/coordtransform
 */

const PI = Math.PI
const X_PI = (PI * 3000.0) / 180.0
const A = 6378245.0 // 长半轴
const EE = 0.00669342162296594323 // 偏心率平方

/**
 * 判断坐标是否在中国境内
 * @param lng 经度
 * @param lat 纬度
 * @returns 是否在中国境内
 */
function isInChina(lng: number, lat: number): boolean {
  return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271
}

/**
 * 转换经度
 */
function transformLng(lng: number, lat: number): number {
  let ret =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng))
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) *
      2.0) /
    3.0
  ret +=
    ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) /
    3.0
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * PI) +
      300.0 * Math.sin((lng / 30.0) * PI)) *
      2.0) /
    3.0
  return ret
}

/**
 * 转换纬度
 */
function transformLat(lng: number, lat: number): number {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) *
      2.0) /
    3.0
  ret +=
    ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) /
    3.0
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * PI) +
      320.0 * Math.sin((lat * PI) / 30.0)) *
      2.0) /
    3.0
  return ret
}

/**
 * WGS84（GPS坐标）转 GCJ-02（高德/火星坐标）
 * @param wgsLng WGS84经度
 * @param wgsLat WGS84纬度
 * @returns GCJ-02坐标 { lng, lat }
 */
export function wgs84ToGcj02(wgsLng: number, wgsLat: number): { lng: number; lat: number } {
  // 如果不在中国境内，不进行转换
  if (!isInChina(wgsLng, wgsLat)) {
    return { lng: wgsLng, lat: wgsLat }
  }

  let dlat = transformLat(wgsLng - 105.0, wgsLat - 35.0)
  let dlng = transformLng(wgsLng - 105.0, wgsLat - 35.0)
  const radlat = (wgsLat / 180.0) * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI)
  dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI)
  const mglat = wgsLat + dlat
  const mglng = wgsLng + dlng
  return { lng: mglng, lat: mglat }
}

/**
 * GCJ-02（高德/火星坐标）转 WGS84（GPS坐标）
 * @param gcjLng GCJ-02经度
 * @param gcjLat GCJ-02纬度
 * @returns WGS84坐标 { lng, lat }
 */
export function gcj02ToWgs84(gcjLng: number, gcjLat: number): { lng: number; lat: number } {
  // 如果不在中国境内，不进行转换
  if (!isInChina(gcjLng, gcjLat)) {
    return { lng: gcjLng, lat: gcjLat }
  }

  let dlat = transformLat(gcjLng - 105.0, gcjLat - 35.0)
  let dlng = transformLng(gcjLng - 105.0, gcjLat - 35.0)
  const radlat = (gcjLat / 180.0) * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI)
  dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI)
  const mglat = gcjLat + dlat
  const mglng = gcjLng + dlng
  return { lng: gcjLng * 2 - mglng, lat: gcjLat * 2 - mglat }
}

/**
 * 批量转换坐标：WGS84 -> GCJ-02
 * @param coordinates 坐标数组 [{ lng, lat }]
 * @returns 转换后的坐标数组
 */
export function batchWgs84ToGcj02(
  coordinates: Array<{ lng: number; lat: number }>
): Array<{ lng: number; lat: number }> {
  return coordinates.map(coord => wgs84ToGcj02(coord.lng, coord.lat))
}

/**
 * 检测坐标是否可能是 WGS84 坐标系（通过与已知 GCJ-02 坐标的偏移判断）
 * 这是一个启发式方法，不是100%准确
 * @param lng 经度
 * @param lat 纬度
 * @returns 是否可能是 WGS84 坐标
 */
export function isPossiblyWgs84(lng: number, lat: number): boolean {
  if (!isInChina(lng, lat)) {
    return false // 不在中国境内，无法判断
  }

  // 将坐标视为 GCJ-02，转换为 WGS84，然后再转回来
  const wgs = gcj02ToWgs84(lng, lat)
  const gcj = wgs84ToGcj02(wgs.lng, wgs.lat)

  // 计算偏移距离（米）
  const offset = Math.sqrt(
    Math.pow((gcj.lng - lng) * 111000 * Math.cos((lat * PI) / 180), 2) +
    Math.pow((gcj.lat - lat) * 111000, 2)
  )

  // 如果偏移小于10米，说明这个坐标已经是 GCJ-02
  // 如果偏移大于10米，说明可能是 WGS84
  return offset > 10
}
