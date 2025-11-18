# AI Travel Planner - 第一阶段重构方案

> **版本**: 1.0
> **日期**: 2025-11-17
> **作者**: Claude Code 分析报告
> **预计时间**: 1-2 周
> **优先级**: 🔴 高

---

## 📋 目录

1. [执行摘要](#执行摘要)
2. [问题分析](#问题分析)
3. [重构方案](#重构方案)
4. [实施路线图](#实施路线图)
5. [预期收益](#预期收益)
6. [风险评估](#风险评估)
7. [验收标准](#验收标准)

---

## 执行摘要

### 当前状况

本项目是一个功能完整的 AI 旅行规划应用，拥有 ~18,000 行高质量 TypeScript 代码。虽然功能实现良好，但存在以下影响可维护性和可扩展性的问题：

- **代码重复率**: 20-25% (API: 25.5%, 组件: 15-20%, lib: 10-15%)
- **大文件问题**: 5个文件超过 500 行
- **职责不清**: 部分模块职责过多或重叠
- **缺少统一机制**: 错误处理、响应格式、请求验证

### 重构目标

1. **减少代码重复** 20-30% (~1,000-1,500 行)
2. **提升可维护性** 30-40%
3. **降低 Bug 风险** 25-35%
4. **提高开发效率** 20-30%
5. **建立统一标准** (中间件、响应格式、错误处理)

---

## 问题分析

### 1. API 路由层 (3,112 行代码)

#### 🔴 严重问题

| 问题 | 受影响文件 | 重复代码量 | 影响 |
|------|----------|----------|------|
| **认证逻辑重复** | 18 个文件 | ~400 行 | 安全风险、维护困难 |
| **响应格式不统一** | 所有文件 | - | API 可用性差 |
| **缺少参数验证** | 15+ 个文件 | - | 运行时错误风险 |
| **错误处理不一致** | 所有文件 | - | 调试困难 |

#### 🟠 中等问题

| 问题 | 具体位置 | 代码量 | 建议 |
|------|---------|-------|------|
| **坐标修正重复** | `generate-itinerary` | ~135 行 | 提取函数 |
| **高德 POI 重复** | `enrich-attraction`, `enrich-hotel` | ~30 行 | 统一服务 |
| **权限验证重复** | 4 个文件 | ~60 行 | 中间件 |

#### 🟢 需要改进

- 缺少速率限制
- 缺少请求日志
- 缺少分页机制 (2 个端点)
- 坐标修正性能问题 (串行延迟 9 秒)

### 2. 组件层 (8,822 行代码, 40 个组件)

#### 🔴 大型组件需要拆分

| 组件 | 代码行数 | 问题 | 建议 |
|------|---------|------|------|
| **TripOverviewMap** | 682 | 地图逻辑重复 | 提取 `useAMapLoader` |
| **ApiKeyManager** | 559 | 职责过多 | 拆分子组件 |
| **MapView** | 509 | 地图逻辑重复 | 提取 hook |
| **exportTripToPDF.ts** | 814 | 超大文件 | 拆分为多个模块 |

#### 🟠 代码重复热点

| 重复类型 | 涉及组件 | 重复代码量 | 优先级 |
|---------|---------|----------|--------|
| **高德地图加载** | 4 个组件 | ~150 行 | 🔴 高 |
| **照片轮播逻辑** | 2 个组件 | ~80 行 | 🟠 中 |
| **表单 API 调用** | 5+ 个组件 | ~40 行 | 🟠 中 |
| **样式映射常量** | 6 个组件 | ~50 行 | 🟢 低 |
| **工具函数** | 5 个组件 | ~30 行 | 🟢 低 |

#### 🟢 自定义 Hook 不足

- 当前仅 3 个自定义 hook (使用率 7.5%)
- 需要创建: `useAMapLoader`, `usePhotoCarousel`, `useAuthFetch`, `useFormValidation`

### 3. lib/ 目录 (6,000+ 行代码)

#### 🔴 职责不清 & 重复

| 问题 | 涉及文件 | 代码量 | 严重性 |
|------|---------|-------|--------|
| **config.ts 过时** | `config.ts` vs `config/` | 40 行 | 🔴 高 |
| **supabase.ts 职责过多** | `supabase.ts` | 163 行 | 🔴 高 |
| **地理编码重复** | `amap-geocoding.ts` vs `geocoding.service.ts` | ~200 行 | 🔴 高 |
| **API Key 管理混乱** | `api-keys.ts`, `check-api-keys.ts` | 426 行 | 🟠 中 |

#### 🟠 大文件需要拆分

| 文件 | 代码行数 | 问题 | 建议 |
|------|---------|------|------|
| **exportTripToPDF.ts** | 814 | 功能集中 | 拆分为 pdf/sections/ |
| **geo-clustering.ts** | 391 | 可接受 | - |
| **geocoding.service.ts** | 392 | 可接受 | 合并 amap-geocoding.ts |

---

## 重构方案

### Phase 1: API 路由层优化 (3-4 天)

#### 1.1 创建中间件基础设施

**新建目录结构**:
```
app/api/
├── _middleware/
│   ├── auth.ts              # 认证中间件
│   ├── error-handler.ts     # 统一错误处理
│   ├── rate-limit.ts        # 限流中间件
│   ├── logger.ts            # 请求日志
│   └── index.ts             # 导出
├── _utils/
│   ├── response.ts          # 统一响应格式
│   ├── validation.ts        # 请求参数验证 (Zod)
│   ├── supabase.ts          # Supabase 客户端工具
│   └── index.ts             # 导出
```

**核心代码示例**:

```typescript
// app/api/_middleware/auth.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/database/client'
import { UnauthorizedError } from '@/lib/errors'

export async function requireAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new UnauthorizedError('未提供认证令牌')
  }

  const supabase = createServerSupabaseClient(token)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('无效的认证令牌')
  }

  return { user, supabase }
}
```

```typescript
// app/api/_utils/response.ts
import { NextResponse } from 'next/server'

export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
) {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  )
}

export function errorResponse(
  error: Error | string,
  status = 500
) {
  const message = typeof error === 'string' ? error : error.message
  return NextResponse.json(
    { success: false, error: message },
    { status }
  )
}
```

```typescript
// app/api/_middleware/error-handler.ts
import { NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'
import { errorResponse } from '@/app/api/_utils/response'
import { logger } from '@/lib/utils/logger'

export function handleApiError(error: unknown) {
  logger.error('API Error:', error)

  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode)
  }

  // Supabase 错误
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { message: string; code: string }
    return errorResponse(supabaseError.message, 400)
  }

  // 未知错误
  return errorResponse('服务器内部错误', 500)
}
```

```typescript
// app/api/_utils/validation.ts
import { z } from 'zod'
import { ValidationError } from '@/lib/errors'

export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  const result = await schema.safeParseAsync(data)

  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message
    }))
    throw new ValidationError('请求参数验证失败', errors)
  }

  return result.data
}

// 常用 Schema
export const generateItinerarySchema = z.object({
  destination: z.string().min(1, '目的地不能为空'),
  origin: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
  budget: z.number().positive('预算必须为正数').optional(),
  travelers: z.number().int().positive().default(1),
  preferences: z.array(z.string()).optional(),
  model: z.enum(['deepseek', 'qwen']).optional()
})
```

#### 1.2 重构示例 API (2 天)

**重构前**: `app/api/trips/[id]/route.ts`
```typescript
// 当前代码: ~150 行，包含认证、错误处理、业务逻辑
export async function GET(request: NextRequest, { params }: Props) {
  try {
    // 10+ 行认证代码
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '...' }, { status: 401 })
    // ... 更多认证逻辑

    // 业务逻辑
    const trip = await supabase.from('trips').select('*').eq('id', params.id).single()

    // 手动错误处理
    if (!trip) return NextResponse.json({ error: '...' }, { status: 404 })

    return NextResponse.json({ trip })
  } catch (error) {
    // 不一致的错误处理
    return NextResponse.json({ error: '...' }, { status: 500 })
  }
}
```

**重构后**:
```typescript
// 新代码: ~50 行，使用中间件和工具函数
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { TripService } from '@/lib/services/trip.service'
import { NotFoundError } from '@/lib/errors'

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { user, supabase } = await requireAuth(request)

    const trip = await TripService.getTripById(supabase, params.id, user.id)

    if (!trip) {
      throw new NotFoundError('行程不存在')
    }

    return successResponse(trip)
  } catch (error) {
    return handleApiError(error)
  }
}
```

**代码减少**: 从 ~150 行 → ~50 行 (减少 67%)

#### 1.3 重构核心 API (1-2 天)

**重点文件**:
1. `app/api/generate-itinerary/route.ts` (601 行)
   - 提取坐标修正逻辑到 `_utils/coordinate-fixer.ts`
   - 提取 AI 调用到 `_utils/ai-helper.ts`
   - 目标: 减少到 ~300 行

2. `app/api/trips/[id]/share/route.ts` (212 行)
   - 提取 Cookie 处理到 `_utils/cookie-parser.ts`
   - 提取权限验证到中间件
   - 目标: 减少到 ~100 行

3. `app/api/enrich-attraction/route.ts` 和 `app/api/enrich-hotel/route.ts`
   - 合并高德 POI 搜索逻辑
   - 创建共享服务 `_utils/amap-poi.ts`
   - 目标: 减少 30 行重复代码

**预期收益**:
- 减少代码 ~470-620 行 (15-20%)
- 提升可维护性 30-40%
- 统一错误处理和响应格式

---

### Phase 2: lib/ 目录重构 (3-4 天)

#### 2.1 重构 Supabase 模块 (1 天)

**当前问题**: `lib/supabase.ts` 混合了 3 个职责
1. Supabase 客户端初始化
2. 认证操作 (signUp, signIn, signOut)
3. 数据库 CRUD 操作 (trips, expenses)

**重构方案**:

```
lib/
├── database/
│   ├── client.ts           # Supabase 客户端初始化
│   ├── auth.ts             # 认证操作
│   ├── schema.ts           # 数据库类型定义
│   └── index.ts            # 导出
```

```typescript
// lib/database/client.ts
import { createClient } from '@supabase/supabase-js'
import config from '@/lib/config'

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
)

export function createServerSupabaseClient(token: string) {
  return createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  )
}
```

```typescript
// lib/database/auth.ts
import { supabase } from './client'

export const auth = {
  async signUp(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    })

    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  }
}
```

**迁移步骤**:
1. 创建新的 `database/` 目录
2. 移动认证逻辑到 `auth.ts`
3. 保留旧的 `supabase.ts` 作为 re-export (向后兼容)
4. 逐步更新导入路径
5. 一周后删除旧文件

#### 2.2 合并地理编码模块 (半天)

**问题**: 代码重复 ~200 行
- `lib/amap-geocoding.ts` (285 行) - 原始 API 调用
- `lib/services/geocoding.service.ts` (392 行) - 包装服务

**方案**: 删除 `amap-geocoding.ts`，完全使用 service

```typescript
// lib/services/geocoding.service.ts (合并后)
import { BaseService } from './base.service'
import config from '@/lib/config'

export class GeocodingService extends BaseService {
  private readonly apiKey: string

  constructor(supabaseClient: SupabaseClient) {
    super(supabaseClient)
    this.apiKey = config.map.webServiceKey
  }

  // 合并原 amap-geocoding.ts 的所有方法
  async geocode(address: string) { /* ... */ }
  async reverseGeocode(lat: number, lng: number) { /* ... */ }
  async searchPOI(keyword: string, city?: string) { /* ... */ }
  async getRouteDistance(origin: [number, number], destination: [number, number]) { /* ... */ }

  // 保留 service 层的高级方法
  async smartGeocode(location: string | Location) { /* ... */ }
  async batchGeocode(locations: string[]) { /* ... */ }
}
```

**迁移步骤**:
1. 将 `amap-geocoding.ts` 的所有函数移到 `geocoding.service.ts`
2. 更新所有导入 (主要在 API 路由中)
3. 删除 `amap-geocoding.ts`

#### 2.3 整理 API Key 管理 (1 天)

**问题**: 职责交叉
- `lib/api-keys.ts` - 获取/解密 + 测试函数
- `lib/check-api-keys.ts` - 可用性检查

**方案**: 重组为模块化结构

```
lib/
├── api-keys/
│   ├── client.ts           # 获取、解密、缓存
│   ├── validator.ts        # API Key 测试
│   ├── checker.ts          # 可用性检查
│   ├── types.ts            # 类型定义
│   └── index.ts            # 导出
```

```typescript
// lib/api-keys/client.ts
export class ApiKeyClient {
  static async getUserKey(userId: string, service: ServiceType) { /* ... */ }
  static async getSystemKey(service: ServiceType) { /* ... */ }
  static async decryptKey(encryptedKey: string) { /* ... */ }
  static getKeyWithFallback(userId: string, service: ServiceType) { /* ... */ }
}

// lib/api-keys/validator.ts
export class ApiKeyValidator {
  static async testDeepSeekKey(apiKey: string) { /* ... */ }
  static async testModelScopeKey(apiKey: string) { /* ... */ }
  static async testMapKey(apiKey: string) { /* ... */ }
}

// lib/api-keys/checker.ts
export class ApiKeyChecker {
  static async checkAllKeys(userId: string) { /* ... */ }
  static async checkSystemKeys() { /* ... */ }
}
```

#### 2.4 拆分 PDF 导出模块 (1-2 天)

**问题**: `lib/exportTripToPDF.ts` 有 814 行

**方案**: 按功能拆分为多个模块

```
lib/
├── pdf/
│   ├── core.ts              # PDF 初始化、页面管理 (~200行)
│   ├── sections/
│   │   ├── cover.ts         # 封面 (~80行)
│   │   ├── overview.ts      # 概览 (~80行)
│   │   ├── itinerary.ts     # 每日行程 (~150行)
│   │   ├── accommodation.ts # 住宿 (~100行)
│   │   ├── transportation.ts# 交通 (~100行)
│   │   ├── budget.ts        # 费用 (~100行)
│   │   ├── map.ts           # 地图截图 (~50行)
│   │   └── charts.ts        # 图表 (~50行)
│   ├── helpers.ts           # 通用工具
│   ├── fonts/
│   │   └── loadPdfFonts.ts
│   ├── types.ts             # PDF 相关类型
│   └── index.ts             # 主入口
```

```typescript
// lib/pdf/index.ts (主入口)
import { PdfCore } from './core'
import { addCoverPage } from './sections/cover'
import { addOverviewPage } from './sections/overview'
import { addItineraryPages } from './sections/itinerary'
// ... 其他导入

export async function exportTripToPDF(
  trip: Trip,
  onProgress?: (progress: number, message: string) => void
) {
  const pdf = new PdfCore()

  onProgress?.(10, '生成封面...')
  await addCoverPage(pdf, trip)

  onProgress?.(20, '生成概览...')
  await addOverviewPage(pdf, trip)

  onProgress?.(40, '生成行程详情...')
  await addItineraryPages(pdf, trip)

  // ... 其他页面

  onProgress?.(100, '完成')
  return pdf.save(`${trip.destination}-旅行计划.pdf`)
}
```

#### 2.5 清理过时配置 (半天)

**删除**:
- `lib/config.ts` (已被 `config/` 取代)
- `lib/models.ts` (合并到 `config/constants.ts`)

**更新所有导入**:
```typescript
// 之前
import config from '@/lib/config'
import { AI_MODELS } from '@/lib/models'

// 之后
import config from '@/lib/config/app.config'
import { AI_MODELS } from '@/lib/config/constants'
```

---

### Phase 3: 组件层优化 (4-5 天)

#### 3.1 创建自定义 Hooks (2 天)

##### Hook 1: `useAMapLoader`

**影响**: 4 个组件 (TripOverviewMap, MapView, FullScreenMapModal, DayMapPreview)
**代码减少**: ~150 行

```typescript
// lib/hooks/useAMapLoader.ts
import { useEffect, useState } from 'react'
import config from '@/lib/config'

export function useAMapLoader() {
  const [loading, setLoading] = useState(!window.AMap)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const apiKey = config.map.apiKey
    if (!apiKey) {
      setError('未配置地图 API Key')
      setLoading(false)
      return
    }

    if (window.AMap) {
      setLoading(false)
      return
    }

    const securityKey = process.env.NEXT_PUBLIC_MAP_SECURITY_KEY
    if (securityKey) {
      window._AMapSecurityConfig = { securityJsCode: securityKey }
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`
    script.async = true

    script.onload = () => setLoading(false)
    script.onerror = () => {
      setError('地图加载失败')
      setLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      // 清理逻辑（如需要）
    }
  }, [])

  return { loading, error, isLoaded: !!window.AMap }
}
```

##### Hook 2: `usePhotoCarousel`

**影响**: 2 个组件 (AttractionCard, HotelCard)
**代码减少**: ~80 行

```typescript
// lib/hooks/usePhotoCarousel.ts
import { useState } from 'react'

export function usePhotoCarousel(photos: string[] = []) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [imageError, setImageError] = useState(false)

  const nextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex(prev => (prev + 1) % photos.length)
      setImageError(false)
    }
  }

  const prevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length)
      setImageError(false)
    }
  }

  const goToPhoto = (index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentPhotoIndex(index)
      setImageError(false)
    }
  }

  return {
    currentPhotoIndex,
    currentPhoto: photos[currentPhotoIndex],
    imageError,
    setImageError,
    nextPhoto,
    prevPhoto,
    goToPhoto,
    hasPhotos: photos.length > 0,
    totalPhotos: photos.length
  }
}
```

##### Hook 3: `useAuthFetch`

**影响**: 5+ 个表单组件
**代码减少**: ~40 行

```typescript
// lib/hooks/useAuthFetch.ts
import { useState } from 'react'
import { supabase } from '@/lib/database/client'

