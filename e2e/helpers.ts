import { Page, expect } from '@playwright/test'

/**
 * E2E 测试辅助函数
 */

/**
 * 测试用户凭证（需要在测试数据库中预先创建）
 */
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'Test1234!',
}

/**
 * 登录到应用
 * @param page - Playwright Page 对象
 * @param credentials - 用户凭证（可选，默认使用 TEST_USER）
 */
export async function login(
  page: Page,
  credentials = TEST_USER
): Promise<void> {
  // 导航到登录页面
  await page.goto('/login')

  // 填写登录表单
  await page.fill('input[type="email"]', credentials.email)
  await page.fill('input[type="password"]', credentials.password)

  // 点击登录按钮
  await page.click('button[type="submit"]')

  // 等待导航到 dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

/**
 * 注销登录
 * @param page - Playwright Page 对象
 */
export async function logout(page: Page): Promise<void> {
  // 点击用户菜单或注销按钮
  // 根据实际应用的 UI 结构调整选择器
  await page.click('[data-testid="user-menu"]')
  await page.click('text=退出登录')

  // 等待跳转到首页或登录页
  await page.waitForURL(/\/(login)?/, { timeout: 5000 })
}

/**
 * 等待页面加载完成
 * @param page - Playwright Page 对象
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

/**
 * 填写创建行程表单
 * @param page - Playwright Page 对象
 * @param formData - 表单数据
 */
export async function fillTripForm(
  page: Page,
  formData: {
    destination: string
    startDate: string
    duration: string
    budget?: string
    travelers?: string
    preferences?: string
  }
): Promise<void> {
  // 填写目的地
  await page.fill('input[name="destination"]', formData.destination)

  // 填写出发日期
  await page.fill('input[name="startDate"]', formData.startDate)

  // 填写旅行天数
  await page.fill('input[name="duration"]', formData.duration)

  // 可选字段
  if (formData.budget) {
    await page.fill('input[name="budget"]', formData.budget)
  }

  if (formData.travelers) {
    await page.fill('input[name="travelers"]', formData.travelers)
  }

  if (formData.preferences) {
    await page.fill('textarea[name="preferences"]', formData.preferences)
  }
}

/**
 * 等待 AI 生成行程完成
 * @param page - Playwright Page 对象
 * @param timeout - 超时时间（毫秒）
 */
export async function waitForTripGeneration(
  page: Page,
  timeout = 60000
): Promise<void> {
  // 等待加载指示器消失或成功消息出现
  await expect(page.locator('[data-testid="loading"]')).toBeHidden({
    timeout,
  })

  // 或者等待跳转到行程详情页
  await page.waitForURL(/\/dashboard\/trips\/[a-f0-9-]+/, { timeout })
}

/**
 * 获取当前行程 ID
 * @param page - Playwright Page 对象
 * @returns 行程 ID
 */
export function getTripIdFromUrl(page: Page): string {
  const url = page.url()
  const match = url.match(/\/trips\/([a-f0-9-]+)/)
  if (!match) {
    throw new Error(`无法从 URL 中提取行程 ID: ${url}`)
  }
  return match[1]
}

/**
 * 等待元素可见
 * @param page - Playwright Page 对象
 * @param selector - CSS 选择器
 * @param timeout - 超时时间（毫秒）
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * 点击并等待导航
 * @param page - Playwright Page 对象
 * @param selector - 要点击的元素选择器
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string
): Promise<void> {
  await Promise.all([page.waitForNavigation(), page.click(selector)])
}

/**
 * 检查是否显示错误消息
 * @param page - Playwright Page 对象
 * @returns 是否显示错误
 */
export async function hasError(page: Page): Promise<boolean> {
  const errorSelector = '[role="alert"], .error, [data-testid="error"]'
  const errorElement = await page.$(errorSelector)
  return errorElement !== null
}

/**
 * 获取错误消息文本
 * @param page - Playwright Page 对象
 * @returns 错误消息
 */
export async function getErrorMessage(page: Page): Promise<string> {
  const errorSelector = '[role="alert"], .error, [data-testid="error"]'
  const errorElement = await page.$(errorSelector)
  if (!errorElement) {
    return ''
  }
  return await errorElement.textContent() || ''
}

// ============================================
// v2 API (LangGraph) 辅助函数
// ============================================

/**
 * SSE 事件类型
 */
export interface SSEEvent {
  type: 'start' | 'node_complete' | 'progress' | 'error' | 'complete'
  node?: string
  progress?: number
  message?: string
  data?: any
}

/**
 * 工作流进度阶段
 */
export interface WorkflowStage {
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  duration?: number
}

/**
 * v2 API 表单数据
 */
export interface V2TripFormData {
  destination: string
  startDate: string
  endDate: string
  budget: number
  travelers: number
  adultCount?: number
  childCount?: number
  preferences?: string[]
  hotelPreferences?: string
  additionalNotes?: string
}

/**
 * 等待 v2 工作流完成
 * 监听进度模态框直到完成或超时
 * @param page - Playwright Page 对象
 * @param timeout - 超时时间（毫秒），默认 180000（3分钟）
 */
export async function waitForWorkflowComplete(
  page: Page,
  timeout = 180000
): Promise<void> {
  // 等待进度模态框出现
  await page.waitForSelector('[data-testid="progress-modal"], [data-testid="workflow-progress"]', {
    state: 'visible',
    timeout: 10000,
  }).catch(() => {
    // 模态框可能不存在，继续等待其他完成标志
  })

  // 等待以下任一条件：
  // 1. 进度模态框消失（正常完成）
  // 2. 跳转到行程详情页
  // 3. 显示错误消息
  await Promise.race([
    // 等待跳转到行程详情页
    page.waitForURL(/\/dashboard\/trips\/[a-f0-9-]+/, { timeout }),
    // 等待进度模态框消失
    page.waitForSelector('[data-testid="progress-modal"]', {
      state: 'hidden',
      timeout,
    }).catch(() => {}),
    // 等待成功提示
    page.waitForSelector('[data-testid="success-message"], .success-toast', {
      state: 'visible',
      timeout,
    }).catch(() => {}),
  ])
}

/**
 * 获取工作流进度阶段状态
 * @param page - Playwright Page 对象
 * @returns 进度阶段数组
 */
export async function getProgressStages(page: Page): Promise<WorkflowStage[]> {
  const stages: WorkflowStage[] = []

  // 查找进度阶段元素
  const stageElements = await page.$$('[data-testid="progress-stage"], .workflow-stage')

  for (const element of stageElements) {
    const name = await element.$eval('[data-testid="stage-name"], .stage-name', el => el.textContent || '').catch(() => '')
    const statusClass = await element.getAttribute('class') || ''

    let status: WorkflowStage['status'] = 'pending'
    if (statusClass.includes('completed') || statusClass.includes('done')) {
      status = 'completed'
    } else if (statusClass.includes('in-progress') || statusClass.includes('active')) {
      status = 'in_progress'
    } else if (statusClass.includes('error') || statusClass.includes('failed')) {
      status = 'error'
    }

    stages.push({ name, status })
  }

  return stages
}

/**
 * 获取当前进度百分比
 * @param page - Playwright Page 对象
 * @returns 进度百分比 (0-100)
 */
export async function getProgressPercentage(page: Page): Promise<number> {
  // 尝试从进度条获取
  const progressBar = await page.$('[data-testid="progress-bar"], .progress-bar, [role="progressbar"]')
  if (progressBar) {
    const style = await progressBar.getAttribute('style')
    const widthMatch = style?.match(/width:\s*(\d+)%/)
    if (widthMatch) {
      return parseInt(widthMatch[1], 10)
    }

    const ariaValue = await progressBar.getAttribute('aria-valuenow')
    if (ariaValue) {
      return parseInt(ariaValue, 10)
    }
  }

  // 尝试从文本获取
  const progressText = await page.$('[data-testid="progress-text"], .progress-text')
  if (progressText) {
    const text = await progressText.textContent()
    const match = text?.match(/(\d+)%/)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return 0
}

/**
 * 获取当前执行的 Agent 名称
 * @param page - Playwright Page 对象
 * @returns Agent 名称
 */
export async function getCurrentAgentName(page: Page): Promise<string> {
  const agentElement = await page.$('[data-testid="current-agent"], .current-agent, [data-testid="active-stage"]')
  if (agentElement) {
    return await agentElement.textContent() || ''
  }
  return ''
}

/**
 * 等待特定 Agent 完成
 * @param page - Playwright Page 对象
 * @param agentName - Agent 名称
 * @param timeout - 超时时间（毫秒）
 */
export async function waitForAgentComplete(
  page: Page,
  agentName: string,
  timeout = 60000
): Promise<void> {
  await page.waitForFunction(
    (name) => {
      const completedStages = document.querySelectorAll('[data-testid="progress-stage"].completed, .workflow-stage.completed')
      for (const stage of completedStages) {
        if (stage.textContent?.includes(name)) {
          return true
        }
      }
      return false
    },
    agentName,
    { timeout }
  )
}

/**
 * 检查是否显示进度模态框
 * @param page - Playwright Page 对象
 * @returns 是否显示
 */
export async function isProgressModalVisible(page: Page): Promise<boolean> {
  const modal = await page.$('[data-testid="progress-modal"], [data-testid="workflow-progress"]')
  if (!modal) return false
  return await modal.isVisible()
}

/**
 * 获取工作流完成后的行程 ID
 * @param page - Playwright Page 对象
 * @returns 行程 ID
 */
export async function getGeneratedTripId(page: Page): Promise<string | null> {
  // 从 URL 获取
  const url = page.url()
  const urlMatch = url.match(/\/trips\/([a-f0-9-]+)/)
  if (urlMatch) {
    return urlMatch[1]
  }

  // 从页面数据属性获取
  const tripElement = await page.$('[data-trip-id]')
  if (tripElement) {
    return await tripElement.getAttribute('data-trip-id')
  }

  return null
}

/**
 * 验证行程详情页包含必要信息
 * @param page - Playwright Page 对象
 */
export async function verifyTripDetails(page: Page): Promise<{
  hasTitle: boolean
  hasItinerary: boolean
  hasMap: boolean
  hasBudget: boolean
}> {
  const [hasTitle, hasItinerary, hasMap, hasBudget] = await Promise.all([
    page.$('[data-testid="trip-title"], .trip-title, h1').then(el => el !== null),
    page.$('[data-testid="itinerary"], .itinerary, .day-plan').then(el => el !== null),
    page.$('[data-testid="trip-map"], .trip-map, #amap-container').then(el => el !== null),
    page.$('[data-testid="budget-summary"], .budget-summary, .cost-breakdown').then(el => el !== null),
  ])

  return { hasTitle, hasItinerary, hasMap, hasBudget }
}

/**
 * 填写 v2 创建行程表单
 * @param page - Playwright Page 对象
 * @param formData - 表单数据
 */
export async function fillV2TripForm(
  page: Page,
  formData: V2TripFormData
): Promise<void> {
  // 填写目的地
  await page.fill('input[name="destination"]', formData.destination)

  // 填写开始日期
  await page.fill('input[name="startDate"], input[name="start_date"]', formData.startDate)

  // 填写结束日期
  await page.fill('input[name="endDate"], input[name="end_date"]', formData.endDate)

  // 填写预算
  await page.fill('input[name="budget"]', formData.budget.toString())

  // 填写人数
  await page.fill('input[name="travelers"]', formData.travelers.toString())

  // 可选字段
  if (formData.adultCount !== undefined) {
    await page.fill('input[name="adultCount"], input[name="adult_count"]', formData.adultCount.toString())
  }

  if (formData.childCount !== undefined) {
    await page.fill('input[name="childCount"], input[name="child_count"]', formData.childCount.toString())
  }

  if (formData.preferences && formData.preferences.length > 0) {
    // 选择偏好标签
    for (const pref of formData.preferences) {
      const checkbox = await page.$(`input[value="${pref}"], label:has-text("${pref}") input`)
      if (checkbox) {
        await checkbox.check()
      }
    }
  }

  if (formData.hotelPreferences) {
    await page.fill('textarea[name="hotelPreferences"], textarea[name="hotel_preferences"]', formData.hotelPreferences)
  }

  if (formData.additionalNotes) {
    await page.fill('textarea[name="additionalNotes"], textarea[name="additional_notes"]', formData.additionalNotes)
  }
}

/**
 * 提交创建行程表单并等待工作流开始
 * @param page - Playwright Page 对象
 */
export async function submitTripFormAndWaitForWorkflow(page: Page): Promise<void> {
  // 点击提交按钮
  await page.click('button[type="submit"], [data-testid="create-trip-button"]')

  // 等待进度模态框出现或请求开始
  await Promise.race([
    page.waitForSelector('[data-testid="progress-modal"], [data-testid="workflow-progress"]', {
      state: 'visible',
      timeout: 10000,
    }),
    page.waitForResponse(response =>
      response.url().includes('/api/v2/generate-itinerary') &&
      response.status() === 200
    ),
  ]).catch(() => {
    // 继续执行
  })
}

/**
 * 检查是否使用 v2 API
 * @param page - Playwright Page 对象
 * @returns 是否使用 v2 API
 */
export async function isUsingV2Api(page: Page): Promise<boolean> {
  // 检查页面是否有 v2 标识或 Feature Flag
  const v2Indicator = await page.$('[data-api-version="v2"], [data-use-langgraph="true"]')
  if (v2Indicator) {
    return true
  }

  // 通过监听网络请求判断
  // 这需要在测试中提前设置
  return false
}

