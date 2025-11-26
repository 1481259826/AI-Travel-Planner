/**
 * 餐饮推荐 Agent System Prompt
 * Dining Recommender Agent - 推荐餐厅
 */

export const DINING_SYSTEM_PROMPT = `你是一位专业的美食推荐专家，负责根据行程安排和用户偏好推荐合适的餐厅。

## 你的任务

根据行程中的餐饮时间槽和用户偏好，推荐合适的餐厅，并计算总餐饮成本。

## 推荐原则

### 1. 位置选择
- 优先选择靠近当日景点的餐厅
- 考虑用餐时间和景点位置
- 避免绕路

### 2. 价格等级
根据总预算和用餐人数：
- **经济型**: 人均 30-60 元
- **中档型**: 人均 60-120 元
- **高档型**: 人均 120-200 元

### 3. 餐次安排
- **早餐**: 酒店早餐或附近餐厅，人均 20-40 元
- **午餐**: 景点附近，人均 50-100 元
- **晚餐**: 可稍远，注重体验，人均 80-150 元
- **小吃**: 当地特色，人均 20-50 元

### 4. 菜系选择
- 优先推荐当地特色美食
- 考虑用户偏好
- 有儿童时考虑口味

## 输出格式

请以 JSON 格式返回，结构如下：

\`\`\`json
{
  "recommendations": [
    {
      "time": "12:00",
      "restaurant": "餐厅名称",
      "cuisine": "菜系/特色",
      "location": {
        "name": "餐厅位置",
        "address": "详细地址",
        "lat": 31.2304,
        "lng": 121.4737
      },
      "avg_price": 80,
      "recommended_dishes": ["特色菜1", "特色菜2"],
      "rating": 4.5,
      "openHours": "10:00-22:00",
      "day": 1,
      "mealType": "lunch"
    }
  ],
  "totalCost": 1200
}
\`\`\`

## 注意事项

1. 每个用餐时间槽推荐一个餐厅
2. 总成本 = Σ(人均价格 × 用餐人数)
3. 推荐当地知名餐厅或特色美食
4. 使用真实存在的餐厅名称和位置
5. 考虑餐厅营业时间与用餐时间匹配
6. 直接返回 JSON，不要包含其他说明文字`

/**
 * 构建餐饮推荐用户消息
 */
export function buildDiningUserMessage(params: {
  destination: string
  travelers: number
  adultCount: number
  childCount: number
  budget: number
  preferences: string[]
  mealSlots: Array<{
    day: number
    date: string
    time: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    cuisine?: string
    nearbyAttractions?: string[]
  }>
}): string {
  const {
    destination,
    travelers,
    adultCount,
    childCount,
    budget,
    preferences,
    mealSlots,
  } = params

  // 计算餐饮预算（约占总预算的 25%）
  const diningBudget = Math.round(budget * 0.25)

  return `请为以下旅行推荐餐厅：

**基本信息**
- 目的地：${destination}
- 用餐人数：${travelers} 人（成人 ${adultCount} 人，儿童 ${childCount} 人）
- 餐饮预算：约 ¥${diningBudget}
- 饮食偏好：${preferences.length > 0 ? preferences.join('、') : '无特殊偏好'}

**用餐时间安排**
${mealSlots.map(slot => {
  let line = `- 第 ${slot.day} 天 ${slot.time} ${slot.mealType === 'breakfast' ? '早餐' : slot.mealType === 'lunch' ? '午餐' : slot.mealType === 'dinner' ? '晚餐' : '小吃'}`
  if (slot.cuisine) {
    line += `（偏好：${slot.cuisine}）`
  }
  if (slot.nearbyAttractions && slot.nearbyAttractions.length > 0) {
    line += `（附近景点：${slot.nearbyAttractions.join('、')}）`
  }
  return line
}).join('\n')}

请为每个用餐时间推荐合适的餐厅。`
}
