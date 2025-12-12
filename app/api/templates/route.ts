/**
 * API: /api/templates
 * 模板管理 - 列表查询和创建
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, createdResponse, paginatedResponse } from '@/app/api/_utils/response'
import { ValidationError } from '@/lib/errors'
import {
  TemplateService,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type TemplateCategory,
  type TemplateFilters,
} from '@/lib/templates'

/**
 * GET /api/templates
 * 获取用户的模板列表
 *
 * Query Parameters:
 * - page: 页码（默认 1）
 * - page_size: 每页数量（默认 20，最大 100）
 * - category: 分类筛选（business, leisure, family, adventure, culture, custom, all）
 * - destination: 目的地筛选（模糊搜索）
 * - q: 全文搜索（名称、描述、目的地）
 * - sort_by: 排序字段（createdAt, useCount, name, lastUsedAt）
 * - sort_order: 排序方向（asc, desc）
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)

    // 分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('page_size') || String(DEFAULT_PAGE_SIZE)))
    )

    // 筛选参数
    const filters: TemplateFilters = {}

    const category = searchParams.get('category')
    if (category && category !== 'all') {
      filters.category = category as TemplateCategory
    }

    const destination = searchParams.get('destination')
    if (destination) {
      filters.destination = destination
    }

    const query = searchParams.get('q')
    if (query) {
      filters.query = query
    }

    // 排序参数
    const sortBy = searchParams.get('sort_by') as
      | 'createdAt'
      | 'useCount'
      | 'name'
      | 'lastUsedAt'
      | null
    const sortOrder = searchParams.get('sort_order') as 'asc' | 'desc' | null

    // 获取模板列表
    const result = await TemplateService.list(supabase, user.id, {
      page,
      pageSize,
      filters,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    })

    return paginatedResponse(result.templates, result.page, result.pageSize, result.total)
  } catch (error) {
    return handleApiError(error, 'GET /api/templates')
  }
}

/**
 * POST /api/templates
 * 创建新模板
 *
 * Request Body:
 * {
 *   name: string (required)
 *   description?: string
 *   category?: TemplateCategory
 *   tags?: string[]
 *   form_data: {
 *     destination: string (required)
 *     duration_days: number (required)
 *     budget: number (required)
 *     travelers: number (required)
 *     origin?: string
 *     preferences?: string[]
 *     accommodation_preference?: 'budget' | 'mid' | 'luxury'
 *     transport_preference?: 'public' | 'driving' | 'mixed'
 *     special_requirements?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const { name, description, category, tags, form_data } = body

    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('模板名称不能为空')
    }

    if (name.length > 100) {
      throw new ValidationError('模板名称不能超过 100 个字符')
    }

    if (!form_data || typeof form_data !== 'object') {
      throw new ValidationError('请提供有效的表单数据 (form_data)')
    }

    if (!form_data.destination) {
      throw new ValidationError('目的地不能为空')
    }

    if (typeof form_data.budget !== 'number' || form_data.budget <= 0) {
      throw new ValidationError('预算必须是正数')
    }

    // 创建模板
    const template = await TemplateService.create(supabase, user.id, {
      name: name.trim(),
      description: description?.trim() || undefined,
      category: category || undefined,
      tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : undefined,
      formData: {
        destination: form_data.destination,
        durationDays: form_data.duration_days || 3,
        budget: form_data.budget,
        travelers: form_data.travelers || 2,
        origin: form_data.origin || undefined,
        preferences: form_data.preferences || undefined,
        accommodation_preference: form_data.accommodation_preference || undefined,
        transport_preference: form_data.transport_preference || undefined,
        special_requirements: form_data.special_requirements || undefined,
      },
    })

    return createdResponse(template, '模板创建成功')
  } catch (error) {
    return handleApiError(error, 'POST /api/templates')
  }
}
