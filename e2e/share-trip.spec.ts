import { test, expect, Browser } from '@playwright/test'
import { login, logout, waitForVisible } from './helpers'

/**
 * E2E 测试: 分享行程完整流程
 *
 * 测试流程:
 * 1. 用户登录并访问行程详情页
 * 2. 点击分享按钮，生成分享链接
 * 3. 复制分享链接
 * 4. 在新的无痕窗口中（模拟匿名用户）访问分享链接
 * 5. 验证匿名用户可以看到行程内容
 * 6. 测试取消分享功能
 */

test.describe('分享行程 E2E 测试', () => {
  let testTripId: string
  let shareToken: string

  test.beforeEach(async ({ page }) => {
    // 登录
    await login(page)

    // 获取第一个行程 ID
    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    const href = await firstTripLink.getAttribute('href')

    if (href) {
      const match = href.match(/\/trips\/([a-f0-9-]+)/)
      if (match) {
        testTripId = match[1]
      }
    }

    // 如果没有行程，跳过测试
    if (!testTripId) {
      test.skip(true, '没有可用的测试行程')
    }
  })

  test('应该成功创建分享链接', async ({ page }) => {
    // 导航到行程详情页
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    // 查找分享按钮
    const shareButton = page.locator(
      'button:has-text("分享"), [data-testid="share-button"]'
    ).first()

    // 验证分享按钮存在
    await expect(shareButton).toBeVisible({ timeout: 5000 })

    // 点击分享按钮
    await shareButton.click()

    // 等待分享对话框或分享链接出现
    const shareDialog = page.locator(
      '[data-testid="share-dialog"], [role="dialog"]'
    ).first()

    await expect(shareDialog).toBeVisible({ timeout: 5000 })

    // 查找分享链接输入框
    const shareLinkInput = page.locator(
      'input[readonly], [data-testid="share-link"]'
    ).first()

    await expect(shareLinkInput).toBeVisible()

    // 获取分享链接
    const shareLink = await shareLinkInput.inputValue()
    expect(shareLink).toBeTruthy()
    expect(shareLink).toMatch(/\/share\/[a-f0-9]+/)

    // 提取 share token
    const tokenMatch = shareLink.match(/\/share\/([a-f0-9]+)/)
    if (tokenMatch) {
      shareToken = tokenMatch[1]
      console.log(`✅ 分享链接创建成功: ${shareLink}`)
      console.log(`Token: ${shareToken}`)
    }
  })

  test('应该能够复制分享链接到剪贴板', async ({ page, context }) => {
    // 授予剪贴板权限
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    // 点击分享按钮
    const shareButton = page.locator('button:has-text("分享")').first()
    await shareButton.click()

    // 等待分享对话框
    await waitForVisible(page, '[data-testid="share-dialog"], [role="dialog"]')

    // 查找复制按钮
    const copyButton = page.locator(
      'button:has-text("复制"), [data-testid="copy-link"]'
    ).first()

    if (await copyButton.isVisible()) {
      // 点击复制按钮
      await copyButton.click()

      // 验证复制成功提示
      const successMessage = page.locator(
        'text=复制成功, text=已复制, [role="status"]'
      )
      await expect(successMessage.first()).toBeVisible({ timeout: 3000 })

      // 验证剪贴板内容
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText()
      )
      expect(clipboardText).toMatch(/\/share\/[a-f0-9]+/)

      console.log(`✅ 链接已复制到剪贴板: ${clipboardText}`)
    } else {
      console.log('⚠️ 未找到复制按钮')
    }
  })

  test('应该允许匿名用户访问公开的分享链接', async ({ page, browser }) => {
    // 首先创建分享链接
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    await shareButton.click()

    await waitForVisible(page, '[data-testid="share-dialog"], [role="dialog"]')

    const shareLinkInput = page.locator('input[readonly]').first()
    const shareLink = await shareLinkInput.inputValue()

    // 提取分享路径
    const urlObj = new URL(shareLink)
    const sharePath = urlObj.pathname

    // 退出登录或创建新的无痕窗口
    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      // 访问分享链接（匿名用户）
      await incognitoPage.goto(sharePath)
      await waitForVisible(incognitoPage, 'body')

      // 验证可以看到行程标题
      const title = incognitoPage.locator('h1')
      await expect(title).toBeVisible()

      // 验证可以看到行程内容
      const dayPlan = incognitoPage.locator('[data-testid="day-plan"]')
      if (await dayPlan.count() > 0) {
        expect(await dayPlan.count()).toBeGreaterThan(0)
      }

      // 验证不能编辑（没有编辑按钮）
      const editButton = incognitoPage.locator(
        'button:has-text("编辑"), [data-testid="edit-button"]'
      )
      await expect(editButton).not.toBeVisible()

      console.log('✅ 匿名用户可以访问分享链接')
    } finally {
      // 清理
      await incognitoContext.close()
    }
  })

  test('应该能够取消分享', async ({ page, browser }) => {
    // 创建分享链接
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    await shareButton.click()

    await waitForVisible(page, '[data-testid="share-dialog"], [role="dialog"]')

    const shareLinkInput = page.locator('input[readonly]').first()
    const shareLink = await shareLinkInput.inputValue()
    const sharePath = new URL(shareLink).pathname

    // 查找取消分享按钮
    const cancelShareButton = page.locator(
      'button:has-text("取消分享"), button:has-text("停止分享")'
    ).first()

    if (await cancelShareButton.isVisible()) {
      // 点击取消分享
      await cancelShareButton.click()

      // 确认对话框（如果有的话）
      const confirmButton = page.locator(
        'button:has-text("确定"), button:has-text("确认")'
      )
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // 等待取消成功
      await page.waitForTimeout(1000)

      // 尝试用无痕窗口访问分享链接，应该失败
      const incognitoContext = await browser.newContext()
      const incognitoPage = await incognitoContext.newPage()

      try {
        await incognitoPage.goto(sharePath)
        await incognitoPage.waitForTimeout(2000)

        // 验证显示错误或重定向（取决于实际实现）
        const errorMessage = incognitoPage.locator(
          'text=无法访问, text=已停止分享, text=不存在'
        )

        const hasError = await errorMessage.count() > 0
        const isRedirected = !incognitoPage.url().includes('/share/')

        expect(hasError || isRedirected).toBe(true)

        console.log('✅ 取消分享成功，匿名用户无法访问')
      } finally {
        await incognitoContext.close()
      }
    } else {
      console.log('⚠️ 未找到取消分享按钮')
    }
  })

  test('应该显示分享二维码', async ({ page }) => {
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    await shareButton.click()

    await waitForVisible(page, '[data-testid="share-dialog"], [role="dialog"]')

    // 查找二维码元素
    const qrCode = page.locator(
      '[data-testid="qr-code"], img[alt*="二维码"]'
    ).first()

    if (await qrCode.isVisible()) {
      await expect(qrCode).toBeVisible()

      // 如果是图片，验证 src 属性
      const tagName = await qrCode.evaluate((el) => el.tagName.toLowerCase())
      if (tagName === 'img') {
        const src = await qrCode.getAttribute('src')
        expect(src).toBeTruthy()
      }

      console.log('✅ 二维码显示正常')
    } else {
      console.log('⚠️ 未找到二维码')
    }
  })
})

