/**
 * LangGraph 工作流指标收集器
 * Phase 5.4: Prometheus/Grafana 监控支持
 *
 * 收集的指标：
 * - 工作流执行次数和持续时间
 * - Agent 节点执行次数和持续时间
 * - MCP 工具调用次数和持续时间
 * - 预算重试次数
 * - 错误率统计
 */

import { logger } from '@/lib/logger'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 计数器指标
 */
interface CounterMetric {
  name: string
  help: string
  labels: Record<string, string>
  value: number
}

/**
 * 直方图指标（用于持续时间统计）
 */
interface HistogramMetric {
  name: string
  help: string
  labels: Record<string, string>
  sum: number
  count: number
  buckets: { le: number | '+Inf'; count: number }[]
}

/**
 * 仪表盘指标（当前值）
 */
interface GaugeMetric {
  name: string
  help: string
  labels: Record<string, string>
  value: number
}

/**
 * 指标收集器配置
 */
export interface MetricsConfig {
  /** 是否启用指标收集 */
  enabled: boolean
  /** 指标前缀 */
  prefix: string
  /** 持续时间直方图桶边界 (ms) */
  durationBuckets: number[]
  /** 是否记录详细标签 */
  detailedLabels: boolean
}

/**
 * Agent 执行记录
 */
export interface AgentExecutionRecord {
  agentName: string
  status: 'success' | 'error'
  durationMs: number
  retryCount?: number
  errorMessage?: string
}

/**
 * 工作流执行记录
 */
export interface WorkflowExecutionRecord {
  workflowName: string
  status: 'success' | 'error'
  durationMs: number
  agentCount: number
  retryCount: number
  errorMessage?: string
}

/**
 * MCP 工具调用记录
 */
export interface MCPToolCallRecord {
  toolName: string
  status: 'success' | 'error'
  durationMs: number
  cached?: boolean
  errorMessage?: string
}

// ============================================================================
// 指标存储
// ============================================================================

/**
 * 简单的内存指标存储
 * 注：生产环境建议使用 prom-client 或类似库
 */
class MetricsStore {
  private counters: Map<string, CounterMetric> = new Map()
  private histograms: Map<string, HistogramMetric> = new Map()
  private gauges: Map<string, GaugeMetric> = new Map()

