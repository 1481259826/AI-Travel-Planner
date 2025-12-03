# Weather Scout Agent 节点详解 (`lib/agents/nodes/weather-scout.ts`)

## 文件概述

这是 LangGraph 工作流中的**第一个 Agent 节点**——天气感知 Agent。它负责：
1. 调用高德天气 API 获取目的地天气预报
2. 使用 AI 分析天气数据，生成策略标签
3. 输出穿衣建议和天气警告

这个 Agent 展示了一个典型的**工具调用 + AI 分析**模式。

---

## 逐行详解

### 第 1-4 行：文件头注释

```typescript
/**
 * Weather Scout Agent 节点
 * 天气感知 Agent - 获取天气预报并生成策略标签
 */
```

**解释**：说明这是 Weather Scout Agent 的实现文件。

---

### 第 6-12 行：导入依赖

```typescript
import OpenAI from 'openai'
import type { TripState, TripStateUpdate, WeatherOutput, StrategyTag } from '../state'
import { getMCPClient } from '../mcp-client'
import {
  WEATHER_SCOUT_SYSTEM_PROMPT,
  buildWeatherScoutUserMessage,
} from '../prompts'
```

**解释**：

| 导入项 | 来源 | 作用 |
|--------|------|------|
| `OpenAI` | `openai` npm 包 | AI API 客户端（兼容 DeepSeek） |
| `TripState` | `../state` | 完整状态类型 |
| `TripStateUpdate` | `../state` | 状态更新类型（Agent 返回值） |
| `WeatherOutput` | `../state` | 天气输出数据类型 |
| `StrategyTag` | `../state` | 策略标签联合类型 |
| `getMCPClient` | `../mcp-client` | 获取 MCP 客户端（调用高德 API） |
| `WEATHER_SCOUT_SYSTEM_PROMPT` | `../prompts` | AI 系统提示词 |
| `buildWeatherScoutUserMessage` | `../prompts` | 构建用户消息的函数 |

**面试要点**：
- `openai` 包不仅支持 OpenAI，还支持所有 OpenAI 兼容 API（如 DeepSeek）
- `import type` 只导入类型，不会增加运行时代码

---

### 第 14-30 行：AI 配置类型和默认值

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

**解释**：
- 定义 AI 客户端需要的配置
- 默认从环境变量读取 DeepSeek 配置
- `|| ''` 确保 `apiKey` 始终是字符串（避免 `undefined`）

**面试要点**：
- 使用环境变量存储敏感信息（API Key）
- 提供默认值使配置可选

---

### 第 32-37 行：工厂函数开始

```typescript
export function createWeatherScoutAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }
```

**解释**：
- 工厂函数模式：返回一个 Agent 函数
- `Partial<AIClientConfig>` 使所有配置字段可选
- 展开运算符合并默认配置和自定义配置

**为什么用工厂函数？**
1. **依赖注入**：可以传入不同的 AI 配置
2. **闭包**：内部函数可以访问外部的 `config`
3. **便于测试**：可以注入 mock 配置

---

### 第 39-46 行：Agent 节点函数签名

```typescript
return async function weatherScoutAgent(
  state: TripState
): Promise<TripStateUpdate> {
  console.log('[Weather Scout] Starting weather analysis...')
  const startTime = Date.now()
```

**解释**：
- **这是 LangGraph 节点函数的标准签名**
  - 输入：完整状态 `TripState`
  - 输出：状态更新 `TripStateUpdate`
- `async function` 因为涉及 API 调用
- 记录开始时间，用于性能监控

**面试要点**：
- LangGraph 节点函数必须接收完整状态，返回部分更新
- 这种设计使节点之间解耦

---

### 第 48-67 行：获取天气数据

```typescript
try {
  const { userInput } = state
  const { destination, start_date, end_date } = userInput

  // 1. 获取天气数据
  console.log(`[Weather Scout] Fetching weather for ${destination}...`)
  const mcpClient = getMCPClient()
  const weatherData = await mcpClient.getWeatherForecast(destination)

  if (!weatherData || !weatherData.forecasts) {
    console.warn('[Weather Scout] No weather data available, using defaults')
    return {
      weather: {
        forecasts: [],
        strategyTags: ['outdoor_friendly'],
        clothingAdvice: '请根据当地实际天气情况穿着',
        warnings: [],
      },
    }
  }
```

**解释**：

1. **解构状态**：从 `state` 中提取 `userInput`，再从中提取目的地和日期
2. **调用 MCP 客户端**：`getMCPClient()` 返回封装好的高德 API 客户端
3. **空值处理**：如果没有天气数据，返回安全的默认值

**什么是 MCP？**
- MCP（Model Context Protocol）是一种工具调用协议
- 这里的 `mcpClient` 封装了高德地图的各种 API
- `getWeatherForecast()` 调用高德天气预报 API

