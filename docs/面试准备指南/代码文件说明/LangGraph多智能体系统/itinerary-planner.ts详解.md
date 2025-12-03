# Itinerary Planner Agent 节点详解 (`lib/agents/nodes/itinerary-planner.ts`)

## 文件概述

这是 LangGraph 工作流中的**核心规划 Agent**——行程规划师。它负责：
1. 读取用户输入和天气策略
2. 调用 AI 生成行程骨架（草稿）
3. 使用高德 API 补充景点坐标
4. 处理预算超支时的重试反馈

这个 Agent 是整个系统的**核心**，它生成的草稿行程是后续所有 Agent 的基础。

---

## 逐行详解

### 第 1-4 行：文件头注释

```typescript
/**
 * Itinerary Planner Agent 节点
 * 核心规划 Agent - 生成行程骨架
 */
```

**解释**："Itinerary" 意为"行程"，"Planner" 意为"规划者"。这个 Agent 生成行程的骨架结构。

---

### 第 6-19 行：导入依赖

```typescript
import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  DraftItinerary,
  DraftDay,
  AttractionSlot,
  MealSlot,
} from '../state'
import { getMCPClient } from '../mcp-client'
import {
  ITINERARY_PLANNER_SYSTEM_PROMPT,
  buildItineraryPlannerUserMessage,
} from '../prompts'
```

**解释**：

| 导入项 | 来源 | 作用 |
|--------|------|------|
| `OpenAI` | `openai` 包 | AI API 客户端 |
| `TripState` | `../state` | 完整状态类型 |
| `TripStateUpdate` | `../state` | 状态更新类型 |
| `DraftItinerary` | `../state` | 草稿行程类型 |
| `DraftDay` | `../state` | 草稿每日计划类型 |
| `AttractionSlot` | `../state` | 景点时间槽类型 |
| `MealSlot` | `../state` | 餐饮时间槽类型 |
| `getMCPClient` | `../mcp-client` | 高德 API 客户端 |
| `ITINERARY_PLANNER_SYSTEM_PROMPT` | `../prompts` | AI 系统提示词 |
| `buildItineraryPlannerUserMessage` | `../prompts` | 构建用户消息函数 |

---

### 第 21-37 行：AI 配置

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

**解释**：与 Weather Scout 相同的配置模式，默认使用 DeepSeek API。

---

### 第 39-53 行：工厂函数和节点函数签名

```typescript
export function createItineraryPlannerAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  return async function itineraryPlannerAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Itinerary Planner] Starting itinerary planning...')
    const startTime = Date.now()
```

**解释**：
- 标准的 LangGraph 节点函数签名
- 接收完整状态，返回部分更新
- 记录开始时间用于性能监控

---

### 第 55-61 行：解构状态和处理重试

```typescript
try {
  const { userInput, weather, budgetResult, retryCount } = state

  // 如果是重试，记录反馈信息
  if (retryCount > 0 && budgetResult?.feedback) {
    console.log(`[Itinerary Planner] Retry ${retryCount}, feedback: ${budgetResult.feedback.suggestion}`)
  }
```

**解释**：

提取的状态字段：
| 字段 | 来源 | 用途 |
|------|------|------|
| `userInput` | 初始状态 | 用户输入的表单数据 |
| `weather` | Weather Scout | 天气策略标签 |
| `budgetResult` | Budget Critic | 预算审计结果（重试时存在） |
| `retryCount` | 累加器 | 当前重试次数 |

**重试检测**：
- `retryCount > 0` 表示这是重试
- `budgetResult?.feedback` 包含 Budget Critic 的反馈建议

---

### 第 63-81 行：构建用户消息

```typescript
const userMessage = buildItineraryPlannerUserMessage({
  destination: userInput.destination,
  origin: userInput.origin,
  startDate: userInput.start_date,
  endDate: userInput.end_date,
  startTime: userInput.start_time,
  endTime: userInput.end_time,
  budget: userInput.budget,
  travelers: userInput.travelers,
  adultCount: userInput.adult_count,
  childCount: userInput.child_count,
  preferences: userInput.preferences,
  hotelPreferences: userInput.hotel_preferences,
  additionalNotes: userInput.additional_notes,
  strategyTags: weather?.strategyTags || [],
  clothingAdvice: weather?.clothingAdvice,
  weatherWarnings: weather?.warnings,
})
```

**解释**：

