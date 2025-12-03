# Attraction Enricher Agent 节点详解 (`lib/agents/nodes/attraction-enricher.ts`)

## 文件概述

这是 LangGraph 工作流中的**景点详情增强 Agent**。它负责：
1. 从草稿行程中提取所有景点
2. 调用高德 POI API 获取详细信息
3. 估算门票价格、开放时间、游玩时长
4. 生成景点标签
5. 可选使用 AI 进一步增强描述

这个 Agent 位于 Itinerary Planner 之后，为后续的并行 Agent（住宿、交通、餐饮）提供更丰富的景点信息。

---

## 逐行详解

### 第 1-18 行：文件头和导入

```typescript
/**
 * Attraction Enricher Agent 节点
 * 景点详情增强 Agent - 为景点添加详细信息
 */

import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  AttractionEnrichmentResult,
  EnrichedAttraction,
} from '../state'
import { getMCPClient, type POI } from '../mcp-client'
import {
  ATTRACTION_ENRICHER_SYSTEM_PROMPT,
  buildAttractionEnricherUserMessage,
  parseAttractionEnricherResponse,
} from '../prompts'
```

**解释**：

| 导入项 | 作用 |
|--------|------|
| `OpenAI` | AI API 客户端（可选增强） |
| `AttractionEnrichmentResult` | Agent 输出类型 |
| `EnrichedAttraction` | 增强后的景点类型 |
| `getMCPClient` | 高德 API 客户端 |
| `POI` | 高德 POI 数据类型 |
| `*_PROMPT` | AI 提示词相关 |

---

### 第 20-36 行：AI 配置

```typescript
interface AIClientConfig {
  apiKey: string
  baseURL: string
  model?: string
}

const DEFAULT_AI_CONFIG: AIClientConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: 'deepseek-chat',
}
```

**解释**：标准的 AI 配置模式，与其他 Agent 一致。

---

### 第 38-58 行：从 POI 提取数据

```typescript
function extractPOIData(poi: POI): Partial<EnrichedAttraction> {
  const result: Partial<EnrichedAttraction> = {
    poiId: poi.id,
    category: poi.type,
    tel: poi.tel,
    photos: poi.photos,
  }

  // 提取评分（高德返回的是字符串）
  if (poi.rating) {
    const rating = parseFloat(poi.rating)
    if (!isNaN(rating)) {
      result.rating = rating
    }
  }

  return result
}
```

**解释**：
- 从高德 POI 数据中提取有用字段
- `Partial<EnrichedAttraction>` 表示部分字段
- 评分需要从字符串转换为数字
- 使用 `isNaN` 检查转换是否成功

---

### 第 60-120 行：估算门票价格函数

```typescript
export function estimateTicketPrice(
  name: string,
  poiType?: string,
  poiTypecode?: string
): number {
  const nameLower = name.toLowerCase()
  const typeLower = (poiType || '').toLowerCase()

  // 免费景点关键词
  const freeKeywords = ['公园', '广场', '步行街', '商业街', '夜市', '免费']
  if (freeKeywords.some(kw => nameLower.includes(kw) || typeLower.includes(kw))) {
    return 0
  }

  // 著名景点（5A 级别）- 优先匹配
  const famousSpots = ['故宫', '长城', '兵马俑', '西湖', '黄山', '张家界', '九寨沟', '丽江']
  if (famousSpots.some(spot => nameLower.includes(spot))) {
    return 150
  }

  // 博物馆/纪念馆（部分免费）
  if (nameLower.includes('博物馆') || nameLower.includes('纪念馆') || nameLower.includes('美术馆')) {
    return 30
  }

  // 寺庙/宗教场所
  if (nameLower.includes('寺') || nameLower.includes('庙') || nameLower.includes('观') || nameLower.includes('塔')) {
    return 50
  }

  // 古镇/古村
  if (nameLower.includes('古镇') || nameLower.includes('古村') || nameLower.includes('老街')) {
    return 80
  }

  // 主题乐园
  if (nameLower.includes('乐园') || nameLower.includes('欢乐谷') || nameLower.includes('迪士尼') || nameLower.includes('环球')) {
    return 300
  }

  // 山/自然景区
  if (nameLower.includes('山') || nameLower.includes('峰') || nameLower.includes('岭')) {
    return 100
  }

  // 湖/水景
  if (nameLower.includes('湖') || nameLower.includes('河') || nameLower.includes('江')) {
    return 50
  }

  // 动物园/植物园
  if (nameLower.includes('动物园') || nameLower.includes('植物园') || nameLower.includes('海洋馆')) {
    return 120
  }

  // 默认景点价格
  return 60
}
```

