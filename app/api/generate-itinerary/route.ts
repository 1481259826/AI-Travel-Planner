import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helpers'
import config from '@/lib/config'
import { TripFormData, Itinerary, AIModel } from '@/types'
import { getModelById } from '@/lib/models'
import { getUserApiKey } from '@/lib/api-keys'
import { getWeatherByCityName } from '@/lib/amap-weather'
import { optimizeItineraryByClustering } from '@/lib/geo-clustering'
import { smartGeocode } from '@/lib/amap-geocoding'
import { wgs84ToGcj02 } from '@/lib/coordinate-converter'

// 初始化 DeepSeek 客户端（使用 OpenAI 兼容 API）
const deepseek = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
})

// 初始化 ModelScope 客户端（使用 OpenAI 兼容 API）
const modelscope = new OpenAI({
  apiKey: config.modelscope.apiKey,
  baseURL: config.modelscope.baseURL,
})

/**
 * 修正行程中的坐标
 * 策略：
 * 1. 优先使用高德地图 API 获取准确的 GCJ-02 坐标
 * 2. 如果 API 调用失败，则将 WGS84 坐标转换为 GCJ-02
 */
async function correctItineraryCoordinates(itinerary: Itinerary, destination: string): Promise<Itinerary> {
  console.log('Starting coordinate correction...')

  let apiCallCount = 0
  const maxApiCalls = 30 // 限制API调用次数，避免超出配额

  // 遍历每一天的行程
  for (const day of itinerary.days) {
    // 修正活动景点坐标
    if (day.activities && day.activities.length > 0) {
      for (const activity of day.activities) {
        if (activity.location && activity.location.lat && activity.location.lng) {
          // 尝试使用高德地图API获取准确坐标（有次数限制）
          if (apiCallCount < maxApiCalls) {
            try {
              // 添加延迟避免API限流
              if (apiCallCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 300))
              }

              const result = await smartGeocode(activity.name, destination)
              apiCallCount++

              if (result) {
                console.log(`✓ Corrected coordinates for ${activity.name}: (${activity.location.lat}, ${activity.location.lng}) → (${result.lat}, ${result.lng})`)
                activity.location.lat = result.lat
                activity.location.lng = result.lng
                if (result.formattedAddress) {
                  activity.location.address = result.formattedAddress
                }
                continue
              }
            } catch (error) {
              console.warn(`Failed to geocode ${activity.name}, falling back to coordinate conversion:`, error)
            }
          }

          // API调用失败或超出次数限制，使用坐标转换
          const converted = wgs84ToGcj02(activity.location.lng, activity.location.lat)
          const offsetDistance = Math.sqrt(
            Math.pow((converted.lng - activity.location.lng) * 111000, 2) +
            Math.pow((converted.lat - activity.location.lat) * 111000, 2)
          )

          // 只有偏移超过10米才进行转换（避免重复转换已经是GCJ-02的坐标）
          if (offsetDistance > 10) {
            console.log(`→ Converted coordinates for ${activity.name}: (${activity.location.lat}, ${activity.location.lng}) → (${converted.lat}, ${converted.lng})`)
            activity.location.lat = converted.lat
            activity.location.lng = converted.lng
          }
        }
      }
    }

    // 修正餐饮地点坐标
    if (day.meals && day.meals.length > 0) {
      for (const meal of day.meals) {
        if (meal.location && meal.location.lat && meal.location.lng) {
          // 尝试使用高德地图API获取准确坐标
          if (apiCallCount < maxApiCalls) {
            try {
              if (apiCallCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 300))
              }

              const result = await smartGeocode(meal.restaurant, destination)
              apiCallCount++

              if (result) {
                console.log(`✓ Corrected coordinates for ${meal.restaurant}: (${meal.location.lat}, ${meal.location.lng}) → (${result.lat}, ${result.lng})`)
                meal.location.lat = result.lat
                meal.location.lng = result.lng
                if (result.formattedAddress) {
                  meal.location.address = result.formattedAddress
                }
                continue
              }
            } catch (error) {
              console.warn(`Failed to geocode ${meal.restaurant}, falling back to coordinate conversion:`, error)
            }
          }

          // API调用失败或超出次数限制，使用坐标转换
          const converted = wgs84ToGcj02(meal.location.lng, meal.location.lat)
          const offsetDistance = Math.sqrt(
            Math.pow((converted.lng - meal.location.lng) * 111000, 2) +
            Math.pow((converted.lat - meal.location.lat) * 111000, 2)
          )

          if (offsetDistance > 10) {
            console.log(`→ Converted coordinates for ${meal.restaurant}: (${meal.location.lat}, ${meal.location.lng}) → (${converted.lat}, ${converted.lng})`)
            meal.location.lat = converted.lat
            meal.location.lng = converted.lng
          }
        }
      }
    }
  }

  // 修正住宿坐标
  if (itinerary.accommodation && itinerary.accommodation.length > 0) {
    for (const hotel of itinerary.accommodation) {
      if (hotel.location && hotel.location.lat && hotel.location.lng) {
        // 尝试使用高德地图API获取准确坐标
        if (apiCallCount < maxApiCalls) {
          try {
            if (apiCallCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 300))
            }

            const result = await smartGeocode(hotel.name, destination)
            apiCallCount++

            if (result) {
              console.log(`✓ Corrected coordinates for hotel ${hotel.name}: (${hotel.location.lat}, ${hotel.location.lng}) → (${result.lat}, ${result.lng})`)
              hotel.location.lat = result.lat
              hotel.location.lng = result.lng
              if (result.formattedAddress) {
                hotel.location.address = result.formattedAddress
              }
              continue
            }
          } catch (error) {
            console.warn(`Failed to geocode ${hotel.name}, falling back to coordinate conversion:`, error)
          }
        }

        // API调用失败或超出次数限制，使用坐标转换
        const converted = wgs84ToGcj02(hotel.location.lng, hotel.location.lat)
        const offsetDistance = Math.sqrt(
          Math.pow((converted.lng - hotel.location.lng) * 111000, 2) +
          Math.pow((converted.lat - hotel.location.lat) * 111000, 2)
        )

        if (offsetDistance > 10) {
          console.log(`→ Converted coordinates for hotel ${hotel.name}: (${hotel.location.lat}, ${hotel.location.lng}) → (${converted.lat}, ${converted.lng})`)
          hotel.location.lat = converted.lat
          hotel.location.lng = converted.lng
        }
      }
    }
  }

  console.log(`Coordinate correction completed. API calls used: ${apiCallCount}/${maxApiCalls}`)
  return itinerary
}

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
    let userDeepSeekKey: string | null = null
    let userModelScopeKey: string | null = null

    if (modelConfig.provider === 'deepseek') {
      userDeepSeekKey = await getUserApiKey(user.id, 'deepseek')
    } else if (modelConfig.provider === 'modelscope') {
      userModelScopeKey = await getUserApiKey(user.id, 'modelscope')
    }

    // 如果用户有自己的 Key，创建新的客户端实例
    const deepseekClient = userDeepSeekKey
      ? new OpenAI({ apiKey: userDeepSeekKey, baseURL: config.deepseek.baseURL })
      : deepseek

    const modelscopeClient = userModelScopeKey
      ? new OpenAI({ apiKey: userModelScopeKey, baseURL: config.modelscope.baseURL })
      : modelscope

    // Calculate trip duration
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 获取目的地天气预报（可选，失败不影响主流程）
    let weatherInfo = ''
    try {
      const weatherData = await getWeatherByCityName(formData.destination)
      if (weatherData && weatherData.forecasts && weatherData.forecasts.length > 0) {
        const forecast = weatherData.forecasts[0]
        if (forecast.casts && forecast.casts.length > 0) {
          weatherInfo = '\n天气预报信息：\n'
          forecast.casts.slice(0, days).forEach((day) => {
            weatherInfo += `${day.date} ${day.week}: 白天${day.dayweather}，${day.daytemp}°C，${day.daywind}风${day.daypower}级；`
            weatherInfo += `晚上${day.nightweather}，${day.nighttemp}°C，${day.nightwind}风${day.nightpower}级\n`
          })
          weatherInfo += '\n请根据天气情况合理安排活动，如遇雨天建议安排室内活动，晴天适合户外游览。\n'
        }
      }
    } catch (error) {
      console.error('Failed to fetch weather, continuing without weather data:', error)
    }

    // Create prompt for Claude
    const hotelPreferencesText = formData.hotel_preferences && formData.hotel_preferences.length > 0
      ? `\n酒店偏好：${formData.hotel_preferences.join('、')}`
      : ''

    // 构建时间信息
    const timeInfo = []
    if (formData.start_time) {
      timeInfo.push(`到达时间：${formData.start_time}`)
    }
    if (formData.end_time) {
      timeInfo.push(`离开时间：${formData.end_time}`)
    }
    const timeInfoText = timeInfo.length > 0 ? `\n${timeInfo.join('，')}` : ''

    const prompt = `你是一个专业的旅行规划师。根据以下信息生成详细的旅行计划：

出发地：${formData.origin || '未指定'}
目的地：${formData.destination}
日期：${formData.start_date} 至 ${formData.end_date}（共 ${days} 天）${timeInfoText}
预算：¥${formData.budget}
人数：${formData.travelers} 人（成人 ${formData.adult_count} 人，儿童 ${formData.child_count} 人）
偏好：${formData.preferences.join('、') || '无特殊偏好'}${hotelPreferencesText}
${formData.additional_notes ? `补充说明：${formData.additional_notes}` : ''}${weatherInfo}

${formData.start_time ? `注意：第一天的行程需要考虑到达时间${formData.start_time}，请合理安排首日活动的开始时间。` : ''}
${formData.end_time ? `注意：最后一天的行程需要考虑离开时间${formData.end_time}，请确保在此之前完成所有活动并留出前往机场/车站的时间。` : ''}

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
      "check_in": "入住日期（YYYY-MM-DD）",
      "check_out": "退房日期（YYYY-MM-DD）",
      "price_per_night": 每晚价格（数字）,
      "total_price": 总价（数字）,
      "rating": 评分（1-5，数字）,
      "amenities": ["免费WiFi", "空调", "早餐", "停车场", "健身房", "游泳池等"]
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
10. **地理位置优化建议：**
    - 同一天内，相邻的景点应该在地理位置上相对靠近（距离在 1-2 公里以内最佳）
    - 避免早上在 A 区域，中午跳到 B 区域，下午又回到 A 区域的往返情况
    - 按合理的地理动线安排景点顺序，形成顺畅的游览路线，节省交通时间
    - 餐厅应选择靠近当天景点的位置
11. **酒店推荐策略：**
    - **短途行程（1-3天）**：推荐1个交通便利、靠近主要景点的酒店，全程入住
    - **中等行程（4-6天）**：可以推荐1-2个酒店，如果行程跨越不同区域，建议在不同区域各住一个酒店
    - **长途行程（7天以上）**：建议根据行程路线推荐2-3个不同位置的酒店，每个酒店覆盖附近几天的行程
    - 选择酒店位置时，优先考虑靠近当天及次日主要活动区域，减少往返时间
    - 每个酒店的 check_in 和 check_out 日期必须连续且合理
    - 酒店价格应根据预算合理分配，避免超出总预算
    - type 字段可以是: "hotel"（酒店）, "hostel"（青年旅舍）, "apartment"（公寓）, "resort"（度假村）
    - 推荐的酒店应该真实存在，评分应该合理（3.5-5.0）
    - amenities（设施）应该根据酒店类型和价格档次合理设置
12. 请直接返回 JSON，不要包含任何其他文字说明`

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
    } else if (modelConfig.provider === 'modelscope') {
      // ModelScope (Qwen) 使用 OpenAI 兼容的 API
      const completion = await modelscopeClient.chat.completions.create({
        model: selectedModel,
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
      return NextResponse.json(
        { error: `Unsupported AI provider: ${modelConfig.provider}` },
        { status: 400 }
      )
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

    // 修正坐标：WGS84 -> GCJ-02 或使用高德地图API获取准确坐标
    console.log('Correcting coordinates...')
    itinerary = await correctItineraryCoordinates(itinerary, formData.destination)

    // 执行地理位置聚类优化，将相近的景点安排在一起
    console.log('Applying geographic clustering optimization...')
    itinerary = optimizeItineraryByClustering(itinerary, 1000) // 1000米聚类阈值

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

    // 如果提供了 origin，则添加
    if (formData.origin) {
      tripData.origin = formData.origin
    }

    // 如果提供了时间，则添加
    if (formData.start_time) {
      tripData.start_time = formData.start_time
    }
    if (formData.end_time) {
      tripData.end_time = formData.end_time
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
