'use client'

/**
 * TripCompletionCard - 生成完成卡片
 * 展示生成完成后的行程概要和跳转链接
 */

import React from 'react'
import Link from 'next/link'

interface TripCompletionCardProps {
  tripId: string
  destination: string
  startDate: string
  endDate: string
  totalDays: number
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function TripCompletionCard({
  tripId,
  destination,
  startDate,
  endDate,
  totalDays,
}: TripCompletionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden max-w-md">
      {/* 头部 - 成功状态 */}
      <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <h3 className="font-medium text-green-700 dark:text-green-300">
            行程生成完成！
          </h3>
        </div>
      </div>

      {/* 内容 - 行程概要 */}
      <div className="p-4">
        {/* 目的地大标题 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🗺️</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {destination} {totalDays}日游
          </h2>
        </div>

        {/* 日期信息 */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
        </div>

        {/* 功能提示 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            您的行程已生成完毕！点击下方按钮查看详细行程安排，包括每日景点、餐饮、住宿等信息。
          </p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-3">
        <Link
          href={`/dashboard/trips/${tripId}`}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          查看详情
        </Link>
        <Link
          href={`/dashboard/trips/${tripId}/print`}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          打印
        </Link>
      </div>
    </div>
  )
}
