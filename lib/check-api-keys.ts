/**
 * API Key 可用性检查工具（向后兼容层）
 *
 * ⚠️ 弃用警告：此文件仅用于向后兼容，推荐使用新的模块化导入
 *
 * 旧的用法（仍然支持）：
 * ```typescript
 * import { checkApiKeyAvailable, checkDeepSeekKeyRequired } from '@/lib/check-api-keys'
 * const result = await checkApiKeyAvailable('deepseek', userId, token)
 * ```
 *
 * 推荐的新用法：
 * ```typescript
 * import { ApiKeyChecker } from '@/lib/api-keys'
 * const result = await ApiKeyChecker.checkAvailability('deepseek', userId, token)
 * ```
 *
 * 计划：一周后将逐步迁移所有代码到新模块化结构
 */

// ==================== 重新导出新模块 ====================

export type { ApiKeyCheckResult } from '@/lib/api-keys/types'

export {
  checkApiKeyAvailable,
  checkDeepSeekKeyRequired,
  checkMapKeyOptional,
  checkVoiceKeyOptional,
} from '@/lib/api-keys'

// 为了完全兼容，也导出 ApiKeyChecker 类
export { ApiKeyChecker } from '@/lib/api-keys/checker'
