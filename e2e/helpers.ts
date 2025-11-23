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
