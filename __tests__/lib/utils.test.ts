/**
 * 工具函数测试
 *
 * 测试范围：
 * - cn 函数（Tailwind CSS 类名合并）
 */

import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  describe('基本功能', () => {
    it('应该合并多个类名', () => {
      const result = cn('foo', 'bar', 'baz')
      expect(result).toBe('foo bar baz')
    })

    it('应该处理单个类名', () => {
      const result = cn('foo')
      expect(result).toBe('foo')
    })

    it('应该处理空输入', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })

  describe('条件类名（clsx功能）', () => {
    it('应该处理对象形式的条件类名', () => {
      const result = cn({
        foo: true,
        bar: false,
        baz: true,
      })
      expect(result).toBe('foo baz')
    })

    it('应该处理混合形式', () => {
      const result = cn('foo', { bar: true, baz: false }, 'qux')
      expect(result).toBe('foo bar qux')
    })

    it('应该过滤假值', () => {
      const result = cn('foo', false, null, undefined, 0, '', 'bar')
      expect(result).toBe('foo bar')
    })

    it('应该处理数组', () => {
      const result = cn(['foo', 'bar'], 'baz')
      expect(result).toBe('foo bar baz')
    })

    it('应该处理嵌套数组', () => {
      const result = cn('foo', ['bar', ['baz', 'qux']])
      expect(result).toContain('foo')
      expect(result).toContain('bar')
      expect(result).toContain('baz')
      expect(result).toContain('qux')
    })
  })

  describe('Tailwind 冲突处理（tailwind-merge功能）', () => {
    it('应该处理相同属性的冲突类（后者优先）', () => {
      const result = cn('px-2 px-4')
      // tailwind-merge 会只保留最后一个 padding-x 类
      expect(result).toBe('px-4')
    })

    it('应该处理背景色冲突', () => {
      const result = cn('bg-red-500 bg-blue-500')
      expect(result).toBe('bg-blue-500')
    })

    it('应该处理文字大小冲突', () => {
      const result = cn('text-sm text-lg')
      expect(result).toBe('text-lg')
    })

    it('应该保留不冲突的类', () => {
      const result = cn('px-2 py-4 px-6')
      expect(result).toContain('py-4')
      expect(result).toContain('px-6')
      expect(result).not.toContain('px-2')
    })

    it('应该处理响应式类的冲突', () => {
      const result = cn('sm:px-2 sm:px-4')
      expect(result).toBe('sm:px-4')
    })

    it('应该正确处理不同断点的类（不冲突）', () => {
      const result = cn('sm:px-2 md:px-4')
      expect(result).toContain('sm:px-2')
      expect(result).toContain('md:px-4')
    })

    it('应该处理伪类的冲突', () => {
      const result = cn('hover:bg-red-500 hover:bg-blue-500')
      expect(result).toBe('hover:bg-blue-500')
    })
  })

  describe('实际使用场景', () => {
    it('应该处理按钮组件的动态类名', () => {
      const isPrimary = true
      const isDisabled = false

      const result = cn(
        'px-4 py-2 rounded',
        {
          'bg-blue-500 text-white': isPrimary,
          'bg-gray-200 text-gray-800': !isPrimary,
          'opacity-50 cursor-not-allowed': isDisabled,
        }
      )

      expect(result).toContain('px-4')
      expect(result).toContain('py-2')
      expect(result).toContain('rounded')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('text-white')
      expect(result).not.toContain('opacity-50')
    })

    it('应该处理卡片组件的条件样式', () => {
      const isSelected = true
      const hasError = false

      const result = cn(
        'border rounded-lg p-4',
        {
          'border-blue-500 bg-blue-50': isSelected,
          'border-gray-200': !isSelected,
          'border-red-500 bg-red-50': hasError,
        }
      )

      expect(result).toContain('rounded-lg')
      expect(result).toContain('p-4')
      expect(result).toContain('border-blue-500')
      expect(result).not.toContain('border-gray-200')
      expect(result).not.toContain('border-red-500')
    })

    it('应该处理覆盖默认样式的场景', () => {
      const defaultClasses = 'bg-gray-100 text-gray-900 px-4'
      const customClasses = 'bg-blue-500 text-white'

      const result = cn(defaultClasses, customClasses)

      // 自定义样式应该覆盖默认样式
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('text-white')
      expect(result).toContain('px-4') // 不冲突的类应该保留
      expect(result).not.toContain('bg-gray-100')
      expect(result).not.toContain('text-gray-900')
    })

    it('应该处理复杂的组合场景', () => {
      const baseStyles = 'flex items-center gap-2'
      const sizeStyles = { 'px-3 py-1.5': true }
      const variantStyles = 'bg-blue-500'
      const stateStyles = { 'hover:bg-blue-600': true, 'disabled:opacity-50': false }

      const result = cn(baseStyles, sizeStyles, variantStyles, stateStyles)

      expect(result).toContain('flex')
      expect(result).toContain('items-center')
      expect(result).toContain('gap-2')
      expect(result).toContain('px-3')
      expect(result).toContain('py-1.5')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('hover:bg-blue-600')
      expect(result).not.toContain('disabled:opacity-50')
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const result = cn('', '', '')
      expect(result).toBe('')
    })

    it('应该处理只包含空格的字符串', () => {
      const result = cn('  ', '   ')
      expect(result).toBe('')
    })

    it('应该处理重复的类名', () => {
      // clsx 不会自动去除非Tailwind的重复类名
      const result = cn('foo foo bar bar')
      expect(result).toBe('foo foo bar bar')
    })

    it('应该处理带额外空格的类名', () => {
      const result = cn('  foo   bar  ')
      expect(result).toBe('foo bar')
    })

    it('应该处理空对象', () => {
      const result = cn({})
      expect(result).toBe('')
    })

    it('应该处理空数组', () => {
      const result = cn([])
      expect(result).toBe('')
    })

    it('应该处理大量类名', () => {
      const classes = Array.from({ length: 100 }, (_, i) => `class-${i}`)
      const result = cn(...classes)

      expect(result).toContain('class-0')
      expect(result).toContain('class-99')
    })

    it('应该处理特殊字符', () => {
      const result = cn('foo-bar', 'baz_qux', 'test:hover', 'sm/md:flex')
      expect(result).toContain('foo-bar')
      expect(result).toContain('baz_qux')
      expect(result).toContain('test:hover')
      expect(result).toContain('sm/md:flex')
    })
  })

  describe('类型安全', () => {
    it('应该接受字符串', () => {
      expect(() => cn('foo')).not.toThrow()
    })

    it('应该接受对象', () => {
      expect(() => cn({ foo: true })).not.toThrow()
    })

    it('应该接受数组', () => {
      expect(() => cn(['foo', 'bar'])).not.toThrow()
    })

    it('应该接受混合类型', () => {
      expect(() => cn('foo', { bar: true }, ['baz'])).not.toThrow()
    })

    it('应该接受 undefined', () => {
      expect(() => cn(undefined)).not.toThrow()
    })

    it('应该接受 null', () => {
      expect(() => cn(null)).not.toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该快速处理大量类名', () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        cn(
          'base-class',
          { 'conditional-1': true, 'conditional-2': false },
          'another-class',
          ['array-class-1', 'array-class-2']
        )
      }

      const duration = performance.now() - start

      // 1000次调用应该在100ms以内完成
      expect(duration).toBeLessThan(100)
    })
  })
})
