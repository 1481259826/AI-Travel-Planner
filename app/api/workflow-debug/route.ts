/**
 * 工作流调试 API 端点
 * Phase 5.5: 提供追踪数据查询接口
 *
 * 端点:
 * - GET /api/workflow-debug - 获取追踪数据
 * - GET /api/workflow-debug?id=xxx - 获取特定追踪
 * - GET /api/workflow-debug?type=graph - 获取工作流图结构
 *
 * 数据来源:
 * - 内存追踪器 (console 模式)
 * - JSON 文件 (json 模式) - 从 logs/traces/ 目录读取
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTracer, getWorkflowNodes } from '@/lib/agents'
import type { TraceRecord } from '@/lib/agents'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 工作流图结构类型
 */
interface WorkflowGraph {
  nodes: Array<{
    id: string
    name: string
    description: string
    type: 'start' | 'node' | 'end' | 'condition'
    position?: { x: number; y: number }
  }>
  edges: Array<{
    source: string
    target: string
    label?: string
    type: 'normal' | 'conditional'
  }>
}

/**
 * 获取工作流图结构
 */
function getWorkflowGraph(): WorkflowGraph {
  const nodes = getWorkflowNodes()

  return {
    nodes: [
      // 开始节点
      {
        id: '__start__',
        name: '开始',
        description: '工作流开始',
        type: 'start' as const,
        position: { x: 100, y: 50 },
      },
      // Agent 节点
      ...nodes.map((node, index) => ({
        id: node.id,
        name: node.name,
        description: node.description,
        type: 'node' as const,
        position: calculateNodePosition(node.id, index),
      })),
      // 条件节点
      {
        id: '__budget_check__',
        name: '预算检查',
        description: '判断是否通过预算审计',
        type: 'condition' as const,
        position: { x: 400, y: 450 },
      },
      // 结束节点
      {
        id: '__end__',
        name: '结束',
        description: '工作流结束',
        type: 'end' as const,
        position: { x: 400, y: 650 },
      },
    ],
    edges: [
      // 开始 -> 天气
      { source: '__start__', target: 'weather_scout', type: 'normal' as const },
      // 天气 -> 规划
      { source: 'weather_scout', target: 'itinerary_planner', type: 'normal' as const },
      // 规划 -> 并行 (资源 Agent)
      { source: 'itinerary_planner', target: 'accommodation_agent', type: 'normal' as const },
      { source: 'itinerary_planner', target: 'transport_agent', type: 'normal' as const },
      { source: 'itinerary_planner', target: 'dining_agent', type: 'normal' as const },
      // 并行 -> 预算
      { source: 'accommodation_agent', target: 'budget_critic', type: 'normal' as const },
      { source: 'transport_agent', target: 'budget_critic', type: 'normal' as const },
      { source: 'dining_agent', target: 'budget_critic', type: 'normal' as const },
      // 预算 -> 条件判断
      { source: 'budget_critic', target: '__budget_check__', type: 'normal' as const },
      // 条件分支
      { source: '__budget_check__', target: 'finalize', label: '通过', type: 'conditional' as const },
      { source: '__budget_check__', target: 'itinerary_planner', label: '超预算重试', type: 'conditional' as const },
      // 最终 -> 结束
      { source: 'finalize', target: '__end__', type: 'normal' as const },
    ],
  }
}

/**
 * 计算节点位置
 */
function calculateNodePosition(nodeId: string, _index: number): { x: number; y: number } {
  // 定义节点位置布局
  const positions: Record<string, { x: number; y: number }> = {
    weather_scout: { x: 400, y: 100 },
    itinerary_planner: { x: 400, y: 180 },
    accommodation_agent: { x: 200, y: 280 },
    transport_agent: { x: 400, y: 280 },
    dining_agent: { x: 600, y: 280 },
    budget_critic: { x: 400, y: 380 },
    finalize: { x: 400, y: 550 },
  }
  return positions[nodeId] || { x: 400, y: 100 + _index * 80 }
}

// ============================================================================
// JSON 文件追踪数据读取
// ============================================================================

/**
 * 获取追踪文件目录（绝对路径）
 */
function getTraceOutputDir(): string {
  const configDir = process.env.LANGGRAPH_TRACE_OUTPUT_DIR || './logs/traces'
  return path.isAbsolute(configDir)
    ? configDir
    : path.resolve(process.cwd(), configDir)
}

/**
 * 从 JSON 文件读取所有追踪记录
 */
function readTracesFromFiles(): TraceRecord[] {
  const outputDir = getTraceOutputDir()
  const traces: TraceRecord[] = []

  try {
    // 检查目录是否存在
    if (!fs.existsSync(outputDir)) {
      console.log('[Workflow Debug] Trace directory does not exist:', outputDir)
      return traces
    }

    // 读取目录中的所有 JSON 文件
    const files = fs.readdirSync(outputDir).filter((file) => file.endsWith('.json'))
    console.log(`[Workflow Debug] Found ${files.length} trace files in ${outputDir}`)

    for (const file of files) {
      try {
        const filepath = path.join(outputDir, file)
        const content = fs.readFileSync(filepath, 'utf-8')
        const trace = JSON.parse(content) as TraceRecord
        traces.push(trace)
      } catch (err) {
        console.warn(`[Workflow Debug] Failed to read trace file ${file}:`, err)
      }
    }

    // 按开始时间排序（最新的在后面）
    traces.sort((a, b) => a.startTime - b.startTime)
  } catch (err) {
    console.error('[Workflow Debug] Failed to read traces from files:', err)
  }

  return traces
}

