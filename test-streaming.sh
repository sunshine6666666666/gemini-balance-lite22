#!/bin/bash

# 流式响应测试
# 验证stream=true功能是否正常工作

echo "🌊 流式响应测试"

URL="https://gemini-balance-lite22-i2lyyd8m0-showlin666s-projects.vercel.app"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

echo "测试流式响应功能..."

# 测试流式响应
echo ""
echo "=== 流式响应测试 ==="

response=$(curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "请写一首关于春天的短诗"}],
        "stream": true,
        "max_tokens": 100
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

echo "流式响应内容:"
echo "$response"

# 检查流式响应格式
if echo "$response" | grep -q "data: {"; then
    echo ""
    echo "✅ 流式响应格式正确"
    
    # 检查是否包含content字段
    if echo "$response" | grep -q '"content":'; then
        echo "✅ 包含content字段"
    else
        echo "❌ 缺少content字段"
    fi
    
    # 检查是否有结束标记
    if echo "$response" | grep -q "data: \[DONE\]"; then
        echo "✅ 包含结束标记"
    else
        echo "⚠️ 缺少结束标记"
    fi
    
else
    echo "❌ 流式响应格式异常"
fi

echo ""
echo "=== 流式响应英文测试 ==="

response_en=$(curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "Write a short poem about spring"}],
        "stream": true,
        "max_tokens": 100
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

echo "英文流式响应:"
echo "$response_en"

if echo "$response_en" | grep -q "data: {" && echo "$response_en" | grep -q '"content":'; then
    echo "✅ 英文流式响应正常"
else
    echo "❌ 英文流式响应异常"
fi

echo ""
echo "🎯 流式响应测试完成"
