/**
 * LangGraph 工作流追踪器
 * 支持多种追踪后端：LangSmith、Console、JSON 文件
 * Phase 5.3: LangGraph Tracing 实现
 */

import { logger } from '@/lib/logger'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 追踪后端类型
 */
export type TracerType = 'langsmith' | 'console' | 'json' | 'none'

/**
 * 追踪 Span 类型
 */
export type SpanType = 'workflow' | 'node' | 'tool' | 'llm' | 'retriever'

/**
 * Span 状态
 */
export type SpanStatus = 'running' | 'completed' | 'error'

/**
 * 追踪 Span 数据
 */
export interface TraceSpan {
  /** Span ID */
  id: string
  /** 父 Span ID */
  parentId?: string
  /** Trace ID (整个工作流的唯一标识) */
  traceId: string
  /** Span 名称 */
  name: string
  /** Span 类型 */
  type: SpanType
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime?: number
  /** 持续时间 (ms) */
  duration?: number
  /** 状态 */
  status: SpanStatus
  /** 输入数据 */
  input?: unknown
  /** 输出数据 */
  output?: unknown
  /** 错误信息 */
  error?: string
  /** 元数据 */
  metadata?: Record<string, unknown>
  /** Token 使用统计 */
  tokenUsage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * 完整的追踪记录
 */
export interface TraceRecord {
  /** Trace ID */
  id: string
  /** 工作流名称 */
  workflowName: string
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime?: number
  /** 持续时间 (ms) */
  duration?: number
  /** 状态 */
  status: SpanStatus
  /** 用户输入 */
  input?: unknown
  /** 最终输出 */
  output?: unknown
  /** 所有 Span */
  spans: TraceSpan[]
  /** 元数据 */
  metadata?: Record<string, unknown>
  /** 错误信息 */
  error?: string
}

/**
 * 追踪器配置
 */
export interface TracerConfig {
  /** 追踪后端类型 */
  type: TracerType
  /** 是否启用 */
  enabled: boolean
  /** LangSmith API Key */
  langsmithApiKey?: string
  /** LangSmith 项目名称 */
  langsmithProject?: string
  /** JSON 文件输出目录 */
  jsonOutputDir?: string
  /** 是否记录输入输出详情 */
  logDetails?: boolean
  /** 是否记录 Token 使用 */
  logTokenUsage?: boolean
}

/**
 * 追踪器接口
 */
export interface Tracer {
  /** 开始新的追踪 */
  startTrace(workflowName: string, input?: unknown, metadata?: Record<string, unknown>): string
  /** 结束追踪 */
  endTrace(traceId: string, output?: unknown, error?: string): void
  /** 开始新的 Span */
  startSpan(
    traceId: string,
    name: string,
    type: SpanType,
    input?: unknown,
    parentSpanId?: string
  ): string
  /** 结束 Span */
  endSpan(spanId: string, output?: unknown, error?: string, tokenUsage?: TraceSpan['tokenUsage']): void
  /** 获取追踪记录 */
  getTrace(traceId: string): TraceRecord | undefined
  /** 获取所有追踪记录 */
  getAllTraces(): TraceRecord[]
  /** 清除追踪记录 */
  clearTraces(): void
  /** 导出追踪记录 */
  exportTraces(format?: 'json' | 'summary'): string
}

// ============================================================================
// 基础追踪器实现
// ============================================================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 基础追踪器 - 内存存储
 */
class BaseTracer implements Tracer {
  protected traces: Map<string, TraceRecord> = new Map()
  protected spans: Map<string, TraceSpan> = new Map()
  protected config: TracerConfig

  constructor(config: TracerConfig) {
    this.config = config
  }

  startTrace(workflowName: string, input?: unknown, metadata?: Record<string, unknown>): string {
    const traceId = generateId()
    const trace: TraceRecord = {
      id: traceId,
      workflowName,
      startTime: Date.now(),
      status: 'running',
      input: this.config.logDetails ? input : undefined,
      spans: [],
      metadata,
    }
    this.traces.set(traceId, trace)
    return traceId
  }

  endTrace(traceId: string, output?: unknown, error?: string): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    trace.endTime = Date.now()
    trace.duration = trace.endTime - trace.startTime
    trace.status = error ? 'error' : 'completed'
    trace.output = this.config.logDetails ? output : undefined
    trace.error = error
  }

