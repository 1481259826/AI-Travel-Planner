'use client'

import { useState } from 'react'
import { Trip } from '@/types'
import { getShareUrl, copyToClipboard, formatShareText, generateShareToken } from '@/lib/share'
import { supabase } from '@/lib/supabase'

interface ShareButtonProps {
  trip: Trip
  onShareUpdate?: (shareToken: string, isPublic: boolean) => void
}

export default function ShareButton({ trip, onShareUpdate }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPublic, setIsPublic] = useState(trip.is_public)
  const [shareToken, setShareToken] = useState(trip.share_token || '')
  const [showCopied, setShowCopied] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [error, setError] = useState('')

  const shareUrl = shareToken ? getShareUrl(shareToken) : ''

  // 生成或更新分享链接
  const handleGenerateShare = async (publicStatus: boolean) => {
    setIsLoading(true)
    setError('')

    try {
      // 生成新的 token（如果还没有）或使用现有的
      const newShareToken = shareToken || generateShareToken()

      // 直接使用 Supabase 客户端更新行程
      const { data, error } = await supabase
        .from('trips')
        .update({
          share_token: newShareToken,
          is_public: publicStatus
        })
        .eq('id', trip.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || '更新分享设置失败')
      }

      setShareToken(newShareToken)
      setIsPublic(publicStatus)

      if (onShareUpdate) {
        onShareUpdate(newShareToken, publicStatus)
      }
    } catch (err: any) {
      console.error('Share error:', err)
      setError(err.message || '操作失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 切换公开/私密状态
  const handleTogglePublic = async () => {
    const newStatus = !isPublic
    await handleGenerateShare(newStatus)
  }

  // 复制链接
  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } else {
      setError('复制失败，请手动复制')
    }
  }

  // 分享到社交平台（可选）
  const handleShareToSocial = (platform: 'wechat' | 'weibo' | 'twitter') => {
    const text = formatShareText(trip)
    const url = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(text)

    let shareLink = ''
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`
        break
      case 'weibo':
        shareLink = `http://service.weibo.com/share/share.php?title=${encodedText}&url=${url}`
        break
      default:
        // 微信需要扫码，显示二维码
        setShowQRCode(true)
        return
    }

    window.open(shareLink, '_blank')
  }

  return (
    <>
      {/* 分享按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        分享行程
      </button>

      {/* 分享弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">分享行程</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* 公开/私密切换 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">公开分享</p>
                  <p className="text-sm text-gray-600">允许任何人通过链接访问</p>
                </div>
                <button
                  onClick={handleTogglePublic}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-blue-600' : 'bg-gray-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 分享链接 */}
            {shareToken && isPublic && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分享链接
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    {showCopied ? '已复制!' : '复制'}
                  </button>
                </div>
              </div>
            )}

            {/* 二维码 */}
            {shareToken && isPublic && (
              <div className="mb-4">
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showQRCode ? '隐藏二维码' : '显示二维码'}
                </button>

                {showQRCode && (
                  <div className="mt-3 flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        shareUrl
                      )}`}
                      alt="分享二维码"
                      className="w-48 h-48"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 社交平台分享 */}
            {shareToken && isPublic && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">分享到</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleShareToSocial('wechat')}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    微信
                  </button>
                  <button
                    onClick={() => handleShareToSocial('weibo')}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    微博
                  </button>
                  <button
                    onClick={() => handleShareToSocial('twitter')}
                    className="flex-1 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Twitter
                  </button>
                </div>
              </div>
            )}

            {/* 提示信息 */}
            {!isPublic && (
              <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                开启公开分享后，任何拥有链接的人都可以查看此行程
              </p>
            )}

            {/* 关闭按钮 */}
            <div className="mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