**解释**：

这是一个**基于规则的价格估算引擎**，按优先级匹配：

| 优先级 | 类型 | 估价 |
|--------|------|------|
| 1 | 免费景点 | ¥0 |
| 2 | 著名 5A 景点 | ¥150 |
| 3 | 博物馆/纪念馆 | ¥30 |
| 4 | 寺庙/宗教场所 | ¥50 |
| 5 | 古镇/古村 | ¥80 |
| 6 | 主题乐园 | ¥300 |
| 7 | 山/自然景区 | ¥100 |
| 8 | 湖/水景 | ¥50 |
| 9 | 动物园/植物园 | ¥120 |
| 10 | 默认 | ¥60 |

**面试要点**：
- 使用 `toLowerCase()` 进行不区分大小写的匹配
- `some()` 方法检查数组中是否有任一元素匹配
- 优先级顺序很重要：免费景点优先判断，避免"西湖公园"被误判为 ¥150

---

### 第 122-156 行：推断开放时间函数

```typescript
export function inferOpeningHours(name: string, poiType?: string): string {
  const nameLower = name.toLowerCase()
  const typeLower = (poiType || '').toLowerCase()

  // 博物馆
  if (nameLower.includes('博物馆') || nameLower.includes('纪念馆') || nameLower.includes('美术馆')) {
    return '09:00-17:00（周一闭馆）'
  }

  // 公园
  if (nameLower.includes('公园') || typeLower.includes('公园')) {
    return '06:00-22:00'
  }

  // 商业区
  if (nameLower.includes('步行街') || nameLower.includes('商业街') || nameLower.includes('购物')) {
    return '10:00-22:00'
  }

  // 夜市
  if (nameLower.includes('夜市')) {
    return '17:00-24:00'
  }

  // 寺庙
  if (nameLower.includes('寺') || nameLower.includes('庙')) {
    return '07:00-17:00'
  }

  // 默认景区时间
  return '08:30-17:30'
}
```

**解释**：

根据景点类型推断典型开放时间：

| 类型 | 开放时间 |
|------|----------|
| 博物馆 | 09:00-17:00（周一闭馆） |
| 公园 | 06:00-22:00 |
| 商业区 | 10:00-22:00 |
| 夜市 | 17:00-24:00 |
| 寺庙 | 07:00-17:00 |
| 默认 | 08:30-17:30 |

---

### 第 158-197 行：推断游玩时长函数

```typescript
export function inferDuration(name: string, poiType?: string): string {
  const nameLower = name.toLowerCase()

  // 大型景区
  const largeSpots = ['故宫', '长城', '迪士尼', '环球', '欢乐谷', '黄山', '张家界']
  if (largeSpots.some(spot => nameLower.includes(spot))) {
    return '4-6小时'
  }

  // 博物馆
  if (nameLower.includes('博物馆') || nameLower.includes('美术馆')) {
    return '2-3小时'
  }

  // 古镇
  if (nameLower.includes('古镇') || nameLower.includes('古村')) {
    return '3-4小时'
  }

  // 公园/湖泊
  if (nameLower.includes('公园') || nameLower.includes('湖')) {
    return '2-3小时'
  }

  // 商业街
  if (nameLower.includes('步行街') || nameLower.includes('商业街')) {
    return '2-3小时'
  }

  // 打卡点
  if (nameLower.includes('塔') || nameLower.includes('桥') || nameLower.includes('广场')) {
    return '1-2小时'
  }

  // 默认
  return '2小时'
}
```

**解释**：

| 类型 | 建议时长 |
|------|----------|
| 大型景区 | 4-6小时 |
| 博物馆 | 2-3小时 |
| 古镇 | 3-4小时 |
| 公园/湖泊 | 2-3小时 |
| 商业街 | 2-3小时 |
| 打卡点 | 1-2小时 |
| 默认 | 2小时 |