1. **用户输入字段**：
   - `destination`：目的地（如"杭州"）
   - `origin`：出发地
   - `start_date/end_date`：日期范围
   - `start_time/end_time`：首日出发/末日返回时间
   - `budget`：预算金额
   - `travelers`：出行人员描述
   - `adult_count/child_count`：成人/儿童数量
   - `preferences`：偏好（如"自然风光"、"美食"）
   - `hotel_preferences`：酒店偏好
   - `additional_notes`：额外备注

2. **天气策略字段**：
   - `strategyTags`：策略标签（如 `indoor_priority`）
   - `clothingAdvice`：穿衣建议
   - `weatherWarnings`：天气警告

**面试要点**：
- 这里体现了 Agent 之间的**数据流动**
- Weather Scout 的输出成为 Planner 的输入
- 使用 `|| []` 和 `?.` 处理可能缺失的数据

---

### 第 83-90 行：添加重试反馈

```typescript
let finalMessage = userMessage
if (retryCount > 0 && budgetResult?.feedback) {
  finalMessage += `\n\n**预算反馈（第 ${retryCount} 次重试）**\n`
  finalMessage += `- 问题：预算超支 ¥${budgetResult.feedback.targetReduction}\n`
  finalMessage += `- 建议：${budgetResult.feedback.suggestion}\n`
  finalMessage += `- 请相应调整行程，减少费用。`
}
```

**解释**：

这是**反馈循环**的关键部分：
- 重试时，将 Budget Critic 的反馈附加到用户消息
- AI 会看到这些反馈并调整规划

**示例反馈**：
```
**预算反馈（第 1 次重试）**
- 问题：预算超支 ¥500
- 建议：建议选择更经济的住宿，可节省约 20-30%
- 请相应调整行程，减少费用。
```

**面试要点**：
- 这是**人机协作**的体现：系统提供反馈，AI 调整行为
- 不需要修改 AI 代码，只需修改输入

---

### 第 92-114 行：调用 AI 生成行程

```typescript
if (!config.apiKey) {
  console.warn('[Itinerary Planner] No API key, returning empty draft')
  return {
    draftItinerary: createEmptyDraft(userInput.start_date, userInput.end_date),
  }
}

const client = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
})

console.log('[Itinerary Planner] Calling AI for itinerary generation...')
const completion = await client.chat.completions.create({
  model: config.model || 'deepseek-chat',
  messages: [
    { role: 'system', content: ITINERARY_PLANNER_SYSTEM_PROMPT },
    { role: 'user', content: finalMessage },
  ],
  max_tokens: 4000,
  temperature: 0.7,
})
```

**解释**：

1. **API Key 检查**：没有 Key 时返回空草稿
2. **创建 OpenAI 客户端**：指向 DeepSeek API
3. **调用参数**：
   - `max_tokens: 4000`：行程内容较多，需要更大的输出限制
   - `temperature: 0.7`：比 Weather Scout 更高，允许更多创意

**temperature 对比**：
| Agent | temperature | 原因 |
|-------|-------------|------|
| Weather Scout | 0.3 | 需要确定性的分析 |
| Itinerary Planner | 0.7 | 需要创意的规划 |

---

### 第 116-132 行：解析响应并补充坐标

```typescript
const responseText = completion.choices[0]?.message?.content || ''

// 3. 解析 AI 响应
const draftItinerary = parseDraftItinerary(responseText)

// 4. 使用 MCP 验证和补充景点坐标
console.log('[Itinerary Planner] Enriching attractions with coordinates...')
const enrichedDraft = await enrichDraftWithCoordinates(
  draftItinerary,
  userInput.destination
)

const duration = Date.now() - startTime
console.log(`[Itinerary Planner] Completed in ${duration}ms`)
console.log(`[Itinerary Planner] Generated ${enrichedDraft.totalAttractions} attractions, ${enrichedDraft.totalMeals} meals`)

return { draftItinerary: enrichedDraft }
```

**解释**：

1. **提取响应文本**
2. **解析 AI 响应**：`parseDraftItinerary()` 将文本转为结构化数据
3. **补充坐标**：`enrichDraftWithCoordinates()` 使用高德 API 获取真实坐标
4. **返回草稿行程**

**为什么需要补充坐标？**
- AI 生成的坐标可能不准确或根本没有
- 高德 API 提供准确的 GCJ-02 坐标
- 后续的地图显示和路线规划需要真实坐标

---

### 第 133-144 行：错误处理

```typescript
} catch (error) {
  console.error('[Itinerary Planner] Error:', error)

  // 返回空草稿
  return {
    draftItinerary: createEmptyDraft(
      state.userInput.start_date,
      state.userInput.end_date
    ),
  }
}
```

