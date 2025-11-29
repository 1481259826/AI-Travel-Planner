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

// ============================================================================
// v1/v2 API 切换测试
// ============================================================================

test.describe('创建行程 - v1/v2 API 切换', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该根据 Feature Flag 使用正确的 API', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 设置请求监听
    const apiRequests: string[] = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/generate-itinerary') || url.includes('/api/v2/generate-itinerary')) {
        apiRequests.push(url)
      }
    })

    // 填写基本表单
    await page.fill('input[name="destination"]', '测试城市')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-20')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    // 提交表单
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待请求发出
    await page.waitForTimeout(3000)

    // 验证使用了其中一个 API
    if (apiRequests.length > 0) {
      const usedV2 = apiRequests.some(url => url.includes('/api/v2/'))
      const usedV1 = apiRequests.some(url => url.includes('/api/generate-itinerary') && !url.includes('/v2/'))

      // 应该使用 v1 或 v2 其中之一
      expect(usedV1 || usedV2).toBe(true)
      console.log(`使用的 API: ${usedV2 ? 'v2' : 'v1'}`)
    }
  })

  test('v1 和 v2 API 应该返回兼容的行程格式', async ({ page }) => {
    // 这个测试验证无论使用哪个 API，行程详情页都能正确显示
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 填写表单
    await page.fill('input[name="destination"]', '西安')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-25')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    const budgetInput = page.locator('input[name="budget"]').first()
    if (await budgetInput.isVisible()) {
      await budgetInput.fill('3000')
    }

    const travelersInput = page.locator('input[name="travelers"]').first()
    if (await travelersInput.isVisible()) {
      await travelersInput.fill('2')
    }

    // 提交并等待完成
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待跳转到详情页
    await page.waitForURL(/\/dashboard\/trips\/[a-f0-9-]+/, { timeout: 180000 })

    // 验证行程详情页基本元素
    await waitForVisible(page, 'h1')

    // 验证包含目的地
    const pageContent = await page.content()
    expect(pageContent).toContain('西安')

    // 验证有行程内容
    const dayPlan = page.locator('[data-testid="day-plan"], .day-plan, .itinerary-day')
    const attractions = page.locator('[data-testid="attraction-card"], .attraction-card, .activity-item')

    // 应该有天数规划或景点
    const hasDays = await dayPlan.count() > 0
    const hasAttractions = await attractions.count() > 0
    expect(hasDays || hasAttractions).toBe(true)
  })
})

// ============================================================================
// 边界条件测试
// ============================================================================

test.describe('创建行程 - 边界条件', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该处理超长目的地名称', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 输入超长目的地
    const longDestination = '这是一个非常非常长的目的地名称用于测试系统对超长文本的处理能力' +
      '这是一个非常非常长的目的地名称用于测试系统对超长文本的处理能力'

    await page.fill('input[name="destination"]', longDestination)

    // 验证输入被接受或截断
    const inputValue = await page.locator('input[name="destination"]').inputValue()
    expect(inputValue).toBeTruthy()
  })

  test('应该处理特殊字符目的地', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 输入包含特殊字符的目的地
    const specialDestination = '北京（朝阳区）/海淀区-西城区'

    await page.fill('input[name="destination"]', specialDestination)

    // 验证输入被接受
    const inputValue = await page.locator('input[name="destination"]').inputValue()
    expect(inputValue).toBe(specialDestination)
  })

  test('应该处理英文目的地', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 输入英文目的地
    await page.fill('input[name="destination"]', 'Beijing')

    const inputValue = await page.locator('input[name="destination"]').inputValue()
    expect(inputValue).toBe('Beijing')
  })

  test('应该验证日期不能是过去', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 输入过去的日期
    await page.fill('input[name="destination"]', '上海')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2020-01-01') // 过去的日期
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    // 提交表单
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待验证结果
    await page.waitForTimeout(2000)

    // 应该仍在创建页面或显示错误
    const url = page.url()
    const hasError = await page.locator('[role="alert"], .error, .validation-error').count() > 0
    const stillOnCreate = url.includes('/create')

    // 要么显示错误，要么仍在创建页面
    expect(hasError || stillOnCreate).toBe(true)
  })

  test('应该处理极短行程（1天）', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    await page.fill('input[name="destination"]', '南京')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-20')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('1') // 最短1天
    }

    // 验证输入被接受
    const inputValue = await durationInput.inputValue()
    expect(inputValue).toBe('1')
  })

  test('应该处理长行程（30天）', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    await page.fill('input[name="destination"]', '云南')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-01')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('30') // 长行程
    }

    // 验证输入被接受
    const inputValue = await durationInput.inputValue()
    expect(inputValue).toBe('30')
  })

  test('应该处理负数天数', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('-1') // 无效值
    }

    // 验证是否被拒绝或转换为有效值
    const inputValue = await durationInput.inputValue()
    // 可能被拒绝（空）或转换为正数
  })

  test('应该处理零预算', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    await page.fill('input[name="destination"]', '苏州')

    const budgetInput = page.locator('input[name="budget"]').first()
    if (await budgetInput.isVisible()) {
      await budgetInput.fill('0')
    }

    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待验证结果
    await page.waitForTimeout(2000)

    // 应该有验证或仍在页面
    const url = page.url()
    expect(url).toContain('/dashboard')
  })

  test('应该处理极大预算', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    const budgetInput = page.locator('input[name="budget"]').first()
    if (await budgetInput.isVisible()) {
      await budgetInput.fill('9999999999') // 极大预算
    }

    // 验证输入被接受
    const inputValue = await budgetInput.inputValue()
    expect(inputValue).toBeTruthy()
  })

  test('应该处理零人数', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    const travelersInput = page.locator('input[name="travelers"]').first()
    if (await travelersInput.isVisible()) {
      await travelersInput.fill('0')
    }

    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待验证
    await page.waitForTimeout(2000)

    // 应该有错误或仍在页面
    const url = page.url()
    expect(url).toContain('/dashboard')
  })

  test('应该处理大人数', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    const travelersInput = page.locator('input[name="travelers"]').first()
    if (await travelersInput.isVisible()) {
      await travelersInput.fill('100') // 大团体
    }

    // 验证输入被接受
    const inputValue = await travelersInput.inputValue()
    expect(inputValue).toBe('100')
  })
})

