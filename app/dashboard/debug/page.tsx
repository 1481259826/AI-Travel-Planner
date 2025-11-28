/**
 * 工作流调试页面
 * Phase 5.5: 可视化展示 LangGraph 工作流执行过程
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import type { TraceRecord, TraceSpan } from '@/lib/agents'

// ============================================================================
// 类型定义
// ============================================================================

interface WorkflowNode {
  id: string
  name: string
  description: string
  type: 'start' | 'node' | 'end' | 'condition'
  position?: { x: number; y: number }
}

interface WorkflowEdge {
  source: string
  target: string
  label?: string
  type: 'normal' | 'conditional'
}

interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

interface TraceStats {
  total: number
  completed: number
  failed: number
  running: number
  avgDuration: number
  lastTraceTime: number | null
}

// ============================================================================
// 工作流图组件
// ============================================================================

function WorkflowGraphView({
  graph,
  activeNodes = [],
  completedNodes = [],
}: {
  graph: WorkflowGraph
  activeNodes?: string[]
  completedNodes?: string[]
}) {
  const svgWidth = 700
  const svgHeight = 700

  // 获取节点样式
  const getNodeStyle = (nodeId: string) => {
    if (activeNodes.includes(nodeId)) {
      return { fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 2 }
    }
    if (completedNodes.includes(nodeId)) {
      return { fill: '#d1fae5', stroke: '#10b981', strokeWidth: 2 }
    }
    return { fill: '#f3f4f6', stroke: '#6b7280', strokeWidth: 1 }
  }

  // 获取节点图标
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start':
        return '▶'
      case 'end':
        return '■'
      case 'condition':
        return '◇'
      default:
        return '○'
    }
  }

  return (
    <div className="border rounded-lg bg-white p-4 overflow-auto">
      <h3 className="text-lg font-semibold mb-4">工作流状态图</h3>
      <svg width={svgWidth} height={svgHeight} className="mx-auto">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
          <marker
            id="arrowhead-conditional"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
          </marker>
        </defs>

        {/* 绘制边 */}
        {graph.edges.map((edge, idx) => {
          const sourceNode = graph.nodes.find((n) => n.id === edge.source)
          const targetNode = graph.nodes.find((n) => n.id === edge.target)
          if (!sourceNode?.position || !targetNode?.position) return null

          const isConditional = edge.type === 'conditional'
          const strokeColor = isConditional ? '#f59e0b' : '#9ca3af'
          const markerId = isConditional ? 'arrowhead-conditional' : 'arrowhead'

          // 计算路径（简单直线）
          const x1 = sourceNode.position.x
          const y1 = sourceNode.position.y + 25
          const x2 = targetNode.position.x
          const y2 = targetNode.position.y - 25

          // 特殊处理条件边（回退到规划节点）
          let path = `M ${x1} ${y1} L ${x2} ${y2}`
          if (edge.source === '__budget_check__' && edge.target === 'itinerary_planner') {
            // 画一条绕过的曲线
            path = `M ${x1 + 60} ${y1 - 60} Q ${x1 + 150} ${y1 - 200} ${x2 + 80} ${y2 + 40}`
          }

          return (
            <g key={idx}>
              <path
                d={path}
                stroke={strokeColor}
                strokeWidth={isConditional ? 2 : 1}
                fill="none"
                strokeDasharray={isConditional ? '5,3' : undefined}
                markerEnd={`url(#${markerId})`}
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2 + (isConditional ? 30 : 0)}
                  y={(y1 + y2) / 2 - 5}
                  fontSize="11"
                  fill={strokeColor}
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* 绘制节点 */}
        {graph.nodes.map((node) => {
          if (!node.position) return null
          const style = getNodeStyle(node.id)
          const { x, y } = node.position

          // 不同类型节点的形状
          if (node.type === 'start' || node.type === 'end') {
            return (
              <g key={node.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={20}
                  fill={node.type === 'start' ? '#d1fae5' : '#fee2e2'}
                  stroke={node.type === 'start' ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="14">
                  {getNodeIcon(node.type)}
                </text>
                <text x={x} y={y + 40} textAnchor="middle" fontSize="12" fill="#374151">
                  {node.name}
                </text>
              </g>
            )
          }

          if (node.type === 'condition') {
            return (
              <g key={node.id}>
                <polygon
                  points={`${x},${y - 25} ${x + 35},${y} ${x},${y + 25} ${x - 35},${y}`}
                  fill="#fef3c7"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#92400e">
                  {node.name}
                </text>
              </g>
            )
          }

          // 普通节点（圆角矩形）
          const width = 120
          const height = 50
          return (
            <g key={node.id}>
              <rect
                x={x - width / 2}
                y={y - height / 2}
                width={width}
                height={height}
                rx={8}
                ry={8}
                {...style}
              />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fill="#374151">
                {node.name}
              </text>
            </g>
          )
        })}
      </svg>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 border border-gray-400"></div>
          <span>待执行</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-500"></div>
          <span>执行中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-500"></div>
          <span>已完成</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 追踪列表组件
// ============================================================================

function TraceList({
  traces,
  selectedTraceId,
  onSelect,
}: {
  traces: TraceRecord[]
  selectedTraceId: string | null
  onSelect: (trace: TraceRecord) => void
}) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
            完成
          </span>
        )
      case 'error':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
            错误
          </span>
        )
      case 'running':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
            运行中
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
            {status}
          </span>
        )
    }
  }

  if (traces.length === 0) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center text-gray-500">
        <p>暂无追踪记录</p>
        <p className="text-sm mt-2">创建行程后，追踪数据将显示在这里</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold">追踪记录 ({traces.length})</h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {traces.map((trace) => (
          <div
            key={trace.id}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
              selectedTraceId === trace.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => onSelect(trace)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{trace.workflowName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(trace.startTime)}
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(trace.status)}
                <div className="text-xs text-gray-500 mt-1">
                  {formatDuration(trace.duration)}
                </div>
              </div>
            </div>
            {trace.error && (
              <div className="mt-2 text-xs text-red-600 truncate">{trace.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// 时间线组件
// ============================================================================

function ExecutionTimeline({ spans }: { spans: TraceSpan[] }) {
  if (spans.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        选择一个追踪记录查看执行详情
      </div>
    )
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getSpanIcon = (type: string) => {
    switch (type) {
      case 'workflow':
        return '📋'
      case 'node':
        return '🔷'
      case 'tool':
        return '🔧'
      case 'llm':
        return '🤖'
      default:
        return '○'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'running':
        return 'bg-amber-500'
      default:
        return 'bg-gray-400'
    }
  }

  // 计算最大持续时间用于进度条
  const maxDuration = Math.max(...spans.map((s) => s.duration || 0))

  return (
    <div className="space-y-3">
      {spans.map((span, idx) => (
        <div key={span.id} className="flex items-start gap-3">
          {/* 时间线连接线 */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(span.status)}`}></div>
            {idx < spans.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 -my-1"></div>
            )}
          </div>

          {/* Span 内容 */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getSpanIcon(span.type)}</span>
              <span className="font-medium">{span.name}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {formatDuration(span.duration)}
              </span>
            </div>

            {/* 进度条 */}
            {span.duration && maxDuration > 0 && (
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStatusColor(span.status)}`}
                  style={{ width: `${(span.duration / maxDuration) * 100}%` }}
                ></div>
              </div>
            )}

            {/* 错误信息 */}
            {span.error && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                {span.error}
              </div>
            )}

            {/* Token 使用 */}
            {span.tokenUsage && (
              <div className="mt-2 text-xs text-gray-500">
                Tokens: {span.tokenUsage.totalTokens}
                (prompt: {span.tokenUsage.promptTokens}, completion:{' '}
                {span.tokenUsage.completionTokens})
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 状态数据查看器组件
// ============================================================================

function StateViewer({ trace }: { trace: TraceRecord | null }) {
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  if (!trace) {
    return (
      <div className="text-center text-gray-500 py-8">
        选择一个追踪记录查看状态数据
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  const renderJson = (data: unknown) => {
    try {
      return (
        <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-[300px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )
    } catch {
      return <span className="text-gray-500">无法解析数据</span>
    }
  }

  const sections: Array<{ key: string; label: string; data: unknown }> = [
    { key: 'input', label: '用户输入', data: trace.input },
    { key: 'output', label: '最终输出', data: trace.output },
    { key: 'metadata', label: '元数据', data: trace.metadata },
    { key: 'spans', label: '执行详情', data: trace.spans },
  ]

  return (
    <div className="space-y-3">
      {sections
        .filter((section) => section.data)
        .map((section) => (
          <div key={section.key} className="border rounded-lg overflow-hidden">
            <button
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition"
              onClick={() => toggleSection(section.key)}
            >
              <span className="font-medium">{section.label}</span>
              <span className="text-gray-400">
                {expandedSections.includes(section.key) ? '▼' : '▶'}
              </span>
            </button>
            {expandedSections.includes(section.key) && (
              <div className="p-4">{renderJson(section.data)}</div>
            )}
          </div>
        ))}
    </div>
  )
}

// ============================================================================
// 统计卡片组件
// ============================================================================

function StatsCards({ stats }: { stats: TraceStats }) {
  const cards = [
    { label: '总执行次数', value: stats.total, color: 'text-blue-600' },
    { label: '成功', value: stats.completed, color: 'text-green-600' },
    { label: '失败', value: stats.failed, color: 'text-red-600' },
    {
      label: '平均耗时',
      value: stats.avgDuration ? `${(stats.avgDuration / 1000).toFixed(1)}s` : '-',
      color: 'text-gray-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 主页面组件
// ============================================================================

export default function WorkflowDebugPage() {
  const { loading: authLoading } = useAuth()
  const [graph, setGraph] = useState<WorkflowGraph | null>(null)
  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [stats, setStats] = useState<TraceStats | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'graph' | 'timeline' | 'data'>('graph')

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 并行获取图结构和追踪数据
      const [graphRes, tracesRes] = await Promise.all([
        fetch('/api/workflow-debug?type=graph'),
        fetch('/api/workflow-debug'),
      ])

      if (!graphRes.ok || !tracesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const graphData = await graphRes.json()
      const tracesData = await tracesRes.json()

      if (graphData.success) {
        setGraph(graphData.data)
      }

      if (tracesData.success) {
        setTraces(tracesData.data.traces || [])
        setStats(tracesData.data.stats || null)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading, fetchData])

  // 清除追踪数据
  const handleClearTraces = async () => {
    if (!confirm('确定要清除所有追踪记录吗？')) return

    try {
      await fetch('/api/workflow-debug', { method: 'DELETE' })
      setTraces([])
      setSelectedTrace(null)
      setStats({
        total: 0,
        completed: 0,
        failed: 0,
        running: 0,
        avgDuration: 0,
        lastTraceTime: null,
      })
    } catch (err) {
      alert('清除失败: ' + (err as Error).message)
    }
  }

  // 获取选中追踪的完成节点
  const completedNodes = selectedTrace
    ? selectedTrace.spans
        .filter((s) => s.status === 'completed')
        .map((s) => s.name.toLowerCase().replace(/\s+/g, '_'))
    : []

  // 获取选中追踪的活跃节点
  const activeNodes = selectedTrace
    ? selectedTrace.spans
        .filter((s) => s.status === 'running')
        .map((s) => s.name.toLowerCase().replace(/\s+/g, '_'))
    : []

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-bold">工作流调试</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                刷新
              </button>
              <button
                onClick={handleClearTraces}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
              >
                清除记录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="mb-6">
            <StatsCards stats={stats} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：追踪列表 */}
          <div className="lg:col-span-1">
            <TraceList
              traces={traces}
              selectedTraceId={selectedTrace?.id || null}
              onSelect={setSelectedTrace}
            />
          </div>

          {/* 右侧：详情区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab 切换 */}
            <div className="flex border-b bg-white rounded-t-lg">
              {[
                { key: 'graph', label: '工作流图' },
                { key: 'timeline', label: '执行时间线' },
                { key: 'data', label: '状态数据' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`px-6 py-3 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 内容 */}
            <div className="bg-white rounded-b-lg rounded-tr-lg border border-t-0 p-4">
              {activeTab === 'graph' && graph && (
                <WorkflowGraphView
                  graph={graph}
                  activeNodes={activeNodes}
                  completedNodes={completedNodes}
                />
              )}
              {activeTab === 'timeline' && (
                <ExecutionTimeline spans={selectedTrace?.spans || []} />
              )}
              {activeTab === 'data' && <StateViewer trace={selectedTrace} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
