#!/bin/bash

# API端点测试脚本
# 用于测试本地开发环境和预览环境的API功能

# 配置
BASE_URL="${1:-http://localhost:3000}"  # 默认本地地址，可通过参数传入预览环境地址
TEST_API_KEY="${2:-trusted_test_key_1}"  # 测试用的API Key

echo "🧪 开始API端点测试..."
echo "📍 测试地址: $BASE_URL"
echo "🔑 测试API Key: ${TEST_API_KEY:0:8}..."
echo ""

# 测试1: 首页访问
echo "1️⃣ 测试首页访问..."
curl -s "$BASE_URL/" | head -1
echo ""

# 测试2: Gemini原生API
echo "2️⃣ 测试Gemini原生API..."
curl -s "$BASE_URL/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $TEST_API_KEY" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Hello, this is a test from script"
          }
        ]
      }
    ]
  }' | jq -r '.candidates[0].content.parts[0].text // "API调用失败"' | head -3
echo ""

# 测试3: OpenAI兼容API
echo "3️⃣ 测试OpenAI兼容API..."
curl -s "$BASE_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_API_KEY" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [
      {
        "role": "user",
        "content": "Hello, this is OpenAI format test"
      }
    ]
  }' | jq -r '.choices[0].message.content // "API调用失败"' | head -3
echo ""

# 测试4: 模型列表
echo "4️⃣ 测试模型列表..."
curl -s "$BASE_URL/models" \
  -H "Authorization: Bearer $TEST_API_KEY" \
  | jq -r '.data[0].id // "获取模型列表失败"'
echo ""

# 测试5: API Key验证
echo "5️⃣ 测试API Key验证..."
curl -s "$BASE_URL/verify" \
  -X POST \
  -H "x-goog-api-key: $TEST_API_KEY" \
  | jq -r '.message // "验证失败"'
echo ""

# 测试6: 错误处理（无效API Key）
echo "6️⃣ 测试错误处理（无效API Key）..."
curl -s "$BASE_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_key_test" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [
      {
        "role": "user",
        "content": "This should fail"
      }
    ]
  }' | jq -r '.error.message // "未返回错误信息"'
echo ""

echo "✅ API端点测试完成！"
