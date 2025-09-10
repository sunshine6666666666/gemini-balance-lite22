#!/bin/bash

# 修复后的流式响应测试

echo "🌊 测试修复后的流式响应功能"

URL="https://gemini-balance-lite22-opfefkgt9-showlin666s-projects.vercel.app"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

echo "目标URL: $URL"

# 测试1: 简单的流式响应
echo ""
echo "=== 测试1: 英文流式响应 ==="

response=$(curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "Count from 1 to 5"}],
        "stream": true,
        "max_tokens": 50
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

echo "流式响应内容:"
echo "$response"

if echo "$response" | grep -q "data: "; then
    echo "✅ 检测到流式响应格式"
    
    if echo "$response" | grep -q '"delta":'; then
        echo "✅ 包含delta字段"
    else
        echo "❌ 缺少delta字段"
    fi
    
    if echo "$response" | grep -q "data: \[DONE\]"; then
        echo "✅ 包含结束标记"
    else
        echo "⚠️ 缺少结束标记"
    fi
else
    echo "❌ 流式响应格式异常"
fi

# 测试2: 中文流式响应
echo ""
echo "=== 测试2: 中文流式响应 ==="

response_cn=$(curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "从1数到5"}],
        "stream": true,
        "max_tokens": 50
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

echo "中文流式响应:"
echo "$response_cn"

if echo "$response_cn" | grep -q "data: " && echo "$response_cn" | grep -q '"delta":'; then
    echo "✅ 中文流式响应正常"
else
    echo "❌ 中文流式响应异常"
fi

# 测试3: 对比非流式响应
echo ""
echo "=== 测试3: 对比非流式响应 ==="

response_normal=$(curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "Count from 1 to 3"}],
        "stream": false,
        "max_tokens": 50
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

echo "非流式响应:"
echo "$response_normal"

if echo "$response_normal" | grep -q '"content":' && ! echo "$response_normal" | grep -q "data: "; then
    echo "✅ 非流式响应正常"
else
    echo "❌ 非流式响应异常"
fi

echo ""
echo "🎯 流式响应测试完成"

# 汇总结果
stream_works=false
if echo "$response" | grep -q "data: " && echo "$response" | grep -q '"delta":'; then
    stream_works=true
fi

normal_works=false
if echo "$response_normal" | grep -q '"content":'; then
    normal_works=true
fi

echo ""
echo "📊 测试结果汇总:"
if [ "$stream_works" = true ]; then
    echo "✅ 流式响应: 正常"
else
    echo "❌ 流式响应: 异常"
fi

if [ "$normal_works" = true ]; then
    echo "✅ 非流式响应: 正常"
else
    echo "❌ 非流式响应: 异常"
fi

if [ "$stream_works" = true ] && [ "$normal_works" = true ]; then
    echo ""
    echo "🎉 所有响应模式都正常工作！"
else
    echo ""
    echo "⚠️ 部分响应模式有问题，需要进一步调试"
fi
