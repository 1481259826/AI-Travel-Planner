# PWA 和离线缓存功能实现文档

本文档详细说明 AI Travel Planner 的 PWA (Progressive Web App) 和离线缓存功能的技术实现。

## 目录

- [架构概览](#架构概览)
- [核心技术栈](#核心技术栈)
- [实现细节](#实现细节)
- [API 参考](#api-参考)
- [性能优化](#性能优化)
- [故障排除](#故障排除)

## 架构概览

### 系统架构图

```
┌─────────────┐
│   用户界面   │
└──────┬──────┘
       │
┌──────┴──────────────────────────────┐
│                                      │
│  React Hooks Layer                   │
│  - useOfflineTrips                   │
│  - useOfflineTrip                    │
│  - useSync                           │
│                                      │
└──────┬──────────────────────────────┘
       │
┌──────┴──────────────────────────────┐
│                                      │
│  Data Management Layer               │
│  - lib/offline.ts (IndexedDB)        │
│  - lib/sync.ts (Sync Engine)         │
│                                      │
└──────┬──────────────────────────────┘
       │
┌──────┴──────────────────────────────┐
│                                      │
│  Storage Layer                       │
│  ┌────────────┐  ┌────────────┐     │
│  │ IndexedDB  │  │  Supabase  │     │
│  │  (Local)   │  │  (Remote)  │     │
│  └────────────┘  └────────────┘     │
│                                      │
└──────────────────────────────────────┘
       │
┌──────┴──────────────────────────────┐
│                                      │
│  Service Worker                      │
│  - Static asset caching              │
│  - API response caching              │
│  - Offline fallback                  │
│                                      │
└──────────────────────────────────────┘
```

### 数据流

#### 读取流程（Offline-First）

```
用户请求数据
    │
    ↓
优先从 IndexedDB 读取
    │
    ├─→ 有缓存 ─→ 立即返回缓存数据
    │              │
    │              ↓
    │           后台请求服务器
    │              │
    │              ↓
    │           更新本地缓存
    │              │
    │              ↓
    │           刷新UI（如果数据有变化）
    │
    ↓
无缓存 + 在线 ─→ 请求服务器
    │              │
    │              ↓
    │           缓存到本地
    │              │
    │              ↓
    │           返回数据
    │
    ↓
无缓存 + 离线 ─→ 显示错误
```

#### 写入流程（Online-First with Offline Queue）

```
用户修改数据
    │
    ↓
立即更新 IndexedDB
    │
    ↓
检查网络状态
    │
    ├─→ 在线 ─→ 同步到服务器
    │            │
    │            ├─→ 成功 ─→ 完成
    │            │
    │            └─→ 失败 ─→ 添加到同步队列
    │
    └─→ 离线 ─→ 添加到同步队列
                    │
                    ↓
                 等待网络恢复
                    │
                    ↓
                 自动同步
```

## 核心技术栈

### 依赖包

| 包名 | 版本 | 用途 |
|------|------|------|
| @ducanh2912/next-pwa | latest | Next.js PWA 集成，支持 Next.js 15 |
| idb | latest | IndexedDB 封装库，提供 Promise API |
| workbox | (via next-pwa) | Service Worker 工具箱 |

### 浏览器 API

- **IndexedDB**: 客户端存储
- **Service Worker**: 资源缓存和离线支持
- **Cache API**: Service Worker 缓存管理
- **Navigator.onLine**: 网络状态检测
- **beforeinstallprompt**: PWA 安装提示

## 实现细节

### 1. PWA 配置 (next.config.js)

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      // 静态资源：Cache First
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      // API 路由：Network First
      {
        urlPattern: /\/api\/.*$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})
```

### 2. IndexedDB Schema (lib/offline.ts)

```typescript
interface OfflineDB extends DBSchema {
  trips: {
    key: string              // Trip ID
    value: Trip             // Trip object
    indexes: {
      'by-user': string     // Index by user_id
      'by-updated': string  // Index by updated_at
    }
  }
  expenses: {
    key: string              // Expense ID
    value: Expense          // Expense object
    indexes: {
      'by-trip': string     // Index by trip_id
    }
  }
  sync_queue: {
    key: number             // Auto-increment ID
    value: SyncQueueItem    // Sync item
    indexes: {
      'by-status': string   // Index by status
    }
  }
}
```

### 3. 离线数据操作 (lib/offline.ts)

#### 核心 API

```typescript
// Trip 操作
offlineTrips.getAll(userId: string): Promise<Trip[]>
offlineTrips.getById(id: string): Promise<Trip | undefined>
offlineTrips.save(trip: Trip): Promise<void>
offlineTrips.saveMany(trips: Trip[]): Promise<void>
offlineTrips.delete(id: string): Promise<void>
offlineTrips.clear(): Promise<void>

// Expense 操作
offlineExpenses.getByTrip(tripId: string): Promise<Expense[]>
offlineExpenses.save(expense: Expense): Promise<void>
offlineExpenses.saveMany(expenses: Expense[]): Promise<void>
offlineExpenses.delete(id: string): Promise<void>

// 同步队列
syncQueue.add(item: SyncQueueItem): Promise<number>
syncQueue.getPending(): Promise<SyncQueueItem[]>
syncQueue.updateStatus(id: number, status: string): Promise<void>
syncQueue.clearSynced(): Promise<void>

// 高级操作（自动处理在线/离线）
offlineData.updateTrip(trip: Trip, isOffline: boolean): Promise<void>
offlineData.deleteTrip(id: string, isOffline: boolean): Promise<void>
```

### 4. 同步引擎 (lib/sync.ts)

#### 同步流程

```typescript
// 手动同步
await startSync()

// 自动同步（5分钟间隔）
startAutoSync(5 * 60 * 1000)

// 全量同步
await forceFullSync(userId)

// 网络监控
startNetworkMonitoring()
```

#### 冲突解决策略

**Last-Write-Wins (最后修改优先)**

```typescript
function resolveConflict<T extends { updated_at: string }>(
  local: T,
  remote: T
): T {
  const localTime = new Date(local.updated_at).getTime()
  const remoteTime = new Date(remote.updated_at).getTime()
  return localTime > remoteTime ? local : remote
}
```

当本地和远程数据都被修改时：
1. 比较 `updated_at` 时间戳
2. 保留较新的版本
3. 更新另一端的数据

### 5. React Hooks

#### useOfflineTrips

离线优先的行程列表获取：

```typescript
const { trips, isLoading, error, refetch, fromCache } = useOfflineTrips(userId)
```

特性：
- 优先返回缓存数据（快速渲染）
- 后台更新服务器数据
- 自动更新 UI
- `fromCache` 标志指示数据来源

#### useOfflineTrip

单个行程的离线优先获取和更新：

```typescript
const { trip, isLoading, error, refetch, updateTrip, fromCache } = useOfflineTrip(tripId)

// 更新行程（自动处理在线/离线）
await updateTrip({ status: 'completed' })
```

#### useSync

同步状态管理：

```typescript
const { status, message, isOnline, syncNow, fullSync, isSyncing } = useSync(true)

// 手动触发同步
await syncNow()

// 全量同步
await fullSync(userId)
```

### 6. UI 组件

#### OfflineIndicator

显示在线/离线状态：

```typescript
// 自动检测网络状态
// 离线时显示黄色徽章
// 重新上线时显示绿色徽章（3秒后自动隐藏）
<OfflineIndicator />
```

#### SyncStatus

显示同步状态和进度：

```typescript
// 显示：同步中/已同步/同步失败
// 待同步项数量
// 手动同步按钮
<SyncStatus />
```

#### InstallPrompt

自定义PWA安装提示：

```typescript
// 自动检测 beforeinstallprompt 事件
// 延迟2秒显示
// 关闭后7天内不再显示
<InstallPrompt />
```

#### CacheManager

缓存管理工具：

```typescript
// 显示缓存统计
// 清除缓存功能
// 刷新统计
<CacheManager />
```

## API 参考

### SyncQueueItem

```typescript
interface SyncQueueItem {
  id?: number
  type: 'create' | 'update' | 'delete'
  entity: 'trip' | 'expense'
  entityId: string
  data?: any
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  error?: string
}
```

### 同步事件

```typescript
// 订阅同步状态变化
const unsubscribe = onSyncStatusChange((status, message) => {
  console.log(`Sync status: ${status}`, message)
})

// 取消订阅
unsubscribe()
```

## 性能优化

### 缓存策略

| 资源类型 | 策略 | 原因 |
|---------|------|------|
| 图片/字体 | Cache First | 不常变化，优先本地 |
| JS/CSS | Cache First | 版本化，优先本地 |
| API | Network First | 数据实时性重要 |
| 页面 | Network First | 保证最新内容 |

### IndexedDB 优化

1. **批量操作**
   ```typescript
   // 使用事务批量写入
   await offlineTrips.saveMany(trips)
   ```

2. **索引使用**
   ```typescript
   // 利用索引加速查询
   await db.getAllFromIndex('trips', 'by-user', userId)
   ```

3. **限制缓存大小**
   ```typescript
   // Service Worker 中设置最大条目数
   expiration: {
     maxEntries: 64,
     maxAgeSeconds: 30 * 24 * 60 * 60,
   }
   ```

### 内存管理

- 单例 DB 连接
- 及时清理已同步项
- 限制同步队列大小

## 故障排除

### 常见问题

#### 1. Service Worker 未注册

**症状**: PWA 功能不工作，无法离线访问

**解决**:
```bash
# 检查 Service Worker
# 打开 Chrome DevTools > Application > Service Workers

# 清除并重新注册
npm run build
npm run start
```

#### 2. IndexedDB 访问被拒绝

**症状**: 无法保存数据到本地

**解决**:
- 检查浏览器隐私设置
- 确保不在隐身模式
- 清除站点数据后重试

#### 3. 数据不同步

**症状**: 离线编辑的数据未上传

**解决**:
```typescript
// 检查同步队列
const stats = await getSyncStats()
console.log(stats)

// 手动触发同步
await startSync()

// 检查失败项
const failed = await syncQueue.getAll()
  .then(items => items.filter(i => i.status === 'failed'))
console.log('Failed items:', failed)
```

#### 4. 缓存过期

**症状**: 显示旧数据

**解决**:
```typescript
// 强制全量同步
await forceFullSync(userId)

// 或清除缓存
await clearAllCache()
window.location.reload()
```

### 调试技巧

```typescript
// 启用详细日志
localStorage.setItem('debug', 'sync:*')

// 查看 IndexedDB 内容
// Chrome DevTools > Application > Storage > IndexedDB

// 查看 Service Worker 缓存
// Chrome DevTools > Application > Cache Storage

// 模拟离线
// Chrome DevTools > Network > Offline
```

## 测试

### 离线功能测试

1. **基本离线访问**
   ```
   1. 访问应用并登录
   2. 加载几个行程
   3. 断开网络（DevTools > Network > Offline）
   4. 刷新页面
   5. 验证：页面正常加载，显示缓存的行程
   ```

2. **离线编辑**
   ```
   1. 离线状态下修改行程
   2. 检查同步队列（应有待同步项）
   3. 恢复网络
   4. 等待自动同步
   5. 验证：数据已同步到服务器
   ```

3. **冲突处理**
   ```
   1. 在设备A离线编辑行程X
   2. 在设备B（在线）编辑同一行程X
   3. 设备A恢复网络并同步
   4. 验证：使用最后修改时间解决冲突
   ```

### 性能测试

```typescript
// 测量首次加载时间
performance.mark('start')
// ... 加载数据
performance.mark('end')
performance.measure('load-time', 'start', 'end')

// 测量缓存命中率
const caches = await caches.keys()
for (const cache of caches) {
  const c = await caches.open(cache)
  const keys = await c.keys()
  console.log(`Cache ${cache}: ${keys.length} items`)
}
```

## 最佳实践

1. **优先使用 Hooks**
   - 不要直接调用 `offlineTrips` API
   - 使用 `useOfflineTrips` / `useOfflineTrip`

2. **检查网络状态**
   ```typescript
   if (!navigator.onLine) {
     // 提示用户当前离线
   }
   ```

3. **处理同步失败**
   ```typescript
   try {
     await syncNow()
   } catch (error) {
     // 显示友好的错误提示
     toast.error('同步失败，请稍后重试')
   }
   ```

4. **定期清理缓存**
   ```typescript
   // 每次登录时清理7天前的缓存
   await syncQueue.clearSynced()
   ```

## 安全考虑

1. **数据加密**: IndexedDB 数据未加密，不存储敏感信息
2. **认证令牌**: 不缓存 JWT token 到 IndexedDB
3. **HTTPS Only**: PWA 仅在 HTTPS 下工作
4. **同源策略**: Service Worker 遵守同源策略

## 未来改进

- [ ] 增量同步（仅同步变更部分）
- [ ] 冲突合并（而非简单覆盖）
- [ ] 后台同步 API (Background Sync)
- [ ] 推送通知集成
- [ ] IndexedDB 数据加密
- [ ] 离线创建新行程支持
- [ ] 图片离线缓存和压缩

## 参考资源

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Next PWA](https://github.com/DuCanhGH/next-pwa)
