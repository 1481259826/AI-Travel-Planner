/**
 * API Key 管理模块统一导出
 *
 * 提供清晰的模块化 API Key 管理接口：
 * - 类型定义（types）
 * - 客户端（client）- 获取、解密、缓存
 * - 验证器（validator）- API Key 测试
 * - 检查器（checker）- 可用性检查
 *
 * @example
 * ```typescript
 * // 导入类
 * import { ApiKeyClient, ApiKeyValidator, ApiKeyChecker } from '@/lib/api-keys'
 *
 * // 使用客户端
 * const config = await ApiKeyClient.getUserConfig(userId, 'deepseek')
 *
 * // 使用验证器
 * const isValid = await ApiKeyValidator.testDeepSeekKey(apiKey)
 *
 * // 使用检查器
 * const result = await ApiKeyChecker.checkDeepSeekRequired(userId, token)
 * ```
 */

// ==================== 类型定义 ====================

export type {
  ApiKeyConfig,
  ApiKeyTestConfig,
  ApiKeyCheckResult,
  ApiKeyService,
} from './types'

export { SERVICE_NAMES } from './types'

// ==================== 客户端 ====================

export { ApiKeyClient } from './client'

// ==================== 验证器 ====================

export { ApiKeyValidator } from './validator'

// ==================== 检查器 ====================

export { ApiKeyChecker } from './checker'

// ==================== 便捷函数导出（向后兼容） ====================

/**
 * 获取用户 API Key（仅返回解密后的 Key）
 * @deprecated 推荐使用 ApiKeyClient.getUserKey()
 */
export const getUserApiKey = ApiKeyClient.getUserKey.bind(ApiKeyClient)

/**
 * 获取用户 API Key 配置（包含 baseUrl 和 extraConfig）
 * @deprecated 推荐使用 ApiKeyClient.getUserConfig()
 */
export const getUserApiKeyConfig = ApiKeyClient.getUserConfig.bind(ApiKeyClient)

/**
 * 测试 DeepSeek API Key
 * @deprecated 推荐使用 ApiKeyValidator.testDeepSeekKey()
 */
export const testDeepSeekKey = ApiKeyValidator.testDeepSeekKey.bind(ApiKeyValidator)

/**
 * 测试 ModelScope API Key
 * @deprecated 推荐使用 ApiKeyValidator.testModelScopeKey()
 */
export const testModelScopeKey = ApiKeyValidator.testModelScopeKey.bind(ApiKeyValidator)

/**
 * 测试高德地图 API Key
 * @deprecated 推荐使用 ApiKeyValidator.testMapKey()
 */
export const testMapKey = ApiKeyValidator.testMapKey.bind(ApiKeyValidator)

/**
 * 测试科大讯飞语音 API Key
 * @deprecated 推荐使用 ApiKeyValidator.testVoiceKey()
 */
export const testVoiceKey = ApiKeyValidator.testVoiceKey.bind(ApiKeyValidator)

/**
 * 测试 Anthropic API Key
 * @deprecated 推荐使用 ApiKeyValidator.testAnthropicKey()
 */
export const testAnthropicKey = ApiKeyValidator.testAnthropicKey.bind(ApiKeyValidator)

/**
 * 检查 API Key 可用性
 * @deprecated 推荐使用 ApiKeyChecker.checkAvailability()
 */
export const checkApiKeyAvailable = ApiKeyChecker.checkAvailability.bind(ApiKeyChecker)

/**
 * 检查 DeepSeek Key 是否配置（必需）
 * @deprecated 推荐使用 ApiKeyChecker.checkDeepSeekRequired()
 */
export const checkDeepSeekKeyRequired =
  ApiKeyChecker.checkDeepSeekRequired.bind(ApiKeyChecker)

/**
 * 检查地图 Key 是否配置（可选）
 * @deprecated 推荐使用 ApiKeyChecker.checkMapOptional()
 */
export const checkMapKeyOptional = ApiKeyChecker.checkMapOptional.bind(ApiKeyChecker)

/**
 * 检查语音 Key 是否配置（可选）
 * @deprecated 推荐使用 ApiKeyChecker.checkVoiceOptional()
 */
export const checkVoiceKeyOptional = ApiKeyChecker.checkVoiceOptional.bind(ApiKeyChecker)
