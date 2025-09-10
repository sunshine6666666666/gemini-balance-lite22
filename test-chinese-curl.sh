#!/bin/bash

# 中文UTF-8测试脚本 - 使用curl

echo "🌍 开始中文UTF-8编码测试"

URL="https://gemini-balance-lite22-i2lyyd8m0-showlin666s-projects.vercel.app/v1/chat/completions"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

echo "目标URL: $URL"

# 测试中文
echo ""
echo "=== 测试中文 ==="

# 创建JSON请求体
JSON_BODY='{
  "model": "gemini-2.5-flash",
  "messages": [
    {
      "role": "user",
      "content": "你好，请用中文简单回复"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 100
}'

echo "请求体: $JSON_BODY"

# 发送请求
echo "发送请求..."
RESPONSE=$(curl -s -w "\n状态码:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$JSON_BODY" \
  --max-time 45 \
  "$URL")

echo "响应结果:"
echo "$RESPONSE"

# 检查content字段
if echo "$RESPONSE" | grep -q '"content":null'; then
    echo "❌ 失败！Content字段为null"
elif echo "$RESPONSE" | grep -q '"content":"'; then
    echo "✅ 成功！Content字段有内容"
    # 提取content内容
    CONTENT=$(echo "$RESPONSE" | grep -o '"content":"[^"]*"' | sed 's/"content":"//' | sed 's/"$//')
    echo "Content内容: $CONTENT"
else
    echo "⚠️ 无法确定content状态"
fi

echo ""
echo "🎯 中文UTF-8编码测试完成！"
