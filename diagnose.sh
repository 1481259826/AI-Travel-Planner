#!/bin/sh
# Docker 容器诊断脚本

echo "=== Docker 环境变量检查 ==="
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
echo "NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL"
echo ""

echo "=== 网络连接测试 ==="
echo "测试 Supabase 连接..."
if command -v curl > /dev/null 2>&1; then
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$NEXT_PUBLIC_SUPABASE_URL"
else
    echo "curl 未安装，跳过网络测试"
fi
echo ""

echo "=== 文件系统检查 ==="
echo "当前目录内容:"
ls -la
echo ""
echo "server.js 是否存在:"
test -f server.js && echo "✓ 存在" || echo "✗ 不存在"
