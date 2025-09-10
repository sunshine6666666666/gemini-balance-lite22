#!/bin/bash

# 真实请求测试脚本 - 验证日志系统
# 发送多个真实的API请求，观察Vercel Dashboard中的日志输出

PREVIEW_URL="https://gemini-balance-lite22-gsh17dcv7-showlin666s-projects.vercel.app"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

echo "真实请求日志验证测试 - $(date)"
echo "目标: $PREVIEW_URL"
echo "🔍 请同时观察Vercel Dashboard的Function Logs"
echo "📊 重点观察: [INFO] [ReqID:xxx] 📥 日志格式"
echo

# 测试1: 简单聊天请求
echo "=== 测试1：简单聊天请求 ==="
echo "🔍 观察日志: 请求处理、负载均衡、格式转换、性能指标"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 15 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-1.5-flash",
        "messages": [
            {"role": "user", "content": "你好，请简单介绍一下自己"}
        ],
        "max_tokens": 50,
        "temperature": 0.7
    }' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试2: 多轮对话
echo "=== 测试2：多轮对话请求 ==="
echo "🔍 观察日志: 多消息处理、上下文管理"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 15 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "我想学习编程"},
            {"role": "assistant", "content": "很好！你想学习哪种编程语言？"},
            {"role": "user", "content": "Python，请给我一些建议"}
        ],
        "max_tokens": 100
    }' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试3: 代码生成请求
echo "=== 测试3：代码生成请求 ==="
echo "🔍 观察日志: 大token处理、代码生成性能"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 20 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-1.5-flash",
        "messages": [
            {"role": "user", "content": "请写一个Python函数，实现快速排序算法，包含详细注释"}
        ],
        "max_tokens": 200,
        "temperature": 0.3
    }' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试4: 流式响应请求
echo "=== 测试4：流式响应请求 ==="
echo "🔍 观察日志: 流式处理、SSE格式转换"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 20 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-1.5-flash",
        "messages": [
            {"role": "user", "content": "请写一首关于春天的诗"}
        ],
        "max_tokens": 80,
        "stream": true
    }' \
    "$PREVIEW_URL/v1/chat/completions" | head -20)
echo "流式响应前20行已显示"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试5: Gemini原生API
echo "=== 测试5：Gemini原生API请求 ==="
echo "🔍 观察日志: 原生API处理、直接转发"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 15 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "解释一下人工智能的基本概念"}]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 100,
            "temperature": 0.8
        }
    }' \
    "$PREVIEW_URL/v1/models/gemini-1.5-flash:generateContent")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试6: 模型列表请求
echo "=== 测试6：模型列表请求 ==="
echo "🔍 观察日志: 模型列表处理、缓存机制"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    "$PREVIEW_URL/v1/models")
status_code=$(echo "$response" | tail -n1)
model_count=$(echo "$response" | head -n -1 | jq '.data | length' 2>/dev/null || echo "解析失败")
echo "状态码: $status_code"
echo "模型数量: $model_count"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试7: 高温度创意请求
echo "=== 测试7：高温度创意请求 ==="
echo "🔍 观察日志: 参数转换、创意生成"
response=$(curl.exe -s -w '\n%{http_code}' --max-time 15 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
        "model": "gemini-2.0-flash",
        "messages": [
            {"role": "user", "content": "创造一个有趣的科幻故事开头"}
        ],
        "max_tokens": 120,
        "temperature": 1.2,
        "top_p": 0.9
    }' \
    "$PREVIEW_URL/v1/chat/completions")
status_code=$(echo "$response" | tail -n1)
echo "状态码: $status_code"
echo "等待3秒让日志显示..."
sleep 3
echo

# 测试8: 并发请求模拟
echo "=== 测试8：并发请求模拟 ==="
echo "🔍 观察日志: 负载均衡、并发处理、ReqID区分"
for i in {1..3}; do
    (
        response=$(curl.exe -s -w '\n%{http_code}' --max-time 10 \
            -X POST \
            -H "Content-Type: application/json" \
            -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
            -H "Authorization: Bearer $API_KEY" \
            -d "{
                \"model\": \"gemini-1.5-flash\",
                \"messages\": [
                    {\"role\": \"user\", \"content\": \"这是并发请求$i，请回复\"}
                ],
                \"max_tokens\": 20
            }" \
            "$PREVIEW_URL/v1/chat/completions")
        status_code=$(echo "$response" | tail -n1)
        echo "并发请求$i 状态码: $status_code"
    ) &
done
wait
echo "等待5秒让所有并发日志显示..."
sleep 5
echo

echo "🎉 真实请求测试完成！"
echo
echo "📊 请在Vercel Dashboard的Function Logs中观察以下日志模式："
echo "   1. [INFO] [ReqID:xxx] 📥 请求摘要 - 包含方法、路径、模型、状态码、耗时"
echo "   2. [INFO] [ReqID:xxx] 🎯 负载均衡 - API Key选择和轮询信息"
echo "   3. [INFO] [ReqID:xxx] ⚡ 性能指标 - 操作耗时和状态"
echo "   4. [DEBUG] [ReqID:xxx] 🔄 格式转换 - OpenAI ↔ Gemini转换详情"
echo "   5. [ERROR] [ReqID:xxx] ❌ 错误信息 - 如果有错误发生"
echo
echo "🔍 验证要点："
echo "   ✅ 所有日志级别都应该在Vercel中可见"
echo "   ✅ ReqID应该贯穿每个请求的完整生命周期"
echo "   ✅ 表情符号应该正确显示，便于快速识别"
echo "   ✅ 性能数据应该准确记录（响应时间、token数量等）"
echo "   ✅ 并发请求应该有不同的ReqID，便于区分"
