/**
 * API: /api/templates/[id]
 * 模板管理 - 详情、更新、删除
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, noContentResponse } from '@/app/api/_utils/response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { TemplateService } from '@/lib/templates'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]
 * 获取模板详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await context.params

    const template = await TemplateService.get(supabase, user.id, id)

    if (!template) {
      throw new NotFoundError('模板不存在')
    }

    return successResponse(template)
  } catch (error) {
    return handleApiError(error, 'GET /api/templates/[id]')
  }
}

/**
 * PUT /api/templates/[id]
 * 更新模板
 *
 * Request Body (all fields optional):
 * {
 *   name?: string
 *   description?: string
 *   category?: TemplateCategory
 *   tags?: string[]
 *   form_data?: {
 *     destination?: string
 *     duration_days?: number
 *     budget?: number
 *     travelers?: number
 *     origin?: string
 *     preferences?: string[]
 *     accommodation_preference?: 'budget' | 'mid' | 'luxury'
 *     transport_preference?: 'public' | 'driving' | 'mixed'
 *     special_requirements?: string
 *   }
 * }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await context.params

    // 先检查模板是否存在
    const existing = await TemplateService.get(supabase, user.id, id)
    if (!existing) {
      throw new NotFoundError('模板不存在')
    }

    const body = await request.json()
    const { name, description, category, tags, form_data } = body

    // 验证字段（如果提供）
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('模板名称不能为空')
      }
      if (name.length > 100) {
        throw new ValidationError('模板名称不能超过 100 个字符')
      }
    }

    if (form_data?.budget !== undefined) {
      if (typeof form_data.budget !== 'number' || form_data.budget <= 0) {
        throw new ValidationError('预算必须是正数')
      }
    }

    // 构建更新参数
    const updateParams: {
      name?: string
      description?: string
      category?: string
      tags?: string[]
      formData?: Record<string, unknown>
    } = {}

    if (name !== undefined) updateParams.name = name.trim()
    if (description !== undefined) updateParams.description = description?.trim() || undefined
    if (category !== undefined) updateParams.category = category || undefined
    if (tags !== undefined) {
      updateParams.tags = Array.isArray(tags)
        ? tags.filter((t: unknown) => typeof t === 'string')
        : undefined
    }

    // 构建 formData 更新
    if (form_data && typeof form_data === 'object') {
      const formDataUpdate: Record<string, unknown> = {}

      if (form_data.destination !== undefined)
        formDataUpdate.destination = form_data.destination
      if (form_data.duration_days !== undefined)
        formDataUpdate.durationDays = form_data.duration_days
      if (form_data.budget !== undefined) formDataUpdate.budget = form_data.budget
      if (form_data.travelers !== undefined) formDataUpdate.travelers = form_data.travelers
      if (form_data.origin !== undefined) formDataUpdate.origin = form_data.origin || undefined
      if (form_data.preferences !== undefined)
        formDataUpdate.preferences = form_data.preferences || undefined
      if (form_data.accommodation_preference !== undefined)
        formDataUpdate.accommodation_preference =
          form_data.accommodation_preference || undefined
      if (form_data.transport_preference !== undefined)
        formDataUpdate.transport_preference = form_data.transport_preference || undefined
      if (form_data.special_requirements !== undefined)
        formDataUpdate.special_requirements = form_data.special_requirements || undefined

      if (Object.keys(formDataUpdate).length > 0) {
        updateParams.formData = formDataUpdate
      }
    }

    // 更新模板
    const template = await TemplateService.update(supabase, user.id, id, updateParams as any)

    return successResponse(template, '模板更新成功')
  } catch (error) {
    return handleApiError(error, 'PUT /api/templates/[id]')
  }
}

/**
 * DELETE /api/templates/[id]
 * 删除模板
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await context.params

    // 先检查模板是否存在
    const existing = await TemplateService.get(supabase, user.id, id)
    if (!existing) {
      throw new NotFoundError('模板不存在')
    }

    await TemplateService.delete(supabase, user.id, id)

    return successResponse(null, '模板已删除')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/templates/[id]')
  }
}