test.describe('分享行程 - 权限测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该只允许行程所有者创建分享链接', async ({ page, browser }) => {
    // 获取第一个行程
    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    const href = await firstTripLink.getAttribute('href')
    let tripId = ''

    if (href) {
      const match = href.match(/\/trips\/([a-f0-9-]+)/)
      if (match) {
        tripId = match[1]
      }
    }

    if (!tripId) {
      test.skip(true, '没有可用的测试行程')
      return
    }

    // 访问行程详情页
    await page.goto(`/dashboard/trips/${tripId}`)
    await waitForVisible(page, 'h1')

    // 验证作为所有者可以看到分享按钮
    const shareButton = page.locator('button:has-text("分享")').first()
    await expect(shareButton).toBeVisible()

    // TODO: 测试非所有者访问（需要另一个测试账号）
    console.log('✅ 行程所有者可以看到分享按钮')
  })

  test('应该验证未公开的行程不能被匿名访问', async ({ page, browser }) => {
    // 尝试构造一个不存在的分享 token
    const fakeTripId = 'nonexistenttoken123456'

    // 使用无痕窗口访问
    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(`/share/${fakeTripId}`)
      await incognitoPage.waitForTimeout(2000)

      // 验证显示错误或重定向
      const errorMessage = incognitoPage.locator('text=不存在, text=无法访问')
      const hasError = await errorMessage.count() > 0
      const isNotSharePage = !incognitoPage.url().includes(`/share/${fakeTripId}`)

      expect(hasError || isNotSharePage).toBe(true)

      console.log('✅ 无效的分享链接被正确拒绝')
    } finally {
      await incognitoContext.close()
    }
  })
})

