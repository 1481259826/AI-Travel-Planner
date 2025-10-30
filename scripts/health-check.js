#!/usr/bin/env node

/**
 * 健康检查脚本
 * 自动检测并清理僵尸进程
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = 3008;
const MAX_RESPONSE_TIME = 5000; // 5秒超时
const HEALTH_CHECK_URL = `http://localhost:${PORT}`;

console.log('🏥 开始健康检查...\n');

// 检查端口是否被占用
function checkPortInUse() {
  try {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr :${PORT}`
      : `lsof -ti:${PORT}`;

    const result = execSync(cmd, { encoding: 'utf8' });

    if (result.trim()) {
      console.log('✅ 端口被占用，进程存在');

      // 提取 PID (Windows)
      if (process.platform === 'win32') {
        const lines = result.trim().split('\n');
        const match = lines[0].match(/\s+(\d+)\s*$/);
        if (match) {
          return match[1];
        }
      } else {
        return result.trim().split('\n')[0];
      }
    }
  } catch (error) {
    console.log('ℹ️  端口未被占用');
    return null;
  }
}

// 检查服务器是否响应
function checkServerHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = http.get(HEALTH_CHECK_URL, (res) => {
      const responseTime = Date.now() - startTime;

      if (res.statusCode === 200) {
        console.log(`✅ 服务器健康 (响应时间: ${responseTime}ms)`);
        resolve({ healthy: true, responseTime });
      } else {
        console.log(`⚠️  服务器响应异常 (状态码: ${res.statusCode})`);
        resolve({ healthy: false, statusCode: res.statusCode });
      }

      req.destroy();
    });

    req.on('error', (error) => {
      console.log(`❌ 服务器无响应: ${error.message}`);
      resolve({ healthy: false, error: error.message });
    });

    req.setTimeout(MAX_RESPONSE_TIME, () => {
      console.log(`⏱️  服务器响应超时 (>${MAX_RESPONSE_TIME}ms)`);
      req.destroy();
      resolve({ healthy: false, timeout: true });
    });
  });
}

// 清理僵尸进程
function cleanupZombieProcess(pid) {
  console.log(`\n🧹 正在清理僵尸进程 (PID: ${pid})...`);

  try {
    // 尝试优雅关闭 PM2 管理的进程
    try {
      execSync('pm2 stop ai-travel-planner', { stdio: 'ignore' });
      execSync('pm2 delete ai-travel-planner', { stdio: 'ignore' });
      console.log('✅ PM2 进程已停止');
    } catch (e) {
      // PM2 可能未运行，忽略错误
    }

    // 强制终止进程
    const killCmd = process.platform === 'win32'
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;

    execSync(killCmd);
    console.log('✅ 僵尸进程已清理');

    // 等待端口释放
    setTimeout(() => {
      const stillInUse = checkPortInUse();
      if (stillInUse) {
        console.log('⚠️  端口仍被占用，可能需要手动清理');
      } else {
        console.log('✅ 端口已释放');
      }
    }, 2000);

  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

// 主函数
async function main() {
  const pid = checkPortInUse();

  if (!pid) {
    console.log('\n💡 服务器未运行，可以安全启动');
    console.log('   运行: npm run dev 或 npm run dev:safe');
    process.exit(0);
  }

  console.log(`\n📊 检测到进程 (PID: ${pid})`);
  console.log('⏳ 检查服务器健康状态...\n');

  const health = await checkServerHealth();

  console.log('\n' + '='.repeat(50));

  if (health.healthy) {
    console.log('✅ 服务器状态正常，无需清理');
    console.log(`   访问: ${HEALTH_CHECK_URL}`);
  } else {
    console.log('🧟 检测到僵尸进程！');
    console.log(`   PID: ${pid}`);
    console.log(`   端口: ${PORT}`);
    console.log(`   状态: ${health.error || health.statusCode || '超时'}`);

    // 询问是否清理（自动化模式直接清理）
    if (process.argv.includes('--auto')) {
      cleanupZombieProcess(pid);
    } else {
      console.log('\n💡 建议操作:');
      console.log(`   1. 自动清理: node scripts/health-check.js --auto`);
      console.log(`   2. 手动清理: taskkill /F /PID ${pid} (Windows)`);
      console.log(`                kill -9 ${pid} (Mac/Linux)`);
    }
  }

  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);
