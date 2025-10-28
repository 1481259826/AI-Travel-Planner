import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import OfflineIndicator from '@/components/OfflineIndicator'
import SyncStatus from '@/components/SyncStatus'
import InstallPrompt from '@/components/InstallPrompt'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Travel Planner - 智能旅行规划师',
  description: '基于 AI 技术的智能旅行规划助手，提供行程规划、费用管理和实时旅行辅助',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI 旅行规划',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* 防止主题闪烁的脚本 - 必须在页面渲染前执行 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 从 localStorage 读取主题设置
                  const stored = localStorage.getItem('theme-storage');
                  if (stored) {
                    const { state } = JSON.parse(stored);
                    const theme = state?.theme || 'system';

                    // 确定实际主题
                    let actualTheme = theme;
                    if (theme === 'system') {
                      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }

                    // 立即应用主题类到 html 元素
                    document.documentElement.classList.remove('light', 'dark');
                    document.documentElement.classList.add(actualTheme);
                  }
                } catch (e) {
                  console.error('Failed to load theme:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <InstallPrompt />
          <OfflineIndicator />
          {children}
          <SyncStatus />
        </Providers>
      </body>
    </html>
  )
}