  private defaultBuckets = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000]

  /**
   * 生成唯一的指标键
   */
  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    return `${name}{${labelStr}}`
  }

  /**
   * 增加计数器
   */
  incrementCounter(
    name: string,
    help: string,
    labels: Record<string, string> = {},
    value: number = 1
  ): void {
    const key = this.getKey(name, labels)
    const existing = this.counters.get(key)

    if (existing) {
      existing.value += value
    } else {
      this.counters.set(key, {
        name,
        help,
        labels,
        value,
      })
    }
  }

  /**
   * 记录直方图观测值
   */
  observeHistogram(
    name: string,
    help: string,
    labels: Record<string, string> = {},
    value: number,
    buckets: number[] = this.defaultBuckets
  ): void {
    const key = this.getKey(name, labels)
    let existing = this.histograms.get(key)

    if (!existing) {
      existing = {
        name,
        help,
        labels,
        sum: 0,
        count: 0,
        buckets: [
          ...buckets.map((le) => ({ le, count: 0 })),
          { le: '+Inf' as const, count: 0 },
        ],
      }
      this.histograms.set(key, existing)
    }

    existing.sum += value
    existing.count += 1

    // 更新桶计数
    for (const bucket of existing.buckets) {
      if (bucket.le === '+Inf' || value <= bucket.le) {
        bucket.count += 1
      }
    }
  }

  /**
   * 设置仪表盘值
   */
  setGauge(
    name: string,
    help: string,
    labels: Record<string, string> = {},
    value: number
  ): void {
    const key = this.getKey(name, labels)
    this.gauges.set(key, {
      name,
      help,
      labels,
      value,
    })
  }

  /**
   * 获取所有计数器
   */
  getCounters(): CounterMetric[] {
    return Array.from(this.counters.values())
  }

  /**
   * 获取所有直方图
   */
  getHistograms(): HistogramMetric[] {
    return Array.from(this.histograms.values())
  }

  /**
   * 获取所有仪表盘
   */
  getGauges(): GaugeMetric[] {
    return Array.from(this.gauges.values())
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.counters.clear()
    this.histograms.clear()
    this.gauges.clear()
  }

  /**
   * 导出为 Prometheus 格式
   */
  exportPrometheusFormat(): string {
    const lines: string[] = []
    const processedMetrics = new Set<string>()

    // 导出计数器
    for (const counter of this.counters.values()) {
      if (!processedMetrics.has(counter.name)) {
        lines.push(`# HELP ${counter.name} ${counter.help}`)
        lines.push(`# TYPE ${counter.name} counter`)
        processedMetrics.add(counter.name)
      }
      const labelStr = this.formatLabels(counter.labels)
      lines.push(`${counter.name}${labelStr} ${counter.value}`)
    }

    // 导出直方图
    const histogramGroups = new Map<string, HistogramMetric[]>()
    for (const hist of this.histograms.values()) {
      const group = histogramGroups.get(hist.name) || []
      group.push(hist)
      histogramGroups.set(hist.name, group)
    }

    for (const [name, hists] of histogramGroups) {
      if (!processedMetrics.has(name)) {
        lines.push(`# HELP ${name} ${hists[0].help}`)
        lines.push(`# TYPE ${name} histogram`)
        processedMetrics.add(name)
      }

      for (const hist of hists) {
        const baseLabels = this.formatLabels(hist.labels, false)

        // 导出桶
        for (const bucket of hist.buckets) {
          const bucketLabel = bucket.le === '+Inf' ? '+Inf' : bucket.le.toString()
          const allLabels = hist.labels
            ? `{${baseLabels}${baseLabels ? ',' : ''}le="${bucketLabel}"}`
            : `{le="${bucketLabel}"}`
          lines.push(`${name}_bucket${allLabels} ${bucket.count}`)
        }

        // 导出 sum 和 count
        const labelStr = this.formatLabels(hist.labels)
        lines.push(`${name}_sum${labelStr} ${hist.sum}`)
        lines.push(`${name}_count${labelStr} ${hist.count}`)
      }
    }

    // 导出仪表盘
    for (const gauge of this.gauges.values()) {
      if (!processedMetrics.has(gauge.name)) {
        lines.push(`# HELP ${gauge.name} ${gauge.help}`)
        lines.push(`# TYPE ${gauge.name} gauge`)
        processedMetrics.add(gauge.name)
      }
      const labelStr = this.formatLabels(gauge.labels)
      lines.push(`${gauge.name}${labelStr} ${gauge.value}`)
    }

    return lines.join('\n')
  }

  private formatLabels(labels: Record<string, string>, wrap = true): string {
    const entries = Object.entries(labels)
    if (entries.length === 0) return ''
    const labelStr = entries.map(([k, v]) => `${k}="${v}"`).join(',')
    return wrap ? `{${labelStr}}` : labelStr
  }
}

// ============================================================================
// 指标收集器
// ============================================================================

/**
 * LangGraph 指标收集器
 */
export class MetricsCollector {
  private store: MetricsStore
  private config: MetricsConfig
  private startTime: number