export function useAuthFetch<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('请先登录')
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...options.headers
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '请求失败')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { authFetch, loading, error }
}
```

#### 3.2 提取常量和工具函数 (1 天)

##### 常量提取

```typescript
// lib/ui-constants.ts

// Emoji 映射
export const ACTIVITY_EMOJI_MAP = {
  attraction: '🎯',
  shopping: '🛍️',
  entertainment: '🎭',
  relaxation: '🧘',
  food: '🍽️',
  culture: '🏛️',
  nature: '🏞️',
  adventure: '⛰️'
} as const

export const HOTEL_TYPE_MAP = {
  hotel: '🏨',
  hostel: '🏠',
  resort: '🏖️',
  apartment: '🏢',
  villa: '🏡'
} as const

// 交通关键词
export const TRANSPORTATION_KEYWORDS = [
  '前往', '出发', '到达', '乘坐', '搭乘',
  '地铁', '公交', '打车', '步行', '骑行'
]

// 颜色方案
export const DAY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
]

// 费用类别信息
export const EXPENSE_CATEGORIES = {
  accommodation: { label: '住宿', color: '#FF6B6B', icon: '🏨' },
  transportation: { label: '交通', color: '#4ECDC4', icon: '🚗' },
  food: { label: '餐饮', color: '#FFA07A', icon: '🍽️' },
  attractions: { label: '景点', color: '#98D8C8', icon: '🎯' },
  shopping: { label: '购物', color: '#F7DC6F', icon: '🛍️' },
  other: { label: '其他', color: '#BB8FCE', icon: '💰' }
} as const
```

##### 工具函数提取

```typescript
// lib/ui-helpers.ts
import { ACTIVITY_EMOJI_MAP, TRANSPORTATION_KEYWORDS } from './ui-constants'

