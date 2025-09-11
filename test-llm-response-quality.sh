#!/bin/bash

# LLM响应质量验证测试
# 重点验证实际的LLM响应内容和质量

# 配置
PREVIEW_URL="https://gemini-balance-lite22-opfefkgt9-showlin666s-projects.vercel.app"
BYPASS_SECRET="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

echo "🔍 LLM响应质量验证测试"
echo "目标: 验证实际LLM响应内容和质量"
echo ""

# 测试1：简单技术问题
echo "=== 测试1：简单技术问题 ==="
echo "问题：什么是负载均衡？"

response1=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "什么是负载均衡？请简单解释一下。"
            }
        ],
        "max_tokens": 200
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "完整响应:"
echo "$response1"
echo ""

# 提取content字段
content1=$(echo "$response1" | grep -o '"content":"[^"]*"' | sed 's/"content":"//; s/"$//')
echo "LLM回答内容:"
echo "$content1"
echo ""
echo "---"
echo ""

# 测试2：代码生成
echo "=== 测试2：代码生成 ==="
echo "问题：写一个简单的JavaScript函数"

response2=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请写一个JavaScript函数，用于计算数组的平均值。"
            }
        ],
        "max_tokens": 300
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "完整响应:"
echo "$response2"
echo ""

# 提取content字段
content2=$(echo "$response2" | grep -o '"content":"[^"]*"' | sed 's/"content":"//; s/"$//')
echo "LLM回答内容:"
echo "$content2"
echo ""
echo "---"
echo ""

# 测试3：中文处理
echo "=== 测试3：中文处理 ==="
echo "问题：中文技术术语解释"

response3=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请解释什么是微服务架构，并说明其优缺点。"
            }
        ],
        "max_tokens": 400
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "完整响应:"
echo "$response3"
echo ""

# 提取content字段
content3=$(echo "$response3" | grep -o '"content":"[^"]*"' | sed 's/"content":"//; s/"$//')
echo "LLM回答内容:"
echo "$content3"
echo ""
echo "---"
echo ""

# 测试4：流式响应
echo "=== 测试4：流式响应 ==="
echo "问题：测试流式输出"

response4=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请数从1到10。"
            }
        ],
        "stream": true,
        "max_tokens": 100
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "流式响应:"
echo "$response4"
echo ""
echo "---"
echo ""

# 测试5：多轮对话
echo "=== 测试5：多轮对话 ==="
echo "问题：上下文理解测试"

response5=$(curl -s --max-time 30 \
    -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "我叫张三，是一名程序员。"
            },
            {
                "role": "assistant",
                "content": "你好张三！很高兴认识你这位程序员。"
            },
            {
                "role": "user",
                "content": "我叫什么名字？我的职业是什么？"
            }
        ],
        "max_tokens": 100
    }' \
    "$PREVIEW_URL/v1/chat/completions")

echo "完整响应:"
echo "$response5"
echo ""

# 提取content字段
content5=$(echo "$response5" | grep -o '"content":"[^"]*"' | sed 's/"content":"//; s/"$//')
echo "LLM回答内容:"
echo "$content5"
echo ""

echo "🎯 LLM响应质量验证完成！"
echo ""
echo "📊 验证结果分析："
echo "1. 技术问题回答质量"
echo "2. 代码生成能力"
echo "3. 中文处理效果"
echo "4. 流式响应功能"
echo "5. 上下文理解能力"
