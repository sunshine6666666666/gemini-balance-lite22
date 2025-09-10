#!/bin/bash

# Preview环境快速测试脚本
# 目标：快速验证核心功能，重点观察console.log

# 配置
PREVIEW_URL="https://gemini-balance-lite22-2t3vi9lq2-showlin666s-projects.vercel.app"
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
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志文件
LOG_FILE="tests/preview/quick-test-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log "${GREEN}快速Preview测试 - $(date)${NC}"
log "目标: $PREVIEW_URL"
log "API Key: ${FIRST_KEY:0:20}..."
log ""

log "${YELLOW}=== 测试1：健康检查 ===${NC}"
log "🔍 Console.log观察: [文件：vercel_index.js] 静态文件过滤，[文件：gemini-handler.js] 首页处理"
curl.exe -s -w '\n状态码:%{http_code} 时间:%{time_total}s' "$(build_url "/")" | tee -a "$LOG_FILE"
log ""

log "${YELLOW}=== 测试2：OpenAI聊天API ===${NC}"
log "🔍 Console.log观察: [文件：openai-adapter.js] 格式转换，thoughtsTokenCount，content字段"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 30 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hello, 这是一个测试消息"}],"max_tokens":100}' \
  "$(build_url "/v1/chat/completions")" | tee -a "$LOG_FILE"
log ""

log "${YELLOW}=== 测试3：Gemini原生API ===${NC}"
log "🔍 Console.log观察: [文件：gemini-handler.js] 原生API处理，负载均衡选择"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 30 \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $FIRST_KEY" \
  -d '{"contents":[{"role":"user","parts":[{"text":"测试Gemini原生API"}]}],"generationConfig":{"maxOutputTokens":100}}' \
  "$(build_url "/v1beta/models/gemini-2.5-flash:generateContent")" | tee -a "$LOG_FILE"
log ""

log "${YELLOW}=== 测试4：模型列表 ===${NC}"
log "🔍 Console.log观察: [文件：openai-adapter.js] 模型列表处理"
curl.exe -s -w '\n状态码:%{http_code}' \
  -H "Authorization: Bearer $FIRST_KEY" \
  "$(build_url "/v1/models")" | tee -a "$LOG_FILE"
log ""

log "${YELLOW}=== 测试5：错误处理 ===${NC}"
log "🔍 Console.log观察: [文件：openai-adapter.js] 错误处理，Missing API Key"
curl.exe -s -w '\n状态码:%{http_code}' \
  "$(build_url "/v1/models")" | tee -a "$LOG_FILE"
log ""

log "${GREEN}快速测试完成！${NC}"
log "📊 请查看Vercel Dashboard的Function Logs观察详细日志"
log "📄 本地日志: $LOG_FILE"
log ""
log "🔍 重点观察的Console.log模式："
log "   - [文件：xxx.js][模块名][函数名][ReqID:xxx] 日志前缀"
log "   - 步骤编号: [步骤 1], [步骤 2.1] 等"
log "   - 负载均衡: 选中API Key的脱敏显示"
log "   - 错误处理: 错误堆栈和异常信息"
log "   - Gemini 2.5: thoughtsTokenCount和content字段"
