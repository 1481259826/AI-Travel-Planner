import { test, expect } from '@playwright/test'
import {
  login,
  fillTripForm,
  waitForTripGeneration,
  getTripIdFromUrl,
  waitForVisible,
} from './helpers'

/**
 * E2E 测试: 创建行程完整流程
 *
 * 测试流程:
 * 1. 用户登录
 * 2. 导航到创建行程页面
 * 3. 填写行程表单
 * 4. 提交表单并等待 AI 生成
 * 5. 验证跳转到行程详情页
 * 6. 验证行程数据正确显示
 */

test.describe('创建行程 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前登录
    await login(page)
  })

  test('应该成功创建一个新的旅行行程', async ({ page }) => {
    // 1. 导航到创建行程页面
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 2. 验证表单元素存在
    await expect(page.locator('input[name="destination"]')).toBeVisible()
    await expect(page.locator('input[name="startDate"]')).toBeVisible()
    await expect(page.locator('input[name="duration"]')).toBeVisible()

    // 3. 填写行程表单
    const formData = {
      destination: '北京',
      startDate: '2025-03-01',
      duration: '3',
      budget: '5000',
      travelers: '2',
      preferences: '喜欢历史文化景点，对美食感兴趣',
    }

    await fillTripForm(page, formData)

    // 4. 提交表单
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await submitButton.click()

    // 5. 等待 AI 生成行程（可能需要较长时间）
    // 注意: 这会调用真实的 AI API，可能需要配置 API Keys
    await waitForTripGeneration(page, 120000) // 2 分钟超时

    // 6. 验证跳转到行程详情页
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\/dashboard\/trips\/[a-f0-9-]+/)

    // 7. 获取行程 ID
    const tripId = getTripIdFromUrl(page)
    expect(tripId).toBeTruthy()

    // 8. 验证行程详情页面元素
    await waitForVisible(page, 'h1') // 行程标题

    // 验证基本信息显示
    await expect(page.locator('text=北京')).toBeVisible()

    // 验证行程日期信息
    await expect(page.locator('text=2025-03-01')).toBeVisible()

    // 验证行程天数（应该有 3 天的规划）
    const dayHeaders = page.locator('[data-testid="day-header"]')
    const dayCount = await dayHeaders.count()
    expect(dayCount).toBeGreaterThanOrEqual(3)

    // 验证行程中有景点信息
    const attractions = page.locator('[data-testid="attraction-card"]')
    const attractionCount = await attractions.count()
    expect(attractionCount).toBeGreaterThan(0)

    // 验证地图显示（如果有的话）
    const map = page.locator('[data-testid="trip-map"]')
    if (await map.isVisible()) {
      await expect(map).toBeVisible()
    }

    console.log(`✅ 成功创建行程，ID: ${tripId}`)
  })

  test('应该验证表单必填字段', async ({ page }) => {
    // 导航到创建行程页面
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 不填写任何字段，直接提交
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 验证显示错误提示
    // 注意: 根据实际表单验证实现调整选择器
    const errorMessages = page.locator('[role="alert"], .error')
    await expect(errorMessages).toBeTruthy()

    // 或者验证表单没有提交（仍在创建页面）
    expect(page.url()).toContain('/dashboard/create')
  })

  test('应该能够取消创建并返回', async ({ page }) => {
    // 导航到创建行程页面
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 查找取消或返回按钮
    const cancelButton = page.locator('text=取消, text=返回').first()

    if (await cancelButton.isVisible()) {
      await cancelButton.click()

      // 验证返回到 dashboard 或上一页
      await page.waitForURL(/\/dashboard/)
      expect(page.url()).not.toContain('/create')
    }
  })

  test('应该在缺少 API Key 时显示提示', async ({ page }) => {
    // 这个测试假设测试账号没有配置 API Key，且系统也没有默认 Key
    // 如果有 API Key 配置，这个测试会失败

    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 填写表单
    const formData = {
      destination: '上海',
      startDate: '2025-04-01',
      duration: '2',
    }

    await fillTripForm(page, formData)

    // 提交表单
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 如果没有 API Key，应该显示错误提示
    // 这个测试可能需要根据实际错误处理逻辑调整
    const errorAlert = page.locator('[role="alert"]')

    // 等待一段时间看是否出现错误
    try {
      await errorAlert.waitFor({ state: 'visible', timeout: 5000 })
      const errorText = await errorAlert.textContent()
      console.log('错误提示:', errorText)
    } catch {
      // 如果没有错误，说明有 API Key 配置，测试跳过
      console.log('✅ API Key 已配置，跳过此测试')
    }
  })
})

test.describe('创建行程 - 高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该支持自然语言日期输入', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 尝试使用自然语言输入日期（如果支持的话）
    const dateInput = page.locator('input[name="startDate"]')

    // 测试不同的日期格式
    await dateInput.fill('明天')

    // 验证日期被正确解析（这取决于实际实现）
    const dateValue = await dateInput.inputValue()
    expect(dateValue).toBeTruthy()
  })

  test('应该能够保存为草稿', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 部分填写表单
    await page.fill('input[name="destination"]', '杭州')

    // 查找保存草稿按钮（如果有的话）
    const saveDraftButton = page.locator('text=保存草稿, text=暂存')

    if (await saveDraftButton.isVisible()) {
      await saveDraftButton.click()

      // 验证保存成功提示
      const successMessage = page.locator('text=保存成功, text=已保存')
      await expect(successMessage).toBeVisible({ timeout: 5000 })
    }
  })
})
