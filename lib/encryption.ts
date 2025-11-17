import CryptoJS from 'crypto-js'

/**
 * AES-256 加密服务
 * 用于安全存储敏感信息（如 API Keys）
 */

// 从环境变量获取加密密钥
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY

  if (!key) {
    throw new Error('ENCRYPTION_KEY is not configured in environment variables')
  }

  return key
}

/**
 * 使用 AES-256 加密文本
 * @param text 要加密的明文
 * @returns 加密后的密文
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const encrypted = CryptoJS.AES.encrypt(text, key).toString()
    return encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * 使用 AES-256 解密文本
 * @param encryptedText 要解密的密文
 * @returns 解密后的明文
 * @throws Error 如果解密失败（可能是密钥不匹配或数据损坏）
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new Error('Invalid encrypted text: empty or not a string')
    }

    const key = getEncryptionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key)
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8)

    if (!plaintext) {
      throw new Error('Decryption resulted in empty string - likely wrong encryption key or corrupted data')
    }

    return plaintext
  } catch (error) {
    if (error instanceof Error) {
      console.error('Decryption error:', error.message)
      throw error
    }
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * 从 API Key 提取前缀用于显示
 * @param apiKey 完整的 API key
 * @param prefixLength 前缀长度，默认 8
 * @returns 前缀（如 sk-ant-***）
 */
export function getKeyPrefix(apiKey: string, prefixLength: number = 8): string {
  if (!apiKey || apiKey.length < prefixLength) {
    return '***'
  }

  return `${apiKey.substring(0, prefixLength)}***`
}

/**
 * 验证加密密钥是否配置正确
 * @returns 是否配置正确
 */
export function validateEncryptionKey(): boolean {
  try {
    const key = getEncryptionKey()
    return key.length >= 32 // AES-256 requires at least 32 characters
  } catch {
    return false
  }
}
