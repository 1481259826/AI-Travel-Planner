/**
 * 日志工具
 * 提供统一的日志记录接口，支持不同级别的日志
 * 在开发环境输出到控制台，生产环境可发送到日志服务
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: Error
}

/**
 * 日志配置
 */
interface LoggerConfig {
  /** 是否启用日志（默认：开发环境启用，生产环境禁用 debug/info） */
  enabled: boolean
  /** 最小日志级别 */
  minLevel: LogLevel
  /** 是否在控制台输出 */
  console: boolean
  /** 是否发送到远程服务（生产环境） */
  remote: boolean
  /** 远程日志服务 URL */
  remoteUrl?: string
}

class Logger {
  private config: LoggerConfig
  private isDev: boolean

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development'

    this.config = {
      enabled: true,
      minLevel: this.isDev ? 'debug' : 'warn',
      console: true,
      remote: false,
      remoteUrl: process.env.NEXT_PUBLIC_LOG_SERVICE_URL,
    }
  }

  /**
   * 更新日志配置
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * 检查日志级别是否应该被记录
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(level)
    const minLevelIndex = levels.indexOf(this.config.minLevel)

    return currentLevelIndex >= minLevelIndex
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    const levelUpper = level.toUpperCase().padEnd(5)
    return `[${timestamp}] [${levelUpper}] ${message}`
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }
  }

  /**
   * 发送日志到远程服务
   */
  private async sendToRemote(entry: LogEntry) {
    if (!this.config.remote || !this.config.remoteUrl) return

    try {
      await fetch(this.config.remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // 静默失败，避免日志系统本身导致应用崩溃
      console.error('Failed to send log to remote service:', error)
    }
  }

  /**
   * 核心日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ) {
    if (!this.shouldLog(level)) return

    const entry = this.createLogEntry(level, message, context, error)

    // 控制台输出
    if (this.config.console) {
      const formattedMessage = this.formatMessage(level, message)

      switch (level) {
        case 'debug':
          console.debug(formattedMessage, context || '', error || '')
          break
        case 'info':
          console.info(formattedMessage, context || '', error || '')
          break
        case 'warn':
          console.warn(formattedMessage, context || '', error || '')
          break
        case 'error':
          console.error(formattedMessage, context || '', error || '')
          if (error?.stack) {
            console.error('Stack trace:', error.stack)
          }
          break
      }
    }

    // 发送到远程服务（异步，不阻塞）
    if (level === 'error' || level === 'warn') {
      this.sendToRemote(entry).catch(() => {
        // 静默失败
      })
    }
  }

  /**
   * 调试日志（仅开发环境）
   * 用于调试信息，不会出现在生产环境
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }

  /**
   * 信息日志
   * 用于一般性信息输出
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  /**
   * 警告日志
   * 用于潜在问题，但不影响正常运行
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  /**
   * 错误日志
   * 用于错误情况，可能影响功能
   */
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error)
  }

  /**
   * 创建带上下文的子 Logger
   * 用于模块化日志记录
   */
  createChild(moduleName: string): ChildLogger {
    return new ChildLogger(this, moduleName)
  }
}

/**
 * 子 Logger
 * 自动添加模块名称到日志消息
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private moduleName: string
  ) {}

  private formatMessage(message: string): string {
    return `[${this.moduleName}] ${message}`
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.parent.debug(this.formatMessage(message), context)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.parent.info(this.formatMessage(message), context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.parent.warn(this.formatMessage(message), context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.parent.error(this.formatMessage(message), error, context)
  }
}

// 导出全局 logger 实例
export const logger = new Logger()

// 导出类型
export type { LogLevel, LogEntry, LoggerConfig }

// 使用示例导出
export const exampleUsage = {
  basic: () => {
    logger.debug('This is a debug message')
    logger.info('User logged in', { userId: '123', email: 'user@example.com' })
    logger.warn('API rate limit approaching', { currentRate: 95, limit: 100 })
    logger.error('Failed to save data', new Error('Database connection failed'), {
      operation: 'save',
      table: 'trips',
    })
  },

  withChild: () => {
    const apiLogger = logger.createChild('API')
    apiLogger.info('Request received', { method: 'POST', path: '/api/trips' })
    apiLogger.error('Request failed', new Error('Validation error'))
  },
}
