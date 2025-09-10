#!/bin/bash

# 错误处理验证测试脚本
# 验证修复后的错误状态码和响应格式

PREVIEW_URL="https://gemini-balance-lite22-gsh17dcv7-showlin666s-projects.vercel.app"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

echo "错误处理验证测试 - $(date)"
echo "目标: $PREVIEW_URL"
echo "验证修复后的错误状态码..."
echo

# 测试1: 无API Key (应该返回401)
echo "=== 测试1：无API Key (期望401) ==="
response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    "$PREVIEW_URL/v1/models")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
if [ "$status_code" = "401" ]; then
    echo "✅ 正确: 无API Key返回401"
else
    echo "❌ 错误: 期望401，实际$status_code"
fi
echo

# 测试2: 无效JSON (应该返回400)
echo "=== 测试2：无效JSON (期望400) ==="
response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"invalid_json":}' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
if [ "$status_code" = "400" ]; then
    echo "✅ 正确: 无效JSON返回400"
else
    echo "❌ 错误: 期望400，实际$status_code"
fi
echo

# 测试3: 无效模型 (应该返回400)
echo "=== 测试3：无效模型 (期望400) ==="
response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"model":"invalid-model","messages":[{"role":"user","content":"test"}]}' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
if [ "$status_code" = "400" ]; then
    echo "✅ 正确: 无效模型返回400"
else
    echo "❌ 错误: 期望400，实际$status_code"
fi
echo

# 测试4: 空消息数组 (应该返回400)
echo "=== 测试4：空消息数组 (期望400) ==="
response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"model":"gemini-1.5-flash","messages":[]}' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
if [ "$status_code" = "400" ]; then
    echo "✅ 正确: 空消息数组返回400"
else
    echo "❌ 错误: 期望400，实际$status_code"
fi
echo

# 测试5: 不存在的端点 (应该返回404)
echo "=== 测试5：不存在的端点 (期望404) ==="
response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    "$PREVIEW_URL/v1/nonexistent")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
if [ "$status_code" = "404" ]; then
    echo "✅ 正确: 不存在端点返回404"
else
    echo "❌ 错误: 期望404，实际$status_code"
fi
echo

# 测试6: 正常请求 (应该返回200)
echo "=== 测试6：正常请求 (期望200) ==="
response=$(curl.exe -s -w '\n%{http_code}' --max-time 15 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hello"}],"max_tokens":5}' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
if [ "$status_code" = "200" ]; then
    echo "✅ 正确: 正常请求返回200"
else
    echo "❌ 错误: 期望200，实际$status_code"
fi
echo

echo "错误处理验证测试完成！"
echo "📊 请查看Vercel Dashboard的Function Logs观察新的日志格式"
echo "🔍 重点观察: [INFO] [ReqID:xxx] 📥 日志是否正常显示"