**面试要点**：
- **防御式编程**：始终检查 API 返回值，提供默认值
- **优雅降级**：即使没有天气数据，也能继续工作流

---

### 第 71-100 行：调用 AI 分析天气

```typescript
// 2. 调用 AI 分析天气
if (!config.apiKey) {
  console.warn('[Weather Scout] No API key configured, using rule-based analysis')
  return {
    weather: analyzeWeatherWithRules(weatherData.forecasts),
  }
}

const client = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
})

const userMessage = buildWeatherScoutUserMessage(
  destination,
  start_date,
  end_date,
  weatherData.forecasts
)

console.log('[Weather Scout] Calling AI for analysis...')
const completion = await client.chat.completions.create({
  model: config.model || 'deepseek-chat',
  messages: [
    { role: 'system', content: WEATHER_SCOUT_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ],
  max_tokens: 1000,
  temperature: 0.3,
})
```

**解释**：

1. **API Key 检查**：没有 Key 时使用基于规则的备用方案
2. **创建 OpenAI 客户端**：使用自定义 `baseURL` 指向 DeepSeek
3. **构建消息**：
   - `system` 消息：定义 AI 的角色和输出格式
   - `user` 消息：包含目的地、日期、天气数据
4. **调用 API**：
   - `max_tokens: 1000`：限制输出长度
   - `temperature: 0.3`：较低的温度使输出更确定性

**面试要点**：
- **双重降级策略**：
  1. 没有 API Key → 使用规则分析
  2. API 调用失败 → catch 中返回默认值
- `temperature` 越低，输出越稳定（适合结构化输出）

---

### 第 102-127 行：解析响应并返回结果

```typescript
const responseText = completion.choices[0]?.message?.content || ''

// 3. 解析 AI 响应
const analysis = parseWeatherAnalysis(responseText)

const weather: WeatherOutput = {
  forecasts: weatherData.forecasts.map(f => ({
    date: f.date,
    dayweather: f.dayweather,
    nightweather: f.nightweather,
    daytemp: f.daytemp,
    nighttemp: f.nighttemp,
    daywind: f.daywind,
    nightwind: f.nightwind,
    daypower: f.daypower,
    nightpower: f.nightpower,
  })),
  strategyTags: analysis.strategyTags,
  clothingAdvice: analysis.clothingAdvice,
  warnings: analysis.warnings,
}

const duration = Date.now() - startTime
console.log(`[Weather Scout] Completed in ${duration}ms`)
console.log(`[Weather Scout] Strategy tags: ${weather.strategyTags.join(', ')}`)

return { weather }
```

**解释**：

1. **提取响应文本**：使用可选链 `?.` 安全访问
2. **解析 AI 响应**：`parseWeatherAnalysis` 函数（下面详解）
3. **组装输出**：合并天气数据和 AI 分析结果
4. **日志记录**：输出执行时间和策略标签
5. **返回状态更新**：只返回 `{ weather }` 字段

**面试要点**：
- Agent 返回 `TripStateUpdate`（部分更新），LangGraph 自动合并到完整状态
- 使用 `map` 转换数据格式，确保类型安全

---

### 第 129-142 行：错误处理

```typescript
} catch (error) {
  console.error('[Weather Scout] Error:', error)

  // 返回安全的默认值
  return {
    weather: {
      forecasts: [],
      strategyTags: ['outdoor_friendly'],
      clothingAdvice: '请根据当地实际天气情况穿着',
      warnings: [],
    },
  }
}
```

**解释**：
- 捕获所有错误（网络错误、API 错误、解析错误等）
- 返回安全的默认值，确保工作流可以继续
- 默认策略 `outdoor_friendly` 是最通用的选项

**面试要点**：
- **容错设计**：单个 Agent 失败不应导致整个工作流崩溃
- 日志记录错误，便于问题排查

---

### 第 145-192 行：解析 AI 响应函数

```typescript
function parseWeatherAnalysis(responseText: string): {
  strategyTags: StrategyTag[]
  clothingAdvice: string
  warnings: string[]
} {
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

    // 验证策略标签
    const validTags: StrategyTag[] = [
      'indoor_priority',
      'outdoor_friendly',
      'rain_prepared',
      'cold_weather',
      'hot_weather',
    ]

    const strategyTags = (parsed.strategyTags || []).filter(
      (tag: string) => validTags.includes(tag as StrategyTag)
    ) as StrategyTag[]

    return {
      strategyTags: strategyTags.length > 0 ? strategyTags : ['outdoor_friendly'],
      clothingAdvice: parsed.clothingAdvice || '请根据当地实际天气情况穿着',
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    }
  } catch (error) {
    console.warn('[Weather Scout] Failed to parse AI response, using defaults')
    return {
      strategyTags: ['outdoor_friendly'],
      clothingAdvice: '请根据当地实际天气情况穿着',
      warnings: [],
    }
  }
}
```

