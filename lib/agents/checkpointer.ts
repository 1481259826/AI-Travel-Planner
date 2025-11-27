/**
 * LangGraph PostgreSQL Checkpointer 模块
 *
 * 提供生产级的检查点持久化功能，支持：
 * - 工作流状态保存和恢复
 * - 中断后继续执行
 * - 多实例部署时的状态共享
 */

import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { MemorySaver } from '@langchain/langgraph'
import { Pool, PoolConfig } from 'pg'
import { appConfig } from '@/lib/config'
import { logger } from '@/lib/logger'

// ============================================================================
// 类型定义
// ============================================================================

export type CheckpointerType = 'memory' | 'postgres'

export interface CheckpointerConfig {
  /** 检查点存储类型 */
  type: CheckpointerType
  /** PostgreSQL 连接字符串（仅 postgres 类型需要） */
  connectionString?: string
  /** PostgreSQL 连接池配置 */
  poolConfig?: PoolConfig
}

// ============================================================================
// 模块状态
// ============================================================================

let postgresPool: Pool | null = null
let postgresSaver: PostgresSaver | null = null
let memorySaver: MemorySaver | null = null
let isInitialized = false

// ============================================================================
// 获取数据库连接字符串
// ============================================================================

/**
 * 从环境变量获取 PostgreSQL 连接字符串
 *
 * 优先级：
 * 1. DATABASE_URL（直接 PostgreSQL 连接）
 * 2. 从 Supabase URL 构造连接字符串
 */
function getDatabaseUrl(): string | null {
  // 优先使用 DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    return databaseUrl
  }

  // 尝试从 Supabase 配置构造
  // Supabase 的数据库连接格式通常是：
  // postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  const supabaseDbUrl = process.env.SUPABASE_DB_URL
  if (supabaseDbUrl) {
    return supabaseDbUrl
  }

  logger.warn(
    'Checkpointer',
    'No PostgreSQL connection string found. Set DATABASE_URL or SUPABASE_DB_URL environment variable.'
  )
  return null
}

// ============================================================================
// Checkpointer 工厂函数
// ============================================================================

/**
 * 创建 Memory Checkpointer
 * 用于开发和测试环境
 */
function createMemoryCheckpointer(): MemorySaver {
  if (!memorySaver) {
    memorySaver = new MemorySaver()
    logger.info('Checkpointer', 'Memory checkpointer created')
  }
  return memorySaver
}

/**
 * 创建 PostgreSQL Checkpointer
 * 用于生产环境
 */
async function createPostgresCheckpointer(
  connectionString?: string
): Promise<PostgresSaver> {
  if (postgresSaver && postgresPool) {
    return postgresSaver
  }

  const dbUrl = connectionString || getDatabaseUrl()
  if (!dbUrl) {
    throw new Error(
      'PostgreSQL connection string not found. Please set DATABASE_URL or SUPABASE_DB_URL.'
    )
  }

  try {
    // 创建连接池
    postgresPool = new Pool({
      connectionString: dbUrl,
      max: 10, // 最大连接数
      idleTimeoutMillis: 30000, // 空闲连接超时
      connectionTimeoutMillis: 10000, // 连接超时
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    })

    // 测试连接
    const client = await postgresPool.connect()
    await client.query('SELECT 1')
    client.release()

    logger.info('Checkpointer', 'PostgreSQL connection established')

    // 创建 PostgresSaver
    postgresSaver = PostgresSaver.fromConnString(dbUrl)

    // 设置表（如果不存在）
    await postgresSaver.setup()

    logger.info('Checkpointer', 'PostgreSQL checkpointer initialized')
    isInitialized = true

    return postgresSaver
  } catch (error) {
    logger.error('Checkpointer', error as Error, {
      context: 'Failed to create PostgreSQL checkpointer',
    })
    throw error
  }
}

// ============================================================================
// 导出 API
// ============================================================================

/**
 * 获取 Checkpointer 实例
 *
 * @param config 配置选项
 * @returns Checkpointer 实例
 *
 * @example
 * ```typescript
 * // 使用默认配置（根据环境自动选择）
 * const checkpointer = await getCheckpointer()
 *
 * // 指定使用 PostgreSQL
 * const checkpointer = await getCheckpointer({ type: 'postgres' })
 *
 * // 指定使用 Memory（开发/测试）
 * const checkpointer = await getCheckpointer({ type: 'memory' })
 * ```
 */
export async function getCheckpointer(
  config?: Partial<CheckpointerConfig>
): Promise<PostgresSaver | MemorySaver> {
  // 确定检查点类型
  const checkpointerType =
    config?.type ||
    (process.env.LANGGRAPH_CHECKPOINTER as CheckpointerType) ||
    (appConfig.isProd ? 'postgres' : 'memory')

  if (checkpointerType === 'postgres') {
    return createPostgresCheckpointer(config?.connectionString)
  }

  return createMemoryCheckpointer()
}

/**
 * 检查 Checkpointer 是否已初始化
 */
export function isCheckpointerInitialized(): boolean {
  return isInitialized
}

/**
 * 获取当前 Checkpointer 类型
 */
export function getCheckpointerType(): CheckpointerType {
  if (postgresSaver) return 'postgres'
  if (memorySaver) return 'memory'
  return appConfig.isProd ? 'postgres' : 'memory'
}

/**
 * 关闭 Checkpointer 连接
 * 在应用关闭时调用
 */
export async function closeCheckpointer(): Promise<void> {
  if (postgresPool) {
    await postgresPool.end()
    postgresPool = null
    postgresSaver = null
    logger.info('Checkpointer', 'PostgreSQL connection pool closed')
  }

  memorySaver = null
  isInitialized = false
}

/**
 * 清理旧的检查点数据
 * 建议定期调用以释放存储空间
 *
 * @param daysToKeep 保留天数，默认 7 天
 * @returns 删除的记录数
 */
export async function cleanupOldCheckpoints(
  daysToKeep: number = 7
): Promise<number> {
  if (!postgresPool) {
    logger.warn(
      'Checkpointer',
      'Cannot cleanup: PostgreSQL checkpointer not initialized'
    )
    return 0
  }

  try {
    const result = await postgresPool.query(
      'SELECT cleanup_old_checkpoints($1)',
      [daysToKeep]
    )
    const deletedCount = result.rows[0]?.cleanup_old_checkpoints || 0

    logger.info('Checkpointer', `Cleaned up ${deletedCount} old checkpoints`)
    return deletedCount
  } catch (error) {
    logger.error('Checkpointer', error as Error, {
      context: 'Failed to cleanup old checkpoints',
    })
    throw error
  }
}

// ============================================================================
// 默认导出
// ============================================================================

export default {
  getCheckpointer,
  closeCheckpointer,
  cleanupOldCheckpoints,
  isCheckpointerInitialized,
  getCheckpointerType,
}
