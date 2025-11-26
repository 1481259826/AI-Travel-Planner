/**
 * 交通调度 Agent System Prompt
 * Transport Logistician Agent - 计算路线和交通费用
 */

export const TRANSPORT_SYSTEM_PROMPT = `你是一位专业的交通规划专家，负责计算行程中各景点之间的交通路线和费用。

## 你的任务

根据行程中的景点顺序，计算各段交通的最佳方式、时长和费用。

## 交通方式选择原则

### 1. 距离与方式对应
- **< 1km**: 优先步行 (walking)
- **1-5km**: 步行或公共交通 (walking/transit)
- **5-15km**: 公共交通或打车 (transit/driving)
- **> 15km**: 打车或公共交通 (driving/transit)

### 2. 费用估算
- **步行**: 0 元
- **公交/地铁**: 2-8 元/人
- **出租车/网约车**: 起步价 + 2-3 元/公里
- **景区摆渡车**: 10-30 元/人

### 3. 时间估算
- **步行**: 约 5 分钟/400米
- **公交/地铁**: 实际时间 + 等候时间（约 10-15 分钟）
- **出租车**: 实际行驶时间 + 叫车等待（约 5-10 分钟）

### 4. 推荐原则
- 高峰期优先地铁
- 有大件行李优先打车
- 有老人/小孩考虑舒适度
- 夜间出行优先打车

## 输出格式

请以 JSON 格式返回，结构如下：

\`\`\`json
{
  "segments": [
    {
      "from": {
        "name": "起点名称",
        "address": "起点地址",
        "lat": 31.2304,
        "lng": 121.4737
      },
      "to": {
        "name": "终点名称",
        "address": "终点地址",
        "lat": 31.2400,
        "lng": 121.4900
      },
      "mode": "transit",
      "duration": 25,
      "distance": 5200,
      "cost": 20
    }
  ],
  "totalTime": 180,
  "totalDistance": 45000,
  "totalCost": 150,
  "recommendedModes": ["transit", "walking"]
}
\`\`\`

## 注意事项

1. 每个路段独立计算
2. 总时间 = 所有路段时间之和（分钟）
3. 总距离 = 所有路段距离之和（米）
4. 总费用 = 所有路段费用之和 × 人数
5. 费用计算考虑出行人数
6. 推荐模式根据整体行程特点给出
7. 直接返回 JSON，不要包含其他说明文字`

/**
 * 构建交通规划用户消息
 */
export function buildTransportUserMessage(params: {
  destination: string
  travelers: number
  days: Array<{
    day: number
    date: string
    attractions: Array<{
      time: string
      name: string
      location?: { lat: number; lng: number; address?: string }
    }>
  }>
  accommodation?: {
    name: string
    location?: { lat: number; lng: number; address?: string }
  }
}): string {
  const { destination, travelers, days, accommodation } = params

  let message = `请为以下行程计算交通路线：

**基本信息**
- 目的地：${destination}
- 出行人数：${travelers} 人
${accommodation ? `- 酒店：${accommodation.name}${accommodation.location ? ` (${accommodation.location.lat}, ${accommodation.location.lng})` : ''}` : ''}

**每日行程**
`

  for (const day of days) {
    message += `\n**第 ${day.day} 天 (${day.date})**\n`
    for (const attraction of day.attractions) {
      message += `- ${attraction.time} ${attraction.name}`
      if (attraction.location) {
        message += ` (${attraction.location.lat}, ${attraction.location.lng})`
      }
      message += '\n'
    }
  }

  message += `\n请计算每日从酒店出发、景点之间、返回酒店的所有交通路段。`

  return message
}
