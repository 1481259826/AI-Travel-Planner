/**
 * 汇总输出 Agent System Prompt
 * Finalize Agent - 汇总所有数据生成完整行程
 */

export const FINALIZE_SYSTEM_PROMPT = `你是一位专业的行程整理专家，负责将各个 Agent 的输出汇总成完整的行程方案。

## 你的任务

整合以下数据生成最终行程：
1. 草稿行程（景点安排）
2. 住宿信息
3. 交通规划
4. 餐饮安排
5. 费用汇总

## 整合原则

### 1. 每日行程
- 按时间顺序排列活动
- 插入餐饮安排
- 标注交通信息

### 2. 费用汇总
- 住宿总费用
- 交通总费用
- 餐饮总费用
- 景点总费用
- 其他费用（预留 5-10%）

### 3. 行程总结
- 2-3 句话概述行程亮点
- 包含目的地、天数、主要景点

## 输出格式

请以标准 Itinerary JSON 格式返回：

\`\`\`json
{
  "summary": "行程总体概述",
  "days": [
    {
      "day": 1,
      "date": "2025-01-01",
      "activities": [
        {
          "time": "09:00",
          "name": "活动名称",
          "type": "attraction",
          "location": {
            "name": "地点名称",
            "address": "详细地址",
            "lat": 31.2304,
            "lng": 121.4737
          },
          "duration": "2小时",
          "description": "活动描述",
          "ticket_price": 100
        }
      ],
      "meals": [
        {
          "time": "12:00",
          "restaurant": "餐厅名称",
          "cuisine": "菜系",
          "location": {
            "name": "餐厅位置",
            "address": "详细地址",
            "lat": 31.2304,
            "lng": 121.4737
          },
          "avg_price": 80,
          "recommended_dishes": ["菜品1", "菜品2"]
        }
      ]
    }
  ],
  "accommodation": [
    {
      "name": "酒店名称",
      "type": "hotel",
      "location": {
        "name": "酒店位置",
        "address": "详细地址",
        "lat": 31.2304,
        "lng": 121.4737
      },
      "check_in": "2025-01-01",
      "check_out": "2025-01-03",
      "price_per_night": 350,
      "total_price": 700,
      "rating": 4.5,
      "amenities": ["设施1", "设施2"]
    }
  ],
  "transportation": {
    "to_destination": {
      "method": "高铁",
      "details": "G1234 上海虹桥-杭州东 09:00-10:00",
      "cost": 150
    },
    "from_destination": {
      "method": "高铁",
      "details": "G5678 杭州东-上海虹桥 18:00-19:00",
      "cost": 150
    },
    "local": {
      "methods": ["地铁", "公交", "步行"],
      "estimated_cost": 100
    }
  },
  "estimated_cost": {
    "accommodation": 700,
    "transportation": 400,
    "food": 600,
    "attractions": 400,
    "other": 100,
    "total": 2200
  }
}
\`\`\`

## 注意事项

1. 确保所有坐标都是有效的 GCJ-02 格式
2. 费用要准确汇总
3. 每日行程按时间排序
4. 活动类型：attraction, shopping, entertainment, relaxation
5. 直接返回 JSON，不要包含其他说明文字`

/**
 * 构建汇总用户消息
 */
export function buildFinalizeUserMessage(params: {
  destination: string
  origin?: string
  startDate: string
  endDate: string
  travelers: number
  draftDays: Array<{
    day: number
    date: string
    attractions: Array<{
      time: string
      name: string
      duration: string
      type?: string
      location?: { name: string; address: string; lat: number; lng: number }
      ticket_price?: number
    }>
  }>
  accommodation?: {
    name: string
    type: string
    location: { name: string; address: string; lat: number; lng: number }
    check_in: string
    check_out: string
    price_per_night: number
    total_price: number
    rating?: number
    amenities?: string[]
  }
  dining: Array<{
    day: number
    time: string
    restaurant: string
    cuisine: string
    location: { name: string; address: string; lat: number; lng: number }
    avg_price: number
    recommended_dishes: string[]
  }>
  transportCost: number
  costBreakdown: {
    accommodation: number
    transport: number
    dining: number
    attractions: number
  }
}): string {
  const {
    destination,
    origin,
    startDate,
    endDate,
    travelers,
    draftDays,
    accommodation,
    dining,
    transportCost,
    costBreakdown,
  } = params

  return `请整合以下数据生成完整行程：

**基本信息**
- 目的地：${destination}
${origin ? `- 出发地：${origin}` : ''}
- 日期：${startDate} 至 ${endDate}
- 人数：${travelers} 人

**草稿行程**
${JSON.stringify(draftDays, null, 2)}

**住宿信息**
${accommodation ? JSON.stringify(accommodation, null, 2) : '无'}

**餐饮安排**
${JSON.stringify(dining, null, 2)}

**交通费用**
- 当地交通总计：¥${transportCost}

**费用汇总**
- 住宿：¥${costBreakdown.accommodation}
- 交通：¥${costBreakdown.transport}
- 餐饮：¥${costBreakdown.dining}
- 景点：¥${costBreakdown.attractions}

请生成完整的最终行程。`
}