---

### 第 199-249 行：生成景点标签函数

```typescript
export function generateTags(name: string, poiType?: string, ticketPrice?: number): string[] {
  const tags: string[] = []
  const nameLower = name.toLowerCase()

  // 免费标签
  if (ticketPrice === 0) {
    tags.push('免费开放')
  }

  // 著名景点
  const worldHeritage = ['故宫', '长城', '兵马俑', '西湖', '丽江', '黄山', '九寨沟', '峨眉山', '武夷山']
  if (worldHeritage.some(spot => nameLower.includes(spot))) {
    tags.push('世界遗产')
    tags.push('必去景点')
  }

  // 类型标签
  if (nameLower.includes('博物馆') || nameLower.includes('纪念馆')) {
    tags.push('历史文化')
    tags.push('室内')
  }

  if (nameLower.includes('公园') || nameLower.includes('山') || nameLower.includes('湖')) {
    tags.push('自然风光')
    tags.push('户外')
  }

  if (nameLower.includes('古镇') || nameLower.includes('老街')) {
    tags.push('人文景观')
    tags.push('拍照打卡')
  }

  if (nameLower.includes('乐园') || nameLower.includes('动物园') || nameLower.includes('海洋馆')) {
    tags.push('亲子游')
    tags.push('娱乐休闲')
  }

  if (nameLower.includes('夜市') || nameLower.includes('夜景')) {
    tags.push('夜游')
  }

  // 确保至少有一个标签
  if (tags.length === 0) {
    tags.push('景点游览')
  }

  return tags
}
```

**解释**：

根据景点特征生成多个标签：

| 特征 | 标签 |
|------|------|
| 免费 | 免费开放 |
| 世界遗产 | 世界遗产、必去景点 |
| 博物馆 | 历史文化、室内 |
| 自然景观 | 自然风光、户外 |
| 古镇 | 人文景观、拍照打卡 |
| 乐园 | 亲子游、娱乐休闲 |
| 夜景 | 夜游 |
| 默认 | 景点游览 |

**面试要点**：
- 一个景点可以有多个标签
- 确保至少有一个标签（兜底逻辑）

---

### 第 251-282 行：Agent 工厂函数和输入验证

```typescript
export function createAttractionEnricherAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  return async function attractionEnricherAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Attraction Enricher] Starting attraction enrichment...')
    const startTime = Date.now()

    try {
      const { userInput, draftItinerary } = state

      // 检查是否有草稿行程
      if (!draftItinerary || draftItinerary.days.length === 0) {
        console.warn('[Attraction Enricher] No draft itinerary available')
        return {
          attractionEnrichment: {
            enrichedAttractions: [],
            totalAttractions: 0,
            enrichedCount: 0,
            totalTicketCost: 0,
            errors: ['No draft itinerary available'],
          },
        }
      }
```

**解释**：
- 标准的 Agent 工厂函数模式
- 首先验证输入：如果没有草稿行程，返回空结果
- `errors` 数组记录错误信息

---

### 第 284-322 行：收集所有景点

```typescript
// 收集所有景点
const allAttractions: Array<{
  name: string
  address?: string
  location?: { lat: number; lng: number }
  type?: string
  duration?: string
  dayIndex: number
  attractionIndex: number
}> = []

draftItinerary.days.forEach((day, dayIndex) => {
  day.attractions.forEach((attraction, attractionIndex) => {
    allAttractions.push({
      name: attraction.name,
      address: attraction.location?.address,
      location: attraction.location
        ? { lat: attraction.location.lat, lng: attraction.location.lng }
        : undefined,
      type: attraction.type,
      duration: attraction.duration,
      dayIndex,
      attractionIndex,
    })
  })
})

console.log(`[Attraction Enricher] Found ${allAttractions.length} attractions to enrich`)

if (allAttractions.length === 0) {
  return {
    attractionEnrichment: {
      enrichedAttractions: [],
      totalAttractions: 0,
      enrichedCount: 0,
      totalTicketCost: 0,
    },
  }
}
```

**解释**：
- 遍历所有天、所有景点，展平成一个数组
- 记录 `dayIndex` 和 `attractionIndex` 便于后续定位
- 如果没有景点，直接返回空结果

