/**
 * API Key 管理模块（向后兼容层）
 *
 * ⚠️ 弃用警告：此文件仅用于向后兼容，推荐使用新的模块化导入
 *
 * 旧的用法（仍然支持）：
 * ```typescript
 * import { getUserApiKey, testDeepSeekKey } from '@/lib/api-keys'
 * const apiKey = await getUserApiKey(userId, 'deepseek')
 * const isValid = await testDeepSeekKey(apiKey)
 * ```
 *
 * 推荐的新用法：
 * ```typescript
 * import { ApiKeyClient, ApiKeyValidator } from '@/lib/api-keys'
 * const apiKey = await ApiKeyClient.getUserKey(userId, 'deepseek')
 * const isValid = await ApiKeyValidator.testDeepSeekKey(apiKey)
 * ```
 *
 * 计划：一周后将逐步迁移所有代码到新模块化结构
 */

// ==================== 重新导出新模块 ====================

// 类型定义
export type {
  ApiKeyConfig,
  ApiKeyTestConfig,
  ApiKeyCheckResult,
  ApiKeyService,
} from '@/lib/api-keys/types'

export { SERVICE_NAMES } from '@/lib/api-keys/types'

// 导出类
export { ApiKeyClient } from '@/lib/api-keys/client'
export { ApiKeyValidator } from '@/lib/api-keys/validator'
export { ApiKeyChecker } from '@/lib/api-keys/checker'

// 导出便捷函数（向后兼容）
export {
  getUserApiKey,
  getUserApiKeyConfig,
  testDeepSeekKey,
  testModelScopeKey,
  testMapKey,
  testVoiceKey,
  testAnthropicKey,
  checkApiKeyAvailable,
  checkDeepSeekKeyRequired,
  checkMapKeyOptional,
  checkVoiceKeyOptional,
} from '@/lib/api-keys'
