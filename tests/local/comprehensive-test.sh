#!/bin/bash

# =============================================================================
# Gemini Balance Lite22 - 全面测试脚本
# 测试重构后的代码架构、错误处理、负载均衡和Vercel边缘函数特性
# =============================================================================

# 测试配置
BASE_URL="http://localhost:3000"
TEST_API_KEY="test_key_1,test_key_2,test_key_3"  # 多个API Key用于负载均衡测试
SINGLE_API_KEY="test_key_1"
INVALID_API_KEY="invalid_key_123"
TIMEOUT=30
LONG_TIMEOUT=60

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 日志文件
LOG_FILE="tests/local/test-results-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# =============================================================================
# 工具函数
# =============================================================================

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_test_start() {
    local test_name="$1"
    log "${BLUE}[TEST START]${NC} $test_name"
    echo "----------------------------------------" >> "$LOG_FILE"
}

log_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    case "$status" in
        "PASS")
            PASSED_TESTS=$((PASSED_TESTS + 1))
            log "${GREEN}[PASS]${NC} $test_name"
            ;;
        "FAIL")
            FAILED_TESTS=$((FAILED_TESTS + 1))
            log "${RED}[FAIL]${NC} $test_name"
            if [ -n "$details" ]; then
                log "  详情: $details"
            fi
            ;;
        "SKIP")
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            log "${YELLOW}[SKIP]${NC} $test_name"
            ;;
    esac
    echo "" >> "$LOG_FILE"
}

# HTTP请求测试函数
test_http_request() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    local timeout="${7:-$TIMEOUT}"
    
    log_test_start "$test_name"
    
    local url="${BASE_URL}${endpoint}"
    local curl_cmd="curl -s -w '\\n%{http_code}\\n%{time_total}' --max-time $timeout"
    
    if [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    # 执行请求
    local response
    response=$(eval "$curl_cmd" 2>&1)
    local exit_code=$?
    
    # 解析响应
    local http_code
    local response_time
    local response_body

    if [ $exit_code -eq 0 ]; then
        # 使用换行符分割响应
        local lines=($(echo "$response"))
        local line_count=${#lines[@]}

        if [ $line_count -ge 2 ]; then
            # 最后一行是响应时间，倒数第二行是状态码
            response_time="${lines[$((line_count-1))]}"
            http_code="${lines[$((line_count-2))]}"

            # 响应体是除了最后两行的所有内容
            response_body=$(echo "$response" | head -n -2)
        else
            http_code="000"
            response_time="0"
            response_body="$response"
        fi
    else
        http_code="000"
        response_time="0"
        response_body="$response"
    fi
    
    # 记录详细信息到日志
    {
        echo "请求: $method $url"
        echo "期望状态码: $expected_status"
        echo "实际状态码: $http_code"
        echo "响应时间: ${response_time}s"
        echo "响应体: $response_body"
    } >> "$LOG_FILE"
    
    # 验证结果
    if [ "$http_code" = "$expected_status" ]; then
        log_test_result "$test_name" "PASS" "状态码: $http_code, 响应时间: ${response_time}s"
        return 0
    else
        log_test_result "$test_name" "FAIL" "期望: $expected_status, 实际: $http_code"
        return 1
    fi
}

# =============================================================================
# 测试套件
# =============================================================================

# 1. 基础健康检查
test_health_check() {
    log "${YELLOW}=== 1. 基础健康检查 ===${NC}"
    
    test_http_request \
        "健康检查 - 根路径" \
        "GET" \
        "/" \
        "" \
        "" \
        "200"
}

# 2. OpenAI兼容端点测试
test_openai_endpoints() {
    log "${YELLOW}=== 2. OpenAI兼容端点测试 ===${NC}"
    
    local auth_header="-H 'Authorization: Bearer $TEST_API_KEY' -H 'Content-Type: application/json'"
    
    # 2.1 聊天完成 - 正常请求
    local chat_data='{
        "model": "gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "Hello, this is a test message."}
        ],
        "max_tokens": 100
    }'
    
    test_http_request \
        "OpenAI聊天完成 - 正常请求" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$chat_data" \
        "200"
    
    # 2.2 聊天完成 - 流式请求
    local stream_data='{
        "model": "gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "Count from 1 to 5"}
        ],
        "stream": true,
        "max_tokens": 50
    }'
    
    test_http_request \
        "OpenAI聊天完成 - 流式请求" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$stream_data" \
        "200"
    
    # 2.3 模型列表
    test_http_request \
        "OpenAI模型列表" \
        "GET" \
        "/models" \
        "$auth_header" \
        "" \
        "200"
    
    # 2.4 文本嵌入
    local embedding_data='{
        "model": "text-embedding-004",
        "input": "This is a test text for embedding"
    }'
    
    test_http_request \
        "OpenAI文本嵌入" \
        "POST" \
        "/embeddings" \
        "$auth_header" \
        "$embedding_data" \
        "200"
    
    # 2.5 语音合成（预期返回不支持错误）
    local speech_data='{
        "model": "tts-1",
        "input": "Hello world",
        "voice": "alloy"
    }'
    
    test_http_request \
        "OpenAI语音合成 - 不支持功能" \
        "POST" \
        "/audio/speech" \
        "$auth_header" \
        "$speech_data" \
        "501"
}