---

### 第 324-423 行：POI 增强循环

```typescript
const mcpClient = getMCPClient()
const enrichedAttractions: EnrichedAttraction[] = []
const errors: string[] = []
let totalTicketCost = 0

for (const attraction of allAttractions) {
  try {
    // 搜索 POI 获取详情
    const poiResult = await mcpClient.searchPOI({
      keywords: attraction.name,
      city: userInput.destination,
      cityLimit: true,
      pageSize: 1,
    })

    let enriched: EnrichedAttraction = {
      name: attraction.name,
      address: attraction.address,
      location: attraction.location
        ? {
            name: attraction.name,
            address: attraction.address || userInput.destination,
            lat: attraction.location.lat,
            lng: attraction.location.lng,
          }
        : undefined,
      type: attraction.type as any,
    }

    if (poiResult && poiResult.pois.length > 0) {
      const poi = poiResult.pois[0]

      // 从 POI 提取信息
      enriched = {
        ...enriched,
        poiId: poi.id,
        category: poi.type,
        tel: poi.tel,
        photos: poi.photos,
        address: poi.address || enriched.address,
      }

      // 提取评分
      if (poi.rating) {
        const rating = parseFloat(poi.rating)
        if (!isNaN(rating)) {
          enriched.rating = rating
        }
      }

      // 估算门票价格
      enriched.ticketPrice = estimateTicketPrice(attraction.name, poi.type, poi.typecode)
    } else {
      // 没有找到 POI，使用估算
      enriched.ticketPrice = estimateTicketPrice(attraction.name)
    }

    // 推断开放时间
    enriched.openingHours = inferOpeningHours(attraction.name, enriched.category)

    // 推断游玩时长
    enriched.recommendedDuration = attraction.duration || inferDuration(attraction.name)

    // 生成标签
    enriched.tags = generateTags(attraction.name, enriched.category, enriched.ticketPrice)

    // 累计门票费用（按人数计算）
    if (enriched.ticketPrice) {
      totalTicketCost += enriched.ticketPrice * userInput.travelers
    }

    enrichedAttractions.push(enriched)

    // 添加延迟避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 200))
  } catch (error) {
    console.warn(`[Attraction Enricher] Failed to enrich ${attraction.name}:`, error)
    errors.push(`Failed to enrich ${attraction.name}: ${(error as Error).message}`)

    // 即使失败也添加基本信息
    enrichedAttractions.push({
      name: attraction.name,
      address: attraction.address,
      location: attraction.location
        ? {
            name: attraction.name,
            address: attraction.address || userInput.destination,
            lat: attraction.location.lat,
            lng: attraction.location.lng,
          }
        : undefined,
      type: attraction.type as any,
      ticketPrice: estimateTicketPrice(attraction.name),
      openingHours: inferOpeningHours(attraction.name),
      recommendedDuration: attraction.duration || inferDuration(attraction.name),
      tags: generateTags(attraction.name),
    })
  }
}
```

**解释**：

#### 增强流程（每个景点）

```
1. 搜索 POI
   │
   ├── 找到 → 提取 POI 数据（ID、类型、电话、照片、评分）
   │
   └── 未找到 → 跳过 POI 数据

2. 估算门票价格
3. 推断开放时间
4. 推断游玩时长
5. 生成标签
6. 累计门票费用（× 人数）
7. 200ms 延迟
```

#### 错误处理
- 即使单个景点增强失败，也添加基本信息
- 使用规则引擎提供估算值
- 记录错误到 `errors` 数组

#### 门票费用计算
```typescript
totalTicketCost += enriched.ticketPrice * userInput.travelers
```
- 按人数计算总费用
- 例如：¥100 门票 × 3 人 = ¥300

---

### 第 425-496 行：AI 增强（可选）

