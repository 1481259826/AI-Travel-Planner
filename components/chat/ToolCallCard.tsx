/**
 * ToolCallCard 组件
 * 展示工具调用信息
 */

'use client'

import { useState } from 'react'
import {
  MapPin,
  Hotel,
  Utensils,
  Cloud,
  Route,
  Calendar,
  Search,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { ToolCall } from '@/lib/chat'

// ============================================================================
// 类型定义
// ============================================================================

interface ToolCallCardProps {
  /** 工具调用信息 */
  toolCall: ToolCall
  /** 工具执行结果 */
  result?: unknown
  /** 是否正在执行 */
  isExecuting?: boolean
  /** 是否执行失败 */
  hasError?: boolean
}

// ============================================================================
// 工具图标和描述映射
// ============================================================================

const TOOL_INFO: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  search_attractions: {
    icon: MapPin,
    label: '搜索景点',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  },
  search_hotels: {
    icon: Hotel,
    label: '搜索酒店',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  },
  search_restaurants: {
    icon: Utensils,
    label: '搜索餐厅',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
  },
  get_weather: {
    icon: Cloud,
    label: '获取天气',
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30',
  },
  calculate_route: {
    icon: Route,
    label: '计算路线',
    color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
  },
  create_trip: {
    icon: Calendar,
    label: '创建行程',
    color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30',
  },
  modify_itinerary: {
    icon: Edit3,
    label: '修改行程',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  },
  get_trip_details: {
    icon: Search,
    label: '获取行程详情',
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
  },
  get_recommendations: {
    icon: Sparkles,
    label: '获取推荐',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30',
  },
}

// ============================================================================
// 组件实现
// ============================================================================

export function ToolCallCard({
  toolCall,
  result,
  isExecuting = false,
  hasError = false,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toolName = toolCall.function.name
  const toolInfo = TOOL_INFO[toolName] || {
    icon: Sparkles,
    label: toolName,
    color: 'text-gray-500 bg-gray-50 dark:bg-gray-900/30',
  }

  const Icon = toolInfo.icon

  // 解析参数
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch {
    // 忽略解析错误
  }

  /**
   * 渲染参数摘要
   */
  const renderArgsSummary = () => {
    const keys = Object.keys(args)
    if (keys.length === 0) return null

    // 取前两个关键参数展示
    const summaryArgs = keys.slice(0, 2).map((key) => {
      const value = args[key]
      const displayValue =
        typeof value === 'string'
          ? value.length > 20
            ? value.slice(0, 20) + '...'
            : value
          : JSON.stringify(value)
      return `${key}: ${displayValue}`
    })

    return (
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {summaryArgs.join(', ')}
        {keys.length > 2 && ` +${keys.length - 2} 更多`}
      </span>
    )
  }

  /**
   * 渲染状态图标
   */
  const renderStatusIcon = () => {
    if (isExecuting) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    }
    if (hasError) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }
    if (result !== undefined) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    }
    return null
  }

  return (
    <div
      className={`rounded-lg border dark:border-gray-700 overflow-hidden my-2 ${toolInfo.color}`}
    >
      {/* 头部 */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-medium text-sm">{toolInfo.label}</span>
          {renderArgsSummary()}
        </div>

        <div className="flex items-center gap-2">
          {renderStatusIcon()}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t dark:border-gray-700 p-3 bg-white/50 dark:bg-gray-800/50">
          {/* 参数 */}
          {Object.keys(args).length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                参数
              </h4>
              <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* 结果 */}
          {result !== undefined && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {hasError ? '错误' : '结果'}
              </h4>
              <pre
                className={`text-xs p-2 rounded overflow-x-auto max-h-40 ${
                  hasError
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-900'
                }`}
              >
                {typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* 执行中提示 */}
          {isExecuting && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在执行...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ToolCallCard