# 3. 原生Gemini端点测试
test_gemini_endpoints() {
    log "${YELLOW}=== 3. 原生Gemini端点测试 ===${NC}"
    
    local auth_header="-H 'x-goog-api-key: $SINGLE_API_KEY' -H 'Content-Type: application/json'"
    
    # 3.1 生成内容
    local gemini_data='{
        "contents": [
            {
                "parts": [
                    {"text": "Hello, this is a test for Gemini API"}
                ]
            }
        ]
    }'
    
    test_http_request \
        "Gemini生成内容 - 正常请求" \
        "POST" \
        "/v1beta/models/gemini-2.5-flash:generateContent" \
        "$auth_header" \
        "$gemini_data" \
        "200"
    
    # 3.2 流式生成内容
    test_http_request \
        "Gemini流式生成内容" \
        "POST" \
        "/v1beta/models/gemini-2.5-flash:streamGenerateContent" \
        "$auth_header" \
        "$gemini_data" \
        "200"
}

# 4. 错误场景测试
test_error_scenarios() {
    log "${YELLOW}=== 4. 错误场景测试 ===${NC}"

    local auth_header="-H 'Authorization: Bearer $TEST_API_KEY' -H 'Content-Type: application/json'"

    # 4.1 无效JSON格式
    test_http_request \
        "错误场景 - 无效JSON格式" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "test"}' \
        "400"

    # 4.2 缺少必需字段
    test_http_request \
        "错误场景 - 缺少messages字段" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        '{"model": "gemini-2.5-flash"}' \
        "400"

    # 4.3 不支持的模型
    local unsupported_model_data='{
        "model": "unsupported-model-123",
        "messages": [
            {"role": "user", "content": "test"}
        ]
    }'

    test_http_request \
        "错误场景 - 不支持的模型" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$unsupported_model_data" \
        "400"

    # 4.4 不存在的端点
    test_http_request \
        "错误场景 - 不存在的端点" \
        "GET" \
        "/nonexistent/endpoint" \
        "" \
        "" \
        "404"

    # 4.5 不支持的HTTP方法
    test_http_request \
        "错误场景 - 不支持的HTTP方法" \
        "PUT" \
        "/chat/completions" \
        "$auth_header" \
        '{}' \
        "405"

    # 4.6 超大请求体（测试token限制）
    local large_content=""
    for i in {1..1000}; do
        large_content="$large_content This is a very long text to test the token limit. "
    done

    local large_data="{
        \"model\": \"gemini-2.5-flash\",
        \"messages\": [
            {\"role\": \"user\", \"content\": \"$large_content\"}
        ]
    }"

    test_http_request \
        "错误场景 - 超大请求体" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$large_data" \
        "400" \
        "$LONG_TIMEOUT"
}

# 5. 安全场景测试
test_security_scenarios() {
    log "${YELLOW}=== 5. 安全场景测试 ===${NC}"

    # 5.1 无API Key
    test_http_request \
        "安全测试 - 无API Key" \
        "POST" \
        "/chat/completions" \
        "-H 'Content-Type: application/json'" \
        '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "test"}]}' \
        "401"

    # 5.2 无效API Key
    test_http_request \
        "安全测试 - 无效API Key" \
        "POST" \
        "/chat/completions" \
        "-H 'Authorization: Bearer $INVALID_API_KEY' -H 'Content-Type: application/json'" \
        '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "test"}]}' \
        "401"

    # 5.3 格式错误的Authorization头
    test_http_request \
        "安全测试 - 格式错误的Authorization头" \
        "POST" \
        "/chat/completions" \
        "-H 'Authorization: InvalidFormat' -H 'Content-Type: application/json'" \
        '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "test"}]}' \
        "401"

    # 5.4 空的API Key
    test_http_request \
        "安全测试 - 空的API Key" \
        "POST" \
        "/chat/completions" \
        "-H 'Authorization: Bearer ' -H 'Content-Type: application/json'" \
        '{"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": "test"}]}' \
        "401"
}

