'use client'

import { useState } from 'react'
import { useItineraryStore } from '@/lib/stores/itinerary-store'
import type { Trip } from '@/types'

interface EditModeControlsProps {
  trip: Trip
  onSaveSuccess?: () => void
}

/**
 * 编辑模式控制按钮
 * 提供进入编辑、保存修改、取消编辑功能
 */
export default function EditModeControls({ trip, onSaveSuccess }: EditModeControlsProps) {
  const { isEditMode, enterEditMode, exitEditMode, saveChanges, discardChanges } = useItineraryStore()
  const [isSaving, setIsSaving] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // 进入编辑模式
  const handleEnterEdit = () => {
    enterEditMode(trip)
  }

  // 保存修改
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveChanges()
      onSaveSuccess?.() // 通知父组件刷新数据
    } catch (error) {
      console.error('Failed to save changes:', error)
      alert('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 取消编辑（显示确认对话框）
  const handleCancel = () => {
    setShowDiscardDialog(true)
  }

  // 确认放弃修改
  const handleConfirmDiscard = () => {
    discardChanges()
    exitEditMode()
    setShowDiscardDialog(false)
  }

  // 取消放弃（继续编辑）
  const handleCancelDiscard = () => {
    setShowDiscardDialog(false)
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {!isEditMode ? (
          // 非编辑模式：显示"编辑"按钮
          <button
            onClick={handleEnterEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            编辑行程
          </button>
        ) : (
          // 编辑模式：显示"保存"和"取消"按钮
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  保存中...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  保存修改
                </>
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              取消
            </button>
          </>
        )}
      </div>

      {/* 放弃修改确认对话框 */}
      {showDiscardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  确认放弃修改？
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  您的所有修改将会丢失，此操作无法撤销。
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancelDiscard}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    继续编辑
                  </button>
                  <button
                    onClick={handleConfirmDiscard}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    确认放弃
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
