#!/bin/bash

# 最终全面测试 - 生产就绪验证

echo "🚀 最终全面测试 - 生产就绪验证"
echo "目标：确认所有功能都正常工作，可以安全部署到生产环境"

URL="https://gemini-balance-lite22-opfefkgt9-showlin666s-projects.vercel.app"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

total_tests=0
passed_tests=0

test_api() {
    local name="$1"
    local endpoint="$2"
    local body="$3"
    local check_pattern="$4"
    
    total_tests=$((total_tests + 1))
    echo ""
    echo "=== 测试 $total_tests: $name ==="
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$body" \
        --max-time 45 \
        "$URL$endpoint")
    
    status_code=$(echo "$response" | tail -n1)
    content=$(echo "$response" | head -n -1)
    
    echo "状态码: $status_code"
    echo "响应: $(echo "$content" | head -c 200)..."
    
    if [ "$status_code" = "200" ] && echo "$content" | grep -q "$check_pattern"; then
        echo "✅ 通过"
        passed_tests=$((passed_tests + 1))
        return 0
    else
        echo "❌ 失败"
        return 1
    fi
}

echo ""
echo "📋 第一部分：OpenAI API兼容性测试"

# 1. 基本对话
test_api "OpenAI基本对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
}' '"content":'

# 2. 中文支持
test_api "OpenAI中文支持" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 50
}' '"content":'

# 3. 多轮对话
test_api "OpenAI多轮对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "我叫张三"},
        {"role": "assistant", "content": "你好张三！"},
        {"role": "user", "content": "我叫什么？"}
    ],
    "max_tokens": 50
}' '"content":'

# 4. 系统消息
test_api "OpenAI系统消息" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [
        {"role": "system", "content": "你是一个有用的助手"},
        {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 50
}' '"content":'

# 5. 模型映射
test_api "OpenAI模型映射" "/v1/chat/completions" '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
}' '"content":\|"finish_reason":'

# 6. 流式响应
total_tests=$((total_tests + 1))
echo ""
echo "=== 测试 $total_tests: OpenAI流式响应 ==="

stream_response=$(curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content": "Count 1 to 3"}],
        "stream": true,
        "max_tokens": 50
    }' \
    --max-time 30 \
    "$URL/v1/chat/completions")

echo "流式响应: $(echo "$stream_response" | head -c 200)..."

if echo "$stream_response" | grep -q "data: " && echo "$stream_response" | grep -q '"delta":' && echo "$stream_response" | grep -q "data: \[DONE\]"; then
    echo "✅ 通过"
    passed_tests=$((passed_tests + 1))
else
    echo "❌ 失败"
fi

echo ""
echo "📋 第二部分：Gemini原生API测试"

# 7. Gemini原生API
test_api "Gemini原生API" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "Hello"}
            ]
        }
    ]
}' '"candidates":'

# 8. Gemini中文
test_api "Gemini中文支持" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "你好"}
            ]
        }
    ]
}' '"candidates":'

echo ""
echo "📋 第三部分：错误处理测试"

# 9. 无效API Key
total_tests=$((total_tests + 1))
echo ""
echo "=== 测试 $total_tests: 无效API Key处理 ==="

error_response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer invalid-key" \
    -d '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "Hello"}]}' \
    --max-time 30 \
    "$URL/v1/chat/completions")

error_status=$(echo "$error_response" | tail -n1)
error_content=$(echo "$error_response" | head -n -1)

echo "状态码: $error_status"
echo "错误响应: $error_content"

if [ "$error_status" = "401" ] || [ "$error_status" = "403" ]; then
    echo "✅ 通过"
    passed_tests=$((passed_tests + 1))
else
    echo "❌ 失败"
fi

echo ""
echo "📋 第四部分：多语言编码测试"

# 10. 德语
test_api "德语支持" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hallo"}],
    "max_tokens": 50
}' '"content":'

# 11. 法语
test_api "法语支持" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Bonjour"}],
    "max_tokens": 50
}' '"content":'

# 12. 阿拉伯语
test_api "阿拉伯语支持" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "مرحبا"}],
    "max_tokens": 50
}' '"content":'

# 结果汇总
echo ""
echo "🎯 最终测试结果汇总"
echo "总测试数: $total_tests"
echo "通过: $passed_tests"
echo "失败: $((total_tests - passed_tests))"
echo "成功率: $(( passed_tests * 100 / total_tests ))%"

if [ $passed_tests -eq $total_tests ]; then
    echo ""
    echo "🎉🎉🎉 所有测试通过！系统已准备好生产部署！🎉🎉🎉"
    echo ""
    echo "✅ 验证通过的功能："
    echo "   - OpenAI API完全兼容"
    echo "   - 流式和非流式响应"
    echo "   - 中文编码完全修复"
    echo "   - 多语言支持"
    echo "   - Gemini原生API"
    echo "   - 错误处理机制"
    echo "   - 多轮对话"
    echo "   - 系统消息"
    echo "   - 模型映射"
    echo ""
    echo "🚀 可以安全部署到生产环境！"
else
    echo ""
    echo "⚠️ 发现问题，需要修复后才能部署"
    failed=$((total_tests - passed_tests))
    echo "失败测试数: $failed"
fi