  constructor(config?: Partial<MetricsConfig>) {
    this.config = {
      enabled: config?.enabled ?? (process.env.LANGGRAPH_METRICS_ENABLED !== 'false'),
      prefix: config?.prefix ?? (process.env.LANGGRAPH_METRICS_PREFIX || 'langgraph'),
      durationBuckets: config?.durationBuckets ?? [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
      detailedLabels: config?.detailedLabels ?? (process.env.LANGGRAPH_METRICS_DETAILED === 'true'),
    }

    this.store = new MetricsStore()
    this.startTime = Date.now()

    // 设置启动时间仪表盘
    this.store.setGauge(
      `${this.config.prefix}_start_time_seconds`,
      'Start time of the metrics collector in seconds since epoch',
      {},
      Math.floor(this.startTime / 1000)
    )
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * 记录工作流执行
   */
  recordWorkflowExecution(record: WorkflowExecutionRecord): void {
    if (!this.config.enabled) return

    const prefix = this.config.prefix
    const labels: Record<string, string> = {
      workflow: record.workflowName,
      status: record.status,
    }

    // 执行次数
    this.store.incrementCounter(
      `${prefix}_workflow_executions_total`,
      'Total number of workflow executions',
      labels
    )

    // 持续时间
    this.store.observeHistogram(
      `${prefix}_workflow_duration_milliseconds`,
      'Workflow execution duration in milliseconds',
      { workflow: record.workflowName },
      record.durationMs,
      this.config.durationBuckets
    )

    // Agent 数量
    this.store.observeHistogram(
      `${prefix}_workflow_agents_count`,
      'Number of agents executed in workflow',
      { workflow: record.workflowName },
      record.agentCount,
      [1, 2, 3, 5, 7, 10]
    )

    // 重试次数
    if (record.retryCount > 0) {
      this.store.incrementCounter(
        `${prefix}_workflow_retries_total`,
        'Total number of workflow retries',
        { workflow: record.workflowName },
        record.retryCount
      )
    }

    // 错误次数
    if (record.status === 'error') {
      this.store.incrementCounter(
        `${prefix}_workflow_errors_total`,
        'Total number of workflow errors',
        this.config.detailedLabels && record.errorMessage
          ? { workflow: record.workflowName, error: this.truncateError(record.errorMessage) }
          : { workflow: record.workflowName }
      )
    }

    logger.debug('[Metrics] Recorded workflow execution', {
      workflow: record.workflowName,
      status: record.status,
      durationMs: record.durationMs,
    })
  }

  /**
   * 记录 Agent 节点执行
   */
  recordAgentExecution(record: AgentExecutionRecord): void {
    if (!this.config.enabled) return

    const prefix = this.config.prefix
    const labels: Record<string, string> = {
      agent: record.agentName,
      status: record.status,
    }

    // 执行次数
    this.store.incrementCounter(
      `${prefix}_agent_executions_total`,
      'Total number of agent executions',
      labels
    )

    // 持续时间
    this.store.observeHistogram(
      `${prefix}_agent_duration_milliseconds`,
      'Agent execution duration in milliseconds',
      { agent: record.agentName },
      record.durationMs,
      this.config.durationBuckets
    )

    // 错误次数
    if (record.status === 'error') {
      this.store.incrementCounter(
        `${prefix}_agent_errors_total`,
        'Total number of agent errors',
        this.config.detailedLabels && record.errorMessage
          ? { agent: record.agentName, error: this.truncateError(record.errorMessage) }
          : { agent: record.agentName }
      )
    }
  }

  /**
   * 记录 MCP 工具调用
   */
  recordMCPToolCall(record: MCPToolCallRecord): void {
    if (!this.config.enabled) return

    const prefix = this.config.prefix
    const labels: Record<string, string> = {
      tool: record.toolName,
      status: record.status,
    }

    if (record.cached !== undefined) {
      labels.cached = record.cached ? 'true' : 'false'
    }

    // 调用次数
    this.store.incrementCounter(
      `${prefix}_mcp_tool_calls_total`,
      'Total number of MCP tool calls',
      labels
    )

    // 持续时间（仅对非缓存调用记录）
    if (!record.cached) {
      this.store.observeHistogram(
        `${prefix}_mcp_tool_duration_milliseconds`,
        'MCP tool call duration in milliseconds',
        { tool: record.toolName },
        record.durationMs,
        this.config.durationBuckets
      )
    }

    // 缓存命中率统计
    if (record.cached) {
      this.store.incrementCounter(
        `${prefix}_mcp_cache_hits_total`,
        'Total number of MCP cache hits',
        { tool: record.toolName }
      )
    }

    // 错误次数
    if (record.status === 'error') {
      this.store.incrementCounter(
        `${prefix}_mcp_tool_errors_total`,
        'Total number of MCP tool errors',
        this.config.detailedLabels && record.errorMessage
          ? { tool: record.toolName, error: this.truncateError(record.errorMessage) }
          : { tool: record.toolName }
      )
    }
  }

  /**
   * 设置当前活跃工作流数量
   */
  setActiveWorkflows(count: number): void {
    if (!this.config.enabled) return

    this.store.setGauge(
      `${this.config.prefix}_active_workflows`,
      'Current number of active workflows',
      {},
      count
    )
  }

  /**
   * 更新运行时间
   */
  updateUptime(): void {
    if (!this.config.enabled) return

    const uptime = (Date.now() - this.startTime) / 1000
    this.store.setGauge(
      `${this.config.prefix}_uptime_seconds`,
      'Uptime of the metrics collector in seconds',
      {},
      uptime
    )
  }

  /**
   * 获取 Prometheus 格式的指标
   */
  getMetrics(): string {
    this.updateUptime()
    return this.store.exportPrometheusFormat()
  }

  /**
   * 获取 JSON 格式的指标摘要
   */
  getMetricsSummary(): {
    counters: CounterMetric[]
    histograms: HistogramMetric[]
    gauges: GaugeMetric[]
    uptime: number
  } {
    this.updateUptime()
    return {
      counters: this.store.getCounters(),
      histograms: this.store.getHistograms(),
      gauges: this.store.getGauges(),
      uptime: (Date.now() - this.startTime) / 1000,
    }
  }

  /**
   * 清除所有指标
   */
  reset(): void {
    this.store.clear()
    this.startTime = Date.now()

    this.store.setGauge(
      `${this.config.prefix}_start_time_seconds`,
      'Start time of the metrics collector in seconds since epoch',
      {},
      Math.floor(this.startTime / 1000)
    )
  }

  /**
   * 截断错误消息（避免高基数标签）
   */
  private truncateError(message: string, maxLength = 50): string {
    const cleaned = message.replace(/["\n\r]/g, ' ').trim()
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.substring(0, maxLength - 3) + '...'
  }
}

// ============================================================================
// 全局实例
// ============================================================================

let globalMetricsCollector: MetricsCollector | null = null

/**
 * 获取全局指标收集器实例
 */
export function getMetricsCollector(config?: Partial<MetricsConfig>): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector(config)
  }
  return globalMetricsCollector
}

/**
 * 重置全局指标收集器
 */
export function resetMetricsCollector(): void {
  if (globalMetricsCollector) {
    globalMetricsCollector.reset()
  }
  globalMetricsCollector = null
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建用于测量执行时间的计时器
 */
export function createTimer(): { stop: () => number } {
  const start = Date.now()
  return {
    stop: () => Date.now() - start,
  }
}

/**
 * 包装函数以自动记录 Agent 执行指标
 */
export function withAgentMetrics<T extends (...args: unknown[]) => Promise<unknown>>(
  agentName: string,
  fn: T,
  collector?: MetricsCollector
): T {
  const metricsCollector = collector || getMetricsCollector()

  return (async (...args: unknown[]) => {
    const timer = createTimer()
    let status: 'success' | 'error' = 'success'
    let errorMessage: string | undefined

    try {
      const result = await fn(...args)
      return result
    } catch (error) {
      status = 'error'
      errorMessage = (error as Error).message
      throw error
    } finally {
      metricsCollector.recordAgentExecution({
        agentName,
        status,
        durationMs: timer.stop(),
        errorMessage,
      })
    }
  }) as T
}

/**
 * 包装函数以自动记录 MCP 工具调用指标
 */
export function withMCPToolMetrics<T extends (...args: unknown[]) => Promise<unknown>>(
  toolName: string,
  fn: T,
  collector?: MetricsCollector
): T {
  const metricsCollector = collector || getMetricsCollector()

  return (async (...args: unknown[]) => {
    const timer = createTimer()
    let status: 'success' | 'error' = 'success'
    let errorMessage: string | undefined

    try {
      const result = await fn(...args)
      return result
    } catch (error) {
      status = 'error'
      errorMessage = (error as Error).message
      throw error
    } finally {
      metricsCollector.recordMCPToolCall({
        toolName,
        status,
        durationMs: timer.stop(),
        errorMessage,
      })
    }
  }) as T
}

// ============================================================================
// 导出类型
// ============================================================================

export type { CounterMetric, HistogramMetric, GaugeMetric }
