#!/bin/bash

# 本地环境API测试脚本
# 简单直接，效率第一

echo "🧪 开始本地环境API测试..."
echo "📍 测试地址: http://localhost:3000"
echo "🔑 使用真实API Key"
echo ""

# 从.env.local读取第一个API Key
API_KEY=$(grep "TRUSTED_API_KEYS=" .env.local | cut -d'=' -f2 | cut -d',' -f1)
echo "🔑 API Key: ${API_KEY:0:20}..."
echo ""

# 测试1: 健康检查
echo "1️⃣ 健康检查..."
curl -s "http://localhost:3000/" | head -1
echo -e "\n"

# 测试2: OpenAI聊天API
echo "2️⃣ OpenAI聊天API..."
response=$(curl -s "http://localhost:3000/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [{"role": "user", "content": "Hello, 简单回复测试"}],
    "max_tokens": 50
  }')

if echo "$response" | grep -q "choices"; then
  echo "✅ 成功"
  echo "$response" | jq -r '.choices[0].message.content' 2>/dev/null || echo "$response"
else
  echo "❌ 失败"
  echo "$response"
fi
echo ""

# 测试3: Gemini原生API
echo "3️⃣ Gemini原生API..."
response=$(curl -s "http://localhost:3000/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $API_KEY" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello, 简单回复测试"}]}]
  }')

if echo "$response" | grep -q "candidates"; then
  echo "✅ 成功"
  echo "$response" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null || echo "$response"
else
  echo "❌ 失败"
  echo "$response"
fi
echo ""

# 测试4: 模型列表
echo "4️⃣ 模型列表..."
response=$(curl -s "http://localhost:3000/models" \
  -H "Authorization: Bearer $API_KEY")

if echo "$response" | grep -q "data"; then
  echo "✅ 成功"
  echo "$response" | jq -r '.data[0].id' 2>/dev/null || echo "获取到模型列表"
else
  echo "❌ 失败"
  echo "$response"
fi
echo ""

# 测试5: 负载均衡（多API Key）
echo "5️⃣ 负载均衡测试..."
MULTI_KEYS=$(grep "TRUSTED_API_KEYS=" .env.local | cut -d'=' -f2 | sed 's/,/,/g')
response=$(curl -s "http://localhost:3000/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MULTI_KEYS" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [{"role": "user", "content": "负载均衡测试"}],
    "max_tokens": 30
  }')

if echo "$response" | grep -q "choices"; then
  echo "✅ 负载均衡成功"
else
  echo "❌ 负载均衡失败"
  echo "$response"
fi
echo ""

# 测试6: 错误处理
echo "6️⃣ 错误处理测试..."
response=$(curl -s "http://localhost:3000/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_key" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [{"role": "user", "content": "应该失败"}]
  }')

if echo "$response" | grep -q "error\|unauthorized\|401"; then
  echo "✅ 错误处理正确"
else
  echo "❌ 错误处理异常"
  echo "$response"
fi
echo ""

echo "🎯 本地环境测试完成！"
