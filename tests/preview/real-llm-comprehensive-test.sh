#!/bin/bash

# 真实LLM综合测试脚本 - 多种场景测试
# 目标：测试各种真实的LLM使用场景，观察详细的Console.log

# 配置
PREVIEW_URL="https://gemini-balance-lite22-fmdafo5qs-showlin666s-projects.vercel.app"
BYPASS_SECRET="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
TRUSTED_KEYS="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c,AIzaSyAim8GjbyZmjKHdRE7rMNG8KO33DQ--Udk"
FIRST_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

# 构建URL
build_url() {
    local endpoint="$1"
    echo "${PREVIEW_URL}${endpoint}"
}

# 绕过令牌作为HTTP头
BYPASS_HEADER="x-vercel-protection-bypass: ${BYPASS_SECRET}"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 日志文件
LOG_FILE="tests/preview/real-llm-test-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log "${GREEN}🚀 真实LLM综合测试开始 - $(date)${NC}"
log "目标: $PREVIEW_URL"
log "API Key: ${FIRST_KEY:0:20}..."
log ""

# 测试1：写诗 - 创意写作
log "${YELLOW}=== 测试1：创意写作 - 写诗 ===${NC}"
log "🔍 Console.log观察: 创意内容生成，温度参数，输出token统计"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 45 \
  -H "$BYPASS_HEADER" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "请写一首关于人工智能的现代诗，要求有韵律感，表达对AI未来的思考。"
      }
    ],
    "temperature": 0.8,
    "max_tokens": 300
  }' \
  "$(build_url "/v1/chat/completions")" | tee -a "$LOG_FILE"
log ""
sleep 3

# 测试2：编程任务 - 代码生成
log "${YELLOW}=== 测试2：编程任务 - 代码生成 ===${NC}"
log "🔍 Console.log观察: 代码生成，结构化输出，技术内容处理"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 45 \
  -H "$BYPASS_HEADER" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "请用Python写一个简单的负载均衡器类，要求支持轮询和随机两种算法，包含完整的注释和使用示例。"
      }
    ],
    "temperature": 0.2,
    "max_tokens": 800
  }' \
  "$(build_url "/v1/chat/completions")" | tee -a "$LOG_FILE"
log ""
sleep 3

# 测试3：文本修改 - 内容编辑
log "${YELLOW}=== 测试3：文本修改 - 内容编辑 ===${NC}"
log "🔍 Console.log观察: 文本处理，上下文理解，编辑指令执行"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 45 \
  -H "$BYPASS_HEADER" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "请将以下文本改写得更加正式和专业：\n\n\"我们的API代理服务挺好用的，能处理很多请求，还有负载均衡功能，用户反馈不错。\"\n\n要求：保持原意，提升语言规范性，适合技术文档。"
      }
    ],
    "temperature": 0.3,
    "max_tokens": 200
  }' \
  "$(build_url "/v1/chat/completions")" | tee -a "$LOG_FILE"
log ""
sleep 3

# 测试4：数据分析 - 结构化思考
log "${YELLOW}=== 测试4：数据分析 - 结构化思考 ===${NC}"
log "🔍 Console.log观察: 分析推理，逻辑思考，结构化输出"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 45 \
  -H "$BYPASS_HEADER" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "分析以下API使用数据，给出优化建议：\n\n- 每日请求量：10万次\n- 平均响应时间：1.2秒\n- 错误率：2.5%\n- 主要错误：超时(60%)、API Key无效(25%)、其他(15%)\n- 峰值时段：上午9-11点，下午2-4点\n\n请提供具体的优化方案。"
      }
    ],
    "temperature": 0.4,
    "max_tokens": 500
  }' \
  "$(build_url "/v1/chat/completions")" | tee -a "$LOG_FILE"
log ""
sleep 3

# 测试5：多轮对话 - 上下文理解
log "${YELLOW}=== 测试5：多轮对话 - 上下文理解 ===${NC}"
log "🔍 Console.log观察: 多消息处理，上下文连贯性，对话管理"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 45 \
  -H "$BYPASS_HEADER" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRST_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "我正在开发一个API代理服务，需要实现负载均衡功能。"
      },
      {
        "role": "assistant",
        "content": "很好的项目！API代理服务的负载均衡确实很重要。你可以考虑几种算法：轮询、随机选择、加权轮询等。你希望支持哪种场景？"
      },
      {
        "role": "user",
        "content": "我想实现时间窗口轮询算法，能根据时间自动切换API Key。具体应该怎么设计？"
      }
    ],
    "temperature": 0.5,
    "max_tokens": 400
  }' \
  "$(build_url "/v1/chat/completions")" | tee -a "$LOG_FILE"
log ""
sleep 3

# 测试6：Gemini原生API - 复杂请求
log "${YELLOW}=== 测试6：Gemini原生API - 复杂请求 ===${NC}"
log "🔍 Console.log观察: 原生API处理，复杂参数，安全设置"
curl.exe -s -w '\n状态码:%{http_code}' --max-time 45 \
  -H "$BYPASS_HEADER" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $FIRST_KEY" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "请详细解释Vercel Edge Functions的工作原理，包括运行时环境、性能特点和最佳实践。"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.3,
      "maxOutputTokens": 600,
      "topP": 0.9,
      "topK": 40
    },
    "safetySettings": [
      {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }' \
  "$(build_url "/v1beta/models/gemini-2.5-flash:generateContent")" | tee -a "$LOG_FILE"
log ""

log "${GREEN}🎉 真实LLM综合测试完成！${NC}"
log "📊 请立即查看Vercel Dashboard的Function Logs观察详细日志"
log "📄 本地日志: $LOG_FILE"
log ""
log "🔍 重点观察的Console.log模式："
log "   - 📥 收到请求 / ✅ 处理API请求"
log "   - 🔍 ===== LLM请求信息 ===== (开始标记)"
log "   - 📦 请求体内容 (完整的JSON请求)"
log "   - 🎯 负载均衡选择和API Key管理"
log "   - 📊 响应状态和耗时统计"
log "   - 📤 ===== LLM响应信息 ===== (结束标记)"
log "   - 📦 响应体内容 (完整的JSON响应)"
log ""
log "🎯 特别关注："
log "   - 不同温度参数对输出的影响"
log "   - 各种内容类型的处理效果"
log "   - 多轮对话的上下文管理"
log "   - Gemini 2.5的思考机制 (thoughtsTokenCount)"
log "   - 负载均衡算法的实际运行情况"
