/**
 * 高德地图 API Mock
 *
 * 提供完整的高德地图 API 模拟，用于组件测试
 */

import { vi } from 'vitest'

/**
 * Mock Marker 类
 */
export class MockMarker {
  private position: [number, number]
  private map: any = null
  private options: any
  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(options: any = {}) {
    this.options = options
    this.position = options.position || [0, 0]
  }

  setMap(map: any) {
    this.map = map
  }

  getPosition() {
    return this.position
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  // 触发事件（用于测试）
  trigger(event: string) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => handler())
  }

  getExtData() {
    return this.options.extData
  }
}

/**
 * Mock InfoWindow 类
 */
export class MockInfoWindow {
  private content: string
  private options: any

  constructor(options: any = {}) {
    this.options = options
    this.content = options.content || ''
  }

  open(map: any, position: any) {
    // Mock open behavior
  }

  close() {
    // Mock close behavior
  }

  setContent(content: string) {
    this.content = content
  }

  getContent() {
    return this.content
  }
}

/**
 * Mock Polyline 类
 */
export class MockPolyline {
  private path: any[]
  private options: any
  private map: any = null

  constructor(options: any = {}) {
    this.options = options
    this.path = options.path || []
  }

  setMap(map: any) {
    this.map = map
  }

  getPath() {
    return this.path
  }
}

/**
 * Mock Map 类
 */
export class MockMap {
  private center: [number, number]
  private zoom: number
  private markers: any[] = []
  private overlays: any[] = []
  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(container: HTMLElement, options: any = {}) {
    this.zoom = options.zoom || 10
    this.center = options.center || [116.397428, 39.90923]
  }

  setCenter(center: [number, number]) {
    this.center = center
  }

  getCenter() {
    return this.center
  }

  setZoom(zoom: number) {
    this.zoom = zoom
  }

  getZoom() {
    return this.zoom
  }

  setFitView(markers?: any[], immediately?: boolean, avoid?: number[]) {
    // Mock fit view behavior
  }

  add(overlay: any) {
    this.overlays.push(overlay)
    if (overlay.setMap) {
      overlay.setMap(this)
    }
  }

  remove(overlay: any) {
    const index = this.overlays.indexOf(overlay)
    if (index > -1) {
      this.overlays.splice(index, 1)
    }
    if (overlay.setMap) {
      overlay.setMap(null)
    }
  }

  addControl(control: any) {
    // Mock add control behavior
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  destroy() {
    this.markers = []
    this.overlays = []
    this.eventHandlers.clear()
  }

  // 获取覆盖物（用于测试验证）
  getOverlays() {
    return this.overlays
  }
}

/**
 * Mock Scale 控件
 */
export class MockScale {
  constructor() {}
}

/**
 * Mock ToolBar 控件
 */
export class MockToolBar {
  constructor() {}
}

/**
 * Mock Driving 类（驾车路线规划）
 */
export class MockDriving {
  private options: any
  private results: any[] = []

  constructor(options: any = {}) {
    this.options = options
  }

  search(
    start: [number, number],
    end: [number, number],
    callback: (status: string, result: any) => void
  ) {
    // 模拟成功的路线规划结果
    const mockResult = {
      routes: [
        {
          steps: [
            {
              path: [
                { lng: start[0], lat: start[1] },
                { lng: (start[0] + end[0]) / 2, lat: (start[1] + end[1]) / 2 },
                { lng: end[0], lat: end[1] }
              ]
            }
          ]
        }
      ]
    }

    // 异步调用回调
    setTimeout(() => {
      callback('complete', mockResult)
    }, 10)
  }

  clear() {
    this.results = []
  }
}

/**
 * 创建完整的 AMap Mock 对象
 */
export function createAMapMock() {
  return {
    Map: MockMap,
    Marker: MockMarker,
    InfoWindow: MockInfoWindow,
    Polyline: MockPolyline,
    Scale: MockScale,
    ToolBar: MockToolBar,
    Driving: MockDriving,
    DrivingPolicy: {
      LEAST_TIME: 0,
      LEAST_DISTANCE: 1,
      LEAST_FEE: 2
    },
    plugin: vi.fn((plugins: string | string[], callback: () => void) => {
      // 立即执行回调
      callback()
    })
  }
}

/**
 * 设置全局 AMap Mock
 */
export function setupAMapMock() {
  const mockAMap = createAMapMock()
  ;(window as any).AMap = mockAMap
  return mockAMap
}

/**
 * 清理全局 AMap Mock
 */
export function cleanupAMapMock() {
  delete (window as any).AMap
}

/**
 * 创建 useAMapLoader hook 的 mock 返回值
 */
export function createAMapLoaderMock(state: {
  loading?: boolean
  error?: string | null
  isLoaded?: boolean
} = {}) {
  return {
    loading: state.loading ?? false,
    error: state.error ?? null,
    isLoaded: state.isLoaded ?? true
  }
}

/**
 * 默认的 AMap Loader mock（已加载状态）
 */
export const mockAMapLoaderLoaded = {
  loading: false,
  error: null,
  isLoaded: true
}

/**
 * 加载中状态的 AMap Loader mock
 */
export const mockAMapLoaderLoading = {
  loading: true,
  error: null,
  isLoaded: false
}

/**
 * 错误状态的 AMap Loader mock
 */
export const mockAMapLoaderError = {
  loading: false,
  error: '地图加载失败',
  isLoaded: false
}
