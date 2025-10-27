'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted state
    setMounted(true)

    // Check if already installed (only on client)
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)

      // Don't show again for 7 days after dismissal
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()

      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show the install prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 2000)
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      localStorage.removeItem('pwa-install-dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Prevent hydration mismatch
  if (!mounted || !showPrompt || isInstalled) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Icon and message */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">安装 AI 旅行规划</p>
                <p className="text-xs opacity-90 mt-0.5">
                  离线访问，快速启动，获得更好的体验
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                安装
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