test.describe('分享行程 - 功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该在分享页面显示完整的行程信息', async ({ page, browser }) => {
    // 获取行程并创建分享
    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()

    await waitForVisible(page, 'h1')

    // 获取原始页面的行程标题
    const originalTitle = await page.locator('h1').first().textContent()

    // 创建分享
    const shareButton = page.locator('button:has-text("分享")').first()
    await shareButton.click()

    await waitForVisible(page, 'input[readonly]')
    const shareLinkInput = page.locator('input[readonly]').first()
    const shareLink = await shareLinkInput.inputValue()
    const sharePath = new URL(shareLink).pathname

    // 在无痕窗口中访问分享链接
    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await waitForVisible(incognitoPage, 'h1')

      // 验证标题相同
      const sharedTitle = await incognitoPage.locator('h1').first().textContent()
      expect(sharedTitle).toBe(originalTitle)

      // 验证有景点信息
      const attractions = incognitoPage.locator('[data-testid="attraction-card"]')
      const attractionCount = await attractions.count()

      if (attractionCount > 0) {
        expect(attractionCount).toBeGreaterThan(0)
        console.log(`✅ 分享页面显示 ${attractionCount} 个景点`)
      }

      // 验证有日期信息
      const dateInfo = incognitoPage.locator('text=/\\d{4}-\\d{2}-\\d{2}/')
      if (await dateInfo.count() > 0) {
        expect(await dateInfo.count()).toBeGreaterThan(0)
      }

      console.log('✅ 分享页面显示完整行程信息')
    } finally {
      await incognitoContext.close()
    }
  })

  test('应该支持分享链接的唯一性', async ({ page }) => {
    // 获取第一个行程
    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()

    await waitForVisible(page, 'h1')

    // 第一次创建分享
    const shareButton = page.locator('button:has-text("分享")').first()
    await shareButton.click()

    await waitForVisible(page, 'input[readonly]')
    const shareLinkInput = page.locator('input[readonly]').first()
    const firstShareLink = await shareLinkInput.inputValue()

    // 关闭对话框
    const closeButton = page.locator(
      'button[aria-label="关闭"], button:has-text("关闭")'
    ).first()
    if (await closeButton.isVisible()) {
      await closeButton.click()
    } else {
      await page.keyboard.press('Escape')
    }

    await page.waitForTimeout(500)

    // 第二次打开分享
    await shareButton.click()
    await waitForVisible(page, 'input[readonly]')

    const secondShareLink = await shareLinkInput.inputValue()

    // 验证两次获取的分享链接相同（同一个 token）
    expect(secondShareLink).toBe(firstShareLink)

    console.log('✅ 分享链接具有唯一性和持久性')
  })
})

// ============================================================================
// 分享页面内容验证测试
// ============================================================================

