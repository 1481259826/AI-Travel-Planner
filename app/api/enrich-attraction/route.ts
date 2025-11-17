/**
 * API: /api/enrich-attraction
 * 景点信息增强（照片 + AI 描述）
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import {
  fetchAmapPhotos,
  generateAIDescription,
  buildAttractionPrompt,
} from '@/app/api/_utils/enrich-helper'
import { ValidationError } from '@/lib/errors'

/**
 * POST /api/enrich-attraction
 * 输入：{ name: string; destination?: string; locationName?: string; count?: number; model?: string }
 * 输出：{ images: string[]; description: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)

    const body = await request.json()
    const name: string = body.name
    const destination: string | undefined = body.destination
    const locationName: string | undefined = body.locationName
    const count: number = Math.max(1, Math.min(5, body.count || 3))
    const selectedModel: string | undefined = body.model

    if (!name) {
      throw new ValidationError('缺少必填字段：name')
    }

    // 1) 优先从高德地图获取真实照片
    const images = await fetchAmapPhotos(name, destination || '', count)

    // 2) 生成 AI 描述
    const prompt = buildAttractionPrompt(name, destination || '', locationName || name)
    const description = await generateAIDescription(prompt, {
      userId: user.id,
      selectedModel,
    })

    return successResponse({ images, description })
  } catch (error) {
    return handleApiError(error, 'POST /api/enrich-attraction')
  }
}