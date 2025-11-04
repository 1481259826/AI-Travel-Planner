'use client'

import { useEffect } from 'react'
import { Loader2, X, CheckCircle2 } from 'lucide-react'

export interface GenerationStage {
  id: string
  name: string
  description: string
  progress: number // 0-100
  status: 'pending' | 'in_progress' | 'completed' | 'error'
}

interface ProgressModalProps {
  isOpen: boolean
  stages: GenerationStage[]
  currentStage: number
  overallProgress: number
  onCancel?: () => void
  canCancel?: boolean
}

export default function ProgressModal({
  isOpen,
  stages,
  currentStage,
  overallProgress,
  onCancel,
  canCancel = false,
}: ProgressModalProps) {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              正在生成旅行计划
            </h3>
            {canCancel && onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="取消"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Overall Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                总体进度
              </span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Stages List */}
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className={`p-3 rounded-lg transition-all duration-300 ${
                  stage.status === 'in_progress'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : stage.status === 'completed'
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : stage.status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : stage.status === 'in_progress' ? (
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    ) : stage.status === 'error' ? (
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4
                        className={`text-sm font-medium ${
                          stage.status === 'in_progress'
                            ? 'text-blue-900 dark:text-blue-200'
                            : stage.status === 'completed'
                            ? 'text-green-900 dark:text-green-200'
                            : stage.status === 'error'
                            ? 'text-red-900 dark:text-red-200'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {stage.name}
                      </h4>
                      {stage.status === 'in_progress' && stage.progress > 0 && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {Math.round(stage.progress)}%
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs ${
                        stage.status === 'in_progress'
                          ? 'text-blue-700 dark:text-blue-300'
                          : stage.status === 'completed'
                          ? 'text-green-700 dark:text-green-300'
                          : stage.status === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-500 dark:text-gray-500'
                      }`}
                    >
                      {stage.description}
                    </p>

                    {/* Stage Progress Bar */}
                    {stage.status === 'in_progress' && stage.progress > 0 && (
                      <div className="mt-2 h-1 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
            请耐心等待，这可能需要 30-60 秒...
          </p>
        </div>
      </div>
    </div>
  )
}
