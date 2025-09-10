#!/bin/bash

# Preview环境综合测试脚本
# 目标：全面测试生产环境功能，记录console.log观察点

# 配置
PREVIEW_URL="https://gemini-balance-lite22-ayy8t5h0f-showlin666s-projects.vercel.app"
# 从.env.local读取真实的API Key进行测试
TRUSTED_KEYS=$(grep "TRUSTED_API_KEYS=" .env.local | cut -d'=' -f2)
FIRST_KEY=$(echo "$TRUSTED_KEYS" | cut -d',' -f1)
SECOND_KEY=$(echo "$TRUSTED_KEYS" | cut -d',' -f2)
MULTI_KEYS="$FIRST_KEY,$SECOND_KEY"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志文件
LOG_FILE="tests/preview/preview-test-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# 测试函数
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    local console_log_notes="$7"
    
    log "${BLUE}[TEST START]${NC} $test_name"
    log "=========================================="
    log "🎯 Console.log观察重点: $console_log_notes"
    log "📍 请求详情:"
    log "   方法: $method"
    log "   端点: $endpoint"
    log "   期望状态: $expected_status"
    log ""
    
    # 构建curl命令
    local curl_cmd="curl.exe -s -w '\\n%{http_code}' --max-time 30"
    
    if [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$PREVIEW_URL$endpoint'"
    
    log "📤 执行命令: $curl_cmd"
    log ""
    
    # 执行请求
    local start_time=$(date +%s)
    local response=$(eval $curl_cmd)
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 解析响应
    local http_code=$(echo "$response" | tail -n 1)
    local response_body=$(echo "$response" | head -n -1)
    
    # 记录结果
    log "📥 响应结果:"
    log "   状态码: $http_code"
    log "   响应时间: ${duration}秒"
    log "   响应体长度: ${#response_body} 字符"
    log ""
    log "📄 响应内容:"
    echo "$response_body" | head -c 500 | tee -a "$LOG_FILE"
    if [ ${#response_body} -gt 500 ]; then
        log "... (响应内容已截断，完整内容请查看Vercel Dashboard)"
    fi
    log ""
    
    # 判断结果
    if [ "$http_code" = "$expected_status" ]; then
        log "${GREEN}[PASS]${NC} $test_name"
    else
        log "${RED}[FAIL]${NC} $test_name (期望: $expected_status, 实际: $http_code)"
    fi
    
    log "🔍 Console.log检查提醒: $console_log_notes"
    log "=========================================="
    log ""
    
    # 等待一下，避免请求过快
    sleep 2
}

main() {
    log "${GREEN}开始Preview环境综合测试 - $(date)${NC}"
    log "测试目标: $PREVIEW_URL"
    log "日志文件: $LOG_FILE"
    log "使用API Key: ${FIRST_KEY:0:20}..."
    log ""
    
    log "${YELLOW}=== 第1组：基础连通性测试 ===${NC}"
    
    # 测试1：健康检查
    run_test \
        "健康检查" \
        "GET" \
        "/" \
        "" \
        "" \
        "200" \
        "观察: [文件：vercel_index.js] 是否正确过滤静态文件请求，[文件：gemini-handler.js] 首页访问日志"
    
    log "${YELLOW}=== 第2组：OpenAI兼容API测试 ===${NC}"
    
    # 测试2：OpenAI简单聊天
    run_test \
        "OpenAI简单聊天" \
        "POST" \
        "/v1/chat/completions" \
        "-H 'Content-Type: application/json' -H 'Authorization: Bearer $FIRST_KEY'" \
        '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hello, test message"}],"max_tokens":100}' \
        "200" \
        "观察: [文件：openai-adapter.js] 格式转换过程，thoughtsTokenCount数值，content是否为null"
    
    # 测试3：OpenAI模型列表
    run_test \
        "OpenAI模型列表" \
        "GET" \
        "/v1/models" \
        "-H 'Authorization: Bearer $FIRST_KEY'" \
        "" \
        "200" \
        "观察: [文件：openai-adapter.js] 模型列表处理，API Key验证过程"
    
    # 测试4：OpenAI无API Key
    run_test \
        "OpenAI无API Key" \
        "GET" \
        "/v1/models" \
        "" \
        "" \
        "401" \
        "观察: [文件：openai-adapter.js] 错误处理，Missing API Key日志"
    
    log "${YELLOW}=== 第3组：Gemini原生API测试 ===${NC}"
    
    # 测试5：Gemini原生API
    run_test \
        "Gemini原生API" \
        "POST" \
        "/v1beta/models/gemini-2.5-flash:generateContent" \
        "-H 'Content-Type: application/json' -H 'x-goog-api-key: $FIRST_KEY'" \
        '{"contents":[{"role":"user","parts":[{"text":"测试Gemini原生API"}]}],"generationConfig":{"maxOutputTokens":100}}' \
        "200" \
        "观察: [文件：gemini-handler.js] 原生API处理流程，负载均衡选择，API请求耗时"
    
    # 测试6：Gemini无API Key
    run_test \
        "Gemini无API Key" \
        "POST" \
        "/v1beta/models/gemini-2.5-flash:generateContent" \
        "-H 'Content-Type: application/json'" \
        '{"contents":[{"role":"user","parts":[{"text":"测试"}]}]}' \
        "401" \
        "观察: [文件：gemini-handler.js] 安全验证失败，错误响应格式"
    
    log "${YELLOW}=== 第4组：负载均衡测试 ===${NC}"
    
    # 测试7-9：负载均衡验证
    for i in {1..3}; do
        run_test \
            "负载均衡测试-$i" \
            "POST" \
            "/v1/chat/completions" \
            "-H 'Content-Type: application/json' -H 'Authorization: Bearer $MULTI_KEYS'" \
            "{\"model\":\"gemini-2.5-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"负载均衡测试第${i}次\"}],\"max_tokens\":50}" \
            "200" \
            "观察: [文件：load-balancer.js] 时间窗口计算，选中索引变化，API Key轮询"
    done
    
    log "${YELLOW}=== 第5组：安全机制测试 ===${NC}"
    
    # 测试10：无效API Key
    run_test \
        "无效API Key测试" \
        "GET" \
        "/v1/models" \
        "-H 'Authorization: Bearer invalid_key_12345'" \
        "" \
        "400" \
        "观察: [文件：security.js] 白名单验证失败，API Key脱敏显示"
    
    # 测试11：白名单验证
    run_test \
        "白名单验证测试" \
        "POST" \
        "/v1/chat/completions" \
        "-H 'Content-Type: application/json' -H 'Authorization: Bearer untrusted_test_key'" \
        '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"测试"}]}' \
        "401" \
        "观察: [文件：security.js] validateTrustedApiKey函数，白名单验证结果"
    
    log "${YELLOW}=== 第6组：错误处理测试 ===${NC}"
    
    # 测试12：无效JSON
    run_test \
        "无效JSON测试" \
        "POST" \
        "/v1/chat/completions" \
        "-H 'Content-Type: application/json' -H 'Authorization: Bearer $FIRST_KEY'" \
        '{"invalid_json":}' \
        "400" \
        "观察: [文件：openai-adapter.js] JSON解析错误处理，错误堆栈记录"
    
    # 测试13：不存在的端点
    run_test \
        "不存在端点测试" \
        "GET" \
        "/v1/nonexistent" \
        "-H 'Authorization: Bearer $FIRST_KEY'" \
        "" \
        "404" \
        "观察: [文件：gemini-handler.js] 路由处理，404错误响应"
    
    log "${YELLOW}=== 第7组：Gemini 2.5思考机制测试 ===${NC}"
    
    # 测试14：复杂问题（可能触发思考机制）
    run_test \
        "复杂问题测试" \
        "POST" \
        "/v1/chat/completions" \
        "-H 'Content-Type: application/json' -H 'Authorization: Bearer $FIRST_KEY'" \
        '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"请详细解释量子计算的工作原理，包括量子比特、量子纠缠和量子算法的概念"}],"max_tokens":300}' \
        "200" \
        "观察: [文件：openai-adapter.js] thoughtsTokenCount数值，candidatesTokenCount，content是否为null，finishReason"
    
    log "${YELLOW}=== 测试完成 ===${NC}"
    log "📊 所有测试已完成，请查看Vercel Dashboard的Function Logs"
    log "🔍 重点观察以下日志模式："
    log "   - [文件：xxx.js][模块名][函数名][ReqID:xxx] 格式"
    log "   - 负载均衡选择过程"
    log "   - API Key脱敏显示"
    log "   - 错误处理和堆栈信息"
    log "   - thoughtsTokenCount和实际输出"
    log ""
    log "📄 详细测试日志: $LOG_FILE"
}

# 执行主函数
main "$@"