**解释**：
- 捕获所有错误
- 返回空草稿，确保工作流可以继续
- 空草稿至少包含日期结构和三餐时间槽

---

### 第 147-196 行：解析 AI 响应函数

```typescript
function parseDraftItinerary(responseText: string): DraftItinerary {
  try {
    // 尝试提取 JSON
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) ||
      responseText.match(/```\n([\s\S]*?)\n```/) ||
      responseText.match(/\{[\s\S]*\}/)

    const jsonString = jsonMatch
      ? jsonMatch[1] || jsonMatch[0]
      : responseText

    const parsed = JSON.parse(jsonString)

    // 验证和转换
    const days: DraftDay[] = (parsed.days || []).map((day: any) => ({
      day: day.day || 1,
      date: day.date || '',
      attractions: (day.attractions || []).map((a: any) => ({
        time: a.time || '09:00',
        name: a.name || '未知景点',
        duration: a.duration || '2小时',
        type: a.type || 'attraction',
        location: a.location,
      })) as AttractionSlot[],
      mealSlots: (day.mealSlots || []).map((m: any) => ({
        time: m.time || '12:00',
        mealType: m.mealType || 'lunch',
        cuisine: m.cuisine,
      })) as MealSlot[],
    }))

    return {
      days,
      totalAttractions: parsed.totalAttractions || days.reduce((sum, d) => sum + d.attractions.length, 0),
      totalMeals: parsed.totalMeals || days.reduce((sum, d) => sum + d.mealSlots.length, 0),
      estimatedAttractionCost: parsed.estimatedAttractionCost || 0,
    }
  } catch (error) {
    console.warn('[Itinerary Planner] Failed to parse AI response')
    return {
      days: [],
      totalAttractions: 0,
      totalMeals: 0,
    }
  }
}
```

**解释**：

#### 1. JSON 提取（与 Weather Scout 相同）
```typescript
const jsonMatch =
  responseText.match(/```json\n([\s\S]*?)\n```/) ||
  responseText.match(/```\n([\s\S]*?)\n```/) ||
  responseText.match(/\{[\s\S]*\}/)
```

#### 2. 数据验证和默认值
```typescript
attractions: (day.attractions || []).map((a: any) => ({
  time: a.time || '09:00',        // 默认 9:00
  name: a.name || '未知景点',      // 默认名称
  duration: a.duration || '2小时', // 默认时长
  type: a.type || 'attraction',   // 默认类型
  location: a.location,           // 可能为空
}))
```

#### 3. 统计计算
```typescript
totalAttractions: parsed.totalAttractions ||
  days.reduce((sum, d) => sum + d.attractions.length, 0),
```

- 优先使用 AI 提供的统计
- 如果没有，自己计算

**面试要点**：
- **永远不要信任 AI 输出**：需要验证每个字段
- 使用 `|| defaultValue` 确保必填字段有值
- `reduce` 用于计算数组总和

---

### 第 198-283 行：补充坐标函数

```typescript
async function enrichDraftWithCoordinates(
  draft: DraftItinerary,
  city: string
): Promise<DraftItinerary> {
  const mcpClient = getMCPClient()
  const enrichedDays: DraftDay[] = []
  let totalAttractionCost = 0

  for (const day of draft.days) {
    const enrichedAttractions: AttractionSlot[] = []

    for (const attraction of day.attractions) {
      // 如果已有坐标，跳过
      if (attraction.location?.lat && attraction.location?.lng) {
        enrichedAttractions.push(attraction)
        continue
      }

      try {
        // 使用 POI 搜索获取详细信息
        const poiResult = await mcpClient.searchPOI({
          keywords: attraction.name,
          city,
          cityLimit: true,
          pageSize: 1,
        })

        if (poiResult && poiResult.pois.length > 0) {
          const poi = poiResult.pois[0]
          const [lng, lat] = poi.location.split(',').map(Number)

          enrichedAttractions.push({
            ...attraction,
            location: {
              name: poi.name,
              address: poi.address || city,
              lat,
              lng,
            },
          })
        } else {
          // 尝试地理编码
          const geocodeResult = await mcpClient.geocode(attraction.name, city)

          if (geocodeResult) {
            const [lng, lat] = geocodeResult.location.split(',').map(Number)

            enrichedAttractions.push({
              ...attraction,
              location: {
                name: attraction.name,
                address: geocodeResult.formatted_address,
                lat,
                lng,
              },
            })
          } else {
            // 无法获取坐标，保持原样
            enrichedAttractions.push(attraction)
          }
        }

        // 添加延迟避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.warn(`[Itinerary Planner] Failed to enrich ${attraction.name}:`, error)
        enrichedAttractions.push(attraction)
      }
    }

    enrichedDays.push({
      ...day,
      attractions: enrichedAttractions,
    })
  }

  return {
    days: enrichedDays,
    totalAttractions: draft.totalAttractions,
    totalMeals: draft.totalMeals,
    estimatedAttractionCost: draft.estimatedAttractionCost || totalAttractionCost,
  }
}
```

