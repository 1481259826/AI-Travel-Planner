import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import config from '@/lib/config'
import { getUserApiKey } from '@/lib/api-keys'

/**
 * POST /api/enrich-attraction
 * 输入：{ name: string; destination?: string; locationName?: string; count?: number; model?: string }
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
    const locationName: string | undefined = body.locationName
    const count: number = Math.max(1, Math.min(5, body.count || 3))
    const selectedModel: string | undefined = body.model

    if (!name) {
      return NextResponse.json({ error: '缺少景点名称' }, { status: 400 })
    }

    // 1) 获取图片（Unsplash）
    const query = [destination, name].filter(Boolean).join(' ')
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || ''
    let images: string[] = []
    if (unsplashKey) {
      try {
        const resp = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}`, {
          headers: { 'Authorization': `Client-ID ${unsplashKey}` },
        })
        if (resp.ok) {
          const data = await resp.json()
          images = (data.results || []).map((r: any) => r.urls?.small).filter(Boolean)
        }
      } catch (e) {
        console.warn('Unsplash fetch failed:', e)
      }
    }

    // 2) 生成 AI 描述（优先 ModelScope → DeepSeek → Anthropic）
    let description = ''

    // 检查用户或系统的 Key
    const userModelScopeKey = await getUserApiKey(user.id, 'modelscope')
    const userDeepSeekKey = await getUserApiKey(user.id, 'deepseek')
    const userAnthropicKey = await getUserApiKey(user.id, 'anthropic')

    const modelscopeClient = new OpenAI({
      apiKey: userModelScopeKey || config.modelscope.apiKey,
      baseURL: config.modelscope.baseURL,
    })
    const deepseekClient = new OpenAI({
      apiKey: userDeepSeekKey || config.deepseek.apiKey,
      baseURL: config.deepseek.baseURL,
    })
    const anthropicClient = new Anthropic({
      apiKey: userAnthropicKey || config.anthropic.apiKey,
      baseURL: config.anthropic.baseURL,
    })

    const prompt = `你是一名旅行作家，请为下面的景点生成一段个性化、引人入胜的中文描述（约200-300字），突出特色、氛围、适合人群和小贴士，避免重复和模板化。

景点：${name}
目的地：${destination || '未指定'}
位置名称：${locationName || name}

要求：
- 语言优美、有画面感，避免堆砌形容词；
- 不要编造不存在的事实；
- 如果适合拍照、亲子或美食等，请自然提及；
- 最后一句给出1-2条贴士（如最佳参观时间、预约、交通等）。`

    try {
      // 判断模型所属的 provider
      let useModelScope = false
      let useDeepSeek = false
      let useAnthropic = false
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
      } else if (selectedModel?.includes('claude')) {
        // 指定了 Anthropic 模型
        if (userAnthropicKey || config.anthropic.apiKey) {
          useAnthropic = true
          finalModel = selectedModel
        }
      }

      // 如果未指定模型或指定的模型没有可用的 Key，按优先级选择
      if (!useModelScope && !useDeepSeek && !useAnthropic) {
        if (userModelScopeKey || config.modelscope.apiKey) {
          useModelScope = true
          finalModel = config.modelscope.model
        } else if (userDeepSeekKey || config.deepseek.apiKey) {
          useDeepSeek = true
          finalModel = config.deepseek.model
        } else if (userAnthropicKey || config.anthropic.apiKey) {
          useAnthropic = true
          finalModel = config.anthropic.model
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
      } else if (useAnthropic) {
        const message = await anthropicClient.messages.create({
          model: finalModel,
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        })
        description = message.content[0].type === 'text' ? (message.content[0] as any).text : ''
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
    console.error('Enrich attraction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}