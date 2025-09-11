#!/bin/bash

# 测试默认max_tokens修复
# 验证不设置max_tokens时是否使用默认值1000

# 配置
PREVIEW_URL="https://gemini-balance-lite22-1rymlzk8p-showlin666s-projects.vercel.app"
BYPASS_SECRET="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

echo "🔍 测试默认max_tokens修复"
echo "目标: 验证不设置max_tokens时使用默认值1000"
echo ""

# 测试1：不设置max_tokens
echo "=== 测试1：不设置max_tokens（应该使用默认1000） ==="

response1=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请简单解释什么是负载均衡。"
            }
        ]
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "完整响应:"
echo "$response1"
echo ""

# 检查是否有content
if echo "$response1" | grep -q '"content":null'; then
    echo "❌ 失败: content仍然为null"
elif echo "$response1" | grep -q '"content":"'; then
    content=$(echo "$response1" | grep -o '"content":"[^"]*"' | sed 's/"content":"//; s/"$//')
    echo "✅ 成功: 获得有效内容"
    echo "内容: $content"
else
    echo "❌ 失败: 响应格式异常"
fi

echo ""
echo "---"
echo ""

# 测试2：设置max_tokens=500
echo "=== 测试2：设置max_tokens=500（对比测试） ==="

response2=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请详细解释什么是微服务架构，包括其优缺点。"
            }
        ],
        "max_tokens": 500
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "完整响应:"
echo "$response2"
echo ""

# 检查是否有content
if echo "$response2" | grep -q '"content":null'; then
    echo "❌ 失败: content为null"
elif echo "$response2" | grep -q '"content":"'; then
    content=$(echo "$response2" | grep -o '"content":"[^"]*"' | sed 's/"content":"//; s/"$//')
    echo "✅ 成功: 获得有效内容"
    echo "内容长度: $(echo "$content" | wc -c) 字符"
    echo "内容预览: $(echo "$content" | head -c 100)..."
else
    echo "❌ 失败: 响应格式异常"
fi

echo ""
echo "🎯 默认max_tokens测试完成！"
