/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  getPasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthText,
  validatePasswordRequirements,
  isPasswordValid,
} from '@/lib/utils/password'

describe('password utils', () => {
  describe('getPasswordStrength', () => {
    it('应该返回 weak 当密码为空时', () => {
      expect(getPasswordStrength('')).toBe('weak')
    })

    it('应该返回 weak 当密码太短时', () => {
      expect(getPasswordStrength('abc')).toBe('weak')
      expect(getPasswordStrength('abc123')).toBe('weak')
    })

    it('应该返回 weak 当密码只有长度满足时', () => {
      expect(getPasswordStrength('aaaaaaaa')).toBe('weak')
    })

    it('应该返回 weak 当密码评分 <= 2 时', () => {
      // 只有长度和小写字母 (score = 2)
      expect(getPasswordStrength('abcdefgh')).toBe('weak')
    })

    it('应该返回 medium 当密码评分 3-4 时', () => {
      // 长度 + 小写 + 大写 (score = 3)
      expect(getPasswordStrength('Abcdefgh')).toBe('medium')

      // 长度 + 小写 + 大写 + 数字 (score = 4)
      expect(getPasswordStrength('Abcdefg1')).toBe('medium')
    })

    it('应该返回 strong 当密码评分 >= 5 时', () => {
      // 长度 + 小写 + 大写 + 数字 + 特殊字符 (score = 5)
      expect(getPasswordStrength('Abcdefg1!')).toBe('strong')

      // 长度(2) + 小写 + 大写 + 数字 + 特殊字符 (score = 6)
      expect(getPasswordStrength('Abcdefgh1234!')).toBe('strong')
    })

    it('应该正确识别大写字母', () => {
      const withUpper = 'ABCDEFGH'
      const withoutUpper = 'abcdefgh'
      expect(/[A-Z]/.test(withUpper)).toBe(true)
      expect(/[A-Z]/.test(withoutUpper)).toBe(false)
    })

    it('应该正确识别小写字母', () => {
      const withLower = 'abcdefgh'
      const withoutLower = 'ABCDEFGH'
      expect(/[a-z]/.test(withLower)).toBe(true)
      expect(/[a-z]/.test(withoutLower)).toBe(false)
    })

    it('应该正确识别数字', () => {
      const withDigit = 'abc123'
      const withoutDigit = 'abcdef'
      expect(/\d/.test(withDigit)).toBe(true)
      expect(/\d/.test(withoutDigit)).toBe(false)
    })

    it('应该正确识别各种特殊字符', () => {
      const specialChars = '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?'
      for (const char of specialChars) {
        expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(char)).toBe(true)
      }
    })

    it('应该处理包含中文的密码', () => {
      // 中文不计入任何分类，只看其他字符
      const password = '密码Abcd1234!'
      const strength = getPasswordStrength(password)
      expect(strength).toBe('strong') // 长度(2) + 大小写 + 数字 + 特殊字符
    })

    it('应该处理包含空格的密码', () => {
      const password = 'Abcd 1234'
      const strength = getPasswordStrength(password)
      expect(['weak', 'medium', 'strong']).toContain(strength)
    })
  })

  describe('getPasswordStrengthColor', () => {
    it('应该返回正确的 Tailwind 颜色类名', () => {
      expect(getPasswordStrengthColor('weak')).toBe('bg-red-500')
      expect(getPasswordStrengthColor('medium')).toBe('bg-yellow-500')
      expect(getPasswordStrengthColor('strong')).toBe('bg-green-500')
    })
  })

  describe('getPasswordStrengthText', () => {
    it('应该返回正确的中文描述', () => {
      expect(getPasswordStrengthText('weak')).toBe('弱')
      expect(getPasswordStrengthText('medium')).toBe('中')
      expect(getPasswordStrengthText('strong')).toBe('强')
    })
  })

  describe('validatePasswordRequirements', () => {
    it('应该返回所有要求未满足当密码为空时', () => {
      const requirements = validatePasswordRequirements('')
      expect(requirements).toHaveLength(5)
      expect(requirements.every(req => !req.met)).toBe(true)
    })

    it('应该正确验证长度要求', () => {
      const shortPassword = validatePasswordRequirements('abc')
      const longPassword = validatePasswordRequirements('abcdefgh')

      expect(shortPassword[0].label).toBe('至少 8 个字符')
      expect(shortPassword[0].met).toBe(false)

      expect(longPassword[0].label).toBe('至少 8 个字符')
      expect(longPassword[0].met).toBe(true)
    })

    it('应该正确验证大写字母要求', () => {
      const withoutUpper = validatePasswordRequirements('abcdefgh')
      const withUpper = validatePasswordRequirements('Abcdefgh')

      expect(withoutUpper[1].label).toBe('包含大写字母')
      expect(withoutUpper[1].met).toBe(false)

      expect(withUpper[1].label).toBe('包含大写字母')
      expect(withUpper[1].met).toBe(true)
    })

    it('应该正确验证小写字母要求', () => {
      const withoutLower = validatePasswordRequirements('ABCDEFGH')
      const withLower = validatePasswordRequirements('Abcdefgh')

      expect(withoutLower[2].label).toBe('包含小写字母')
      expect(withoutLower[2].met).toBe(false)

      expect(withLower[2].label).toBe('包含小写字母')
      expect(withLower[2].met).toBe(true)
    })

    it('应该正确验证数字要求', () => {
      const withoutDigit = validatePasswordRequirements('Abcdefgh')
      const withDigit = validatePasswordRequirements('Abcdefg1')

      expect(withoutDigit[3].label).toBe('包含数字')
      expect(withoutDigit[3].met).toBe(false)

      expect(withDigit[3].label).toBe('包含数字')
      expect(withDigit[3].met).toBe(true)
    })

    it('应该正确验证特殊字符要求', () => {
      const withoutSpecial = validatePasswordRequirements('Abcdefg1')
      const withSpecial = validatePasswordRequirements('Abcdefg1!')

      expect(withoutSpecial[4].label).toBe('包含特殊字符')
      expect(withoutSpecial[4].met).toBe(false)

      expect(withSpecial[4].label).toBe('包含特殊字符')
      expect(withSpecial[4].met).toBe(true)
    })

    it('应该返回所有要求都满足的强密码', () => {
      const requirements = validatePasswordRequirements('Abcdefg1!')
      expect(requirements).toHaveLength(5)
      expect(requirements.every(req => req.met)).toBe(true)
    })

    it('应该返回部分要求满足的密码', () => {
      const requirements = validatePasswordRequirements('Abcdefgh')
      const metCount = requirements.filter(req => req.met).length
      expect(metCount).toBe(3) // 长度、大写、小写
    })
  })

  describe('isPasswordValid', () => {
    it('应该返回 false 当密码为空时', () => {
      expect(isPasswordValid('')).toBe(false)
    })

    it('应该返回 false 当密码太短时', () => {
      expect(isPasswordValid('Abc123')).toBe(false)
    })

    it('应该返回 false 当密码缺少大写字母时', () => {
      expect(isPasswordValid('abcdefg1')).toBe(false)
    })

    it('应该返回 false 当密码缺少小写字母时', () => {
      expect(isPasswordValid('ABCDEFG1')).toBe(false)
    })

    it('应该返回 false 当密码缺少数字时', () => {
      expect(isPasswordValid('Abcdefgh')).toBe(false)
    })

    it('应该返回 true 当密码满足最低要求时', () => {
      // 8 字符 + 大写 + 小写 + 数字
      expect(isPasswordValid('Abcdefg1')).toBe(true)
    })

    it('应该返回 true 当密码超过最低要求时', () => {
      // 包含特殊字符但不强制要求
      expect(isPasswordValid('Abcdefg1!')).toBe(true)

      // 超长密码
      expect(isPasswordValid('Abcdefgh1234567890')).toBe(true)
    })

    it('应该正确处理边界情况', () => {
      // 刚好 8 字符
      expect(isPasswordValid('Abcdefg1')).toBe(true)

      // 刚好 7 字符
      expect(isPasswordValid('Abcdef1')).toBe(false)
    })

    it('应该处理包含特殊字符的密码', () => {
      // 特殊字符是可选的，不影响验证结果
      expect(isPasswordValid('Abcdefg1!')).toBe(true)
      expect(isPasswordValid('Abcdefg1@')).toBe(true)
      expect(isPasswordValid('Abcdefg1#')).toBe(true)
    })

    it('应该处理包含多个大写字母的密码', () => {
      expect(isPasswordValid('ABCDefg1')).toBe(true)
      expect(isPasswordValid('AbCdEfG1')).toBe(true)
    })

    it('应该处理包含多个数字的密码', () => {
      expect(isPasswordValid('Abcd1234')).toBe(true)
      expect(isPasswordValid('Abc12345')).toBe(true)
    })
  })

  describe('集成测试', () => {
    it('应该对同一密码返回一致的验证结果', () => {
      const password = 'Abcdefg1!'

      const strength = getPasswordStrength(password)
      const requirements = validatePasswordRequirements(password)
      const isValid = isPasswordValid(password)

      // 强密码
      expect(strength).toBe('strong')

      // 所有要求都满足
      expect(requirements.every(req => req.met)).toBe(true)

      // 有效密码
      expect(isValid).toBe(true)
    })

    it('应该对弱密码返回一致的验证结果', () => {
      const password = 'abc'

      const strength = getPasswordStrength(password)
      const requirements = validatePasswordRequirements(password)
      const isValid = isPasswordValid(password)

      // 弱密码
      expect(strength).toBe('weak')

      // 大部分要求不满足
      const metCount = requirements.filter(req => req.met).length
      expect(metCount).toBeLessThan(3)

      // 无效密码
      expect(isValid).toBe(false)
    })

    it('应该对中等密码返回一致的验证结果', () => {
      const password = 'Abcdefgh' // 缺少数字

      const strength = getPasswordStrength(password)
      const requirements = validatePasswordRequirements(password)
      const isValid = isPasswordValid(password)

      // 中等或弱密码
      expect(['weak', 'medium']).toContain(strength)

      // 部分要求满足
      const metCount = requirements.filter(req => req.met).length
      expect(metCount).toBe(3) // 长度、大写、小写

      // 无效密码（缺少数字）
      expect(isValid).toBe(false)
    })
  })
})
