import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helpers'
import config from '@/lib/config'
import { TripFormData, Itinerary, AIModel } from '@/types'
import { getModelById } from '@/lib/models'
import { getUserApiKey } from '@/lib/api-keys'

// 初始化 Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
  baseURL: config.anthropic.baseURL,
})

// 初始化 DeepSeek 客户端（使用 OpenAI 兼容 API）
const deepseek = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const formData: TripFormData = await request.json()

    // 获取选择的模型配置
    const selectedModel = formData.model || 'claude-haiku-4-5'
    const modelConfig = getModelById(selectedModel)

    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      )
    }

    // 检查用户是否有自己的 API Key
    let userAnthropicKey: string | null = null
    let userDeepSeekKey: string | null = null

    if (modelConfig.provider === 'anthropic') {
      userAnthropicKey = await getUserApiKey(user.id, 'anthropic')
    } else if (modelConfig.provider === 'deepseek') {
      userDeepSeekKey = await getUserApiKey(user.id, 'deepseek')
    }

    // 如果用户有自己的 Key，创建新的客户端实例
    const anthropicClient = userAnthropicKey
      ? new Anthropic({ apiKey: userAnthropicKey, baseURL: config.anthropic.baseURL })
      : anthropic

    const deepseekClient = userDeepSeekKey
      ? new OpenAI({ apiKey: userDeepSeekKey, baseURL: config.deepseek.baseURL })
      : deepseek

    // Calculate trip duration
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Create prompt for Claude
    const prompt = `你是一个专业的旅行规划师。根据以下信息生成详细的旅行计划：

出发地：${formData.origin || '未指定'}
目的地：${formData.destination}
日期：${formData.start_date} 至 ${formData.end_date}（共 ${days} 天）
预算：¥${formData.budget}
人数：${formData.travelers} 人（成人 ${formData.adult_count} 人，儿童 ${formData.child_count} 人）
偏好：${formData.preferences.join('、') || '无特殊偏好'}
${formData.additional_notes ? `补充说明：${formData.additional_notes}` : ''}

请生成一个详细的旅行计划，以 JSON 格式返回，包含以下内容：

{
  "summary": "行程总体概述（2-3句话）",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00",
          "name": "活动名称",
          "type": "attraction",
          "location": {
            "name": "地点名称",
            "address": "详细地址",
            "lat": 纬度,
            "lng": 经度
          },
          "duration": "2小时",
          "description": "活动描述",
          "ticket_price": 门票价格（数字），
          "tips": "游玩建议"
        }
      ],
      "meals": [
        {
          "time": "12:00",
          "restaurant": "餐厅名称",
          "cuisine": "菜系",
          "location": {
            "name": "地点名称",
            "address": "详细地址",
            "lat": 纬度,
            "lng": 经度
          },
          "avg_price": 人均价格（数字）,
          "recommended_dishes": ["推荐菜品1", "推荐菜品2"]
        }
      ]
    }
  ],
  "accommodation": [
    {
      "name": "酒店名称",
      "type": "hotel",
      "location": {
        "name": "地点名称",
        "address": "详细地址",
        "lat": 纬度,
        "lng": 经度
      },
      "check_in": "入住日期",
      "check_out": "退房日期",
      "price_per_night": 每晚价格,
      "total_price": 总价,
      "rating": 评分（1-5）,
      "amenities": ["设施1", "设施2"]
    }
  ],
  "transportation": {
    "to_destination": {
      "method": "交通方式",
      "details": "详细信息",
      "cost": 费用
    },
    "from_destination": {
      "method": "交通方式",
      "details": "详细信息",
      "cost": 费用
    },
    "local": {
      "methods": ["地铁", "出租车"],
      "estimated_cost": 预估费用
    }
  },
  "estimated_cost": {
    "accommodation": 住宿总费用,
    "transportation": 交通总费用,
    "food": 餐饮总费用,
    "attractions": 景点总费用,
    "other": 其他费用,
    "total": 总费用
  }
}

注意：
1. 确保每日行程安排合理，时间不要太紧张
2. 考虑景点之间的距离和交通时间
3. 推荐当地特色美食和知名餐厅
4. **费用估算要尽量准确，特别是交通费用：**
   - 如果提供了出发地，请根据出发地到目的地的实际距离计算往返交通费用
   - 飞机、高铁、汽车等交通方式要基于真实价格估算
   - 目的地内部的交通费用也要准确计算
5. 提供实用的旅行建议
6. 所有价格都用人民币
7. **非常重要：每个活动和餐厅的 location 必须包含真实准确的经纬度坐标（lat, lng）**
8. 经纬度必须是数字类型，不能是字符串或 null
9. 请使用真实存在的景点和餐厅，并提供准确的地理坐标
10. 请直接返回 JSON，不要包含任何其他文字说明`

    // Call AI API (根据选择的模型)
    let responseText = ''

    if (modelConfig.provider === 'deepseek') {
      // DeepSeek 使用 OpenAI 兼容的 API（使用用户 Key 或系统默认）
      const completion = await deepseekClient.chat.completions.create({
        model: config.deepseek.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: modelConfig.maxTokens,
      })
      responseText = completion.choices[0]?.message?.content || ''
    } else {
      // Anthropic Claude API（使用用户 Key 或系统默认）
      const message = await anthropicClient.messages.create({
        model: selectedModel,
        max_tokens: modelConfig.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
      responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    }

    // Try to extract JSON from the response
    let itinerary: Itinerary
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/)
      const jsonString = jsonMatch ? jsonMatch[1] : responseText
      itinerary = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: responseText },
        { status: 500 }
      )
    }

    // 创建带有用户认证的 Supabase 客户端
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || ''

    const supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 确保 profile 记录存在
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      // 如果 profile 不存在，创建一个
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        })

      if (profileError) {
        console.error('Failed to create profile:', profileError)
        // 不阻止流程，继续尝试插入 trip
      }
    }

    // Save trip to database
    const tripData: any = {
        user_id: user.id,
        destination: formData.destination,
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget: formData.budget,
        travelers: formData.travelers,
        adult_count: formData.adult_count,
        child_count: formData.child_count,
        preferences: formData.preferences,
        itinerary: itinerary,
        status: 'planned',
    }

    // 如果提供了 origin，则添加（需要先在数据库中添加该列）
    if (formData.origin) {
      tripData.origin = formData.origin
    }

    const { data: trip, error: dbError } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save trip', details: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      trip_id: trip.id,
      itinerary: itinerary,
    })
  } catch (error) {
    console.error('Error generating itinerary:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
