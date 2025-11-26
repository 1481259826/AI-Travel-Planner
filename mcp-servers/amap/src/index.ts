#!/usr/bin/env node
/**
 * AMap MCP Server 入口文件
 *
 * 支持两种启动模式：
 * 1. stdio 模式（默认）：用于生产环境，通过标准输入输出通信
 * 2. SSE 模式：用于开发环境，通过 HTTP Server-Sent Events 通信
 *
 * 使用方式：
 * - stdio 模式：node dist/index.js
 * - SSE 模式：node dist/index.js --sse [--port 3009]
 */

import { startStdioServer, createAmapServer } from './server.js'
import http from 'node:http'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'

/**
 * 解析命令行参数
 */
function parseArgs(): { mode: 'stdio' | 'sse'; port: number } {
  const args = process.argv.slice(2)
  let mode: 'stdio' | 'sse' = 'stdio'
  let port = 3009

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sse') {
      mode = 'sse'
    } else if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10)
      i++
    }
  }

  return { mode, port }
}

/**
 * 启动 SSE HTTP 服务器
 */
async function startSSEServer(port: number): Promise<void> {
  const server = createAmapServer()

  // 存储活跃的传输连接
  const transports = new Map<string, SSEServerTransport>()

  const httpServer = http.createServer(async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`)

    // 健康检查端点
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', mode: 'sse' }))
      return
    }

    // SSE 连接端点
    if (url.pathname === '/sse' && req.method === 'GET') {
      console.error('New SSE connection')

      // 创建 SSE 传输
      const transport = new SSEServerTransport('/messages', res as any)
      const sessionId = Math.random().toString(36).substring(7)
      transports.set(sessionId, transport)

      // 连接关闭时清理
      res.on('close', () => {
        console.error('SSE connection closed:', sessionId)
        transports.delete(sessionId)
      })

      // 连接服务器
      await server.connect(transport)
      return
    }

    // 消息接收端点
    if (url.pathname === '/messages' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          // 找到对应的传输并处理消息
          // 注意：这是简化实现，实际可能需要更复杂的会话管理
          for (const transport of transports.values()) {
            // 发送消息到传输
            await (transport as any).handlePostMessage?.(req, res, body)
          }
        } catch (error) {
          console.error('Error handling message:', error)
          res.writeHead(500)
          res.end('Internal Server Error')
        }
      })
      return
    }

    // 404 其他路由
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not Found' }))
  })

  httpServer.listen(port, () => {
    console.error(`AMap MCP Server started (SSE mode) at http://localhost:${port}`)
    console.error('Endpoints:')
    console.error(`  - SSE: http://localhost:${port}/sse`)
    console.error(`  - Health: http://localhost:${port}/health`)
  })

  // 优雅关闭
  process.on('SIGINT', () => {
    console.error('\nShutting down...')
    httpServer.close()
    process.exit(0)
  })
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  // 检查 API Key
  const apiKey = process.env.AMAP_API_KEY || process.env.AMAP_WEB_SERVICE_KEY
  if (!apiKey) {
    console.error('Error: AMAP_API_KEY or AMAP_WEB_SERVICE_KEY environment variable is required')
    process.exit(1)
  }

  const { mode, port } = parseArgs()

  console.error('AMap MCP Server')
  console.error('================')
  console.error(`Mode: ${mode}`)
  console.error(`API Key: ${apiKey.substring(0, 8)}...`)

  if (mode === 'sse') {
    await startSSEServer(port)
  } else {
    await startStdioServer()
  }
}

// 运行主函数
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
