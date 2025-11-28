/**
 * Prometheus Metrics API Endpoint
 * Phase 5.4: 提供 Prometheus 格式的指标端点
 *
 * 端点:
 * - GET /api/metrics - 返回 Prometheus 格式的指标
 * - GET /api/metrics?format=json - 返回 JSON 格式的指标摘要
 *
 * 配置:
 * - LANGGRAPH_METRICS_ENABLED - 是否启用指标收集 (默认 true)
 * - LANGGRAPH_METRICS_PREFIX - 指标名称前缀 (默认 "langgraph")
 * - LANGGRAPH_METRICS_AUTH_TOKEN - 可选的认证令牌
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMetricsCollector } from '@/lib/agents/metrics'

/**
 * 验证请求认证（可选）
 */
function validateAuth(request: NextRequest): boolean {
  const authToken = process.env.LANGGRAPH_METRICS_AUTH_TOKEN
  if (!authToken) {
    // 未配置认证令牌，允许所有请求
    return true
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return false
  }

  // 支持 Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/)
  if (match && match[1] === authToken) {
    return true
  }

  // 支持直接 token
  return authHeader === authToken
}

/**
 * GET /api/metrics
 * 返回 Prometheus 或 JSON 格式的指标
 */
export async function GET(request: NextRequest) {
  // 验证认证
  if (!validateAuth(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const metrics = getMetricsCollector()

    // 检查是否禁用了指标收集
    if (!metrics.isEnabled()) {
      return new NextResponse(
        '# Metrics collection is disabled\n',
        {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          },
        }
      )
    }

    // 检查请求格式
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format === 'json') {
      // 返回 JSON 格式
      const summary = metrics.getMetricsSummary()
      return NextResponse.json(summary)
    }

    // 默认返回 Prometheus 格式
    const prometheusMetrics = metrics.getMetrics()

    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Metrics API] Error:', error)
    return new NextResponse(
      `# Error collecting metrics: ${(error as Error).message}\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      }
    )
  }
}

/**
 * POST /api/metrics/reset
 * 重置所有指标（仅用于测试/开发）
 */
export async function POST(request: NextRequest) {
  // 验证认证
  if (!validateAuth(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 仅在开发环境允许重置
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Reset not allowed in production', { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'reset') {
      const metrics = getMetricsCollector()
      metrics.reset()
      return NextResponse.json({ success: true, message: 'Metrics reset' })
    }

    return new NextResponse('Unknown action', { status: 400 })
  } catch (error) {
    console.error('[Metrics API] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
