/**
 * 景点详情增强 Agent System Prompt
 * Attraction Enricher Agent - 为景点添加详细信息
 */

import type { EnrichedAttraction } from '../state'

export const ATTRACTION_ENRICHER_SYSTEM_PROMPT = `你是一位景点信息专家，负责分析和整理景点的详细信息。

## 你的任务

根据提供的景点基本信息和高德 POI 数据，生成完整的景点详情，包括：
1. 门票价格估算
2. 开放时间
3. 游玩建议
4. 特色标签

## 分析原则

### 1. 门票价格估算
根据景点类型估算门票价格：
- **5A 景区/世界遗产**: ¥100-300
- **4A 景区**: ¥50-150
- **城市公园/免费开放景点**: ¥0
- **博物馆/纪念馆**: ¥0-50（部分免费）
- **主题乐园/游乐场**: ¥150-500
- **古镇/古村**: ¥0-100
- **宗教场所**: ¥0-80
- **商业街/购物区**: ¥0

### 2. 开放时间推断
根据景点类型推断开放时间：
- **景区**: 08:00-17:30 或 09:00-18:00
- **博物馆**: 09:00-17:00（周一闭馆）
- **公园**: 06:00-22:00 或全天开放
- **商业区**: 10:00-22:00
- **夜景类**: 18:00-23:00

### 3. 游玩时长建议
- **大型景区**: 3-4 小时
- **中型景区/博物馆**: 2-3 小时
- **小型景点/公园**: 1-2 小时
- **商业街**: 2-3 小时
- **打卡点**: 0.5-1 小时

### 4. 景点标签
常见标签：
- 世界遗产、5A 景区、4A 景区
- 历史文化、自然风光、人文景观
- 亲子游、情侣游、家庭游
- 免费开放、网红打卡、必去景点
- 室内、户外、半室内

## 输出格式

请以 JSON 格式返回增强后的景点信息：

\`\`\`json
{
  "enrichedAttractions": [
    {
      "name": "西湖",
      "address": "浙江省杭州市西湖区龙井路1号",
      "ticketPrice": 0,
      "ticketInfo": "西湖景区免费开放，部分园中园收费",
      "openingHours": "全天开放",
      "rating": 4.8,
      "recommendedDuration": "3-4小时",
      "description": "西湖是中国著名的旅游胜地，被列入世界文化遗产名录...",
      "tips": ["建议清晨或傍晚游览避开人流", "可以租借自行车环湖"],
      "tags": ["世界遗产", "5A景区", "免费开放", "必去景点"]
    }
  ],
  "totalTicketCost": 0
}
\`\`\`

## 注意事项

1. 门票价格按成人标准估算
2. 如果 POI 数据有评分，优先使用 POI 评分
3. 如果 POI 数据有照片，保留照片 URL
4. 如果 POI 数据有电话，保留电话号码
5. 描述应简洁（50-100字），突出景点特色
6. tips 提供 2-3 条实用建议
7. 直接返回 JSON，不要包含其他说明文字`

/**
 * 构建景点增强用户消息
 */
export function buildAttractionEnricherUserMessage(params: {
  destination: string
  attractions: Array<{
    name: string
    address?: string
    location?: { lat: number; lng: number }
    type?: string
    duration?: string
    poiData?: {
      id?: string
      name?: string
      type?: string
      typecode?: string
      address?: string
      tel?: string
      photos?: string[]
      rating?: string
      openingHours?: string
      business?: {
        opentime_today?: string
        keytag?: string
      }
    }
  }>
  travelers: number
  adultCount: number
  childCount: number
}): string {
  const { destination, attractions, travelers, adultCount, childCount } = params

  let message = `请为以下景点提供详细信息增强：

**目的地**：${destination}
**游客人数**：${travelers} 人（成人 ${adultCount} 人，儿童 ${childCount} 人）

**景点列表**：
`

  attractions.forEach((attraction, index) => {
    message += `
### ${index + 1}. ${attraction.name}
- 地址：${attraction.address || '未知'}
- 类型：${attraction.type || '景点'}
- 预计游玩时长：${attraction.duration || '未知'}
`
    if (attraction.poiData) {
      message += `- POI 类型：${attraction.poiData.type || '未知'}
- POI 评分：${attraction.poiData.rating || '未知'}
- 电话：${attraction.poiData.tel || '未知'}
`
      if (attraction.poiData.business?.opentime_today) {
        message += `- 营业时间：${attraction.poiData.business.opentime_today}\n`
      }
      if (attraction.poiData.business?.keytag) {
        message += `- 特色标签：${attraction.poiData.business.keytag}\n`
      }
    }
  })

  message += `
请根据以上信息，为每个景点生成详细的增强信息。`

  return message
}

/**
 * 解析增强结果
 */
export function parseAttractionEnricherResponse(
  responseText: string
): { enrichedAttractions: EnrichedAttraction[]; totalTicketCost: number } {
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

    return {
      enrichedAttractions: parsed.enrichedAttractions || [],
      totalTicketCost: parsed.totalTicketCost || 0,
    }
  } catch (error) {
    console.warn('[Attraction Enricher] Failed to parse response:', error)
    return {
      enrichedAttractions: [],
      totalTicketCost: 0,
    }
  }
}
