#!/bin/bash

# 安全启动开发服务器脚本
# 自动清理端口并启动服务

PORT=3008
APP_NAME="ai-travel-planner"

echo "🔍 检查端口 $PORT 是否被占用..."

# 检查端口是否被占用（跨平台）
if command -v lsof &> /dev/null; then
    # macOS/Linux
    PID=$(lsof -ti:$PORT)
elif command -v netstat &> /dev/null; then
    # Windows (Git Bash)
    PID=$(netstat -ano | grep ":$PORT" | awk '{print $5}' | head -1)
fi

if [ ! -z "$PID" ]; then
    echo "⚠️  发现端口 $PORT 被进程 $PID 占用"
    echo "🧹 正在清理..."

    # 尝试优雅关闭
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true

    # 等待进程释放
    sleep 2

    # 如果还在占用，强制杀死
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti:$PORT)
        if [ ! -z "$PID" ]; then
            echo "🔪 强制终止进程 $PID"
            kill -9 $PID 2>/dev/null || true
        fi
    fi

    echo "✅ 端口已清理"
else
    echo "✅ 端口空闲"
fi

echo ""
echo "🚀 启动开发服务器..."

# 使用 PM2 启动
pm2 start ecosystem.config.js

echo ""
echo "📊 进程状态："
pm2 list

echo ""
echo "💡 提示："
echo "  - 查看日志: pm2 logs $APP_NAME"
echo "  - 停止服务: pm2 stop $APP_NAME"
echo "  - 重启服务: pm2 restart $APP_NAME"
echo "  - 删除服务: pm2 delete $APP_NAME"