/**
 * 渲染星级评分
 */
export function renderStars(rating: number) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <>
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="text-yellow-400">★</span>
      ))}
      {hasHalfStar && <span className="text-yellow-400">☆</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300">☆</span>
      ))}
    </>
  )
}

/**
 * 获取活动类型的 emoji
 */
export function getActivityEmoji(type: string): string {
  return ACTIVITY_EMOJI_MAP[type as keyof typeof ACTIVITY_EMOJI_MAP] || '📍'
}

/**
 * 判断是否为交通活动
 */
export function isTransportationActivity(activity: Activity): boolean {
  const name = activity.name || ''
  const description = activity.description || ''
  const text = `${name} ${description}`.toLowerCase()

  return TRANSPORTATION_KEYWORDS.some(keyword =>
    text.includes(keyword.toLowerCase())
  )
}

/**
 * 格式化货币
 */
export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  // 实现日期格式化逻辑
  return d.toLocaleDateString('zh-CN')
}
```

#### 3.3 重组组件目录 (1-2 天)

**新目录结构**:
```
components/
├── ui/                      # 基础 UI 组件 (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/                  # 布局组件
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── PageContainer.tsx
├── trip/                    # 行程相关
│   ├── TripCard.tsx
│   ├── TripList.tsx
│   ├── TripDetail/
│   │   ├── index.tsx
│   │   ├── DayPlan.tsx
│   │   ├── ActivityCard.tsx
│   │   └── WeatherCard.tsx
│   └── TripForm/
│       ├── index.tsx
│       ├── BasicInfoStep.tsx
│       └── PreferencesStep.tsx
├── map/                     # 地图相关
│   ├── MapView.tsx
│   ├── TripOverviewMap.tsx
│   ├── FullScreenMapModal.tsx
│   └── DayMapPreview.tsx
├── expense/                 # 费用相关
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── BudgetChart.tsx
│   └── ExpenseStatistics.tsx
├── cards/                   # 卡片组件
│   ├── AttractionCard.tsx
│   ├── HotelCard.tsx
│   └── shared/
│       ├── PhotoCarousel.tsx
│       └── RatingDisplay.tsx
├── settings/                # 设置相关
│   ├── ProfileForm.tsx
│   ├── PreferencesForm.tsx
│   ├── PasswordChangeForm.tsx
│   └── ApiKeyManager.tsx
└── shared/                  # 共享组件
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    ├── ConfirmDialog.tsx
    └── Toast.tsx