/**
 * 从 JSON 文件读取特定追踪记录
 */
function readTraceFromFile(traceId: string): TraceRecord | null {
  const outputDir = getTraceOutputDir()
  const filename = `trace-${traceId}.json`
  const filepath = path.join(outputDir, filename)

  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8')
      return JSON.parse(content) as TraceRecord
    }
  } catch (err) {
    console.warn(`[Workflow Debug] Failed to read trace file ${filename}:`, err)
  }

  return null
}

/**
 * 删除所有追踪文件
 */
function clearTraceFiles(): number {
  const outputDir = getTraceOutputDir()
  let deletedCount = 0

  try {
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir).filter((file) => file.endsWith('.json'))
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(outputDir, file))
          deletedCount++
        } catch (err) {
          console.warn(`[Workflow Debug] Failed to delete trace file ${file}:`, err)
        }
      }
    }
  } catch (err) {
    console.error('[Workflow Debug] Failed to clear trace files:', err)
  }

  return deletedCount
}

/**
 * 获取所有追踪数据（内存 + 文件）
 */
function getAllTraces(): TraceRecord[] {
  // 首先从内存获取
  const tracer = getTracer()
  const memoryTraces = tracer.getAllTraces()

  // 然后从文件获取
  const fileTraces = readTracesFromFiles()

  // 合并去重（以 ID 为准）
  const traceMap = new Map<string, TraceRecord>()

  for (const trace of fileTraces) {
    traceMap.set(trace.id, trace)
  }

  // 内存中的数据优先（更新）
  for (const trace of memoryTraces) {
    traceMap.set(trace.id, trace)
  }

  // 转换为数组并按时间排序
  const allTraces = Array.from(traceMap.values())
  allTraces.sort((a, b) => a.startTime - b.startTime)

  return allTraces
}

/**
 * 获取特定追踪记录（内存优先，然后文件）
 */
function getTraceById(traceId: string): TraceRecord | null {
  // 首先从内存查找
  const tracer = getTracer()
  const memoryTrace = tracer.getTrace(traceId)
  if (memoryTrace) {
    return memoryTrace
  }

  // 然后从文件查找
  return readTraceFromFile(traceId)
}

/**
 * GET /api/workflow-debug
 * 获取追踪数据或工作流图结构
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    // 获取工作流图结构
    if (type === 'graph') {
      const graph = getWorkflowGraph()
      return NextResponse.json({ success: true, data: graph })
    }

    // 获取节点列表
    if (type === 'nodes') {
      const nodes = getWorkflowNodes()
      return NextResponse.json({ success: true, data: nodes })
    }

    // 获取特定追踪
    if (id) {
      const trace = getTraceById(id)
      if (!trace) {
        return NextResponse.json(
          { success: false, error: 'Trace not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: trace })
    }

    // 获取所有追踪（内存 + 文件）
    const traces = getAllTraces()

    // 添加统计信息
    const stats = calculateTraceStats(traces)

    // 添加数据源信息
    const tracerType = process.env.LANGGRAPH_TRACER || 'console'

    return NextResponse.json({
      success: true,
      data: {
        traces: traces.slice(-50), // 最近 50 条
        stats,
        total: traces.length,
        source: tracerType,
        traceDir: getTraceOutputDir(),
      },
    })
  } catch (error) {
    console.error('[Workflow Debug API] Error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * 计算追踪统计信息
 */
function calculateTraceStats(traces: TraceRecord[]) {
  if (traces.length === 0) {
    return {
      total: 0,
      completed: 0,
      failed: 0,
      avgDuration: 0,
      lastTraceTime: null,
    }
  }

  const completed = traces.filter((t) => t.status === 'completed').length
  const failed = traces.filter((t) => t.status === 'error').length
  const completedTraces = traces.filter((t) => t.duration !== undefined)
  const avgDuration =
    completedTraces.length > 0
      ? Math.round(
          completedTraces.reduce((sum, t) => sum + (t.duration || 0), 0) /
            completedTraces.length
        )
      : 0

  const lastTrace = traces[traces.length - 1]

  return {
    total: traces.length,
    completed,
    failed,
    running: traces.filter((t) => t.status === 'running').length,
    avgDuration,
    lastTraceTime: lastTrace?.startTime || null,
  }
}

/**
 * DELETE /api/workflow-debug
 * 清除追踪数据（仅开发环境）
 */
export async function DELETE(request: NextRequest) {
  // 仅在开发环境允许
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not allowed in production' },
      { status: 403 }
    )
  }

  try {
    // 清除内存中的追踪数据
    const tracer = getTracer()
    tracer.clearTraces()

    // 清除文件中的追踪数据
    const deletedCount = clearTraceFiles()

    return NextResponse.json({
      success: true,
      message: `Traces cleared. Deleted ${deletedCount} trace files.`,
    })
  } catch (error) {
    console.error('[Workflow Debug API] Error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