  startSpan(
    traceId: string,
    name: string,
    type: SpanType,
    input?: unknown,
    parentSpanId?: string
  ): string {
    const spanId = generateId()
    const span: TraceSpan = {
      id: spanId,
      parentId: parentSpanId,
      traceId,
      name,
      type,
      startTime: Date.now(),
      status: 'running',
      input: this.config.logDetails ? input : undefined,
    }
    this.spans.set(spanId, span)

    // 添加到 trace
    const trace = this.traces.get(traceId)
    if (trace) {
      trace.spans.push(span)
    }

    return spanId
  }

  endSpan(
    spanId: string,
    output?: unknown,
    error?: string,
    tokenUsage?: TraceSpan['tokenUsage']
  ): void {
    const span = this.spans.get(spanId)
    if (!span) return

    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime
    span.status = error ? 'error' : 'completed'
    span.output = this.config.logDetails ? output : undefined
    span.error = error
    if (this.config.logTokenUsage && tokenUsage) {
      span.tokenUsage = tokenUsage
    }
  }

  getTrace(traceId: string): TraceRecord | undefined {
    return this.traces.get(traceId)
  }

  getAllTraces(): TraceRecord[] {
    return Array.from(this.traces.values())
  }

  clearTraces(): void {
    this.traces.clear()
    this.spans.clear()
  }

  exportTraces(format: 'json' | 'summary' = 'json'): string {
    const traces = this.getAllTraces()

    if (format === 'summary') {
      return traces
        .map((trace) => {
          const spanSummary = trace.spans
            .map((s) => `  - ${s.name}: ${s.duration}ms (${s.status})`)
            .join('\n')
          return `[${trace.workflowName}] ${trace.duration}ms (${trace.status})\n${spanSummary}`
        })
        .join('\n\n')
    }

    return JSON.stringify(traces, null, 2)
  }
}

// ============================================================================
// Console 追踪器
// ============================================================================

/**
 * Console 追踪器 - 输出到控制台
 */
class ConsoleTracer extends BaseTracer {
  private tracerLogger = logger.createChild('Tracer')

  startTrace(workflowName: string, input?: unknown, metadata?: Record<string, unknown>): string {
    const traceId = super.startTrace(workflowName, input, metadata)
    this.tracerLogger.info(`🚀 [TRACE START] ${workflowName}`, { traceId, metadata })
    return traceId
  }

  endTrace(traceId: string, output?: unknown, error?: string): void {
    super.endTrace(traceId, output, error)
    const trace = this.getTrace(traceId)
    if (trace) {
      const emoji = error ? '❌' : '✅'
      this.tracerLogger.info(`${emoji} [TRACE END] ${trace.workflowName}`, {
        traceId,
        duration: `${trace.duration}ms`,
        status: trace.status,
        spanCount: trace.spans.length,
        error: error || undefined,
      })
    }
  }

  startSpan(
    traceId: string,
    name: string,
    type: SpanType,
    input?: unknown,
    parentSpanId?: string
  ): string {
    const spanId = super.startSpan(traceId, name, type, input, parentSpanId)
    const typeEmoji = {
      workflow: '📋',
      node: '🔷',
      tool: '🔧',
      llm: '🤖',
      retriever: '🔍',
    }
    this.tracerLogger.debug(`${typeEmoji[type]} [SPAN START] ${name}`, { spanId, traceId, type })
    return spanId
  }

  endSpan(
    spanId: string,
    output?: unknown,
    error?: string,
    tokenUsage?: TraceSpan['tokenUsage']
  ): void {
    super.endSpan(spanId, output, error, tokenUsage)
    const span = this.spans.get(spanId)
    if (span) {
      const emoji = error ? '❌' : '✔️'
      this.tracerLogger.debug(`${emoji} [SPAN END] ${span.name}`, {
        spanId,
        duration: `${span.duration}ms`,
        status: span.status,
        tokenUsage: tokenUsage || undefined,
        error: error || undefined,
      })
    }
  }
}

// ============================================================================
// JSON 文件追踪器
// ============================================================================

/**
 * JSON 文件追踪器 - 输出到 JSON 文件
 */
class JsonTracer extends ConsoleTracer {
  private outputDir: string

  constructor(config: TracerConfig) {
    super(config)
    // 使用绝对路径
    const configDir = config.jsonOutputDir || './logs/traces'
    this.outputDir = path.isAbsolute(configDir)
      ? configDir
      : path.resolve(process.cwd(), configDir)
    this.ensureOutputDir()
    logger.info(`[JsonTracer] Initialized with output dir: ${this.outputDir}`)
  }

