import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import config from '@/lib/config'
import { getUserApiKey } from '@/lib/api-keys'

/**
 * POST /api/enrich-hotel
 * 输入：{ name: string; destination?: string; type?: string; count?: number; model?: string }
 * 输出：{ images: string[]; description: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 从请求头获取 Authorization token
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')

    // 创建带有用户认证的 Supabase 客户端
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

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name: string = body.name
    const destination: string | undefined = body.destination
    const type: string | undefined = body.type // hotel, hostel, apartment, resort
    const count: number = Math.max(1, Math.min(5, body.count || 3))
    const selectedModel: string | undefined = body.model

    if (!name) {
      return NextResponse.json({ error: '缺少酒店名称' }, { status: 400 })
    }

    // 1) 优先从高德地图获取真实照片
    const amapKey = process.env.AMAP_WEB_SERVICE_KEY || ''
    let images: string[] = []

    if (amapKey) {
      try {
        // 使用高德地图 POI 搜索 API
        // 添加 show_fields=photos 参数以获取照片数据
        const searchUrl = `https://restapi.amap.com/v5/place/text?key=${amapKey}&keywords=${encodeURIComponent(name)}&region=${encodeURIComponent(destination || '')}&show_fields=photos&extensions=all`

        const amapResp = await fetch(searchUrl)
        if (amapResp.ok) {
          const amapData = await amapResp.json()

          // 提取照片 URL
          if (amapData.pois && amapData.pois.length > 0) {
            const poi = amapData.pois[0]
            if (poi.photos && Array.isArray(poi.photos)) {
              images = poi.photos
                .map((photo: any) => photo.url)
                .filter((url: string) => url && url.trim() !== '')
                .slice(0, count)
            }
          }

          console.log(`高德地图找到 ${images.length} 张照片`)
        }
      } catch (e) {
        console.warn('高德地图照片获取失败:', e)
      }
    }


    // 2) 生成 AI 描述（优先 ModelScope → DeepSeek → Anthropic）
    let description = ''

    // 检查用户或系统的 Key
    const userModelScopeKey = await getUserApiKey(user.id, 'modelscope')
    const userDeepSeekKey = await getUserApiKey(user.id, 'deepseek')

    const modelscopeClient = new OpenAI({
      apiKey: userModelScopeKey || config.modelscope.apiKey,
      baseURL: config.modelscope.baseURL,
    })
    const deepseekClient = new OpenAI({
      apiKey: userDeepSeekKey || config.deepseek.apiKey,
      baseURL: config.deepseek.baseURL,
    })

    // 根据酒店类型生成不同的提示词
    const typeDescriptions: { [key: string]: string } = {
      hotel: '酒店',
      hostel: '青年旅舍',
      apartment: '公寓',
      resort: '度假村',
    }
    const typeDesc = typeDescriptions[type || 'hotel'] || '酒店'

    const prompt = `你是一名旅行住宿专家，请为下面的${typeDesc}生成一段吸引人的中文描述（约150-200字），突出位置优势、设施特色、服务亮点和适合人群，避免重复和模板化。

${typeDesc}名称：${name}
目的地：${destination || '未指定'}
类型：${typeDesc}

要求：
- 语言专业、有说服力，突出住宿体验；
- 不要编造不存在的设施和服务；
- 如果适合商务、家庭、情侣等，请自然提及；
- 提及周边交通或景点便利性；
- 最后一句给出1-2条住宿建议（如预订建议、特色服务等）。`

    try {
      // 判断模型所属的 provider
      let useModelScope = false
      let useDeepSeek = false
      let finalModel = ''

      if (selectedModel?.includes('Qwen')) {
        // 指定了 ModelScope 模型
        if (userModelScopeKey || config.modelscope.apiKey) {
          useModelScope = true
          finalModel = selectedModel
        }
      } else if (selectedModel?.includes('deepseek')) {
        // 指定了 DeepSeek 模型
        if (userDeepSeekKey || config.deepseek.apiKey) {
          useDeepSeek = true
          finalModel = selectedModel
        }
      }

      // 如果未指定模型或指定的模型没有可用的 Key，按优先级选择
      if (!useModelScope && !useDeepSeek) {
        if (userModelScopeKey || config.modelscope.apiKey) {
          useModelScope = true
          finalModel = config.modelscope.model
        } else if (userDeepSeekKey || config.deepseek.apiKey) {
          useDeepSeek = true
          finalModel = config.deepseek.model
        }
      }

      // 调用对应的 API
      if (useModelScope) {
        const completion = await modelscopeClient.chat.completions.create({
          model: finalModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
        })
        description = completion.choices?.[0]?.message?.content || ''
      } else if (useDeepSeek) {
        const completion = await deepseekClient.chat.completions.create({
          model: finalModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
        })
        description = completion.choices?.[0]?.message?.content || ''
      } else {
        // 没有任何可用的 API Key
        console.warn('No available API key for AI description generation')
        description = ''
      }
    } catch (e) {
      console.error('AI description generation failed:', e)
      description = ''
    }

    return NextResponse.json({ images, description })
  } catch (error) {
    console.error('Enrich hotel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