**解释**：

#### 1. 跳过已有坐标的景点
```typescript
if (attraction.location?.lat && attraction.location?.lng) {
  enrichedAttractions.push(attraction)
  continue
}
```

#### 2. 优先使用 POI 搜索
```typescript
const poiResult = await mcpClient.searchPOI({
  keywords: attraction.name,
  city,
  cityLimit: true,  // 限制在城市范围内
  pageSize: 1,      // 只需要一个结果
})
```

**POI 搜索的优势**：
- 返回更丰富的信息（地址、类型等）
- 更准确（基于关键词匹配）

#### 3. 备用方案：地理编码
```typescript
const geocodeResult = await mcpClient.geocode(attraction.name, city)
```

**地理编码**：
- 将地址/名称转换为坐标
- 当 POI 搜索无结果时使用

#### 4. API 限流保护
```typescript
await new Promise(resolve => setTimeout(resolve, 200))
```

- 每次 API 调用后等待 200ms
- 避免触发高德 API 的频率限制

#### 5. 坐标格式转换
```typescript
const [lng, lat] = poi.location.split(',').map(Number)
```

- 高德返回格式：`"116.397428,39.90923"`
- 转换为数字：`[116.397428, 39.90923]`
- 注意顺序：`lng`（经度）在前，`lat`（纬度）在后

**面试要点**：
- **双重保障**：POI 搜索 + 地理编码
- **容错设计**：即使获取失败也保留原景点
- **性能考虑**：限流保护避免 API 封禁

---

### 第 285-317 行：创建空草稿函数

```typescript
function createEmptyDraft(startDate: string, endDate: string): DraftItinerary {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days: DraftDay[] = []

  let currentDate = new Date(start)
  let dayNum = 1

  while (currentDate <= end) {
    days.push({
      day: dayNum,
      date: currentDate.toISOString().split('T')[0],
      attractions: [],
      mealSlots: [
        { time: '08:00', mealType: 'breakfast' },
        { time: '12:00', mealType: 'lunch' },
        { time: '18:00', mealType: 'dinner' },
      ],
    })

    currentDate.setDate(currentDate.getDate() + 1)
    dayNum++
  }

  return {
    days,
    totalAttractions: 0,
    totalMeals: days.length * 3,
  }
}
```

**解释**：

1. **日期循环**：从开始日期到结束日期
2. **每天结构**：
   - 空的景点数组
   - 三个默认餐饮时间槽
3. **日期格式化**：`toISOString().split('T')[0]` → `"2024-12-01"`

**为什么需要空草稿？**
- 即使 AI 调用失败，也能提供基本结构
- 后续 Agent 至少有日期和餐饮信息可用
- 用户可以手动填充景点

---

## 数据流图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Itinerary Planner Agent                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  输入: TripState                                                         │
│    ├── userInput:                                                       │
│    │     ├── destination: "杭州"                                        │
│    │     ├── start_date: "2024-12-01"                                  │
│    │     ├── end_date: "2024-12-03"                                    │
│    │     ├── budget: 3000                                              │
│    │     └── preferences: ["自然风光", "美食"]                          │
│    ├── weather:                                                         │
│    │     ├── strategyTags: ["outdoor_friendly"]                        │
│    │     └── clothingAdvice: "天气适宜..."                             │
│    ├── budgetResult: (重试时存在)                                       │
│    │     └── feedback: { action: "downgrade_hotel", ... }              │
│    └── retryCount: 0                                                    │
│                                                                          │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  1. 构建用户消息                       │                               │
│  │     - 用户输入                        │                               │
│  │     - 天气策略                        │                               │
│  │     - 重试反馈（如有）                 │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  2. 调用 DeepSeek AI                  │                               │
│  │     system: ITINERARY_PLANNER_PROMPT │                               │
│  │     user: finalMessage               │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  3. 解析 AI 响应                       │                               │
│  │     parseDraftItinerary()             │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  4. 补充坐标                           │                               │
│  │     enrichDraftWithCoordinates()      │                               │
│  │     - POI 搜索                        │                               │
│  │     - 地理编码                        │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  输出: TripStateUpdate                                                   │
│    └── draftItinerary:                                                  │
│         ├── days: [                                                     │
│         │     { day: 1, date: "2024-12-01",                            │
│         │       attractions: [                                          │
│         │         { name: "西湖", time: "09:00",                        │
│         │           location: { lat: 30.24, lng: 120.15 } }            │
│         │       ],                                                      │
│         │       mealSlots: [...] }                                      │
│         │   ]                                                           │
│         ├── totalAttractions: 6                                         │
│         ├── totalMeals: 9                                               │
│         └── estimatedAttractionCost: 200                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 反馈循环机制