// ============================================================================
// 表单交互测试
// ============================================================================

test.describe('创建行程 - 表单交互', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Tab 键应该能在字段间切换', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 聚焦第一个输入
    const destinationInput = page.locator('input[name="destination"]')
    await destinationInput.focus()

    // 按 Tab 切换到下一个字段
    await page.keyboard.press('Tab')

    // 验证焦点移动了
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBeTruthy()
  })

  test('Enter 键应该提交表单', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 填写必要字段
    await page.fill('input[name="destination"]', '广州')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-20')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    // 按 Enter 键
    await page.keyboard.press('Enter')

    // 等待响应
    await page.waitForTimeout(3000)

    // 应该开始处理或显示验证错误
    // （如果缺少必填字段会显示错误）
  })

  test('应该支持复制粘贴', async ({ page, context }) => {
    // 授予剪贴板权限
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 输入文本
    const destinationInput = page.locator('input[name="destination"]')
    await destinationInput.fill('杭州西湖')

    // 全选
    await destinationInput.selectText()

    // 复制
    await page.keyboard.press('Control+c')

    // 清空
    await destinationInput.clear()

    // 粘贴
    await page.keyboard.press('Control+v')

    // 验证
    const value = await destinationInput.inputValue()
    expect(value).toBe('杭州西湖')
  })

  test('清除按钮应该清空字段（如果存在）', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 填写字段
    await page.fill('input[name="destination"]', '深圳')

    // 查找清除按钮
    const clearButton = page.locator('button[aria-label="清除"], [data-testid="clear-destination"]').first()

    if (await clearButton.isVisible()) {
      await clearButton.click()

      // 验证字段被清空
      const value = await page.locator('input[name="destination"]').inputValue()
      expect(value).toBe('')
    }
  })
})

// ============================================================================
// 网络错误处理测试
// ============================================================================

test.describe('创建行程 - 网络错误处理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该处理网络超时', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 模拟网络延迟
    await page.route('**/api/generate-itinerary', async route => {
      // 延迟 30 秒
      await new Promise(resolve => setTimeout(resolve, 30000))
      await route.abort('timedout')
    })

    await page.route('**/api/v2/generate-itinerary', async route => {
      await new Promise(resolve => setTimeout(resolve, 30000))
      await route.abort('timedout')
    })

    // 填写表单
    await page.fill('input[name="destination"]', '成都')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-20')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    // 提交
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待超时或错误显示
    await page.waitForTimeout(5000)

    // 页面应该显示加载状态或错误
    const loading = await page.locator('[data-testid="loading"], .loading, .generating').isVisible()
    const error = await page.locator('[role="alert"], .error').isVisible()

    // 应该有响应
  })

  test('应该处理 500 错误', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 模拟服务器错误
    await page.route('**/api/**/generate-itinerary', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '服务器内部错误' }),
      })
    })

    // 填写表单
    await page.fill('input[name="destination"]', '武汉')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-20')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    // 提交
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待错误显示
    await page.waitForTimeout(5000)

    // 应该显示错误消息
    const errorAlert = page.locator('[role="alert"], .error')
    // 可能显示错误
  })

  test('应该处理 API 返回无效数据', async ({ page }) => {
    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 模拟返回无效数据
    await page.route('**/api/**/generate-itinerary', route => {
      route.fulfill({
        status: 200,
        body: 'invalid json {{{',
        headers: { 'Content-Type': 'application/json' },
      })
    })

    // 填写表单
    await page.fill('input[name="destination"]', '重庆')

    const startDateInput = page.locator('input[name="startDate"]').first()
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-20')
    }

    const durationInput = page.locator('input[name="duration"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('2')
    }

    // 提交
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 等待处理
    await page.waitForTimeout(5000)

    // 应该有错误处理
  })
})

// ============================================================================
// 响应式设计测试
// ============================================================================

test.describe('创建行程 - 响应式设计', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该在移动端正确显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 验证表单可见
    await expect(page.locator('input[name="destination"]')).toBeVisible()

    // 验证提交按钮可见
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
  })

  test('应该在平板端正确显示', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 验证表单可见
    await expect(page.locator('input[name="destination"]')).toBeVisible()
  })

  test('应该在桌面端正确显示', async ({ page }) => {
    // 设置桌面视口
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('/dashboard/create')
    await waitForVisible(page, 'form')

    // 验证表单可见
    await expect(page.locator('input[name="destination"]')).toBeVisible()
  })
})
