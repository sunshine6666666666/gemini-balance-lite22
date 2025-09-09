#!/bin/bash

# 简单测试脚本 - 验证基本功能
BASE_URL="http://localhost:3000"

echo "=== 简单功能测试 ==="
echo "测试目标: $BASE_URL"
echo

# 1. 健康检查
echo "1. 健康检查"
response=$(curl -s -w "%{http_code}" --max-time 10 "$BASE_URL/")
http_code="${response: -3}"
body="${response%???}"
echo "  状态码: $http_code"
echo "  响应: $body"
echo

# 2. 测试Gemini端点（无API Key）
echo "2. Gemini端点测试（无API Key）"
response=$(curl -s -w "%{http_code}" --max-time 10 \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}' \
  "$BASE_URL/v1beta/models/gemini-2.5-pro:generateContent")
http_code="${response: -3}"
body="${response%???}"
echo "  状态码: $http_code"
echo "  响应: $body"
echo

# 3. 测试OpenAI端点（临时禁用状态）
echo "3. OpenAI端点测试（临时禁用状态）"
response=$(curl -s -w "%{http_code}" --max-time 10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_key" \
  -d '{"model":"gemini-2.5-pro","messages":[{"role":"user","content":"Hello"}]}' \
  "$BASE_URL/v1/chat/completions")
http_code="${response: -3}"
body="${response%???}"
echo "  状态码: $http_code"
echo "  响应: $body"
echo

# 4. 测试不存在的端点
echo "4. 不存在的端点测试"
response=$(curl -s -w "%{http_code}" --max-time 10 "$BASE_URL/nonexistent")
http_code="${response: -3}"
body="${response%???}"
echo "  状态码: $http_code"
echo "  响应: $body"
echo

echo "=== 测试完成 ==="