```typescript
// 如果有 AI API Key，使用 AI 进一步增强信息
if (config.apiKey && enrichedAttractions.length > 0) {
  try {
    console.log('[Attraction Enricher] Using AI to enhance attraction details...')

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })

    // 构建用户消息
    const userMessage = buildAttractionEnricherUserMessage({
      destination: userInput.destination,
      attractions: enrichedAttractions.map(a => ({
        name: a.name,
        address: a.address,
        location: a.location,
        type: a.type,
        duration: a.recommendedDuration,
        poiData: {
          id: a.poiId,
          type: a.category,
          tel: a.tel,
          photos: a.photos,
          rating: a.rating?.toString(),
        },
      })),
      travelers: userInput.travelers,
      adultCount: userInput.adult_count,
      childCount: userInput.child_count,
    })

    const completion = await client.chat.completions.create({
      model: config.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: ATTRACTION_ENRICHER_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const aiEnriched = parseAttractionEnricherResponse(responseText)

    // 合并 AI 增强的信息
    if (aiEnriched.enrichedAttractions.length > 0) {
      aiEnriched.enrichedAttractions.forEach((aiAttraction, index) => {
        if (index < enrichedAttractions.length) {
          // 保留 POI 数据，合并 AI 增强的信息
          enrichedAttractions[index] = {
            ...enrichedAttractions[index],
            ...aiAttraction,
            // 保留原始 POI 数据
            poiId: enrichedAttractions[index].poiId,
            photos: enrichedAttractions[index].photos || aiAttraction.photos,
            tel: enrichedAttractions[index].tel || aiAttraction.tel,
            rating: enrichedAttractions[index].rating || aiAttraction.rating,
          }
        }
      })

      // 更新门票总费用（如果 AI 提供了更准确的价格）
      if (aiEnriched.totalTicketCost > 0) {
        totalTicketCost = aiEnriched.totalTicketCost * userInput.travelers
      }
    }
  } catch (aiError) {
    console.warn('[Attraction Enricher] AI enhancement failed:', aiError)
    errors.push(`AI enhancement failed: ${(aiError as Error).message}`)
  }
}
```

**解释**：

#### AI 增强流程

```
POI 增强结果
    │
    ▼
有 API Key?
    │
    ├── 是 → 调用 AI 进一步增强
    │         - 添加景点描述
    │         - 游玩贴士
    │         - 更准确的门票价格
    │         - 合并回原数据
    │
    └── 否 → 跳过 AI 增强
```

#### 数据合并策略

```typescript
enrichedAttractions[index] = {
  ...enrichedAttractions[index],  // 原有数据
  ...aiAttraction,                 // AI 增强数据（覆盖）
  // 保留原始 POI 数据（优先级高于 AI）
  poiId: enrichedAttractions[index].poiId,
  photos: enrichedAttractions[index].photos || aiAttraction.photos,
  tel: enrichedAttractions[index].tel || aiAttraction.tel,
  rating: enrichedAttractions[index].rating || aiAttraction.rating,
}
```

**优先级**：
1. POI 数据（最可靠）
2. AI 增强数据
3. 规则引擎估算

---

### 第 498-524 行：返回结果

```typescript
const duration = Date.now() - startTime
console.log(`[Attraction Enricher] Completed in ${duration}ms`)
console.log(`[Attraction Enricher] Enriched ${enrichedAttractions.length} attractions, total ticket cost: ¥${totalTicketCost}`)

return {
  attractionEnrichment: {
    enrichedAttractions,
    totalAttractions: allAttractions.length,
    enrichedCount: enrichedAttractions.filter(a => a.poiId).length,
    totalTicketCost,
    errors: errors.length > 0 ? errors : undefined,
  },
}
```

**解释**：
- `enrichedCount`：成功获取 POI 的景点数量
- `errors`：只在有错误时包含

---

