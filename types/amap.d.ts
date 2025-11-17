/**
 * 高德地图 JavaScript API 2.0 类型定义
 * 官方文档：https://lbs.amap.com/api/javascript-api-v2/summary
 */

declare namespace AMap {
  // ==================== 基础类型 ====================

  /** 经纬度坐标 [longitude, latitude] */
  type LngLat = [number, number]

  /** 像素坐标 */
  interface Pixel {
    x: number
    y: number
  }

  /** 地理范围 */
  interface Bounds {
    southWest: LngLat
    northEast: LngLat
  }

  /** 尺寸 */
  interface Size {
    width: number
    height: number
  }

  // ==================== 地图配置 ====================

  interface MapOptions {
    /** 地图容器 ID 或 DOM 元素 */
    container?: string | HTMLElement
    /** 中心点坐标 */
    center?: LngLat
    /** 缩放级别 (3-20) */
    zoom?: number
    /** 最小缩放级别 */
    zooms?: [number, number]
    /** 地图显示的参考坐标系（默认 'EPSG3857'） */
    crs?: string
    /** 地图图层 */
    layers?: Layer[]
    /** 地图旋转角度 */
    rotation?: number
    /** 俯仰角度 */
    pitch?: number
    /** 地图显示样式 */
    mapStyle?: string
    /** 地图特性 */
    features?: string[]
    /** 是否监控地图容器尺寸变化 */
    resizeEnable?: boolean
    /** 是否展示地图 logo */
    showBuildingBlock?: boolean
    /** 地图视口 */
    viewMode?: '2D' | '3D'
    /** 天空颜色（3D 模式） */
    skyColor?: string
    /** 是否可拖拽 */
    dragEnable?: boolean
    /** 是否可缩放 */
    zoomEnable?: boolean
    /** 是否可双击缩放 */
    doubleClickZoom?: boolean
    /** 是否可键盘控制 */
    keyboardEnable?: boolean
    /** 是否可滚轮缩放 */
    scrollWheel?: boolean
  }

