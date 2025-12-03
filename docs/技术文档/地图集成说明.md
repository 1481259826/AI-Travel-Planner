# 地图集成功能说明

## 功能概述

AI 旅行规划师现已集成高德地图功能，可在行程详情页面显示景点位置、餐饮推荐，并支持智能路线规划。

## 主要特性

### ✅ 已实现功能

1. **地图显示**
   - 自动加载高德地图 Web API
   - 响应式布局，支持移动端和桌面端
   - 3D 视图，支持俯仰角和缩放

2. **景点标注**
   - 自动提取行程中的所有活动景点和餐饮地点
   - 使用不同图标区分景点类型（🎯 活动、🍽️ 餐饮）
   - 标记按时间顺序编号

3. **详情显示**
   - 点击标记显示信息窗口
   - 展示景点/餐厅名称、时间、类型
   - 显示详细描述信息

4. **路线规划**
   - 支持一键开启/关闭路线显示
   - 使用高德驾车路线规划 API
   - 自动计算最快捷路线
   - 多段路线自动连接

5. **交互控制**
   - 显示/隐藏地图切换按钮
   - 显示/隐藏路线切换按钮
   - 地图缩放、平移等基础操作
   - 图例说明

6. **错误处理**
   - API Key 未配置时友好提示
   - API 加载失败时错误提示
   - 加载状态动画显示

## 配置步骤

### 1. 获取高德地图 API Key

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册/登录账号
3. 进入控制台 → 应用管理 → 我的应用
4. 创建新应用（如果没有）
5. 添加 Key：
   - 选择 **Web 端（JS API）**
   - 输入应用名称
   - 配置允许的域名（本地开发可填 `localhost`）
6. 复制生成的 Key

### 2. 配置环境变量

在项目根目录创建或编辑 `.env.local` 文件：

```bash
# 必需：高德地图 API Key
NEXT_PUBLIC_MAP_API_KEY=your_amap_key_here

# 可选：安全密钥（推荐配置以防止盗用）
# NEXT_PUBLIC_MAP_SECURITY_KEY=your_security_key_here
```

### 3. 重启开发服务器

```bash
npm run dev
```

## 使用说明

### 用户操作指南

1. **查看地图**
   - 进入任意行程详情页面
   - 向下滚动到"行程地图"卡片
   - 如果行程中包含位置信息，地图将自动显示

2. **查看景点详情**
   - 点击地图上的标记点
   - 信息窗口会显示景点/餐厅详细信息

3. **查看路线规划**
   - 点击"显示路线"按钮
   - 地图将绘制推荐的行进路线
   - 蓝色线路为驾车推荐路线

4. **隐藏地图**
   - 点击"隐藏地图"按钮可折叠地图视图
   - 节省页面空间

### 开发者使用指南

#### 基础用法

```tsx
import MapView, { extractLocationsFromItinerary } from '@/components/MapView'

// 从行程数据提取位置
const locations = extractLocationsFromItinerary(
  day.activities,
  day.meals
)

// 渲染地图
<MapView
  locations={locations}
  showRoute={true}
  className="w-full h-96"
/>
```

#### 组件 Props

```typescript
interface MapViewProps {
  locations: MapLocation[]      // 位置数组（必需）
  center?: { lat: number; lng: number }  // 地图中心点（可选）
  zoom?: number                  // 缩放级别，默认 13
  showRoute?: boolean            // 是否显示路线，默认 false
  className?: string             // 自定义样式类
}

interface MapLocation {
  name: string                   // 位置名称
  lat: number                    // 纬度
  lng: number                    // 经度
  type: 'activity' | 'meal'      // 位置类型
  description?: string           // 描述信息
  time?: string                  // 时间
}
```

#### 辅助函数

```typescript
// 从行程数据提取位置信息
extractLocationsFromItinerary(
  activities: Activity[],
  meals: Meal[]
): MapLocation[]
```

## 技术实现

### 架构设计

