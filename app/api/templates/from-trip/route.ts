/**
 * API: /api/templates/from-trip
 * 从已有行程创建模板
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { createdResponse } from '@/app/api/_utils/response'
import { ValidationError } from '@/lib/errors'
import { TemplateService } from '@/lib/templates'

/**
 * POST /api/templates/from-trip
 * 从行程创建模板
 *
 * Request Body:
 * {
 *   trip_id: string (required) - 源行程 ID
 *   name: string (required) - 模板名称
 *   description?: string - 模板描述
 *   category?: TemplateCategory - 分类
 *   tags?: string[] - 标签
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { trip_id, name, description, category, tags } = body

    // 验证必填字段
    if (!trip_id) {
      throw new ValidationError('请指定行程 ID (trip_id)')
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('模板名称不能为空')
    }

    if (name.length > 100) {
      throw new ValidationError('模板名称不能超过 100 个字符')
    }

    // 从行程创建模板
    const template = await TemplateService.createFromTrip(supabase, user.id, {
      tripId: trip_id,
      name: name.trim(),
      description: description?.trim() || undefined,
      category: category || undefined,
      tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : undefined,
    })

    return createdResponse(template, '模板创建成功')
  } catch (error) {
    return handleApiError(error, 'POST /api/templates/from-trip')
  }
}
