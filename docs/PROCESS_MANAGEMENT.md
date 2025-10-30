# 进程管理和僵尸进程预防指南

## 🎯 目标

自动化检测、预防和清理僵尸进程，确保开发环境稳定运行。

---

## 🚀 快速开始

### 推荐方式 1：使用安全启动（自动清理）

```bash
npm run dev:safe
```

**特点：**
- ✅ 自动检测并清理端口占用
- ✅ 自动启动开发服务器
- ✅ 零配置，一键启动

---

### 推荐方式 2：使用 PM2（生产级管理）

```bash
# 首次使用需要安装 PM2
npm install -g pm2

# 启动服务
npm run dev:pm2

# 查看状态
npm run status

# 查看日志
npm run logs

# 重启服务
npm run restart

# 停止服务
npm run stop
```

**特点：**
- ✅ 自动重启（崩溃恢复）
- ✅ 内存监控（超过 1G 自动重启）
- ✅ 日志管理
- ✅ 进程监控面板

---

## 🔧 可用命令

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `npm run dev` | 标准启动 | 正常开发 |
| `npm run dev:safe` | 安全启动（自动清理） | **推荐日常使用** |
| `npm run dev:pm2` | PM2 启动 | 需要进程管理 |
| `npm run dev:check` | 健康检查 | 诊断问题 |
| `npm run cleanup` | 清理僵尸进程 | 手动清理 |
| `npm run status` | 查看进程状态 | 监控 |
| `npm run logs` | 查看日志 | 调试 |
| `npm run stop` | 停止服务 | 关闭 PM2 |
| `npm run restart` | 重启服务 | 更新代码 |

---

## 📊 工作流程

### 流程 1：日常开发（推荐）

```bash
# 1. 启动开发服务器（自动清理）
npm run dev:safe

# 2. 编写代码...

# 3. 完成后直接 Ctrl+C 关闭
```

### 流程 2：使用 PM2（进阶）

```bash
# 1. 启动服务
npm run dev:pm2

# 2. 在后台运行，可以关闭终端

# 3. 需要时查看日志
npm run logs

# 4. 完成后停止
npm run stop
```

### 流程 3：遇到问题时

```bash
# 1. 检查健康状态
npm run dev:check

# 2. 如果发现僵尸进程
npm run cleanup

# 3. 重新启动
npm run dev:safe
```

---

## 🛡️ 自动化保护机制

### 1. 启动前自动检查

`dev:safe` 命令会：
- ✅ 检测端口占用
- ✅ 测试服务器健康
- ✅ 自动清理僵尸进程
- ✅ 安全启动服务

### 2. PM2 自动恢复

PM2 配置了：
- ✅ 崩溃自动重启
- ✅ 内存超限自动重启（> 1GB）
- ✅ 最多重启 10 次
- ✅ 5 秒优雅关闭超时

### 3. 健康检查脚本

自动检测：
- ✅ 端口占用情况
- ✅ HTTP 响应状态
- ✅ 响应时间
- ✅ 僵尸进程识别

---

## 🔍 问题诊断

### 问题 1：端口被占用

```bash
# 检查健康状态
npm run dev:check

# 输出示例：
# 🧟 检测到僵尸进程！
#    PID: 496944
#    端口: 3008
#    状态: 无响应

# 自动清理
npm run cleanup
```

### 问题 2：服务无响应

```bash
# 查看日志
npm run logs

# 如果使用 PM2，重启服务
npm run restart

# 如果未使用 PM2，清理后重启
npm run cleanup
npm run dev:safe
```

### 问题 3：内存溢出

```bash
# PM2 会自动重启
# 查看日志确认
npm run logs

# 手动重启
npm run restart
```

---

## 📝 最佳实践

### ✅ 推荐做法

1. **日常开发使用 `dev:safe`**
   ```bash
   npm run dev:safe
   ```

2. **长时间运行使用 PM2**
   ```bash
   npm run dev:pm2
   ```

3. **遇到问题先检查**
   ```bash
   npm run dev:check
   ```

4. **定期查看日志**
   ```bash
   npm run logs
   ```

### ❌ 避免做法

1. ❌ 不要使用后台运行模式（`&`）
2. ❌ 不要强制关闭终端而不停止服务
3. ❌ 不要忽略端口占用警告
4. ❌ 不要同时运行多个开发服务器

---

## 🔧 高级配置

### 自定义 PM2 配置

编辑 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'ai-travel-planner',
    // 修改内存限制
    max_memory_restart: '2G',  // 改为 2GB

    // 修改重启次数
    max_restarts: 5,

    // 添加环境变量
    env: {
      NODE_ENV: 'development',
      PORT: 3008,
      DEBUG: 'app:*'  // 启用调试日志
    }
  }]
};
```

### 自定义健康检查

编辑 `scripts/health-check.js`：

```javascript
const MAX_RESPONSE_TIME = 10000; // 改为 10 秒
```

---

## 📚 相关文件

- `ecosystem.config.js` - PM2 配置
- `scripts/health-check.js` - 健康检查脚本
- `scripts/dev-safe.sh` - Linux/Mac 启动脚本
- `scripts/dev-safe.bat` - Windows 启动脚本
- `package.json` - NPM 脚本定义

---

## 🆘 常见问题

### Q: PM2 命令找不到？

```bash
# 全局安装 PM2
npm install -g pm2
```

### Q: 权限不足？

Windows: 以管理员身份运行
Linux/Mac: 使用 `sudo`

### Q: 健康检查失败？

```bash
# 查看详细错误
node scripts/health-check.js

# 手动清理
taskkill /F /PID [PID]  # Windows
kill -9 [PID]           # Linux/Mac
```

### Q: PM2 无法启动？

```bash
# 删除 PM2 缓存
pm2 kill

# 重新启动
npm run dev:pm2
```

---

## 💡 提示

- 使用 `dev:safe` 可以避免 99% 的僵尸进程问题
- PM2 适合需要长时间运行的场景
- 定期运行 `npm run dev:check` 可以及早发现问题
- 日志文件位于 `logs/` 目录（使用 PM2 时）

---

**推荐：** 将 `npm run dev:safe` 设为默认开发命令！
