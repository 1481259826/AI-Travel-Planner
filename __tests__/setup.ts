/**
 * Vitest 全局测试配置
 * 在所有测试文件之前运行
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// 每个测试后自动清理 React 组件
afterEach(() => {
  cleanup()
})

// 配置环境变量（测试环境）
process.env.ENCRYPTION_KEY = 'test-encryption-key-with-exactly-32-characters!!'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