```

**迁移策略**:
1. 创建新的目录结构
2. 逐个迁移组件（保留旧位置的 re-export）
3. 更新导入路径
4. 一周后删除旧文件

#### 3.4 拆分大型组件 (1 天)

##### 示例: 拆分 AttractionCard (346 行)

**拆分方案**:
```
components/cards/
├── AttractionCard/
│   ├── index.tsx            # 主组件 (100行)
│   ├── PhotoSection.tsx     # 照片部分 (80行)
│   ├── InfoSection.tsx      # 信息部分 (100行)
│   └── ActionButtons.tsx    # 操作按钮 (40行)
└── shared/
    ├── PhotoCarousel.tsx    # 共享照片轮播
    └── RatingDisplay.tsx    # 共享评分显示
```

```typescript
// components/cards/shared/PhotoCarousel.tsx
import { usePhotoCarousel } from '@/lib/hooks/usePhotoCarousel'
import Image from 'next/image'

interface PhotoCarouselProps {
  photos: string[]
  alt: string
}

export function PhotoCarousel({ photos, alt }: PhotoCarouselProps) {
  const {
    currentPhoto,
    currentPhotoIndex,
    totalPhotos,
    nextPhoto,
    prevPhoto,
    imageError,
    setImageError
  } = usePhotoCarousel(photos)

  if (!photos.length) {
    return <div className="...">暂无照片</div>
  }

  return (
    <div className="relative">
      <Image
        src={currentPhoto}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
      />

      {totalPhotos > 1 && (
        <>
          <button onClick={prevPhoto} className="...">←</button>
          <button onClick={nextPhoto} className="...">→</button>
          <div className="...">
            {currentPhotoIndex + 1} / {totalPhotos}
          </div>
        </>
      )}
    </div>
  )
}
```

```typescript
// components/cards/shared/RatingDisplay.tsx
import { renderStars } from '@/lib/ui-helpers'