```
components/MapView.tsx
├── 动态加载高德地图 SDK
├── 地图实例初始化
├── 标记点管理
├── 信息窗口显示
├── 路线规划
└── 错误处理
```

### 核心功能

1. **动态加载 SDK**
   - 使用 Script 标签动态加载
   - 避免 SSR 问题
   - 支持安全密钥配置

2. **地图初始化**
   - 自动计算中心点
   - 3D 视图渲染
   - 添加缩放、比例尺等控件

3. **标记管理**
   - 自动创建标记点
   - 支持自定义图标和标签
   - 点击事件处理

4. **路线规划**
   - 使用 AMap.Driving API
   - 分段绘制路线
   - 自适应视野范围

## 数据要求

### 位置数据格式

行程数据中的位置信息必须包含经纬度：

```typescript
{
  "activities": [{
    "name": "故宫博物院",
    "location": {
      "name": "故宫博物院",
      "address": "北京市东城区景山前街4号",
      "lat": 39.916345,
      "lng": 116.397155
    }
  }],
  "meals": [{
    "restaurant": "全聚德烤鸭店",
    "location": {
      "name": "全聚德(前门店)",
      "address": "北京市东城区前门大街30号",
      "lat": 39.899124,
      "lng": 116.397516
    }
  }]
}
```

### AI 生成建议

在 AI 生成行程时，需确保返回的数据包含准确的经纬度信息：

```
请为每个景点和餐厅提供准确的经纬度坐标，格式如下：
{
  "location": {
    "name": "景点名称",
    "address": "详细地址",
    "lat": 纬度（数字）,
    "lng": 经度（数字）
  }
}
```

## 常见问题

### Q1: 地图无法显示？

**解决方案：**
1. 检查 `.env.local` 文件是否配置了 `NEXT_PUBLIC_MAP_API_KEY`
2. 确认 API Key 是否正确
3. 检查高德控制台中 Key 的域名配置
4. 查看浏览器控制台错误信息

### Q2: 提示"地图 API Key 未配置"？

**解决方案：**
1. 确认 `.env.local` 文件存在且配置正确
2. 重启开发服务器 (`npm run dev`)
3. 确保环境变量名为 `NEXT_PUBLIC_MAP_API_KEY`（注意大小写）

### Q3: 标记点不显示？

**解决方案：**
1. 检查行程数据中是否包含 `location` 字段
2. 确认 `location.lat` 和 `location.lng` 是有效数字
3. 检查经纬度范围是否正确（中国境内大致范围：纬度 18-54，经度 73-135）

### Q4: 路线规划失败？

**解决方案：**
1. 确保至少有 2 个位置点
2. 检查起点和终点的经纬度是否正确
3. 查看浏览器控制台的路线规划日志
4. 验证网络连接是否正常

### Q5: 地图加载很慢？

**解决方案：**
1. 检查网络连接
2. 考虑配置 CDN 加速
3. 减少同时显示的标记点数量
4. 优化组件渲染性能

## 未来优化

### 计划功能

- [ ] 支持百度地图切换
- [ ] 离线地图缓存
- [ ] 热力图显示景点热度
- [ ] 街景查看
- [ ] AR 导航集成
- [ ] 实时交通状况
- [ ] 周边设施查询（停车场、公厕等）
- [ ] 地图截图/分享功能

### 性能优化

- [ ] 标记点聚合（大量标记时）
- [ ] 懒加载地图组件
- [ ] 地图瓦片缓存
- [ ] 路线缓存

## 相关资源

- [高德地图 JavaScript API 文档](https://lbs.amap.com/api/javascript-api/summary)
- [高德地图示例中心](https://lbs.amap.com/demo/javascript-api/example/map/map-show)
- [高德地图常见问题](https://lbs.amap.com/faq/js-api)
- [高德开发者控制台](https://console.amap.com/dev/index)

## 许可证

本功能使用高德地图 Web API，请遵守[高德地图服务条款](https://lbs.amap.com/terms)。
