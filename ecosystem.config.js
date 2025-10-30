module.exports = {
  apps: [{
    name: 'ai-travel-planner',
    script: './node_modules/next/dist/bin/next',
    args: 'dev -p 3008 -H 0.0.0.0',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3008
    },
    // 自动清理和重启配置
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 5000,
    shutdown_with_message: true,
    // 错误处理
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 优雅关闭
    force: true,
    // 自动杀死挂起的进程
    exec_mode: 'fork',
    // Windows 特定配置
    ...(process.platform === 'win32' ? {
      windowsHide: true
    } : {})
  }]
};
