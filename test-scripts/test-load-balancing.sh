#!/bin/bash

# 负载均衡测试脚本
# 用于测试API Key轮询和负载均衡功能

# 配置
BASE_URL="${1:-http://localhost:3000}"
TEST_API_KEY="${2:-trusted_test_key_1}"

echo "⚖️ 开始负载均衡测试..."
echo "📍 测试地址: $BASE_URL"
echo "🔑 测试API Key: ${TEST_API_KEY:0:8}..."
echo ""

echo "🔄 发送5个连续请求，观察负载均衡效果..."
for i in {1..5}; do
  echo "📤 请求 $i:"
  
  # 记录请求时间
  start_time=$(date +%s%3N)
  
  # 发送请求
  response=$(curl -s "$BASE_URL/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TEST_API_KEY" \
    -d '{
      "model": "gemini-2.5-pro",
      "messages": [
        {
          "role": "user",
          "content": "Load balancing test request '$i'"
        }
      ]
    }')
  
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  
  # 提取响应ID和内容
  response_id=$(echo "$response" | jq -r '.id // "无ID"')
  content=$(echo "$response" | jq -r '.choices[0].message.content // "无响应内容"' | head -1)
  
  echo "  📋 响应ID: $response_id"
  echo "  ⏱️ 响应时间: ${duration}ms"
  echo "  📝 响应内容: ${content:0:50}..."
  echo ""
  
  # 间隔1秒，观察时间窗口轮询
  sleep 1
done

echo "✅ 负载均衡测试完成！"
echo ""
echo "💡 提示："
echo "   - 观察日志中的API Key选择过程"
echo "   - 检查是否使用了不同的API Key"
echo "   - 验证时间窗口轮询算法是否正常工作"
