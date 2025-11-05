'use client'

import { useState } from 'react'
import { Activity } from '@/types'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (activity: Activity) => void
  dayNumber: number
}

/**
 * 添加活动模态框
 * 允许用户手动添加新的景点/活动到行程中
 */
export default function AddItemModal({ isOpen, onClose, onAdd, dayNumber }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'attraction' as Activity['type'],
    time: '',
    duration: '',
    locationName: '',
    locationAddress: '',
    locationLat: 0,
    locationLng: 0,
    description: '',
    ticketPrice: '',
    tips: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 验证表单
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入活动名称'
    }
    if (!formData.time) {
      newErrors.time = '请选择时间'
    }
    if (!formData.locationName.trim()) {
      newErrors.locationName = '请输入地点名称'
    }
    if (!formData.locationAddress.trim()) {
      newErrors.locationAddress = '请输入地点地址'
    }
    if (!formData.description.trim()) {
      newErrors.description = '请输入活动描述'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    const newActivity: Activity = {
      time: formData.time,
      name: formData.name,
      type: formData.type,
      location: {
        name: formData.locationName,
        address: formData.locationAddress,
        lat: formData.locationLat || 0,
        lng: formData.locationLng || 0,
      },
      duration: formData.duration || '1小时',
      description: formData.description,
      ticket_price: formData.ticketPrice ? parseFloat(formData.ticketPrice) : undefined,
      tips: formData.tips || undefined,
    }

    onAdd(newActivity)
    handleClose()
  }

  // 关闭并重置表单
  const handleClose = () => {
    setFormData({
      name: '',
      type: 'attraction',
      time: '',
      duration: '',
      locationName: '',
      locationAddress: '',
      locationLat: 0,
      locationLng: 0,
      description: '',
      ticketPrice: '',
      tips: '',
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* 标题 */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            添加活动 - 第 {dayNumber} 天
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 活动名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              活动名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="例如：故宫博物院"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* 活动类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              活动类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Activity['type'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="attraction">🎯 景点</option>
              <option value="shopping">🛍️ 购物</option>
              <option value="entertainment">🎭 娱乐</option>
              <option value="relaxation">🧘 休闲</option>
            </select>
          </div>

          {/* 时间和时长 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                开始时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  errors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                游玩时长
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="例如：2小时"
              />
            </div>
          </div>

          {/* 地点信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              地点名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.locationName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="例如：故宫博物院"
            />
            {errors.locationName && <p className="text-red-500 text-sm mt-1">{errors.locationName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              详细地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.locationAddress}
              onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.locationAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="例如：北京市东城区景山前街4号"
            />
            {errors.locationAddress && <p className="text-red-500 text-sm mt-1">{errors.locationAddress}</p>}
          </div>

          {/* 活动描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              活动描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="简要描述这个活动的特点和看点"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* 门票价格（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              门票价格（可选）
            </label>
            <input
              type="number"
              value={formData.ticketPrice}
              onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="例如：60"
              min="0"
              step="0.01"
            />
          </div>

          {/* 旅行建议（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              旅行建议（可选）
            </label>
            <textarea
              value={formData.tips}
              onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="例如：建议提前预约门票，避开周末高峰"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加活动
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