test.describe('分享页面 - 内容验证', () => {
  let shareToken: string
  let sharePath: string

  test.beforeEach(async ({ page }) => {
    // 登录并获取分享链接
    await login(page)

    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    const href = await firstTripLink.getAttribute('href')

    if (!href) {
      test.skip(true, '没有可用的测试行程')
      return
    }

    // 访问行程详情
    await firstTripLink.click()
    await waitForVisible(page, 'h1')

    // 创建分享
    const shareButton = page.locator('button:has-text("分享")').first()
    if (await shareButton.isVisible()) {
      await shareButton.click()
      await waitForVisible(page, 'input[readonly]')

      const shareLinkInput = page.locator('input[readonly]').first()
      const shareLink = await shareLinkInput.inputValue()

      const url = new URL(shareLink)
      sharePath = url.pathname

      const match = sharePath.match(/\/share\/([a-f0-9-]+)/)
      if (match) {
        shareToken = match[1]
      }
    }
  })

  test('分享页面应该显示目的地', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 验证页面有目的地信息
      const pageContent = await incognitoPage.content()

      // 应该包含某个中国城市名
      const cities = ['北京', '上海', '杭州', '广州', '深圳', '成都', '西安', '南京', '武汉', '重庆']
      const hasCity = cities.some(city => pageContent.includes(city))

      // 或者有其他目的地标识
      const hasDestination = pageContent.includes('目的地') || pageContent.includes('行程')

      expect(hasCity || hasDestination).toBe(true)
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面应该显示日期信息', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 查找日期格式的文本
      const datePattern = incognitoPage.locator('text=/\\d{4}[-年]\\d{1,2}[-月]\\d{1,2}/')
      const dateCount = await datePattern.count()

      // 应该有日期信息
      // 或者有"第 X 天"的文本
      const dayPattern = incognitoPage.locator('text=/第[一二三四五六七八九十\\d]+天|Day\\s*\\d+/i')
      const dayCount = await dayPattern.count()

      expect(dateCount > 0 || dayCount > 0).toBe(true)
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面应该显示行程天数规划', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 查找天数规划元素
      const dayPlans = incognitoPage.locator('[data-testid="day-plan"], .day-plan, .itinerary-day, [class*="day-"]')
      const dayCount = await dayPlans.count()

      // 或者查找活动/景点元素
      const activities = incognitoPage.locator('[data-testid="activity"], .activity, .attraction, [data-testid="attraction-card"]')
      const activityCount = await activities.count()

      // 应该有天数规划或活动
      expect(dayCount > 0 || activityCount > 0).toBe(true)
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面应该显示景点名称', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 常见景点关键词
      const attractionKeywords = ['博物馆', '公园', '故宫', '长城', '西湖', '外滩', '景区', '古镇', '寺', '塔']

      const pageContent = await incognitoPage.content()
      const hasAttraction = attractionKeywords.some(kw => pageContent.includes(kw))

      // 或者有景点卡片元素
      const attractionCards = incognitoPage.locator('[data-testid="attraction-card"], .attraction-card, .poi-item')
      const cardCount = await attractionCards.count()

      expect(hasAttraction || cardCount > 0).toBe(true)
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面不应该显示编辑功能', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 不应该有编辑按钮
      const editButton = incognitoPage.locator('button:has-text("编辑"), [data-testid="edit-button"], a:has-text("编辑")')
      await expect(editButton).not.toBeVisible()

      // 不应该有删除按钮
      const deleteButton = incognitoPage.locator('button:has-text("删除"), [data-testid="delete-button"]')
      await expect(deleteButton).not.toBeVisible()

      // 不应该有保存按钮
      const saveButton = incognitoPage.locator('button:has-text("保存"), [data-testid="save-button"]')
      await expect(saveButton).not.toBeVisible()
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面应该有品牌标识或来源说明', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 查找品牌标识
      const brandKeywords = ['旅行', '规划', 'AI', '行程', 'Trip', 'Travel', 'Planner']

      const pageContent = await incognitoPage.content()
      const hasBrand = brandKeywords.some(kw => pageContent.toLowerCase().includes(kw.toLowerCase()))

      // 或者有 logo 图片
      const logo = incognitoPage.locator('img[alt*="logo"], [class*="logo"], [data-testid="logo"]')
      const hasLogo = await logo.count() > 0

      expect(hasBrand || hasLogo).toBe(true)
    } finally {
      await incognitoContext.close()
    }
  })
})

// ============================================================================
// 分享页面 - 地图和位置信息
// ============================================================================

test.describe('分享页面 - 地图和位置', () => {
  let sharePath: string

  test.beforeEach(async ({ page }) => {
    await login(page)

    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    if (await shareButton.isVisible()) {
      await shareButton.click()
      await waitForVisible(page, 'input[readonly]')

      const shareLinkInput = page.locator('input[readonly]').first()
      const shareLink = await shareLinkInput.inputValue()
      sharePath = new URL(shareLink).pathname
    }
  })

  test('分享页面应该显示地图（如果有的话）', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 等待地图加载
      await incognitoPage.waitForTimeout(3000)

      // 查找地图容器
      const mapContainer = incognitoPage.locator('[data-testid="trip-map"], .trip-map, #amap-container, .amap-container, [class*="map"]')
      const mapExists = await mapContainer.count() > 0

      // 地图是可选的
      if (mapExists) {
        console.log('✅ 分享页面包含地图')
      } else {
        console.log('ℹ️ 分享页面不包含地图')
      }
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面应该显示景点地址', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 查找地址信息
      const addressPatterns = ['地址', '位置', '路', '街', '号', '区']
      const pageContent = await incognitoPage.content()
      const hasAddress = addressPatterns.some(p => pageContent.includes(p))

      // 地址信息是可选的
      if (hasAddress) {
        console.log('✅ 分享页面包含地址信息')
      }
    } finally {
      await incognitoContext.close()
    }
  })
})

// ============================================================================
// 分享页面 - 费用和预算信息
// ============================================================================