  // ==================== 地图类 ====================

  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions)

    // 地图控制
    destroy(): void
    clearMap(): void
    setCenter(center: LngLat): void
    getCenter(): LngLat
    setZoom(zoom: number): void
    getZoom(): number
    setRotation(rotation: number): void
    getRotation(): number
    setPitch(pitch: number): void
    getPitch(): number
    setStatus(status: Partial<MapOptions>): void
    getStatus(): MapOptions
    setBounds(bounds: Bounds): void
    getBounds(): Bounds
    setFitView(overlays?: Overlay[], immediately?: boolean, avoid?: [number, number, number, number]): void
    panTo(position: LngLat): void
    panBy(x: number, y: number): void
    setZoomAndCenter(zoom: number, center: LngLat): void

    // 图层管理
    add(overlay: Overlay | Overlay[]): void
    remove(overlay: Overlay | Overlay[]): void
    getAllOverlays(type?: string): Overlay[]
    clearInfoWindow(): void

    // 坐标转换
    lngLatToPixel(lngLat: LngLat, zoom?: number): Pixel
    pixelToLngLat(pixel: Pixel, zoom?: number): LngLat

    // 插件加载
    plugin(pluginNames: string | string[], callback: () => void): void

    // 事件监听
    on(eventName: string, handler: (event: Event) => void): void
    off(eventName: string, handler: (event: Event) => void): void
  }

  // ==================== 覆盖物基类 ====================

  interface Overlay {
    setMap(map: Map | null): void
    getMap(): Map | null
    show(): void
    hide(): void
    on(eventName: string, handler: (event: Event) => void): void
    off(eventName: string, handler: (event: Event) => void): void
  }

  // ==================== 标记点 (Marker) ====================

  interface MarkerOptions {
    /** 标记点位置 */
    position?: LngLat
    /** 点标记的图标 */
    icon?: string | Icon
    /** 点标记的文字提示 */
    title?: string
    /** 点标记显示内容 */
    content?: string | HTMLElement
    /** 点标记的偏移量 */
    offset?: Pixel
    /** 点标记的叠加顺序 */
    zIndex?: number
    /** 点标记的旋转角度 */
    angle?: number
    /** 是否可点击 */
    clickable?: boolean
    /** 是否可拖拽 */
    draggable?: boolean
    /** 鼠标滑过点标记时的文字提示 */
    label?: LabelOptions
    /** 自定义属性 */
    extData?: any
  }

  interface LabelOptions {
    content?: string
    offset?: Pixel
    direction?: 'top' | 'right' | 'bottom' | 'left' | 'center'
  }

  interface Icon {
    image: string
    size: Size
    imageSize: Size
  }

  class Marker implements Overlay {
    constructor(opts?: MarkerOptions)

    setMap(map: Map | null): void
    getMap(): Map | null
    setPosition(position: LngLat): void
    getPosition(): LngLat
    setIcon(icon: string | Icon): void
    setContent(content: string | HTMLElement): void
    getContent(): string | HTMLElement
    setTitle(title: string): void
    getTitle(): string
    setLabel(label: LabelOptions): void
    setOffset(offset: Pixel): void
    setZIndex(zIndex: number): void
    setAngle(angle: number): void
    setClickable(clickable: boolean): void
    setDraggable(draggable: boolean): void
    setExtData(extData: any): void
    getExtData(): any
    show(): void
    hide(): void
    on(eventName: string, handler: (event: MarkerEvent) => void): void
    off(eventName: string, handler: (event: MarkerEvent) => void): void
  }

  interface MarkerEvent extends Event {
    lnglat: LngLat
    pixel: Pixel
    target: Marker
  }

  // ==================== 信息窗体 (InfoWindow) ====================

  interface InfoWindowOptions {
    /** 是否自定义窗体 */
    isCustom?: boolean
    /** 是否自动调整窗体到视野内 */
    autoMove?: boolean
    /** 控制是否在鼠标点击地图后关闭信息窗体 */
    closeWhenClickMap?: boolean
    /** 显示内容 */
    content?: string | HTMLElement
    /** 信息窗体尺寸 */
    size?: Size
    /** 信息窗体锚点 */
    anchor?: string
    /** 信息窗体显示位置偏移量 */
    offset?: Pixel
    /** 信息窗体显示基点位置 */
    position?: LngLat
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions)

    open(map: Map, position: LngLat): void
    close(): void
    getIsOpen(): boolean
    setContent(content: string | HTMLElement): void
    getContent(): string | HTMLElement
    setPosition(position: LngLat): void
    getPosition(): LngLat
    on(eventName: string, handler: (event: Event) => void): void
    off(eventName: string, handler: (event: Event) => void): void
  }

  // ==================== 折线 (Polyline) ====================

  interface PolylineOptions {
    /** 折线路径 */
    path?: LngLat[]
    /** 折线颜色 */
    strokeColor?: string
    /** 折线透明度 */
    strokeOpacity?: number
    /** 折线宽度 */
    strokeWeight?: number
    /** 折线样式 */
    strokeStyle?: 'solid' | 'dashed'
    /** 虚线配置 */
    strokeDasharray?: number[]
    /** 折线拐点的绘制样式 */
    lineJoin?: 'miter' | 'round' | 'bevel'
    /** 折线两端线帽的绘制样式 */
    lineCap?: 'butt' | 'round' | 'square'
    /** 层级 */
    zIndex?: number
    /** 是否显示 */
    bubble?: boolean
    /** 是否可点击 */
    cursor?: string
    /** 折线是否带描边 */
    borderWeight?: number
    /** 是否绘制成大地线 */
    geodesic?: boolean
    /** 是否显示方向箭头 */
    showDir?: boolean
    /** 自定义属性 */
    extData?: any
  }

  class Polyline implements Overlay {
    constructor(opts?: PolylineOptions)

    setMap(map: Map | null): void
    getMap(): Map | null
    setPath(path: LngLat[]): void
    getPath(): LngLat[]
    setOptions(opts: PolylineOptions): void
    getOptions(): PolylineOptions
    getLength(): number
    getBounds(): Bounds
    show(): void
    hide(): void
    setExtData(extData: any): void
    getExtData(): any
    on(eventName: string, handler: (event: Event) => void): void
    off(eventName: string, handler: (event: Event) => void): void
  }

  // ==================== 多边形 (Polygon) ====================

  interface PolygonOptions {
    /** 多边形路径 */
    path?: LngLat[] | LngLat[][]
    /** 填充颜色 */
    fillColor?: string
    /** 填充透明度 */
    fillOpacity?: number
    /** 边线颜色 */
    strokeColor?: string
    /** 边线透明度 */
    strokeOpacity?: number
    /** 边线宽度 */
    strokeWeight?: number
    /** 边线样式 */
    strokeStyle?: 'solid' | 'dashed'
    /** 虚线配置 */
    strokeDasharray?: number[]
    /** 层级 */
    zIndex?: number
    /** 自定义属性 */
    extData?: any
  }

  class Polygon implements Overlay {
    constructor(opts?: PolygonOptions)

    setMap(map: Map | null): void
    getMap(): Map | null
    setPath(path: LngLat[] | LngLat[][]): void
    getPath(): LngLat[] | LngLat[][]
    setOptions(opts: PolygonOptions): void
    contains(point: LngLat): boolean
    getArea(): number
    getBounds(): Bounds
    show(): void
    hide(): void
    on(eventName: string, handler: (event: Event) => void): void
    off(eventName: string, handler: (event: Event) => void): void
  }

  // ==================== 圆形 (Circle) ====================

  interface CircleOptions {
    /** 圆心位置 */
    center?: LngLat
    /** 半径（米） */
    radius?: number
    /** 填充颜色 */
    fillColor?: string
    /** 填充透明度 */
    fillOpacity?: number
    /** 边线颜色 */
    strokeColor?: string
    /** 边线透明度 */
    strokeOpacity?: number
    /** 边线宽度 */
    strokeWeight?: number
    /** 边线样式 */
    strokeStyle?: 'solid' | 'dashed'
    /** 层级 */
    zIndex?: number
    /** 自定义属性 */
    extData?: any
  }

  class Circle implements Overlay {
    constructor(opts?: CircleOptions)

    setMap(map: Map | null): void
    getMap(): Map | null
    setCenter(center: LngLat): void
    getCenter(): LngLat
    setRadius(radius: number): void
    getRadius(): number
    contains(point: LngLat): boolean
    getBounds(): Bounds
    show(): void
    hide(): void
    on(eventName: string, handler: (event: Event) => void): void
    off(eventName: string, handler: (event: Event) => void): void
  }

  // ==================== 图层 ====================

  interface Layer {
    setMap(map: Map | null): void
    show(): void
    hide(): void
    setOpacity(opacity: number): void
    setzIndex(zIndex: number): void
  }

  class TileLayer implements Layer {
    constructor(opts?: any)
    setMap(map: Map | null): void
    show(): void
    hide(): void
    setOpacity(opacity: number): void
    setzIndex(zIndex: number): void
  }

  // ==================== 插件 ====================

  namespace plugin {
    // 地理编码
    interface GeocoderOptions {
      city?: string
      radius?: number
      extensions?: 'base' | 'all'
    }

    interface GeocoderResult {
      info: string
      resultNum: number
      geocodes: Geocode[]
    }

    interface Geocode {
      formattedAddress: string
      province: string
      city: string
      district: string
      township: string
      street: string
      streetNumber: string
      adcode: string
      level: string
      location: LngLat
    }

    class Geocoder {
      constructor(opts?: GeocoderOptions)
      getLocation(
        address: string,
        callback: (status: string, result: GeocoderResult | string) => void
      ): void
      getAddress(
        location: LngLat,
        callback: (status: string, result: GeocoderResult | string) => void
      ): void
    }

    // 步行路线规划
    interface WalkingOptions {
      policy?: number
      extensions?: 'base' | 'all'
    }

    interface WalkingResult {
      info: string
      routes: Route[]
    }

    interface Route {
      distance: number
      time: number
      steps: Step[]
    }

    interface Step {
      instruction: string
      road: string
      distance: number
      time: number
      start_location: LngLat
      end_location: LngLat
      path: LngLat[]
    }

    class Walking {
      constructor(opts?: WalkingOptions)
      search(
        origin: LngLat,
        destination: LngLat,
        callback: (status: string, result: WalkingResult | string) => void
      ): void
      clear(): void
      searchOnAMAP(params: {
        origin: LngLat
        destination: LngLat
      }): void
    }

    // 驾车路线规划
    interface DrivingOptions {
      policy?: number
      extensions?: 'base' | 'all'
      ferry?: number
    }

    interface DrivingResult {
      info: string
      routes: Route[]
      taxi_cost?: number
    }

    class Driving {
      constructor(opts?: DrivingOptions)
      search(
        origin: LngLat,
        destination: LngLat,
        callback: (status: string, result: DrivingResult | string) => void
      ): void
      clear(): void
    }

    // 公交路线规划
    interface TransferOptions {
      city?: string
      policy?: number
      extensions?: 'base' | 'all'
    }

    class Transfer {
      constructor(opts?: TransferOptions)
      search(
        origin: LngLat,
        destination: LngLat,
        callback: (status: string, result: any) => void
      ): void
      clear(): void
    }

    // 工具条
    interface ToolBarOptions {
      position?: {
        top?: string
        left?: string
        right?: string
        bottom?: string
      }
    }

    class ToolBar {
      constructor(opts?: ToolBarOptions)
      show(): void
      hide(): void
    }

    // 比例尺
    class Scale {
      constructor()
      show(): void
      hide(): void
    }

    // 鹰眼
    class HawkEye {
      constructor(opts?: any)
      show(): void
      hide(): void
    }

    // 地图类型切换
    class MapType {
      constructor(opts?: any)
      show(): void
      hide(): void
    }
  }

  // ==================== 事件 ====================

  interface Event {
    type: string
    target: any
    lnglat?: LngLat
    pixel?: Pixel
  }

  // ==================== 工具类 ====================

  namespace Util {
    function domContentLoaded(callback: () => void): void
    function isEmpty(obj: any): boolean
  }

  // ==================== 全局加载方法 ====================

  interface LoadOptions {
    key: string
    version?: string
    plugins?: string[]
    AMapUI?: {
      version?: string
      plugins?: string[]
    }
    Loca?: {
      version?: string
    }
  }

  function load(options: LoadOptions): Promise<typeof AMap>
}

// ==================== 全局 AMapLoader ====================

declare global {
  interface Window {
    AMap: typeof AMap
    _AMapSecurityConfig?: {
      securityJsCode?: string
    }
  }
}

export = AMap
export as namespace AMap