interface RatingDisplayProps {
  rating: number
  showNumber?: boolean
}

export function RatingDisplay({ rating, showNumber = true }: RatingDisplayProps) {
  return (
    <div className="flex items-center gap-1">
      {renderStars(rating)}
      {showNumber && <span className="ml-1 text-sm">{rating.toFixed(1)}</span>}
    </div>
  )
}
```

```typescript
// components/cards/AttractionCard/index.tsx
import { PhotoCarousel } from '../shared/PhotoCarousel'
import { RatingDisplay } from '../shared/RatingDisplay'
import { InfoSection } from './InfoSection'
import { ActionButtons } from './ActionButtons'

export function AttractionCard({ attraction, onEdit, onDelete }: Props) {
  return (
    <div className="card">
      <PhotoCarousel photos={attraction.photos} alt={attraction.name} />

      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3>{attraction.name}</h3>
          <RatingDisplay rating={attraction.rating} />
        </div>

        <InfoSection attraction={attraction} />
        <ActionButtons onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}
```

---

## 实施路线图

### Week 1: API 路由层 + lib/ 基础

| 天数 | 任务 | 工作量 | 负责人 | 验收标准 |
|------|------|--------|--------|---------|
| Day 1 | 创建 API 中间件基础设施 | 4h | - | ✅ auth, error-handler, response |
| Day 2 | 创建参数验证层 (Zod) | 3h | - | ✅ validation.ts + schemas |
| Day 2-3 | 重构示例 API (trips) | 4h | - | ✅ 代码减少 50%+ |
| Day 3-4 | 重构 generate-itinerary | 6h | - | ✅ 拆分为多个模块 |
| Day 4-5 | 重构其他 API 路由 | 5h | - | ✅ 应用新模式 |
| Day 5 | 重构 supabase.ts | 3h | - | ✅ 职责分离 |

### Week 2: lib/ 深度重构 + 组件优化

| 天数 | 任务 | 工作量 | 负责人 | 验收标准 |
|------|------|--------|--------|---------|
| Day 6 | 合并地理编码模块 | 2h | - | ✅ 删除 amap-geocoding.ts |
| Day 6-7 | 整理 API Key 管理 | 4h | - | ✅ 模块化结构 |
| Day 7-8 | 拆分 PDF 导出模块 | 6h | - | ✅ 按功能拆分 |
| Day 8 | 清理过时配置 | 2h | - | ✅ 删除旧文件 |
| Day 9-10 | 创建自定义 Hooks | 6h | - | ✅ 3 个核心 hooks |
| Day 10 | 提取常量和工具函数 | 3h | - | ✅ ui-constants, ui-helpers |

### Week 3: 组件重构 + 测试验证 (可选)

| 天数 | 任务 | 工作量 | 负责人 | 验收标准 |
|------|------|--------|--------|---------|
| Day 11-12 | 重组组件目录 | 6h | - | ✅ 新目录结构 |
| Day 12-13 | 拆分大型组件 | 5h | - | ✅ 2-3 个组件拆分 |
| Day 13 | 更新所有导入路径 | 3h | - | ✅ 无编译错误 |
| Day 14 | 全面测试 | 4h | - | ✅ 功能正常 |
| Day 14 | 文档更新 | 2h | - | ✅ 更新开发文档 |

### 时间轴总览

```
Week 1: API + lib 基础
├─ Day 1-2: API 中间件
├─ Day 3-4: 核心 API 重构
└─ Day 5: Supabase 重构

Week 2: lib 深度 + Hooks
├─ Day 6-8: lib 模块整理
├─ Day 9-10: Hooks + 工具
└─ 完成 80% 重构

Week 3: 组件 + 验证 (可选)
├─ Day 11-13: 组件重构
└─ Day 14: 测试验证
```

---

## 预期收益

### 定量收益

| 指标 | 当前 | 目标 | 改善 |
|------|------|------|------|
| **代码重复率** | 20-25% | 10-12% | ↓ 50% |
| **代码总量** | ~18,000 行 | ~16,000 行 | ↓ 11% |
| **平均文件大小** | 220 行 | 150 行 | ↓ 32% |
| **API 路由平均大小** | 164 行 | 100 行 | ↓ 39% |
| **超大文件数 (500+行)** | 5 个 | 0 个 | ↓ 100% |
| **自定义 Hook 覆盖** | 7.5% | 25% | ↑ 233% |

### 定性收益

#### 1. 可维护性 ⭐⭐⭐⭐⭐
- ✅ 代码职责清晰，单一职责原则
- ✅ 统一的错误处理和响应格式
- ✅ 模块化设计，易于定位问题
- ✅ 减少 50% 的代码重复

#### 2. 可扩展性 ⭐⭐⭐⭐⭐
- ✅ 中间件机制，易于添加新功能（日志、限流等）
- ✅ 服务层和数据层分离，易于替换实现
- ✅ 组件模块化，易于添加新页面

#### 3. 稳定性 ⭐⭐⭐⭐
- ✅ 统一的参数验证 (Zod)
- ✅ 统一的错误处理
- ✅ 减少因代码重复导致的不一致

#### 4. 性能 ⭐⭐⭐⭐
- ✅ 优化坐标修正逻辑（并行化）
- ✅ 减少不必要的重复渲染 (Hook 优化)
- ✅ 代码分割和懒加载更容易实现

#### 5. 开发体验 ⭐⭐⭐⭐⭐
- ✅ 清晰的目录结构，快速定位代码
- ✅ 可复用的 Hooks 和组件
- ✅ 统一的开发模式，降低学习成本
- ✅ 更好的 TypeScript 支持

---

## 风险评估

### 高风险 🔴

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|---------|
| **大规模重构导致功能回退** | 严重 | 中 | ✅ 渐进式迁移<br>✅ 保留旧代码 re-export<br>✅ 每个阶段独立测试 |
| **导入路径更新遗漏** | 中 | 高 | ✅ 使用 TypeScript 检查<br>✅ 分步更新并测试 |

### 中等风险 🟡

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|---------|
| **时间超出预期** | 中 | 中 | ✅ 分阶段实施<br>✅ 优先完成高价值部分 |
| **团队协作冲突** | 中 | 低 | ✅ 清晰的分工<br>✅ Git 分支管理 |

### 低风险 🟢

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|---------|
| **用户体验受影响** | 低 | 低 | ✅ 仅后端和代码组织变化<br>✅ UI 保持不变 |

---

## 验收标准

### ✅ 功能验收

- [ ] 所有现有功能正常运行
- [ ] 所有 API 端点返回正确结果
- [ ] 用户界面无变化（除非有明确改进）
- [ ] 离线功能正常
- [ ] PDF 导出正常

### ✅ 代码质量验收

- [ ] TypeScript 编译无错误
- [ ] ESLint 检查无错误
- [ ] 单个文件不超过 300 行（PDF 模块除外）
- [ ] 所有 API 使用统一的响应格式
- [ ] 所有 API 使用统一的错误处理
- [ ] 代码重复率 < 12%

### ✅ 架构验收

- [ ] API 路由使用中间件模式
- [ ] Services 和 Repositories 职责分离
- [ ] 组件按功能模块组织
- [ ] 常量和工具函数统一管理
- [ ] 至少 3 个可复用的自定义 Hook

### ✅ 文档验收

- [ ] 更新 CLAUDE.md 项目结构说明
- [ ] 更新相关功能文档
- [ ] 添加新的开发指南
- [ ] 添加架构决策记录 (ADR)

### ✅ 测试验收

- [ ] 核心功能手动测试通过
- [ ] 关键路径端到端测试
- [ ] 浏览器兼容性测试
- [ ] 移动端响应式测试

---

## 附录

### A. 关键文件清单

#### 需要重构的大文件
1. `app/api/generate-itinerary/route.ts` (601 行)
2. `lib/exportTripToPDF.ts` (814 行)
3. `components/TripOverviewMap.tsx` (682 行)
4. `components/ApiKeyManager.tsx` (559 行)
5. `components/MapView.tsx` (509 行)

#### 需要删除的过时文件
1. `lib/config.ts`
2. `lib/models.ts`
3. `lib/amap-geocoding.ts`

#### 需要合并的重复文件
1. `lib/api-keys.ts` + `lib/check-api-keys.ts`

### B. Git 分支策略

```
main
  ├── feature/refactor-api-routes        # API 路由重构
  ├── feature/refactor-lib-structure     # lib 目录重构
  ├── feature/refactor-components        # 组件重构
  └── feature/create-hooks               # 自定义 Hooks
```

### C. 回滚计划

每个阶段完成后创建 Git Tag:
- `v1.0-before-refactor` - 重构前基准
- `v1.1-api-refactor` - API 重构完成
- `v1.2-lib-refactor` - lib 重构完成
- `v1.3-component-refactor` - 组件重构完成

如遇严重问题，可快速回滚到任意标签。

---

**文档版本**: 1.0
**最后更新**: 2025-11-17
**下一步**: 获得团队批准后，开始 Phase 1 实施
