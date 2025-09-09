#!/bin/bash

# 一键运行所有测试
# 效率第一，简单直接

echo "🚀 开始执行所有API测试..."
echo "=================================="
echo ""

# 检查本地服务是否运行
echo "🔍 检查本地服务状态..."
if curl -s --max-time 3 "http://localhost:3000/" > /dev/null 2>&1; then
    echo "✅ 本地服务运行中"
    echo ""
    
    echo "📍 执行本地环境测试..."
    echo "=================================="
    bash tests/local/test-api.sh
    echo ""
else
    echo "❌ 本地服务未运行，跳过本地测试"
    echo "💡 请先运行: npm run dev"
    echo ""
fi

echo "📍 执行预览环境测试..."
echo "=================================="
bash tests/preview/test-api.sh
echo ""

echo "🎯 所有测试执行完成！"
echo "=================================="
