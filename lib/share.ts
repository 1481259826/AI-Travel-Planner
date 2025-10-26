/**
 * 分享功能工具函数
 * 提供生成分享链接、验证 token 等功能
 */

/**
 * 生成唯一的分享 token
 */
export function generateShareToken(): string {
  // 使用 crypto.randomUUID() 生成唯一标识符
  return crypto.randomUUID().replace(/-/g, '')
}

/**
 * 生成完整的分享 URL
 */
export function getShareUrl(token: string, baseUrl?: string): string {
  // 优先级：1. 传入参数 2. 环境变量 3. 当前页面 origin
  const base = baseUrl ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/share/${token}`
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// 注意：以下函数已废弃，现在直接在组件中使用 Supabase 客户端

// /**
//  * 为行程生成或更新分享链接
//  * @deprecated 改用组件中直接调用 Supabase 客户端
//  */
// export async function generateTripShareLink(tripId: string, isPublic: boolean) { ... }

// /**
//  * 通过 token 获取公开的行程
//  * @deprecated 改用 API 路由 /api/trips/share/[token]
//  */
// export async function getTripByShareToken(token: string) { ... }

/**
 * 生成二维码 Data URL
 * 使用 qrcode 库或在线服务
 */
export function getQRCodeUrl(text: string): string {
  // 使用 qrcode.react 组件时不需要这个
  // 或者使用在线服务如：
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
}

/**
 * 格式化分享文本
 */
export function formatShareText(trip: {
  destination: string
  start_date: string
  end_date: string
}): string {
  return `我的 ${trip.destination} 旅行计划 (${trip.start_date} 至 ${trip.end_date})`
}
