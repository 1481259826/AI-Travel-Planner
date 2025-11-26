/**
 * AMap MCP Server 类型定义
 */

// ============== 基础类型 ==============

/**
 * 坐标点
 */
export interface Coordinate {
  lng: number
  lat: number
}

/**
 * 坐标字符串格式（高德 API 使用）
 * 格式: "lng,lat"
 */
export type CoordinateString = string

// ============== 天气相关类型 ==============

/**
 * 实时天气数据
 */
export interface WeatherLive {
  province: string
  city: string
  adcode: string
  weather: string
  temperature: string
  winddirection: string
  windpower: string
  humidity: string
  reporttime: string
}

/**
 * 天气预报数据
 */
export interface WeatherForecast {
  date: string
  week: string
  dayweather: string
  nightweather: string
  daytemp: string
  nighttemp: string
  daywind: string
  nightwind: string
  daypower: string
  nightpower: string
}

/**
 * 天气查询结果
 */
export interface WeatherResult {
  city: string
  province: string
  adcode: string
  reporttime: string
  live?: WeatherLive
  forecasts?: WeatherForecast[]
}

// ============== POI 相关类型 ==============

/**
 * POI 照片
 */
export interface POIPhoto {
  title: string
  url: string
}

/**
 * POI 信息
 */
export interface POIInfo {
  id: string
  name: string
  type: string
  typecode: string
  address: string
  location: CoordinateString
  tel?: string
  distance?: string
  rating?: string
  cost?: string
  photos?: POIPhoto[]
  opentime?: string
  cityname?: string
  adname?: string
}

/**
 * POI 搜索结果
 */
export interface POISearchResult {
  count: number
  pois: POIInfo[]
}

// ============== 路线规划相关类型 ==============

/**
 * 步行/骑行路线步骤
 */
export interface RouteStep {
  instruction: string
  orientation?: string
  road?: string
  distance: string
  duration?: string
  polyline?: string
}

/**
 * 步行路线
 */
export interface WalkingRoute {
  distance: string
  duration: string
  steps: RouteStep[]
}

/**
 * 驾车路线
 */
export interface DrivingRoute {
  distance: string
  duration: string
  tolls: string
  toll_distance: string
  traffic_lights: string
  steps: RouteStep[]
  polyline?: string
}

/**
 * 公交换乘段
 */
export interface TransitSegment {
  walking?: {
    distance: string
    duration: string
    steps: RouteStep[]
  }
  bus?: {
    buslines: Array<{
      name: string
      type: string
      departure_stop: {
        name: string
        location: CoordinateString
      }
      arrival_stop: {
        name: string
        location: CoordinateString
      }
      via_num: string
      via_stops: Array<{
        name: string
        location: CoordinateString
      }>
      distance: string
      duration: string
    }>
  }
  railway?: {
    name: string
    trip: string
    departure_stop: {
      name: string
      location: CoordinateString
      time: string
    }
    arrival_stop: {
      name: string
      location: CoordinateString
      time: string
    }
    distance: string
    time: string
  }
}

/**
 * 公交路线
 */
export interface TransitRoute {
  cost: string
  duration: string
  walking_distance: string
  transit_distance: string
  segments: TransitSegment[]
}

/**
 * 路线规划结果
 */
export interface RouteResult<T> {
  origin: CoordinateString
  destination: CoordinateString
  routes: T[]
}

// ============== 地理编码相关类型 ==============

/**
 * 地理编码结果
 */
export interface GeocodeResult {
  formatted_address: string
  country: string
  province: string
  city: string
  citycode: string
  district: string
  adcode: string
  street: string
  number: string
  location: CoordinateString
  level: string
}

/**
 * 逆地理编码结果
 */
export interface ReverseGeocodeResult {
  formatted_address: string
  country: string
  province: string
  city: string
  citycode: string
  district: string
  adcode: string
  township: string
  neighborhood: {
    name: string
    type: string
  }
  building: {
    name: string
    type: string
  }
  streetNumber: {
    street: string
    number: string
    location: CoordinateString
    direction: string
    distance: string
  }
  pois: Array<{
    id: string
    name: string
    type: string
    tel: string
    address: string
    location: CoordinateString
    distance: string
  }>
}

// ============== 距离计算相关类型 ==============

/**
 * 距离计算结果
 */
export interface DistanceResult {
  origin_id: string
  dest_id: string
  distance: string
  duration: string
}

// ============== 高德 API 响应基础类型 ==============

/**
 * 高德 API 基础响应
 */
export interface AmapBaseResponse {
  status: string
  info: string
  infocode: string
}

/**
 * 行政区查询响应
 */
