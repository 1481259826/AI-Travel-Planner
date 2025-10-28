import type { PasswordStrength, PasswordRequirement } from '@/types'

/**
 * 计算密码强度
 * @param password 密码
 * @returns 强度等级：weak, medium, strong
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak'

  let score = 0

  // 长度检查
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // 包含小写字母
  if (/[a-z]/.test(password)) score++

  // 包含大写字母
  if (/[A-Z]/.test(password)) score++

  // 包含数字
  if (/\d/.test(password)) score++

  // 包含特殊字符
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

/**
 * 获取密码强度颜色
 * @param strength 强度等级
 * @returns Tailwind 颜色类名
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'strong':
      return 'bg-green-500'
  }
}

/**
 * 获取密码强度文本
 * @param strength 强度等级
 * @returns 中文描述
 */
export function getPasswordStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '弱'
    case 'medium':
      return '中'
    case 'strong':
      return '强'
  }
}

/**
 * 验证密码是否满足各项要求
 * @param password 密码
 * @returns 要求列表及是否满足
 */
export function validatePasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: '至少 8 个字符',
      met: password.length >= 8,
    },
    {
      label: '包含大写字母',
      met: /[A-Z]/.test(password),
    },
    {
      label: '包含小写字母',
      met: /[a-z]/.test(password),
    },
    {
      label: '包含数字',
      met: /\d/.test(password),
    },
    {
      label: '包含特殊字符',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ]
}

/**
 * 验证密码是否符合最低要求
 * @param password 密码
 * @returns 是否有效
 */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  )
}
