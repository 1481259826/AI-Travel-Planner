@echo off
REM 安全启动开发服务器脚本 (Windows)
REM 自动清理端口并启动服务

SET PORT=3008
SET APP_NAME=ai-travel-planner

echo 🔍 检查端口 %PORT% 是否被占用...
echo.

REM 查找占用端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    SET PID=%%a
    goto :FOUND
)

echo ✅ 端口空闲
goto :START

:FOUND
echo ⚠️  发现端口 %PORT% 被进程 %PID% 占用
echo 🧹 正在清理...

REM 尝试优雅关闭
pm2 stop %APP_NAME% >nul 2>&1
pm2 delete %APP_NAME% >nul 2>&1

REM 等待 2 秒
timeout /t 2 /nobreak >nul

REM 强制终止进程
taskkill /F /PID %PID% >nul 2>&1

echo ✅ 端口已清理
echo.

:START
echo 🚀 启动开发服务器...
echo.

REM 使用 PM2 启动
pm2 start ecosystem.config.js

echo.
echo 📊 进程状态：
pm2 list

echo.
echo 💡 提示：
echo   - 查看日志: pm2 logs %APP_NAME%
echo   - 停止服务: pm2 stop %APP_NAME%
echo   - 重启服务: pm2 restart %APP_NAME%
echo   - 删除服务: pm2 delete %APP_NAME%
echo   - 监控界面: pm2 monit