```
┌──────────────────────────────────────────────────────────────────┐
│                         反馈循环                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  第一次执行:                                                      │
│  ┌─────────────────┐                                              │
│  │ Itinerary       │  retryCount=0, 无 feedback                   │
│  │ Planner         │  → 生成正常行程                              │
│  └─────────────────┘                                              │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                              │
│  │ [并行 Agents]   │                                              │
│  └─────────────────┘                                              │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                              │
│  │ Budget Critic   │  → 发现超预算 ¥500                           │
│  │                 │  → 生成 feedback: "降级酒店"                  │
│  │                 │  → retryCount += 1                           │
│  └─────────────────┘                                              │
│           │                                                       │
│           ▼ (超预算，返回重试)                                     │
│                                                                   │
│  第二次执行 (重试):                                               │
│  ┌─────────────────┐                                              │
│  │ Itinerary       │  retryCount=1                                │
│  │ Planner         │  收到 feedback: "降级酒店"                   │
│  │                 │  → 消息中附加: "预算超支¥500，建议降级酒店"   │
│  │                 │  → AI 生成更经济的行程                       │
│  └─────────────────┘                                              │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                              │
│  │ Budget Critic   │  → 预算通过                                   │
│  └─────────────────┘                                              │
│           │                                                       │
│           ▼ (通过，继续)                                          │
│  ┌─────────────────┐                                              │
│  │ Finalize        │                                              │
│  └─────────────────┘                                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 面试常见问题

### Q1: Itinerary Planner 和其他 Agent 的关系是什么？

**答**：

| Agent | 与 Planner 的关系 |
|-------|-------------------|
| Weather Scout | 上游：提供 `strategyTags` 给 Planner |
| Attraction Enricher | 下游：基于草稿增强景点信息 |
| Accommodation/Transport/Dining | 下游：基于草稿并行处理 |
| Budget Critic | 反馈源：超预算时提供反馈给 Planner |

### Q2: 为什么需要在 Planner 中补充坐标，而不是留给 Attraction Enricher？

**答**：
1. **早期验证**：尽早确认景点存在且可定位
2. **后续依赖**：Transport Agent 需要坐标计算路线
3. **关注点分离**：Planner 负责基础坐标，Enricher 负责详细信息

### Q3: 重试时如何保证 AI 真的会调整？

**答**：
1. **明确的反馈**：告诉 AI 具体问题（超支金额）
2. **具体的建议**：告诉 AI 如何调整（降级酒店）
3. **强调重要性**：消息末尾要求"请相应调整行程"
4. **System Prompt**：系统提示词中也会强调预算控制

### Q4: `temperature: 0.7` 和 `max_tokens: 4000` 是如何确定的？

**答**：
- **temperature: 0.7**：
  - 行程规划需要创意（推荐不同景点）
  - 但不能太高（0.9+会产生不稳定输出）
  - 0.7 是平衡点

- **max_tokens: 4000**：
  - 多日行程内容较多
  - 每天可能 3-5 个景点 + 3 餐
  - 3 天行程约需 2000-3000 tokens
  - 留有余量

### Q5: API 限流是如何处理的？

**答**：
```typescript
await new Promise(resolve => setTimeout(resolve, 200))
```
- 每次 API 调用后等待 200ms
- 避免短时间内大量请求
- 高德 API 限制：10 次/秒（免费版）

---

## 相关文件

- `lib/agents/state.ts` - `DraftItinerary` 类型定义
- `lib/agents/prompts/itinerary-planner.ts` - AI 提示词
- `lib/agents/mcp-client.ts` - 高德 API 封装
- `lib/agents/nodes/weather-scout.ts` - 上游 Agent
- `lib/agents/nodes/attraction-enricher.ts` - 下游 Agent
- `lib/agents/nodes/budget-critic.ts` - 反馈源 Agent
