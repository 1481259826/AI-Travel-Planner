# 🚀 快速开始指南

## 推荐启动方式

### ⭐ 方式 1：安全启动（推荐）

```bash
npm run dev:safe
```

**优点：**
- ✅ 自动检测并清理端口
- ✅ 避免僵尸进程
- ✅ 零配置

---

### ⭐ 方式 2：PM2 进程管理（高级）

```bash
# 首次安装 PM2
npm install -g pm2

# 启动
npm run dev:pm2

# 停止
npm run stop
```

**优点：**
- ✅ 崩溃自动重启
- ✅ 日志管理
- ✅ 进程监控

---

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev:safe` | 🌟 安全启动（推荐）|
| `npm run dev:check` | 🔍 健康检查 |
| `npm run cleanup` | 🧹 清理僵尸进程 |
| `npm run logs` | 📝 查看日志 |
| `npm run status` | 📊 进程状态 |

---

## 遇到问题？

```bash
# 1. 检查状态
npm run dev:check

# 2. 清理进程
npm run cleanup

# 3. 重新启动
npm run dev:safe
```

详细文档：[进程管理指南](docs/PROCESS_MANAGEMENT.md)
