#!/bin/bash

# API Key状态验证测试

echo "🔑 API Key状态验证测试"

URL="https://gemini-balance-lite22-opfefkgt9-showlin666s-projects.vercel.app"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

echo "目标URL: $URL"

# 测试1: 简单英文请求
echo ""
echo "=== 测试1: 简单英文请求 ==="

response1=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 100
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

status1=$(echo "$response1" | tail -n1)
content1=$(echo "$response1" | head -n -1)

echo "状态码: $status1"
echo "响应: $(echo "$content1" | head -c 200)..."

# 测试2: 中文请求
echo ""
echo "=== 测试2: 中文请求 ==="

response2=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "你好"}],
        "max_tokens": 100
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

status2=$(echo "$response2" | tail -n1)
content2=$(echo "$response2" | head -n -1)

echo "状态码: $status2"
echo "响应: $(echo "$content2" | head -c 200)..."

# 测试3: 阿拉伯语请求（增加max_tokens）
echo ""
echo "=== 测试3: 阿拉伯语请求（增加max_tokens） ==="

response3=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "مرحبا"}],
        "max_tokens": 200
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

status3=$(echo "$response3" | tail -n1)
content3=$(echo "$response3" | head -n -1)

echo "状态码: $status3"
echo "响应: $(echo "$content3" | head -c 200)..."

# 测试4: 连续多次请求测试负载均衡
echo ""
echo "=== 测试4: 连续多次请求测试负载均衡 ==="

for i in {1..5}; do
    echo "请求 $i:"
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
        -H "Authorization: Bearer $API_KEY" \
        -d '{
            "model": "gemini-2.5-flash",
            "messages": [{"role": "user", "content": "Test '${i}'"}],
            "max_tokens": 50
        }' \
        --max-time 20 \
        "$URL/v1/chat/completions")
    
    status=$(echo "$response" | tail -n1)
    echo "  状态码: $status"
    
    if [ "$status" = "200" ]; then
        echo "  ✅ 成功"
    else
        echo "  ❌ 失败"
        echo "  响应: $(echo "$response" | head -n -1 | head -c 100)..."
    fi
    
    sleep 1
done

echo ""
echo "🎯 API Key状态测试完成"

# 汇总结果
success_count=0
if [ "$status1" = "200" ]; then success_count=$((success_count + 1)); fi
if [ "$status2" = "200" ]; then success_count=$((success_count + 1)); fi
if [ "$status3" = "200" ]; then success_count=$((success_count + 1)); fi

echo ""
echo "📊 测试结果汇总:"
echo "基础测试成功: $success_count/3"

if [ $success_count -eq 3 ]; then
    echo "✅ API Key工作正常，之前的失败可能是临时问题"
else
    echo "⚠️ 发现问题，需要进一步调查"
fi
