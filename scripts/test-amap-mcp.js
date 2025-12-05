/**
 * 测试高德 MCP 服务
 *
 * 运行: node scripts/test-amap-mcp.js
 */

const API_KEY = process.env.AMAP_WEB_SERVICE_KEY || 'f911cd462369023d80b4229b791220e9'
const MCP_URL = 'https://mcp.amap.com/mcp'

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
}

async function testMCP() {
  console.log('Testing Amap MCP Service...')
  console.log('API Key:', API_KEY.substring(0, 8) + '...')

  // 1. 先初始化连接
  const initResponse = await fetch(MCP_URL + `?key=${API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    }),
  })

  console.log('\n=== Initialize Response ===')
  console.log('Status:', initResponse.status)
  const initData = await initResponse.text()
  console.log('Body:', initData)

  // 2. 列出工具
  const listResponse = await fetch(MCP_URL + `?key=${API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    }),
  })

  console.log('\n=== List Tools Response ===')
  console.log('Status:', listResponse.status)
  const listData = await listResponse.json()
  console.log('Tools:', listData.result?.tools?.map(t => t.name))

  // 找到 maps_schema_personal_map 工具的参数定义
  const personalMapTool = listData.result?.tools?.find(t => t.name === 'maps_schema_personal_map')
  if (personalMapTool) {
    console.log('\n=== maps_schema_personal_map Tool Definition ===')
    console.log(JSON.stringify(personalMapTool, null, 2))
  }

  // 3. 调用 maps_schema_personal_map（使用正确的参数格式）
  const callResponse = await fetch(MCP_URL + `?key=${API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'maps_schema_personal_map',
        arguments: {
          orgName: '测试行程',
          lineList: [
            {
              title: '第一天',
              pointInfoList: [
                { name: '西湖', lon: 120.148, lat: 30.242, poiId: '' },
                { name: '灵隐寺', lon: 120.101, lat: 30.240, poiId: '' },
              ],
            },
          ],
        },
      },
    }),
  })

  console.log('\n=== Call maps_schema_personal_map Response ===')
  console.log('Status:', callResponse.status)
  const callData = await callResponse.text()
  console.log('Body:', callData)

  // 4. 尝试不同的参数格式
  const callResponse2 = await fetch(MCP_URL + `?key=${API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'maps_schema_personal_map',
        arguments: {
          name: '测试行程',
          locations: [
            { name: '西湖', location: '120.148,30.242' },
            { name: '灵隐寺', location: '120.101,30.240' },
          ],
        },
      },
    }),
  })

  console.log('\n=== Call with different params Response ===')
  console.log('Status:', callResponse2.status)
  const callData2 = await callResponse2.text()
  console.log('Body:', callData2)
}

testMCP().catch(console.error)