  private ensureOutputDir(): void {
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true })
        logger.info(`[JsonTracer] Created output directory: ${this.outputDir}`)
      }
    } catch (error) {
      logger.warn(`[Tracer] Failed to create output directory: ${this.outputDir}`, { error: (error as Error).message })
    }
  }

  endTrace(traceId: string, output?: unknown, error?: string): void {
    super.endTrace(traceId, output, error)

    // 保存到文件
    const trace = this.getTrace(traceId)
    if (trace) {
      this.saveTraceToFile(trace)
    } else {
      logger.warn(`[JsonTracer] Trace not found for id: ${traceId}`)
    }
  }

  private saveTraceToFile(trace: TraceRecord): void {
    try {
      const filename = `trace-${trace.id}.json`
      const filepath = path.join(this.outputDir, filename)
      fs.writeFileSync(filepath, JSON.stringify(trace, null, 2))
      logger.info(`[JsonTracer] Saved trace to ${filepath}`)
    } catch (error) {
      logger.error(`[JsonTracer] Failed to save trace to file`, error as Error)
    }
  }
}

// ============================================================================
// LangSmith 追踪器
// ============================================================================

/**
 * LangSmith 追踪器
 * 注意：需要安装 langsmith 包并配置环境变量
 */
class LangSmithTracer extends ConsoleTracer {
  private langsmithClient: unknown // LangSmith Client type
  private runMap: Map<string, unknown> = new Map() // span_id -> run
  private initialized: boolean = false

  constructor(config: TracerConfig) {
    super(config)
    this.initLangSmith()
  }

  private async initLangSmith(): Promise<void> {
    try {
      // 动态导入 langsmith（如果已安装）
      const { Client } = await import('langsmith')
      this.langsmithClient = new Client({
        apiKey: this.config.langsmithApiKey,
      })
      this.initialized = true
      logger.info('[Tracer] LangSmith client initialized')
    } catch (error) {
      logger.warn(
        '[Tracer] LangSmith not available. Install with: npm install langsmith'
      )
      // 回退到 Console 追踪
    }
  }

  startTrace(
    workflowName: string,
    input?: unknown,
    metadata?: Record<string, unknown>
  ): string {
    const traceId = super.startTrace(workflowName, input, metadata)

    // 异步发送到 LangSmith（不阻塞）
    if (this.langsmithClient && this.initialized) {
      this.sendStartTraceToLangSmith(traceId, workflowName, input, metadata).catch((err) => {
        logger.warn(`[Tracer] LangSmith createRun failed: ${(err as Error).message}`)
      })
    }

    return traceId
  }

  private async sendStartTraceToLangSmith(
    traceId: string,
    workflowName: string,
    input?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = this.langsmithClient as any
      const run = await client.createRun({
        name: workflowName,
        run_type: 'chain',
        inputs: input,
        project_name: this.config.langsmithProject || 'ai-travel-planner',
        start_time: Date.now(),
        extra: metadata,
      })
      this.runMap.set(traceId, run)
    } catch (error) {
      logger.warn(`[Tracer] LangSmith createRun failed: ${(error as Error).message}`)
    }
  }

  endTrace(traceId: string, output?: unknown, error?: string): void {
    super.endTrace(traceId, output, error)

    // 异步发送到 LangSmith（不阻塞）
    if (this.langsmithClient && this.initialized) {
      this.sendEndTraceToLangSmith(traceId, output, error).catch((err) => {
        logger.warn(`[Tracer] LangSmith updateRun failed: ${(err as Error).message}`)
      })
    }
  }

  private async sendEndTraceToLangSmith(
    traceId: string,
    output?: unknown,
    error?: string
  ): Promise<void> {
    const run = this.runMap.get(traceId)
    if (run) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = this.langsmithClient as any
        await client.updateRun((run as any).id, {
          outputs: output,
          error: error,
          end_time: Date.now(),
        })
        this.runMap.delete(traceId)
      } catch (err) {
        logger.warn(`[Tracer] LangSmith updateRun failed: ${(err as Error).message}`)
      }
    }
  }
}

// ============================================================================
// 空追踪器（禁用时使用）
// ============================================================================

/**
 * 空追踪器 - 不执行任何操作
 */
class NoopTracer implements Tracer {
  startTrace(): string {
    return ''
  }
  endTrace(): void {}
  startSpan(): string {
    return ''
  }
  endSpan(): void {}
  getTrace(): TraceRecord | undefined {
    return undefined
  }
  getAllTraces(): TraceRecord[] {
    return []
  }
  clearTraces(): void {}
  exportTraces(): string {
    return '[]'
  }
}

