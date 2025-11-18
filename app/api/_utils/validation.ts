/**
 * API 请求参数验证工具
 * 使用 Zod 进行类型安全的参数验证
 *
 * 注意：需要先安装 zod: npm install zod
 */

import { z } from 'zod'
import { ValidationError } from '@/lib/errors'

/**
 * 验证请求数据
 * @param schema Zod Schema
 * @param data 待验证的数据
 * @throws ValidationError 验证失败时抛出
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  const result = await schema.safeParseAsync(data)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    }))

    throw new ValidationError('请求参数验证失败', { errors })
  }

  return result.data
}

/**
 * 同步验证
 */
export function validateRequestSync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    }))

    throw new ValidationError('请求参数验证失败', { errors })
  }

  return result.data
}

/**
 * 从 Request 中解析并验证 JSON
 */
export async function parseAndValidateJson<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const data = await request.json()
    return await validateRequest(schema, data)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('无效的 JSON 格式')
  }
}

// ==================== 常用 Schema 定义 ====================

/**
 * 通用分页参数
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

/**
 * 日期范围参数
 */
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
})

/**
 * UUID 参数
 */
export const uuidSchema = z.string().uuid('无效的 UUID 格式')

// ==================== 行程相关 Schema ====================

/**
 * 生成行程请求参数
 */
export const generateItinerarySchema = z.object({
  destination: z.string().min(1, '目的地不能为空').max(100, '目的地过长'),
  origin: z.string().max(100, '出发地过长').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '开始日期格式错误'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '结束日期格式错误'),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '开始时间格式错误')
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '结束时间格式错误')
    .optional(),
  budget: z.number().positive('预算必须为正数').optional(),
  travelers: z.number().int().positive('人数必须为正整数').default(1),
  adultCount: z.number().int().min(0, '成人数量不能为负数').optional(),
  childCount: z.number().int().min(0, '儿童数量不能为负数').optional(),
  preferences: z.array(z.string()).max(10, '偏好标签不能超过 10 个').optional(),
  model: z.enum(['deepseek', 'qwen']).optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return start <= end
  },
  { message: '结束日期不能早于开始日期', path: ['endDate'] }
)

/**
 * 更新行程参数
 */
export const updateTripSchema = z.object({
  destination: z.string().min(1).max(100).optional(),
  origin: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget: z.number().positive().optional(),
  travelers: z.number().int().positive().optional(),
  preferences: z.array(z.string()).max(10).optional(),
  status: z.enum(['draft', 'planned', 'ongoing', 'completed']).optional(),
  itinerary: z.any().optional(), // JSONB 类型
})

// ==================== 费用相关 Schema ====================

/**
 * 创建费用参数
 */
export const createExpenseSchema = z.object({
  tripId: uuidSchema,
  category: z.enum([
    'accommodation',
    'transportation',
    'food',
    'attractions',
    'shopping',
    'other',
  ]),
  amount: z.number().positive('金额必须为正数'),
  currency: z.string().length(3, '货币代码必须为 3 位').default('CNY'),
  description: z.string().max(500, '描述过长').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
})

/**
 * 更新费用参数
 */
export const updateExpenseSchema = createExpenseSchema.partial().omit({ tripId: true })

// ==================== 用户相关 Schema ====================

/**
 * 用户注册参数
 */
export const registerSchema = z.object({
  email: z.string().email('邮箱格式错误'),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名过长').optional(),
})

/**
 * 用户登录参数
 */
export const loginSchema = z.object({
  email: z.string().email('邮箱格式错误'),
  password: z.string().min(1, '密码不能为空'),
})

/**
 * 修改密码参数
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码不能为空'),
    newPassword: z
      .string()
      .min(8, '新密码至少 8 位')
      .regex(/[a-z]/, '密码必须包含小写字母')
      .regex(/[A-Z]/, '密码必须包含大写字母')
      .regex(/[0-9]/, '密码必须包含数字'),
    confirmPassword: z.string().min(1, '确认密码不能为空'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  })

// ==================== API Key 相关 Schema ====================

/**
 * 添加 API Key 参数
 */
export const addApiKeySchema = z.object({
  service: z.enum(['deepseek', 'modelscope', 'map', 'voice']),
  keyName: z.string().min(1, '密钥名称不能为空').max(50, '密钥名称过长'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseUrl: z.string().url('无效的 URL 格式').optional(),
  extraConfig: z.record(z.string(), z.any()).optional(),
})

/**
 * 更新 API Key 参数
 */
export const updateApiKeySchema = addApiKeySchema.partial().omit({ service: true })

// ==================== 工具函数 ====================

/**
 * 从 URL Search Params 中解析并验证参数
 */
export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const obj = Object.fromEntries(searchParams.entries())
  return validateRequestSync(schema, obj)
}

/**
 * 使用示例：
 *
 * // 验证 JSON 请求体
 * export async function POST(request: NextRequest) {
 *   try {
 *     const data = await parseAndValidateJson(request, generateItinerarySchema)
 *
 *     // data 现在是类型安全的，且已验证
 *     console.log(data.destination) // TypeScript 知道这个字段存在
 *
 *     return successResponse(data)
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 *
 * // 验证 URL 参数
 * export async function GET(request: NextRequest) {
 *   try {
 *     const searchParams = request.nextUrl.searchParams
 *     const params = parseSearchParams(searchParams, paginationSchema)
 *
 *     console.log(params.page, params.pageSize)
 *
 *     return successResponse(params)
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 */
