/**
 * 景点/酒店信息增强辅助函数
 * 消除 enrich-attraction 和 enrich-hotel 的代码重复
 */

import OpenAI from 'openai'
import { getUserApiKey } from '@/lib/api-keys'
import config from '@/lib/config'
import { logger } from '@/lib/utils/logger'

/**
 * 从高德地图获取 POI 照片
 */
export async function fetchAmapPhotos(
  name: string,
  destination: string,
  count: number
): Promise<string[]> {
  const amapKey = process.env.AMAP_WEB_SERVICE_KEY || ''

  if (!amapKey) {
    return []
  }

  try {
    const searchUrl = `https://restapi.amap.com/v5/place/text?key=${amapKey}&keywords=${encodeURIComponent(name)}&region=${encodeURIComponent(destination || '')}&show_fields=photos&extensions=all`

    const response = await fetch(searchUrl)
    if (!response.ok) {
      return []
    }

    const data = await response.json()

    // 提取照片 URL
    if (data.pois && data.pois.length > 0) {
      const poi = data.pois[0]
      if (poi.photos && Array.isArray(poi.photos)) {
        const images = poi.photos
          .map((photo: any) => photo.url)
          .filter((url: string) => url && url.trim() !== '')
          .slice(0, count)

        logger.info(`高德地图找到 ${images.length} 张照片`, { name })
        return images
      }
    }

    return []
  } catch (error) {
    logger.warn('高德地图照片获取失败', { name, error })
    return []
  }
}

/**
 * AI 客户端配置
 */
interface AIClientOptions {
  userId: string
  selectedModel?: string
}

/**
 * 获取可用的 AI 客户端和模型
 */
async function getAIClient(options: AIClientOptions): Promise<{
  client: OpenAI
  model: string
} | null> {
  const { userId, selectedModel } = options

  // 检查用户和系统的 API Keys
  const userModelScopeKey = await getUserApiKey(userId, 'modelscope')
  const userDeepSeekKey = await getUserApiKey(userId, 'deepseek')

  // 判断使用哪个 provider
  let useProvider: 'modelscope' | 'deepseek' | null = null
  let finalModel = ''

  // 如果指定了模型，根据模型名称判断 provider
  if (selectedModel) {
    if (selectedModel.includes('Qwen') && (userModelScopeKey || config.modelscope.apiKey)) {
      useProvider = 'modelscope'
      finalModel = selectedModel
    } else if (selectedModel.includes('deepseek') && (userDeepSeekKey || config.deepseek.apiKey)) {
      useProvider = 'deepseek'
      finalModel = selectedModel
    }
  }

  // 如果未指定模型或指定的模型没有可用的 Key，按优先级选择
  if (!useProvider) {
    if (userModelScopeKey || config.modelscope.apiKey) {
      useProvider = 'modelscope'
      finalModel = config.modelscope.model
    } else if (userDeepSeekKey || config.deepseek.apiKey) {
      useProvider = 'deepseek'
      finalModel = config.deepseek.model
    }
  }

  // 创建客户端
  if (useProvider === 'modelscope') {
    return {
      client: new OpenAI({
        apiKey: userModelScopeKey || config.modelscope.apiKey,
        baseURL: config.modelscope.baseURL,
      }),
      model: finalModel,
    }
  } else if (useProvider === 'deepseek') {
    return {
      client: new OpenAI({
        apiKey: userDeepSeekKey || config.deepseek.apiKey,
        baseURL: config.deepseek.baseURL,
      }),
      model: finalModel,
    }
  }

  return null
}

/**
 * 生成 AI 描述
 */
export async function generateAIDescription(
  prompt: string,
  options: AIClientOptions
): Promise<string> {
  try {
    const aiConfig = await getAIClient(options)

    if (!aiConfig) {
      logger.warn('没有可用的 AI API Key')
      return ''
    }

    const completion = await aiConfig.client.chat.completions.create({
      model: aiConfig.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    })

    const description = completion.choices?.[0]?.message?.content || ''
    logger.info('AI 描述生成成功', { model: aiConfig.model })

    return description
  } catch (error) {
    logger.error('AI 描述生成失败', { error })
    return ''
  }
}

/**
 * 构建景点描述提示词
 */
export function buildAttractionPrompt(
  name: string,
  destination: string,
  locationName: string
): string {
  return `你是一名旅行作家，请为下面的景点生成一段个性化、引人入胜的中文描述（约200-300字），突出特色、氛围、适合人群和小贴士，避免重复和模板化。

景点：${name}
目的地：${destination || '未指定'}
位置名称：${locationName || name}

要求：
- 语言优美、有画面感，避免堆砌形容词；
- 不要编造不存在的事实；
- 如果适合拍照、亲子或美食等，请自然提及；
- 最后一句给出1-2条贴士（如最佳参观时间、预约、交通等）。`
}

/**
 * 构建酒店描述提示词
 */
export function buildHotelPrompt(
  name: string,
  destination: string,
  type: string
): string {
  const typeDescriptions: { [key: string]: string } = {
    hotel: '酒店',
    hostel: '青年旅舍',
    apartment: '公寓',
    resort: '度假村',
  }
  const typeDesc = typeDescriptions[type] || '酒店'

  return `你是一名旅行住宿专家，请为下面的${typeDesc}生成一段吸引人的中文描述（约150-200字），突出位置优势、设施特色、服务亮点和适合人群，避免重复和模板化。

${typeDesc}名称：${name}
目的地：${destination || '未指定'}
类型：${typeDesc}

要求：
- 语言专业、有说服力，突出住宿体验；
- 不要编造不存在的设施和服务；
- 如果适合商务、家庭、情侣等，请自然提及；
- 提及周边交通或景点便利性；
- 最后一句给出1-2条住宿建议（如预订建议、特色服务等）。`
}
