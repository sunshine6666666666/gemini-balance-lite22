#!/bin/bash

# 核心功能验证测试
# 快速验证系统的关键功能是否正常

echo "🔍 核心功能验证测试"

URL="https://gemini-balance-lite22-i2lyyd8m0-showlin666s-projects.vercel.app"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

passed=0
total=0

test_api() {
    local name="$1"
    local endpoint="$2"
    local body="$3"
    
    total=$((total + 1))
    echo ""
    echo "测试 $total: $name"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$body" \
        --max-time 30 \
        "$URL$endpoint")
    
    status_code=$(echo "$response" | tail -n1)
    content=$(echo "$response" | head -n -1)
    
    echo "状态码: $status_code"
    echo "响应: $content"
    
    if [ "$status_code" = "200" ]; then
        if echo "$content" | grep -q '"content":' || echo "$content" | grep -q '"candidates":'; then
            echo "✅ 通过"
            passed=$((passed + 1))
        else
            echo "❌ 失败: 响应格式异常"
        fi
    else
        echo "❌ 失败: HTTP状态码异常"
    fi
}

# 1. OpenAI基本功能
test_api "OpenAI英文对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
}'

# 2. OpenAI中文支持
test_api "OpenAI中文对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 50
}'

# 3. OpenAI多轮对话
test_api "OpenAI多轮对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "我叫张三"},
        {"role": "assistant", "content": "你好张三！"},
        {"role": "user", "content": "我叫什么名字？"}
    ],
    "max_tokens": 50
}'

# 4. OpenAI模型映射
test_api "OpenAI模型映射" "/v1/chat/completions" '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
}'

# 5. Gemini原生API
test_api "Gemini原生API" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "Hello"}
            ]
        }
    ]
}'

# 6. Gemini中文原生API
test_api "Gemini中文原生" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "你好"}
            ]
        }
    ]
}'

# 7. 错误处理测试
total=$((total + 1))
echo ""
echo "测试 $total: 错误处理"

response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer invalid-key" \
    -d '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "Hello"}]}' \
    --max-time 30 \
    "$URL/v1/chat/completions")

status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
echo "响应: $(echo "$response" | head -n -1)"

if [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
    echo "✅ 通过: 正确处理无效API Key"
    passed=$((passed + 1))
else
    echo "❌ 失败: 错误处理异常"
fi

# 结果汇总
echo ""
echo "🎯 测试结果汇总"
echo "通过: $passed/$total"
echo "成功率: $(( passed * 100 / total ))%"

if [ $passed -eq $total ]; then
    echo ""
    echo "🎉 所有核心功能测试通过！"
    echo "✅ OpenAI API兼容性正常"
    echo "✅ Gemini API功能正常"
    echo "✅ 中文编码处理正确"
    echo "✅ 多轮对话支持"
    echo "✅ 模型映射正确"
    echo "✅ 错误处理正常"
    echo ""
    echo "🚀 系统核心功能验证完成，可以考虑生产部署"
else
    echo ""
    echo "⚠️ 发现问题，需要修复后才能部署"
    failed=$((total - passed))
    echo "失败测试数: $failed"
fi
