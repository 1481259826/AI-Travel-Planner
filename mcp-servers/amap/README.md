# AMap MCP Server

基于 Model Context Protocol (MCP) 的高德地图 API 服务器，为 AI 应用提供地图相关工具。

## 功能特性

- **天气查询** - 获取城市实时天气和未来 3 天预报
- **POI 搜索** - 关键词搜索和周边搜索
- **路线规划** - 驾车、步行、公交路线规划
- **地理编码** - 地址与坐标互转
- **距离计算** - 计算两点间的直线/驾车/步行距离

## 安装

```bash
cd mcp-servers/amap
npm install
npm run build
```

## 配置

### 环境变量

```bash
# 必须：高德 Web 服务 API Key
export AMAP_API_KEY=your_api_key
# 或
export AMAP_WEB_SERVICE_KEY=your_api_key
```

### Claude Desktop 配置

#### stdio 模式（推荐用于生产）

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "amap": {
      "command": "node",
      "args": ["./mcp-servers/amap/dist/index.js"],
      "env": {
        "AMAP_API_KEY": "your_api_key"
      }
    }
  }
}
```

#### SSE 模式（用于开发/调试）

```json
{
  "mcpServers": {
    "amap-sse": {
      "url": "http://localhost:3009/sse"
    }
  }
}
```

## 使用方式

### stdio 模式启动

```bash
npm start
# 或
node dist/index.js
```

### SSE 模式启动

```bash
npm run start:sse
# 或
node dist/index.js --sse --port 3009
```

### 开发模式

```bash
npm run dev  # 自动重载
```

## 工具列表

### 1. get_weather_forecast

获取城市天气预报。

**参数：**
- `city` (string, 必填) - 城市名称
- `extensions` (string, 可选) - `base` 返回实时天气，`all` 返回未来 3 天预报（默认）

**示例：**
```json
{
  "city": "杭州",
  "extensions": "all"
}
```

### 2. search_poi

关键词搜索 POI 地点。

**参数：**
- `keywords` (string, 必填) - 搜索关键词
- `city` (string, 可选) - 城市名称
- `types` (string, 可选) - POI 类型代码
- `city_limit` (boolean, 可选) - 是否仅在指定城市搜索
- `page_size` (number, 可选) - 返回数量，默认 20
- `page` (number, 可选) - 页码，默认 1

**示例：**
```json
{
  "keywords": "西湖",
  "city": "杭州",
  "city_limit": true
}
```

### 3. search_nearby

搜索指定坐标周边的 POI。

**参数：**
- `location` (string, 必填) - 中心点坐标，格式 "经度,纬度"
- `keywords` (string, 可选) - 搜索关键词
- `types` (string, 可选) - POI 类型代码
- `radius` (number, 可选) - 搜索半径（米），默认 1000
- `page_size` (number, 可选) - 返回数量，默认 20

**示例：**
```json
{
  "location": "120.15,30.28",
  "keywords": "酒店",
  "radius": 2000
}
```

### 4. get_driving_route

获取驾车路线规划。

**参数：**
- `origin` (string, 必填) - 起点坐标
- `destination` (string, 必填) - 终点坐标
- `strategy` (number, 可选) - 路线策略（0-速度优先，1-费用优先，2-距离优先，4-躲避拥堵）

**示例：**
```json
{
  "origin": "116.397428,39.90923",
  "destination": "116.494722,39.925539",
  "strategy": 0
}
```

### 5. get_walking_route

获取步行路线规划。

**参数：**
- `origin` (string, 必填) - 起点坐标
- `destination` (string, 必填) - 终点坐标

### 6. get_transit_route

获取公交/地铁换乘路线。

**参数：**
- `origin` (string, 必填) - 起点坐标
- `destination` (string, 必填) - 终点坐标
- `city` (string, 必填) - 城市名称

### 7. geocode

地理编码：将地址转换为坐标。

**参数：**
- `address` (string, 必填) - 地址
- `city` (string, 可选) - 城市名称（提高精度）

**示例：**
```json
{
  "address": "北京市朝阳区阜通东大街6号",
  "city": "北京"
}
```

### 8. reverse_geocode

逆地理编码：将坐标转换为地址。

**参数：**
- `location` (string, 必填) - 坐标，格式 "经度,纬度"
- `extensions` (string, 可选) - `base` 基础地址，`all` 包含周边 POI

### 9. calculate_distance

计算两点之间的距离。

**参数：**
- `origins` (string, 必填) - 起点坐标，多个用 `|` 分隔
- `destination` (string, 必填) - 终点坐标
- `type` (number, 可选) - 0=直线距离，1=驾车距离（默认），3=步行距离

**示例：**
```json
{
  "origins": "116.397428,39.90923|116.494722,39.925539",
  "destination": "116.481028,39.989643",
  "type": 1
}
```

## POI 类型代码

常用类型代码：
- `110000` - 旅游景点
- `050000` - 餐饮服务
- `100000` - 住宿服务
- `120000` - 购物服务
- `150000` - 交通设施
- `080000` - 金融保险

完整列表参考：[高德 POI 分类编码](https://lbs.amap.com/api/webservice/download)

## 开发

### 运行测试

```bash
npm test          # 单次运行
npm run test:watch  # 监听模式
```

### 项目结构

```
mcp-servers/amap/
├── src/
│   ├── index.ts        # 入口文件
│   ├── server.ts       # MCP Server 主类
│   ├── types.ts        # 类型定义
│   ├── tools/          # 工具实现
│   │   ├── weather.ts
│   │   ├── poi.ts
│   │   ├── route.ts
│   │   ├── geocode.ts
│   │   └── distance.ts
│   └── utils/          # 工具函数
│       ├── http.ts
│       └── transform.ts
├── tests/              # 单元测试
├── package.json
├── tsconfig.json
└── README.md
```

## 注意事项

1. **坐标系统**：高德 API 使用 GCJ-02 坐标系（国测局坐标）
2. **API 限制**：注意高德 API 的调用频率限制
3. **代理问题**：代码使用 Node.js 原生 https 模块绕过代理

## 参考资源

- [高德开放平台](https://lbs.amap.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [高德 Web 服务 API 文档](https://lbs.amap.com/api/webservice/summary)
