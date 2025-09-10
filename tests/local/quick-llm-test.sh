#!/bin/bash

# 快速LLM测试脚本

# 从.env.local读取API Key
TRUSTED_KEYS=$(grep "TRUSTED_API_KEYS=" .env.local | cut -d'=' -f2)
FIRST_KEY=$(echo "$TRUSTED_KEYS" | cut -d',' -f1)

echo "使用API Key: ${FIRST_KEY:0:20}..."

# 测试1: 简单中文对话
echo "=== 测试1: 简单中文对话 ==="
curl.exe -s -w '\n%{http_code}' --max-time 30 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"你好，请简单介绍一下你自己。"}],"max_tokens":200,"temperature":0.7}' \
  "http://localhost:3000/v1/chat/completions"

echo ""
echo "=== 测试2: 数学问题 ==="
curl.exe -s -w '\n%{http_code}' --max-time 30 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"计算 25 + 37 = ?"}],"max_tokens":100,"temperature":0.7}' \
  "http://localhost:3000/v1/chat/completions"

echo ""
echo "=== 测试3: 代码生成 ==="
curl.exe -s -w '\n%{http_code}' --max-time 30 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"用Python写一个计算斐波那契数列的函数"}],"max_tokens":300,"temperature":0.7}' \
  "http://localhost:3000/v1/chat/completions"

echo ""
echo "=== 测试4: Gemini原生API ==="
curl.exe -s -w '\n%{http_code}' --max-time 30 \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $FIRST_KEY" \
  -d '{"contents":[{"role":"user","parts":[{"text":"请介绍一下Vercel Edge Functions的优势"}]}],"generationConfig":{"maxOutputTokens":300,"temperature":0.7}}' \
  "http://localhost:3000/v1beta/models/gemini-2.5-flash:generateContent"

echo ""
echo "测试完成！"