// ============================================================================
// 追踪器工厂和全局实例
// ============================================================================

let globalTracer: Tracer | null = null
let globalConfig: TracerConfig | null = null

/**
 * 获取默认追踪器配置
 */
export function getDefaultTracerConfig(): TracerConfig {
  const type = (process.env.LANGGRAPH_TRACER as TracerType) || 'console'
  const enabled = process.env.LANGGRAPH_TRACING_ENABLED !== 'false'

  return {
    type,
    enabled,
    langsmithApiKey: process.env.LANGSMITH_API_KEY,
    langsmithProject: process.env.LANGSMITH_PROJECT || 'ai-travel-planner',
    jsonOutputDir: process.env.LANGGRAPH_TRACE_OUTPUT_DIR || './logs/traces',
    logDetails: process.env.LANGGRAPH_TRACE_LOG_DETAILS === 'true',
    logTokenUsage: process.env.LANGGRAPH_TRACE_LOG_TOKENS !== 'false',
  }
}

/**
 * 创建追踪器实例
 */
export function createTracer(config?: Partial<TracerConfig>): Tracer {
  const finalConfig: TracerConfig = {
    ...getDefaultTracerConfig(),
    ...config,
  }

  if (!finalConfig.enabled) {
    return new NoopTracer()
  }

  switch (finalConfig.type) {
    case 'langsmith':
      return new LangSmithTracer(finalConfig)
    case 'json':
      return new JsonTracer(finalConfig)
    case 'console':
      return new ConsoleTracer(finalConfig)
    case 'none':
      return new NoopTracer()
    default:
      return new ConsoleTracer(finalConfig)
  }
}

/**
 * 获取全局追踪器实例（单例）
 */
export function getTracer(config?: Partial<TracerConfig>): Tracer {
  // 获取默认配置
  const defaultConfig = getDefaultTracerConfig()

  // 合并配置，过滤掉 undefined 值
  const newConfig: TracerConfig = { ...defaultConfig }
  if (config) {
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        (newConfig as unknown as Record<string, unknown>)[key] = value
      }
    }
  }

  // 如果配置变化，重新创建
  if (
    globalConfig &&
    JSON.stringify(newConfig) !== JSON.stringify(globalConfig)
  ) {
    logger.debug('[Tracer] Config changed, recreating tracer', {
      old: globalConfig.type,
      new: newConfig.type,
    })
    globalTracer = null
  }

  if (!globalTracer) {
    globalConfig = newConfig
    globalTracer = createTracer(newConfig)
    logger.info(`[Tracer] Created ${newConfig.type} tracer`, {
      enabled: newConfig.enabled,
      logDetails: newConfig.logDetails,
      outputDir: newConfig.jsonOutputDir,
    })
  }

  return globalTracer
}

/**
 * 重置全局追踪器
 */
export function resetTracer(): void {
  globalTracer = null
  globalConfig = null
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 追踪工作流执行的装饰器函数
 */
export function withTracing<T extends (...args: unknown[]) => Promise<unknown>>(
  workflowName: string,
  fn: T,
  tracer?: Tracer
): T {
  const tracerInstance = tracer || getTracer()

  return (async (...args: unknown[]) => {
    const traceId = tracerInstance.startTrace(workflowName, args[0])

    try {
      const result = await fn(...args)
      tracerInstance.endTrace(traceId, result)
      return result
    } catch (error) {
      tracerInstance.endTrace(traceId, undefined, (error as Error).message)
      throw error
    }
  }) as T
}

/**
 * 追踪单个 Span 的装饰器函数
 */
export function withSpan<T extends (...args: unknown[]) => Promise<unknown>>(
  traceId: string,
  spanName: string,
  spanType: SpanType,
  fn: T,
  tracer?: Tracer
): T {
  const tracerInstance = tracer || getTracer()

  return (async (...args: unknown[]) => {
    const spanId = tracerInstance.startSpan(traceId, spanName, spanType, args[0])

    try {
      const result = await fn(...args)
      tracerInstance.endSpan(spanId, result)
      return result
    } catch (error) {
      tracerInstance.endSpan(spanId, undefined, (error as Error).message)
      throw error
    }
  }) as T
}

// ============================================================================
// 导出类型和类
// ============================================================================

export {
  BaseTracer,
  ConsoleTracer,
  JsonTracer,
  LangSmithTracer,
  NoopTracer,
}
