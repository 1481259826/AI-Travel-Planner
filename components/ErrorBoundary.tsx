'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * React Error Boundary 组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 *
 * 使用示例:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      errorInfo,
    })

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // TODO: 在生产环境中，可以将错误发送到错误追踪服务（如 Sentry）
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback UI，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

/**
 * 默认错误降级 UI
 */
function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error | null
  onReset: () => void
}) {
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">出错了</h1>
            <p className="text-sm text-gray-600">应用遇到了一个意外错误</p>
          </div>
        </div>

        {isDev && error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-mono text-red-800 mb-2">
              <strong>错误信息:</strong> {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-red-700 cursor-pointer hover:text-red-900">
                  查看堆栈跟踪
                </summary>
                <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-48">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            重新加载页面
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            返回首页
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            如果问题持续出现，请尝试清除浏览器缓存或联系技术支持
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 函数式 Error Boundary（用于简单场景）
 * 注意：这只是一个包装器，实际的错误捕获仍由 class 组件完成
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

export default ErrorBoundary
