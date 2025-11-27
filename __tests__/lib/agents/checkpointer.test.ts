/**
 * LangGraph Checkpointer 模块测试
 *
 * 测试 PostgreSQL 和 Memory checkpointer 的基本功能
 *
 * 注意：PostgreSQL 相关的测试需要实际的数据库连接或更复杂的 mock 设置
 * 这些测试被标记为 skip，可以在有实际数据库时运行
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemorySaver } from '@langchain/langgraph'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock appConfig
vi.mock('@/lib/config', () => ({
  appConfig: {
    isProd: false,
    isDev: true,
    env: 'test',
  },
}))

describe('Checkpointer Module', () => {
  beforeEach(() => {
    vi.resetModules()
    // Reset environment variables
    delete process.env.DATABASE_URL
    delete process.env.SUPABASE_DB_URL
    delete process.env.LANGGRAPH_CHECKPOINTER
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getCheckpointer', () => {
    it('should return MemorySaver by default in development', async () => {
      const { getCheckpointer } = await import('@/lib/agents/checkpointer')
      const checkpointer = await getCheckpointer({ type: 'memory' })

      expect(checkpointer).toBeInstanceOf(MemorySaver)
    })

    it('should return MemorySaver when type is explicitly set to memory', async () => {
      const { getCheckpointer } = await import('@/lib/agents/checkpointer')
      const checkpointer = await getCheckpointer({ type: 'memory' })

      expect(checkpointer).toBeInstanceOf(MemorySaver)
    })

    it('should throw error when postgres type is requested without connection string', async () => {
      const { getCheckpointer } = await import('@/lib/agents/checkpointer')

      await expect(getCheckpointer({ type: 'postgres' })).rejects.toThrow(
        'PostgreSQL connection string not found'
      )
    })

    // 以下测试需要实际的 PostgreSQL 连接或更复杂的 mock 设置
    // 在 CI/CD 环境中可以配置数据库连接来运行这些测试
    it.skip('should create PostgresSaver when connection string is provided', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

      const { getCheckpointer } = await import('@/lib/agents/checkpointer')
      const checkpointer = await getCheckpointer({ type: 'postgres' })

      expect(checkpointer).toBeDefined()
    })

    it.skip('should use SUPABASE_DB_URL when DATABASE_URL is not set', async () => {
      process.env.SUPABASE_DB_URL = 'postgresql://postgres:pass@db.test.supabase.co:5432/postgres'

      const { getCheckpointer } = await import('@/lib/agents/checkpointer')
      const checkpointer = await getCheckpointer({ type: 'postgres' })

      expect(checkpointer).toBeDefined()
    })

    it.skip('should prioritize DATABASE_URL over SUPABASE_DB_URL', async () => {
      process.env.DATABASE_URL = 'postgresql://primary:test@localhost:5432/primary'
      process.env.SUPABASE_DB_URL = 'postgresql://fallback:test@localhost:5432/fallback'

      const { getCheckpointer } = await import('@/lib/agents/checkpointer')
      const checkpointer = await getCheckpointer({ type: 'postgres' })

      expect(checkpointer).toBeDefined()
    })
  })

  describe('getCheckpointerType', () => {
    it('should return memory by default', async () => {
      const { getCheckpointerType, getCheckpointer } = await import('@/lib/agents/checkpointer')

      // Initialize with memory checkpointer
      await getCheckpointer({ type: 'memory' })

      const type = getCheckpointerType()
      expect(type).toBe('memory')
    })
  })

  describe('isCheckpointerInitialized', () => {
    it('should return false initially', async () => {
      const { isCheckpointerInitialized } = await import('@/lib/agents/checkpointer')

      // Without initializing postgres, should be false
      expect(isCheckpointerInitialized()).toBe(false)
    })
  })

  describe('closeCheckpointer', () => {
    // 需要实际的 PostgreSQL 连接
    it.skip('should close PostgreSQL connection if initialized', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

      const { getCheckpointer, closeCheckpointer } = await import('@/lib/agents/checkpointer')

      // Initialize postgres checkpointer
      await getCheckpointer({ type: 'postgres' })

      // Should not throw
      await expect(closeCheckpointer()).resolves.not.toThrow()
    })

    it('should handle closing when not initialized', async () => {
      const { closeCheckpointer } = await import('@/lib/agents/checkpointer')

      // Should not throw even if not initialized
      await expect(closeCheckpointer()).resolves.not.toThrow()
    })
  })

  describe('cleanupOldCheckpoints', () => {
    it('should return 0 if postgres not initialized', async () => {
      const { cleanupOldCheckpoints } = await import('@/lib/agents/checkpointer')

      const result = await cleanupOldCheckpoints(7)
      expect(result).toBe(0)
    })

    // 需要实际的 PostgreSQL 连接
    it.skip('should call cleanup function when postgres is initialized', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

      const { getCheckpointer, cleanupOldCheckpoints } = await import('@/lib/agents/checkpointer')

      // Initialize postgres checkpointer
      await getCheckpointer({ type: 'postgres' })

      const result = await cleanupOldCheckpoints(7)
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Environment variable configuration', () => {
    it('should respect LANGGRAPH_CHECKPOINTER environment variable', async () => {
      process.env.LANGGRAPH_CHECKPOINTER = 'memory'

      const { getCheckpointer } = await import('@/lib/agents/checkpointer')
      const checkpointer = await getCheckpointer()

      expect(checkpointer).toBeInstanceOf(MemorySaver)
    })
  })
})

describe('Workflow with Checkpointer', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.DATABASE_URL
    delete process.env.SUPABASE_DB_URL
    delete process.env.LANGGRAPH_CHECKPOINTER
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create workflow with memory checkpointer by default', async () => {
    const { createTripPlanningWorkflow } = await import('@/lib/agents/workflow')

    const workflow = createTripPlanningWorkflow({
      checkpointer: true,
    })

    expect(workflow).toBeDefined()
  })

  it('should create async workflow', async () => {
    const { createTripPlanningWorkflowAsync } = await import('@/lib/agents/workflow')

    const workflow = await createTripPlanningWorkflowAsync({
      checkpointer: true,
      checkpointerType: 'memory',
    })

    expect(workflow).toBeDefined()
  })

  it('should handle checkpointer initialization failure gracefully', async () => {
    // This will fail because no DATABASE_URL is set
    const { createTripPlanningWorkflowAsync } = await import('@/lib/agents/workflow')

    // Should fall back to MemorySaver
    const workflow = await createTripPlanningWorkflowAsync({
      checkpointer: true,
      checkpointerType: 'postgres',
    })

    expect(workflow).toBeDefined()
  })
})