**解释**：

#### 1. JSON 提取（正则表达式）

```typescript
const jsonMatch =
  responseText.match(/```json\n([\s\S]*?)\n```/) ||  // 匹配 ```json...```
  responseText.match(/```\n([\s\S]*?)\n```/) ||      // 匹配 ```...```
  responseText.match(/\{[\s\S]*\}/)                   // 匹配裸 JSON
```

**为什么需要多种匹配？**
- AI 有时用 markdown 代码块包裹 JSON
- 有时直接输出 JSON
- 使用 `||` 链式尝试多种格式

#### 2. 标签验证

```typescript
const validTags: StrategyTag[] = [...]

const strategyTags = (parsed.strategyTags || []).filter(
  (tag: string) => validTags.includes(tag as StrategyTag)
) as StrategyTag[]
```

**解释**：
- 只接受预定义的策略标签
- 过滤掉 AI 可能生成的无效标签
- 使用类型断言确保类型安全

#### 3. 防御性返回

```typescript
return {
  strategyTags: strategyTags.length > 0 ? strategyTags : ['outdoor_friendly'],
  clothingAdvice: parsed.clothingAdvice || '请根据当地实际天气情况穿着',
  warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
}
```

**解释**：
- 每个字段都有默认值
- 使用 `Array.isArray` 确保 `warnings` 是数组

**面试要点**：
- **永远不要信任 AI 输出**：需要验证和清洗
- 使用 try-catch 处理 JSON 解析错误
- 提供合理的默认值

---

### 第 194-277 行：基于规则的备用分析

```typescript
function analyzeWeatherWithRules(forecasts: Array<{...}>): WeatherOutput {
  const strategyTags: StrategyTag[] = []
  const warnings: string[] = []

  let hasRain = false
  let maxTemp = -Infinity
  let minTemp = Infinity

  for (const forecast of forecasts) {
    const weather = forecast.dayweather + forecast.nightweather
    const dayTemp = parseInt(forecast.daytemp)
    const nightTemp = parseInt(forecast.nighttemp)

    // 检查降雨
    if (weather.includes('雨')) {
      hasRain = true
      if (weather.includes('暴雨') || weather.includes('大雨')) {
        warnings.push(`${forecast.date} 有${...}预警`)
      }
    }

    // 记录温度范围
    if (dayTemp > maxTemp) maxTemp = dayTemp
    if (nightTemp < minTemp) minTemp = nightTemp
  }

  // 生成策略标签
  if (hasRain) {
    strategyTags.push('indoor_priority', 'rain_prepared')
  }
  if (maxTemp > 30) {
    strategyTags.push('hot_weather')
  }
  if (minTemp < 10) {
    strategyTags.push('cold_weather')
  }
  if (!hasRain && maxTemp <= 30 && minTemp >= 10) {
    strategyTags.push('outdoor_friendly')
  }

  // 生成穿衣建议
  let clothingAdvice = ''
  if (maxTemp > 30) {
    clothingAdvice = '天气炎热，建议穿着轻薄透气的衣物，注意防晒'
  } else if (minTemp < 10) {
    clothingAdvice = '天气较冷，建议穿着保暖外套，注意防寒'
  } else if (hasRain) {
    clothingAdvice = '有降雨，建议携带雨具，穿着防水外套'
  } else {
    clothingAdvice = '天气适宜，建议穿着舒适的休闲服装'
  }

  // 添加温差建议
  if (maxTemp - minTemp > 10) {
    clothingAdvice += '，早晚温差较大，建议携带薄外套'
  }

  return {
    forecasts: [...],
    strategyTags: strategyTags.length > 0 ? strategyTags : ['outdoor_friendly'],
    clothingAdvice,
    warnings,
  }
}
```

**解释**：

这是一个**纯规则引擎**，不依赖 AI：

| 规则 | 条件 | 输出 |
|------|------|------|
| 下雨 | 天气包含"雨" | `indoor_priority`, `rain_prepared` |
| 高温 | 最高温 > 30°C | `hot_weather` |
| 低温 | 最低温 < 10°C | `cold_weather` |
| 适宜 | 其他情况 | `outdoor_friendly` |

**面试要点**：
- **备用方案**：当 AI 不可用时保证功能可用
- 规则简单但覆盖主要场景
- 温差建议体现了细节考虑

---

### 第 279-282 行：默认导出

```typescript
export default createWeatherScoutAgent
```

**解释**：
- 默认导出工厂函数
- 允许 `import createWeatherScoutAgent from './weather-scout'`