export interface AmapDistrictResponse extends AmapBaseResponse {
  count: string
  districts: Array<{
    citycode: string
    adcode: string
    name: string
    center: CoordinateString
    level: string
    districts?: Array<{
      citycode: string
      adcode: string
      name: string
      center: CoordinateString
      level: string
    }>
  }>
}

/**
 * 天气查询响应
 */
export interface AmapWeatherResponse extends AmapBaseResponse {
  count: string
  lives?: WeatherLive[]
  forecasts?: Array<{
    city: string
    adcode: string
    province: string
    reporttime: string
    casts: WeatherForecast[]
  }>
}

/**
 * POI 搜索响应
 */
export interface AmapPOIResponse extends AmapBaseResponse {
  count: string
  pois: Array<{
    id: string
    name: string
    type: string
    typecode: string
    address: string | string[]
    location: CoordinateString
    tel?: string | string[]
    distance?: string
    biz_ext?: {
      rating?: string
      cost?: string
      opentime?: string
    }
    photos?: Array<{
      title: string
      url: string
    }>
    cityname?: string
    adname?: string
  }>
}

/**
 * 路线规划响应（驾车）
 */
export interface AmapDrivingResponse extends AmapBaseResponse {
  count: string
  route: {
    origin: CoordinateString
    destination: CoordinateString
    paths: Array<{
      distance: string
      duration: string
      tolls: string
      toll_distance: string
      traffic_lights: string
      steps: Array<{
        instruction: string
        orientation: string
        road: string
        distance: string
        tolls: string
        toll_distance: string
        toll_road: string
        duration: string
        polyline: string
      }>
    }>
  }
}

/**
 * 路线规划响应（步行）
 */
export interface AmapWalkingResponse extends AmapBaseResponse {
  count: string
  route: {
    origin: CoordinateString
    destination: CoordinateString
    paths: Array<{
      distance: string
      duration: string
      steps: Array<{
        instruction: string
        orientation: string
        road: string
        distance: string
        duration: string
        polyline: string
      }>
    }>
  }
}

/**
 * 地理编码响应
 */
export interface AmapGeocodeResponse extends AmapBaseResponse {
  count: string
  geocodes: Array<{
    formatted_address: string
    country: string
    province: string
    city: string | string[]
    citycode: string | string[]
    district: string | string[]
    adcode: string
    street: string | string[]
    number: string | string[]
    location: CoordinateString
    level: string
  }>
}

/**
 * 逆地理编码响应
 */
export interface AmapReverseGeocodeResponse extends AmapBaseResponse {
  regeocode: {
    formatted_address: string
    addressComponent: {
      country: string
      province: string
      city: string | string[]
      citycode: string
      district: string
      adcode: string
      township: string
      neighborhood: {
        name: string | string[]
        type: string | string[]
      }
      building: {
        name: string | string[]
        type: string | string[]
      }
      streetNumber: {
        street: string
        number: string
        location: CoordinateString
        direction: string
        distance: string
      }
    }
    pois: Array<{
      id: string
      name: string
      type: string
      tel: string
      address: string
      location: CoordinateString
      distance: string
    }>
  }
}

/**
 * 距离计算响应
 */
export interface AmapDistanceResponse extends AmapBaseResponse {
  count: string
  results: Array<{
    origin_id: string
    dest_id: string
    distance: string
    duration: string
  }>
}

// ============== MCP 工具参数类型 ==============

/**
 * 天气查询参数
 */
export interface WeatherParams {
  city: string
  extensions?: 'base' | 'all'
}

/**
 * POI 搜索参数
 */
export interface POISearchParams {
  keywords: string
  city?: string
  types?: string
  city_limit?: boolean
  page_size?: number
  page?: number
  extensions?: 'base' | 'all'
}

/**
 * 周边搜索参数
 */
export interface NearbySearchParams {
  location: CoordinateString
  keywords?: string
  types?: string
  radius?: number
  page_size?: number
  page?: number
  extensions?: 'base' | 'all'
}

/**
 * 路线规划参数
 */
export interface RouteParams {
  origin: CoordinateString
  destination: CoordinateString
  city?: string
  strategy?: number
}

/**
 * 地理编码参数
 */
export interface GeocodeParams {
  address: string
  city?: string
}

/**
 * 逆地理编码参数
 */
export interface ReverseGeocodeParams {
  location: CoordinateString
  extensions?: 'base' | 'all'
}

/**
 * 距离计算参数
 */
export interface DistanceParams {
  origins: CoordinateString
  destination: CoordinateString
  type?: 0 | 1 | 3  // 0: 直线距离, 1: 驾车, 3: 步行
}