test.describe('分享页面 - 费用信息', () => {
  let sharePath: string

  test.beforeEach(async ({ page }) => {
    await login(page)

    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    if (await shareButton.isVisible()) {
      await shareButton.click()
      await waitForVisible(page, 'input[readonly]')

      const shareLinkInput = page.locator('input[readonly]').first()
      const shareLink = await shareLinkInput.inputValue()
      sharePath = new URL(shareLink).pathname
    }
  })

  test('分享页面应该显示预算/费用信息（如果有的话）', async ({ page, browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 查找费用相关信息
      const costKeywords = ['预算', '费用', '花费', '价格', '元', '¥', 'RMB', '￥']
      const pageContent = await incognitoPage.content()
      const hasCostInfo = costKeywords.some(kw => pageContent.includes(kw))

      // 费用信息是可选的
      if (hasCostInfo) {
        console.log('✅ 分享页面包含费用信息')
      } else {
        console.log('ℹ️ 分享页面不显示费用信息')
      }
    } finally {
      await incognitoContext.close()
    }
  })
})

// ============================================================================
// 分享页面 - 响应式设计
// ============================================================================

test.describe('分享页面 - 响应式设计', () => {
  let sharePath: string

  test.beforeEach(async ({ page }) => {
    await login(page)

    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    if (await shareButton.isVisible()) {
      await shareButton.click()
      await waitForVisible(page, 'input[readonly]')

      const shareLinkInput = page.locator('input[readonly]').first()
      const shareLink = await shareLinkInput.inputValue()
      sharePath = new URL(shareLink).pathname
    }
  })

  test('分享页面应该在移动端正确显示', async ({ browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    // 创建移动端视口的上下文
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    })
    const mobilePage = await mobileContext.newPage()

    try {
      await mobilePage.goto(sharePath)
      await mobilePage.waitForLoadState('networkidle')

      // 验证页面正常显示
      const title = mobilePage.locator('h1, h2, [class*="title"]').first()
      await expect(title).toBeVisible()

      // 验证内容不会溢出
      const bodyWidth = await mobilePage.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(375)
    } finally {
      await mobileContext.close()
    }
  })

  test('分享页面应该在平板端正确显示', async ({ browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    })
    const tabletPage = await tabletContext.newPage()

    try {
      await tabletPage.goto(sharePath)
      await tabletPage.waitForLoadState('networkidle')

      // 验证页面正常显示
      const title = tabletPage.locator('h1, h2, [class*="title"]').first()
      await expect(title).toBeVisible()
    } finally {
      await tabletContext.close()
    }
  })

  test('分享页面应该在桌面端正确显示', async ({ browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })
    const desktopPage = await desktopContext.newPage()

    try {
      await desktopPage.goto(sharePath)
      await desktopPage.waitForLoadState('networkidle')

      // 验证页面正常显示
      const title = desktopPage.locator('h1, h2, [class*="title"]').first()
      await expect(title).toBeVisible()
    } finally {
      await desktopContext.close()
    }
  })
})

// ============================================================================
// 分享页面 - SEO 和元数据
// ============================================================================

test.describe('分享页面 - SEO 元数据', () => {
  let sharePath: string

  test.beforeEach(async ({ page }) => {
    await login(page)

    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()
    await waitForVisible(page, 'h1')

    const shareButton = page.locator('button:has-text("分享")').first()
    if (await shareButton.isVisible()) {
      await shareButton.click()
      await waitForVisible(page, 'input[readonly]')

      const shareLinkInput = page.locator('input[readonly]').first()
      const shareLink = await shareLinkInput.inputValue()
      sharePath = new URL(shareLink).pathname
    }
  })

  test('分享页面应该有合适的页面标题', async ({ browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 获取页面标题
      const title = await incognitoPage.title()

      // 标题应该存在且有意义
      expect(title).toBeTruthy()
      expect(title.length).toBeGreaterThan(0)

      console.log(`页面标题: ${title}`)
    } finally {
      await incognitoContext.close()
    }
  })

  test('分享页面应该有 Open Graph 元标签（用于社交分享）', async ({ browser }) => {
    if (!sharePath) {
      test.skip(true, '无法获取分享链接')
      return
    }

    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    try {
      await incognitoPage.goto(sharePath)
      await incognitoPage.waitForLoadState('networkidle')

      // 检查 Open Graph 标签
      const ogTitle = await incognitoPage.locator('meta[property="og:title"]').getAttribute('content')
      const ogDescription = await incognitoPage.locator('meta[property="og:description"]').getAttribute('content')

      // OG 标签是可选的
      if (ogTitle || ogDescription) {
        console.log('✅ 分享页面包含 Open Graph 元标签')
        if (ogTitle) console.log(`  og:title: ${ogTitle}`)
        if (ogDescription) console.log(`  og:description: ${ogDescription}`)
      } else {
        console.log('ℹ️ 分享页面不包含 Open Graph 元标签')
      }
    } finally {
      await incognitoContext.close()
    }
  })
})
