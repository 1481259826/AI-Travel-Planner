'use client'

/**
 * TripGenerationProgress - 内联进度显示组件
 * 在对话流中展示行程生成的实时进度
 */

import React from 'react'
import type { GenerationStage } from '@/lib/chat/types'

interface TripGenerationProgressProps {
  destination: string
  days: number
  stages: GenerationStage[]
  currentStage: number
  progress: number
  error?: string | null
  onCancel?: () => void
}

/**
 * 状态图标映射
 */
const STATUS_ICONS: Record<GenerationStage['status'], string> = {
  pending: '⏳',
  running: '🔄',
  completed: '✅',
  error: '❌',
}

/**
 * 进度条组件
 */
function ProgressBar({ progress, status }: { progress: number; status: GenerationStage['status'] }) {
  const getColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'running':
        return 'bg-blue-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-300 dark:bg-gray-600'
    }
  }

  return (
    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${getColor()}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

export default function TripGenerationProgress({
  destination,
  days,
  stages,
  currentStage,
  progress,
  error,
  onCancel,
}: TripGenerationProgressProps) {
  const isComplete = progress >= 100 && !error
  const hasError = !!error

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden max-w-md">
      {/* 头部 */}
      <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${
        hasError
          ? 'bg-red-50 dark:bg-red-900/20'
          : isComplete
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-blue-50 dark:bg-blue-900/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {hasError ? '❌' : isComplete ? '🎉' : '✈️'}
            </span>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {hasError
                ? '生成失败'
                : isComplete
                ? '行程生成完成'
                : `正在生成${destination} ${days}日游行程...`}
            </h3>
          </div>
          {!isComplete && !hasError && onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* 进度列表 */}
      <div className="p-4 space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-3">
            {/* 状态图标 */}
            <span className={`text-sm ${
              stage.status === 'running' ? 'animate-spin' : ''
            }`}>
              {STATUS_ICONS[stage.status]}
            </span>

            {/* 名称 */}
            <span className={`text-sm min-w-[80px] ${
              stage.status === 'completed'
                ? 'text-green-600 dark:text-green-400'
                : stage.status === 'running'
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : stage.status === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {stage.name}
            </span>

            {/* 进度条 */}
            <ProgressBar
              progress={stage.progress || (stage.status === 'completed' ? 100 : 0)}
              status={stage.status}
            />

            {/* 进度百分比 */}
            <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px] text-right">
              {stage.status === 'completed'
                ? '100%'
                : stage.status === 'running'
                ? `${stage.progress || 0}%`
                : '0%'}
            </span>
          </div>
        ))}
      </div>

      {/* 错误信息 */}
      {hasError && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* 总进度 */}
      {!isComplete && !hasError && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">总进度</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{progress}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