# 6. 负载均衡测试
test_load_balancing() {
    log "${YELLOW}=== 6. 负载均衡测试 ===${NC}"

    local multi_key_header="-H 'Authorization: Bearer $TEST_API_KEY' -H 'Content-Type: application/json'"
    local test_data='{
        "model": "gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "Test load balancing"}
        ],
        "max_tokens": 50
    }'

    # 6.1 多API Key负载均衡
    for i in {1..5}; do
        test_http_request \
            "负载均衡测试 - 请求 $i" \
            "POST" \
            "/chat/completions" \
            "$multi_key_header" \
            "$test_data" \
            "200"

        # 短暂延迟以观察负载均衡效果
        sleep 1
    done

    # 6.2 单API Key白名单测试（如果配置了TRUSTED_API_KEYS）
    local single_key_header="-H 'Authorization: Bearer $SINGLE_API_KEY' -H 'Content-Type: application/json'"

    test_http_request \
        "负载均衡测试 - 单Key白名单验证" \
        "POST" \
        "/chat/completions" \
        "$single_key_header" \
        "$test_data" \
        "200"
}

# 7. 超时场景测试
test_timeout_scenarios() {
    log "${YELLOW}=== 7. 超时场景测试 ===${NC}"

    local auth_header="-H 'Authorization: Bearer $TEST_API_KEY' -H 'Content-Type: application/json'"

    # 7.1 长时间处理请求（接近Vercel 25秒限制）
    local complex_data='{
        "model": "gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "Please write a very detailed explanation of quantum computing, including its principles, applications, and future prospects. Make it comprehensive and detailed."}
        ],
        "max_tokens": 2000,
        "temperature": 0.7
    }'

    test_http_request \
        "超时测试 - 复杂请求" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$complex_data" \
        "200" \
        "30"

    # 7.2 流式响应超时测试
    local stream_complex_data='{
        "model": "gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "Generate a long story about artificial intelligence and the future of humanity."}
        ],
        "stream": true,
        "max_tokens": 1500
    }'

    test_http_request \
        "超时测试 - 流式响应" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$stream_complex_data" \
        "200" \
        "35"

    # 7.3 网络超时模拟（使用很短的超时时间）
    test_http_request \
        "超时测试 - 网络超时模拟" \
        "POST" \
        "/chat/completions" \
        "$auth_header" \
        "$complex_data" \
        "000" \
        "1"  # 1秒超时，应该会失败
}

# 启动测试
main() {
    log "${GREEN}开始全面测试 - $(date)${NC}"
    log "测试目标: $BASE_URL"
    log "日志文件: $LOG_FILE"
    log ""
    
    # 检查服务是否运行
    if ! curl -s --max-time 5 "$BASE_URL" > /dev/null; then
        log "${RED}错误: 无法连接到 $BASE_URL${NC}"
        log "请确保本地服务正在运行: npm run dev"
        exit 1
    fi
    
    # 执行测试套件
    test_health_check
    test_openai_endpoints
    test_gemini_endpoints
    test_error_scenarios
    test_security_scenarios
    test_load_balancing
    test_timeout_scenarios
    
    # 显示测试结果统计
    log ""
    log "${GREEN}=== 测试结果统计 ===${NC}"
    log "总测试数: $TOTAL_TESTS"
    log "通过: ${GREEN}$PASSED_TESTS${NC}"
    log "失败: ${RED}$FAILED_TESTS${NC}"
    log "跳过: ${YELLOW}$SKIPPED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "${GREEN}所有测试通过！${NC}"
        exit 0
    else
        log "${RED}有 $FAILED_TESTS 个测试失败${NC}"
        log "详细信息请查看: $LOG_FILE"
        exit 1
    fi
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  --help, -h    显示帮助信息"
    echo "  --url URL     指定测试URL (默认: $BASE_URL)"
    echo ""
    echo "示例:"
    echo "  $0                    # 使用默认配置测试"
    echo "  $0 --url http://localhost:3001  # 指定URL测试"
    exit 0
fi

if [ "$1" = "--url" ] && [ -n "$2" ]; then
    BASE_URL="$2"
fi

# 运行测试
main
