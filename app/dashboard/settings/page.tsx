'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Shield, Settings2, Key, FileStack } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProfileForm from '@/components/settings/ProfileForm'
import PasswordChangeForm from '@/components/settings/PasswordChangeForm'
import PreferencesForm from '@/components/settings/PreferencesForm'
import ApiKeyManager from '@/components/settings/ApiKeyManager'
import { TemplateManager } from '@/components/templates'

type TabId = 'profile' | 'security' | 'preferences' | 'api-keys' | 'templates'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const tabs: Tab[] = [
    { id: 'profile', label: '账户信息', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: '安全', icon: <Shield className="w-4 h-4" /> },
    { id: 'preferences', label: '偏好设置', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
    { id: 'templates', label: '旅行模板', icon: <FileStack className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">管理您的账户和偏好</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[240px_1fr] gap-6">
            {/* Sidebar Navigation - Desktop */}
            <nav className="hidden md:block">
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Tab Navigation - Mobile */}
            <div className="md:hidden">
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-1 flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    账户信息
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    管理您的个人信息和头像
                  </p>
                  <ProfileForm />
                </div>
              )}

              {activeTab === 'security' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    安全设置
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    修改密码和管理账户安全
                  </p>
                  <PasswordChangeForm />
                </div>
              )}

              {activeTab === 'preferences' && (
                <div>
                  <PreferencesForm />
                </div>
              )}

              {activeTab === 'api-keys' && <ApiKeyManager />}

              {activeTab === 'templates' && <TemplateManager />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