## 数据流图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Attraction Enricher Agent                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  输入: TripState                                                         │
│    ├── userInput.destination: "杭州"                                    │
│    ├── userInput.travelers: 2                                           │
│    └── draftItinerary.days: [                                           │
│          { attractions: [{ name: "西湖" }, { name: "灵隐寺" }] }        │
│        ]                                                                 │
│                                                                          │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  1. 收集所有景点                       │                               │
│  │     展平为一维数组                     │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  2. 遍历每个景点                       │                               │
│  │     ┌────────────────────────────┐   │                               │
│  │     │ 搜索高德 POI                │   │                               │
│  │     │ → ID、类型、电话、照片、评分 │   │                               │
│  │     └────────────────────────────┘   │                               │
│  │              │                        │                               │
│  │              ▼                        │                               │
│  │     ┌────────────────────────────┐   │                               │
│  │     │ 规则引擎估算                │   │                               │
│  │     │ → 门票价格                  │   │                               │
│  │     │ → 开放时间                  │   │                               │
│  │     │ → 游玩时长                  │   │                               │
│  │     │ → 标签                      │   │                               │
│  │     └────────────────────────────┘   │                               │
│  │              │                        │                               │
│  │              ▼                        │                               │
│  │     累计门票费用 × 人数               │                               │
│  │     延迟 200ms                        │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  3. AI 增强（可选）                   │                               │
│  │     - 景点描述                        │                               │
│  │     - 游玩贴士                        │                               │
│  │     - 更准确的门票价格                │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  输出: TripStateUpdate                                                   │
│    └── attractionEnrichment:                                            │
│         ├── enrichedAttractions: [                                      │
│         │     { name: "西湖",                                           │
│         │       ticketPrice: 0,                                         │
│         │       openingHours: "06:00-22:00",                           │
│         │       recommendedDuration: "2-3小时",                         │
│         │       tags: ["自然风光", "世界遗产"],                         │
│         │       rating: 4.8,                                            │
│         │       photos: [...] }                                         │
│         │   ]                                                            │
│         ├── totalAttractions: 6                                         │
│         ├── enrichedCount: 5                                            │
│         ├── totalTicketCost: 400                                        │
│         └── errors: undefined                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 设计模式总结

### 1. 规则引擎模式

```typescript
// 基于关键词匹配的规则链
if (免费关键词匹配) return 0
if (著名景点匹配) return 150
if (博物馆匹配) return 30
// ...
return 默认值
```

**优点**：
- 快速、确定性
- 不依赖外部 API
- 可解释

### 2. 多层增强模式

```
第一层: POI 数据（高德 API）
    ↓
第二层: 规则引擎（估算）
    ↓
第三层: AI 增强（可选）
```

**每层都是可选的**，确保即使某一层失败，也有数据。

### 3. 容错累积模式

```typescript
// 错误不中断循环
for (const attraction of allAttractions) {
  try {
    // 增强逻辑
  } catch (error) {
    errors.push(...)
    // 使用估算值继续
    enrichedAttractions.push(基本信息)
  }
}
```

---

## 面试常见问题

### Q1: 为什么需要 Attraction Enricher 这个独立的 Agent？

**答**：
1. **关注点分离**：Planner 负责"去哪里"，Enricher 负责"详细信息"
2. **数据质量**：POI 数据比 AI 生成更准确
3. **后续依赖**：Budget Critic 需要门票费用来计算总成本

### Q2: 为什么门票价格用规则引擎而不是 API？

**答**：
1. **高德 API 限制**：免费版不提供门票价格
2. **数据可靠性**：即使有 API，门票价格经常变化
3. **速度**：规则引擎比 API 快
4. **可控性**：可以根据需要调整估算逻辑

### Q3: AI 增强的作用是什么？

**答**：
- 添加**景点描述**（规则引擎无法生成）
- 添加**游玩贴士**（如"建议早上去避开人流"）
- 可能提供**更准确的门票价格**
- 增强**用户体验**

### Q4: 数据优先级是如何设计的？

**答**：

| 数据类型 | 来源 | 优先级 |
|----------|------|--------|
| poiId, photos, tel | 高德 POI | 最高 |
| rating | 高德 POI > AI | 高 |
| ticketPrice | AI > 规则引擎 | 中 |
| description, tips | AI | 仅 AI |
| openingHours, duration | 规则引擎 | 低 |

### Q5: 为什么要记录 dayIndex 和 attractionIndex？

**答**：
- 当前代码未使用，但预留了定位能力
- 未来可能需要**回写增强数据到草稿**
- 便于**调试**和**日志追踪**

---

## 相关文件

- `lib/agents/state.ts` - `EnrichedAttraction` 类型定义
- `lib/agents/mcp-client.ts` - 高德 POI API 封装
- `lib/agents/prompts/attraction-enricher.ts` - AI 提示词
- `lib/agents/nodes/itinerary-planner.ts` - 上游 Agent
- `lib/agents/nodes/budget-critic.ts` - 使用 `totalTicketCost` 的 Agent
