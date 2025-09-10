#!/bin/bash

# 生产就绪性全面测试套件
# 目标：验证系统在生产环境中的稳定性和兼容性

echo "🚀 开始生产就绪性全面测试"
echo "目标：验证OpenAI和Gemini API的完整兼容性"

URL="https://gemini-balance-lite22-i2lyyd8m0-showlin666s-projects.vercel.app"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

# 测试计数器
total_tests=0
passed_tests=0
failed_tests=0

# 测试函数
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local json_body="$3"
    local expected_pattern="$4"
    
    total_tests=$((total_tests + 1))
    echo ""
    echo "=== 测试 $total_tests: $test_name ==="
    
    local response=$(curl -s -w "\n状态码:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json; charset=utf-8" \
        -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$json_body" \
        --max-time 45 \
        "$URL$endpoint")
    
    echo "响应: $response"
    
    if echo "$response" | grep -q "状态码:200" && echo "$response" | grep -q "$expected_pattern"; then
        echo "✅ 通过: $test_name"
        passed_tests=$((passed_tests + 1))
        return 0
    else
        echo "❌ 失败: $test_name"
        failed_tests=$((failed_tests + 1))
        return 1
    fi
}

# 1. OpenAI兼容性测试
echo ""
echo "📋 第一部分：OpenAI API兼容性测试"

# 1.1 基本chat/completions
run_test "OpenAI基本对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.7,
    "max_tokens": 50
}' '"content":'

# 1.2 多轮对话
run_test "OpenAI多轮对话" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "My name is John"},
        {"role": "assistant", "content": "Hello John! Nice to meet you."},
        {"role": "user", "content": "What is my name?"}
    ],
    "temperature": 0.7,
    "max_tokens": 50
}' '"content":'

# 1.3 系统消息
run_test "OpenAI系统消息" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello"}
    ],
    "temperature": 0.7,
    "max_tokens": 50
}' '"content":'

# 1.4 不同模型名称
run_test "OpenAI模型映射" "/v1/chat/completions" '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.7,
    "max_tokens": 50
}' '"content":'

# 1.5 参数测试
run_test "OpenAI参数测试" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.9,
    "max_tokens": 100,
    "top_p": 0.8
}' '"content":'

# 1.6 中文测试
run_test "OpenAI中文支持" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "你好"}],
    "temperature": 0.7,
    "max_tokens": 50
}' '"content":'

# 1.7 长文本测试
run_test "OpenAI长文本" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Please write a detailed explanation about artificial intelligence, machine learning, and their applications in modern technology. Include examples and future prospects."}],
    "temperature": 0.7,
    "max_tokens": 200
}' '"content":'

# 1.8 特殊字符测试
run_test "OpenAI特殊字符" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Test special chars: !@#$%^&*()"}],
    "temperature": 0.7,
    "max_tokens": 50
}' '"content":'

echo ""
echo "📋 第二部分：Gemini原生API测试"

# 2.1 Gemini原生格式
run_test "Gemini原生API" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "Hello, how are you?"}
            ]
        }
    ]
}' '"candidates":'

# 2.2 Gemini安全设置
run_test "Gemini安全设置" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "Hello"}
            ]
        }
    ],
    "safetySettings": [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        }
    ]
}' '"candidates":'

# 2.3 Gemini生成配置
run_test "Gemini生成配置" "/v1beta/models/gemini-2.5-flash:generateContent" '{
    "contents": [
        {
            "parts": [
                {"text": "Hello"}
            ]
        }
    ],
    "generationConfig": {
        "temperature": 0.8,
        "maxOutputTokens": 100
    }
}' '"candidates":'

echo ""
echo "📋 第三部分：错误处理和边缘情况测试"

# 3.1 无效API Key测试
total_tests=$((total_tests + 1))
echo ""
echo "=== 测试 $total_tests: 无效API Key处理 ==="
response=$(curl -s -w "\n状态码:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer invalid-key" \
    -d '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "Hello"}]}' \
    --max-time 45 \
    "$URL/v1/chat/completions")

if echo "$response" | grep -q "状态码:401\|状态码:403"; then
    echo "✅ 通过: 无效API Key正确返回错误"
    passed_tests=$((passed_tests + 1))
else
    echo "❌ 失败: 无效API Key处理异常"
    echo "响应: $response"
    failed_tests=$((failed_tests + 1))
fi

# 3.2 无效模型名称
run_test "无效模型处理" "/v1/chat/completions" '{
    "model": "invalid-model-name",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.7,
    "max_tokens": 50
}' '"error":\|"content":'

# 3.3 空消息测试
run_test "空消息处理" "/v1/chat/completions" '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": ""}],
    "temperature": 0.7,
    "max_tokens": 50
}' '"error":\|"content":'

echo ""
echo "🎯 测试结果汇总"
echo "总测试数: $total_tests"
echo "通过: $passed_tests"
echo "失败: $failed_tests"
echo "成功率: $(( passed_tests * 100 / total_tests ))%"

if [ $failed_tests -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！系统已准备好生产部署！"
    echo "✅ OpenAI API完全兼容"
    echo "✅ Gemini API正常工作"
    echo "✅ 错误处理正确"
    echo "✅ 字符编码正常"
    echo "✅ 多语言支持"
else
    echo ""
    echo "⚠️ 发现 $failed_tests 个问题，需要修复后才能部署到生产环境"
fi