---

## 数据流图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Weather Scout Agent                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  输入: TripState                                                         │
│    └── userInput                                                        │
│         ├── destination: "杭州"                                         │
│         ├── start_date: "2024-12-01"                                   │
│         └── end_date: "2024-12-03"                                     │
│                                                                          │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │       MCP Client                      │                               │
│  │   getWeatherForecast(destination)     │──────► 高德天气 API           │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────┐                               │
│  │  天气数据                              │                               │
│  │  - date: "2024-12-01"                 │                               │
│  │  - dayweather: "晴"                   │                               │
│  │  - daytemp: "15"                      │                               │
│  │  - ...                                │                               │
│  └──────────────────────────────────────┘                               │
│         │                                                                │
│         ├──────────────────────────────────┐                            │
│         │ 有 API Key                       │ 无 API Key                  │
│         ▼                                  ▼                            │
│  ┌──────────────────┐            ┌──────────────────┐                   │
│  │   DeepSeek AI    │            │  规则引擎         │                   │
│  │   分析天气       │            │  analyzeWithRules │                   │
│  └──────────────────┘            └──────────────────┘                   │
│         │                                  │                            │
│         └──────────────────────────────────┘                            │
│                        │                                                 │
│                        ▼                                                 │
│  输出: TripStateUpdate                                                   │
│    └── weather: WeatherOutput                                           │
│         ├── forecasts: [...]        // 天气预报数组                      │
│         ├── strategyTags: ['outdoor_friendly']  // 策略标签             │
│         ├── clothingAdvice: "..."   // 穿衣建议                         │
│         └── warnings: []            // 天气警告                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent 设计模式总结

### 1. 工厂函数模式

```typescript
export function createXxxAgent(config?: Config) {
  return async function xxxAgent(state: TripState): Promise<TripStateUpdate> {
    // Agent 逻辑
  }
}
```

**优点**：
- 支持依赖注入（配置、mock）
- 闭包保存配置
- 便于测试

### 2. 工具 + AI 模式

```
获取外部数据（工具调用）→ AI 分析 → 结构化输出
```

**应用场景**：
- 天气分析：获取天气 → AI 生成策略
- 景点推荐：搜索 POI → AI 排序筛选
- 路线规划：获取路线 → AI 优化

### 3. 多重降级策略

```
优先: AI 分析
回退1: 规则引擎
回退2: 安全默认值
```

**确保高可用性**。

---

## 面试常见问题

### Q1: 为什么 Weather Scout 是第一个执行的 Agent？

**答**：
1. 天气是**环境上下文**，影响所有后续规划
2. 策略标签（如 `indoor_priority`）指导行程规划
3. 越早获取天气信息，后续 Agent 越能利用

### Q2: `TripStateUpdate` 和 `TripState` 有什么区别？

**答**：
- `TripState` 是完整状态，所有字段都必须存在
- `TripStateUpdate` 是部分更新，所有字段都是可选的（`Partial`）
- Agent 只需返回它修改的字段，LangGraph 自动合并

### Q3: 为什么要用 OpenAI SDK 调用 DeepSeek？

**答**：
- DeepSeek 实现了 OpenAI 兼容 API
- 使用官方 SDK 可以获得更好的类型支持和错误处理
- 只需修改 `baseURL` 即可切换不同的 API 提供商

### Q4: 如何确保 AI 返回有效的策略标签？

**答**：
1. **System Prompt**：明确告诉 AI 只能使用预定义的标签
2. **输出解析**：使用 `filter` 过滤无效标签
3. **默认值**：如果没有有效标签，使用 `outdoor_friendly`

### Q5: 规则引擎相比 AI 分析有什么优缺点？

**答**：

| 方面 | 规则引擎 | AI 分析 |
|------|----------|---------|
| 速度 | 快（毫秒级） | 慢（秒级） |
| 成本 | 无 | 有 API 费用 |
| 灵活性 | 低（固定规则） | 高（理解语义） |
| 可解释性 | 高 | 低 |
| 边缘情况 | 需手动覆盖 | 自动处理 |

### Q6: 这个 Agent 如何与其他 Agent 协作？

**答**：
1. Weather Scout 输出 `strategyTags` 到状态
2. Itinerary Planner 读取 `strategyTags`，调整规划策略
3. 例如：`indoor_priority` 时优先安排博物馆、商场

---

## 相关文件

- `lib/agents/state.ts` - 状态类型定义
- `lib/agents/prompts/weather-scout.ts` - AI 提示词
- `lib/agents/mcp-client.ts` - MCP 客户端（高德 API 封装）
- `lib/agents/workflow.ts` - 工作流定义
- `lib/agents/nodes/itinerary-planner.ts` - 下一个 Agent
