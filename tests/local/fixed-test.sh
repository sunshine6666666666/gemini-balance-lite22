#!/bin/bash

# 修复后的测试脚本 - 正确解析HTTP状态码
BASE_URL="http://localhost:3000"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${GREEN}=== 修复后的功能测试 ===${NC}"
echo "测试目标: $BASE_URL"
echo

# 测试函数
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    
    # 构建curl命令
    local curl_cmd="curl -s -w '\\n%{http_code}' --max-time 10"
    
    if [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # 执行请求
    local response
    response=$(eval "$curl_cmd" 2>&1)
    
    # 解析状态码（最后一行）
    local http_code
    http_code=$(echo "$response" | tail -n 1)
    
    # 响应体（除了最后一行）
    local response_body
    response_body=$(echo "$response" | head -n -1)
    
    # 验证结果
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✅ PASS${NC} - 状态码: $http_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC} - 期望: $expected_status, 实际: $http_code"
        echo -e "  响应: ${response_body:0:100}..."
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo
}

# 1. 基础健康检查
echo -e "${YELLOW}=== 1. 基础健康检查 ===${NC}"
test_endpoint "健康检查" "GET" "/" "" "" "200"

# 2. 安全测试
echo -e "${YELLOW}=== 2. 安全验证测试 ===${NC}"
test_endpoint "无API Key的Gemini请求" "POST" "/v1beta/models/gemini-2.5-pro:generateContent" \
    "-H 'Content-Type: application/json'" \
    '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}' \
    "401"

test_endpoint "无效API Key的Gemini请求" "POST" "/v1beta/models/gemini-2.5-pro:generateContent" \
    "-H 'Content-Type: application/json' -H 'x-goog-api-key: invalid_key'" \
    '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}' \
    "401"

# 3. OpenAI兼容性测试（临时禁用状态）
echo -e "${YELLOW}=== 3. OpenAI兼容性测试（临时禁用） ===${NC}"
test_endpoint "OpenAI聊天完成" "POST" "/v1/chat/completions" \
    "-H 'Content-Type: application/json' -H 'Authorization: Bearer test_key'" \
    '{"model":"gemini-2.5-pro","messages":[{"role":"user","content":"Hello"}]}' \
    "503"

test_endpoint "OpenAI模型列表" "GET" "/v1/models" \
    "-H 'Authorization: Bearer test_key'" \
    "" \
    "503"

# 4. 错误处理测试
echo -e "${YELLOW}=== 4. 错误处理测试 ===${NC}"
test_endpoint "不存在的端点" "GET" "/nonexistent" "" "" "401"

test_endpoint "无效JSON格式" "POST" "/v1beta/models/gemini-2.5-pro:generateContent" \
    "-H 'Content-Type: application/json' -H 'x-goog-api-key: test_key'" \
    '{"invalid": json}' \
    "401"

# 测试结果统计
echo -e "${YELLOW}=== 测试结果统计 ===${NC}"
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}❌ 有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi
