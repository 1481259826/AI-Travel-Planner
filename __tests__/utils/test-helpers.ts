/**
 * 测试辅助函数和数据生成器
 *
 * 提供常用的测试工具函数，简化测试编写
 */

import type { Trip, Expense, Itinerary, DayPlan, Activity, Profile, ApiKey } from '@/types'
import { vi } from 'vitest'

// ==================== ID 生成器 ====================

let idCounter = 1

/**
 * 生成唯一测试 ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${idCounter++}-${Date.now()}`
}

/**
 * 重置 ID 计数器（在测试套件之间调用）
 */
export function resetTestIdCounter(): void {
  idCounter = 1
}

// ==================== 用户数据生成器 ====================

/**
 * 创建测试用户
 */
export function createTestUser(overrides: Partial<{
  id: string
  email: string
  aud: string
  role: string
}> = {}) {
  return {
    id: overrides.id || generateTestId('user'),
    email: overrides.email || `test-${Date.now()}@example.com`,
    aud: overrides.aud || 'authenticated',
    role: overrides.role || 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * 创建测试用户配置
 */
export function createTestProfile(userId: string, overrides: Partial<Profile> = {}): Profile {
  return {
    id: userId,
    email: overrides.email || `${userId}@example.com`,
    name: overrides.name || 'Test User',
    theme: overrides.theme || 'light',
    default_model: overrides.default_model || 'deepseek-chat',
    default_budget: overrides.default_budget || 5000,
    default_origin: overrides.default_origin || '北京',
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  }
}

// ==================== 行程数据生成器 ====================

/**
 * 创建测试活动
 */
export function createTestActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    time: overrides.time || '09:00',
    type: overrides.type || 'attraction',
    name: overrides.name || '测试景点',
    description: overrides.description || '测试景点描述',
    duration: overrides.duration || 2,
    cost: overrides.cost || 0,
    location: overrides.location || {
      address: '测试地址',
      lat: 31.2304,
      lng: 121.4737,
    },
    rating: overrides.rating,
    photos: overrides.photos,
  }
}

/**
 * 创建测试日计划
 */
export function createTestDayPlan(day: number, overrides: Partial<DayPlan> = {}): DayPlan {
  const baseDate = new Date('2025-02-01')
  baseDate.setDate(baseDate.getDate() + day - 1)
  const dateStr = baseDate.toISOString().split('T')[0]

  return {
    day,
    date: overrides.date || dateStr,
    theme: overrides.theme || `第${day}天主题`,
    activities: overrides.activities || [
      createTestActivity({ time: '09:00', name: `景点${day}-1` }),
      createTestActivity({ time: '12:00', type: 'food', name: `餐厅${day}` }),
      createTestActivity({ time: '14:00', name: `景点${day}-2` }),
    ],
  }
}

/**
 * 创建测试行程
 */
export function createTestItinerary(overrides: Partial<Itinerary> = {}): Itinerary {
  const totalDays = overrides.totalDays || 3
  const days = overrides.days || Array.from({ length: totalDays }, (_, i) => createTestDayPlan(i + 1))

  return {
    destination: overrides.destination || '上海',
    startDate: overrides.startDate || '2025-02-01',
    endDate: overrides.endDate || '2025-02-03',
    totalDays,
    budget: overrides.budget || 5000,
    accommodation: overrides.accommodation || {
      name: '测试酒店',
      address: '上海市测试区测试路100号',
      pricePerNight: 500,
      totalPrice: 1500,
      checkIn: '2025-02-01',
      checkOut: '2025-02-04',
      rating: 4.5,
      amenities: ['WiFi', '早餐'],
      location: { lat: 31.234, lng: 121.475 },
    },
    days,
    estimatedCost: overrides.estimatedCost || {
      accommodation: 1500,
      food: 600,
      transportation: 200,
      attractions: 400,
      total: 2700,
    },
    notes: overrides.notes || ['测试备注'],
  }
}

/**
 * 创建测试 Trip
 */
export function createTestTrip(userId: string, overrides: Partial<Trip> = {}): Trip {
  return {
    id: overrides.id || generateTestId('trip'),
    user_id: userId,
    destination: overrides.destination || '上海',
    start_date: overrides.start_date || '2025-02-01',
    end_date: overrides.end_date || '2025-02-03',
    budget: overrides.budget || 5000,
    travelers: overrides.travelers || 2,
    adult_count: overrides.adult_count || 2,
    child_count: overrides.child_count || 0,
    preferences: overrides.preferences || '喜欢历史文化',
    itinerary: overrides.itinerary || createTestItinerary(),
    status: overrides.status || 'planned',
    share_token: overrides.share_token,
    is_public: overrides.is_public || false,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  }
}

// ==================== 费用数据生成器 ====================

/**
 * 创建测试费用
 */
export function createTestExpense(tripId: string, userId: string, overrides: Partial<Expense> = {}): Expense {
  return {
    id: overrides.id || generateTestId('expense'),
    trip_id: tripId,
    user_id: userId,
    category: overrides.category || 'food',
    amount: overrides.amount || 100,
    currency: overrides.currency || 'CNY',
    description: overrides.description || '测试费用',
    date: overrides.date || '2025-02-01',
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  }
}

// ==================== API Key 数据生成器 ====================

/**
 * 创建测试 API Key
 */
export function createTestApiKey(userId: string, overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: overrides.id || generateTestId('apikey'),
    user_id: userId,
    service: overrides.service || 'deepseek',
    encrypted_key: overrides.encrypted_key || 'encrypted-test-key',
    base_url: overrides.base_url || 'https://api.deepseek.com',
    extra_config: overrides.extra_config,
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  }
}

// ==================== Request/Response 辅助函数 ====================

/**
 * 创建测试 Request 对象
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string
    body?: object
    headers?: Record<string, string>
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  return new Request(url, init)
}

/**
 * 创建带认证的测试 Request
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: {
    method?: string
    body?: object
    headers?: Record<string, string>
  } = {}
): Request {
  return createTestRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

// ==================== 异步测试辅助函数 ====================

/**
 * 等待指定毫秒
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 等待所有 Promise 完成并捕获错误
 */
export async function waitForAll<T>(promises: Promise<T>[]): Promise<(T | Error)[]> {
  return Promise.all(
    promises.map(p => p.catch(e => e))
  )
}

/**
 * 重试函数直到成功或超时
 */
export async function waitFor(
  fn: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await fn()) {
      return
    }
    await wait(interval)
  }

  throw new Error(`waitFor timed out after ${timeout}ms`)
}

// ==================== Mock 辅助函数 ====================

/**
 * 创建 Mock fetch 函数
 */
export function createMockFetch(responses: Map<string, { status: number; data: any }>) {
  return vi.fn().mockImplementation(async (url: string) => {
    const response = responses.get(url)
    if (!response) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      }
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
    }
  })
}

/**
 * 创建 localStorage Mock
 */
export function createMockLocalStorage() {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
}

// ==================== 断言辅助函数 ====================

/**
 * 断言对象包含指定属性
 */
export function expectToContain(obj: object, expected: object): void {
  Object.entries(expected).forEach(([key, value]) => {
    expect(obj).toHaveProperty(key, value)
  })
}

/**
 * 断言数组长度
 */
export function expectLength<T>(arr: T[], length: number): void {
  expect(arr).toHaveLength(length)
}

/**
 * 断言 API 响应成功
 */
export async function expectSuccessResponse(response: Response): Promise<any> {
  expect(response.ok).toBe(true)
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
  return response.json()
}

/**
 * 断言 API 响应失败
 */
export async function expectErrorResponse(response: Response, status: number): Promise<any> {
  expect(response.ok).toBe(false)
  expect(response.status).toBe(status)
  return response.json()
}

// ==================== 日期辅助函数 ====================

/**
 * 创建相对于今天的日期字符串
 */
export function getRelativeDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

/**
 * 创建日期范围
 */
export function createDateRange(startDaysFromNow: number, duration: number): { start: string; end: string } {
  return {
    start: getRelativeDate(startDaysFromNow),
    end: getRelativeDate(startDaysFromNow + duration - 1),
  }
}

// ==================== 坐标辅助函数 ====================

/**
 * 创建测试坐标（上海周边随机点）
 */
export function createTestCoordinates(options: {
  baseLat?: number
  baseLng?: number
  spread?: number
} = {}): { lat: number; lng: number } {
  const { baseLat = 31.2304, baseLng = 121.4737, spread = 0.1 } = options
  return {
    lat: baseLat + (Math.random() - 0.5) * spread,
    lng: baseLng + (Math.random() - 0.5) * spread,
  }
}

/**
 * 创建多个测试坐标点
 */
export function createTestCoordinatesArray(count: number): Array<{ lat: number; lng: number }> {
  return Array.from({ length: count }, () => createTestCoordinates())
}
