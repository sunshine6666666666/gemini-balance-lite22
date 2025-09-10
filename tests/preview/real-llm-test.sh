#!/bin/bash

# 真实LLM测试脚本 - 测试实际的API响应
# 目标：验证API功能和观察Console.log

# 配置
PREVIEW_URL="https://gemini-balance-lite22-4uy0mrkyk-showlin666s-projects.vercel.app"

# 从.env.preview读取配置
BYPASS_SECRET=$(grep "VERCEL_AUTOMATION_BYPASS_SECRET=" .env.preview | cut -d'=' -f2)
TRUSTED_KEYS=$(grep "TRUSTED_API_KEYS=" .env.preview | cut -d'=' -f2)
FIRST_KEY=$(echo "$TRUSTED_KEYS" | cut -d',' -f1)

# 构建带绕过令牌的URL
build_url() {
    local endpoint="$1"
    echo "${PREVIEW_URL}${endpoint}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${BYPASS_SECRET}"
}

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志文件
LOG_FILE="tests/preview/real-llm-test-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

echo "真实LLM测试 - $(date)"
echo "目标: $PREVIEW_URL"
echo "API Key: ${FIRST_KEY:0:20}..."
echo "绕过令牌: ${BYPASS_SECRET:0:10}..."
echo ""

# 测试1：简单问候
echo "=== 测试1：简单问候 ==="
echo "🔍 Console.log观察: OpenAI格式转换，负载均衡选择，响应处理"

URL=$(build_url "/v1/chat/completions")
echo "请求URL: $URL"

RESPONSE=$(curl.exe -s -w '\n%{http_code}' --max-time 30 \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "你好，请简单介绍一下你自己"}
    ],
    "max_tokens": 200,
    "temperature": 0.7
  }' \
  "$URL")

echo "响应结果:"
echo "$RESPONSE"
echo ""

# 测试2：Gemini原生API
echo "=== 测试2：Gemini原生API ==="
echo "🔍 Console.log观察: 原生API处理，负载均衡，thoughtsTokenCount"

URL=$(build_url "/v1beta/models/gemini-2.5-flash:generateContent")
echo "请求URL: $URL"

RESPONSE=$(curl.exe -s -w '\n%{http_code}' --max-time 30 \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "x-goog-api-key: $FIRST_KEY" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{"text": "请用一句话介绍人工智能"}]
      }
    ],
    "generationConfig": {
      "maxOutputTokens": 100,
      "temperature": 0.7
    }
  }' \
  "$URL")

echo "响应结果:"
echo "$RESPONSE"
echo ""

# 测试3：模型列表
echo "=== 测试3：模型列表 ==="
echo "🔍 Console.log观察: 模型列表处理"

URL=$(build_url "/v1/models")
echo "请求URL: $URL"

RESPONSE=$(curl.exe -s -w '\n%{http_code}' --max-time 15 \
  -H "Authorization: Bearer $FIRST_KEY" \
  "$URL")

echo "响应结果:"
echo "$RESPONSE"
echo ""

# 测试4：健康检查
echo "=== 测试4：健康检查 ==="
echo "🔍 Console.log观察: 首页处理，静态文件过滤"

URL=$(build_url "/")
echo "请求URL: $URL"

RESPONSE=$(curl.exe -s -w '\n%{http_code}' --max-time 10 "$URL")

echo "响应结果:"
echo "$RESPONSE"
echo ""

echo "真实LLM测试完成！"
echo "📊 请查看Vercel Dashboard的Function Logs观察详细日志"
echo "📄 本地日志: $LOG_FILE"
echo ""
echo "🔍 重点观察的Console.log模式："
echo "   - [文件：xxx.js][模块名][函数名][ReqID:xxx] 日志前缀"
echo "   - 步骤编号: [步骤 1], [步骤 2.1] 等"
echo "   - 负载均衡: 选中API Key的脱敏显示"
echo "   - 格式转换: OpenAI ↔ Gemini 转换过程"
echo "   - thoughtsTokenCount: Gemini 2.5思考机制"
echo "   - 错误处理: 异常捕获和堆栈信息"
