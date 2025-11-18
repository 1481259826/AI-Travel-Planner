'use client'

interface InfoBoxProps {
  /** 标题 */
  title: string
  /** 颜色主题 */
  variant?: 'blue' | 'amber'
  /** 子内容 */
  children: React.ReactNode
}

/**
 * 信息提示框组件
 * 用于显示使用说明、注意事项等信息
 */
export default function InfoBox({ title, variant = 'blue', children }: InfoBoxProps) {
  const colorClasses = {
    blue: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      title: 'text-blue-900 dark:text-blue-300',
      content: 'text-blue-800 dark:text-blue-400'
    },
    amber: {
      container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      title: 'text-amber-900 dark:text-amber-300',
      content: 'text-amber-800 dark:text-amber-400'
    }
  }

  const colors = colorClasses[variant]

  return (
    <div className={`border rounded-lg p-4 ${colors.container}`}>
      <h4 className={`text-sm font-medium mb-2 ${colors.title}`}>
        {title}
      </h4>
      <div className={`text-sm ${colors.content}`}>
        {children}
      </div>
    </div>
  )
}
