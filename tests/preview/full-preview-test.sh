#!/bin/bash

# Preview环境全面测试脚本 - 参考local测试的所有内容
# 测试所有API功能、错误处理、负载均衡、大量token、各种模型、各种错误情况

# 配置
PREVIEW_URL="https://gemini-balance-lite22-da2gyg5qn-showlin666s-projects.vercel.app"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
TRUSTED_KEYS="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c,AIzaSyAim8GjbyZmjKHdRE7rMNG8KO33DQ--Udk"
SINGLE_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
INVALID_KEY="invalid_key_test"

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 日志文件
LOG_FILE="tests/preview/full-preview-test-$(date +%Y%m%d-%H%M%S).log"

echo "🚀 Preview环境全面测试开始 - 参考local测试内容" | tee "$LOG_FILE"
echo "📊 测试URL: $PREVIEW_URL" | tee -a "$LOG_FILE"
echo "🔑 绕过令牌: ${BYPASS_TOKEN:0:8}..." | tee -a "$LOG_FILE"
echo "⏰ 测试时间: $(date)" | tee -a "$LOG_FILE"
echo "===========================================" | tee -a "$LOG_FILE"

# 测试函数
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    local timeout="${7:-15}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "" | tee -a "$LOG_FILE"
    echo "🧪 测试 $TOTAL_TESTS: $test_name" | tee -a "$LOG_FILE"
    
    local cmd="curl.exe -s -w '\\n%{http_code}' --max-time $timeout"
    cmd="$cmd -H 'x-vercel-protection-bypass: $BYPASS_TOKEN'"
    
    if [ "$method" = "POST" ]; then
        cmd="$cmd -X POST -H 'Content-Type: application/json'"
    fi
    
    if [ -n "$headers" ]; then
        cmd="$cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        cmd="$cmd -d '$data'"
    fi
    
    cmd="$cmd '$PREVIEW_URL$endpoint'"
    
    echo "📝 命令: $cmd" | tee -a "$LOG_FILE"
    
    local start_time=$(date +%s%3N)
    local result
    result=$(eval "$cmd" 2>&1)
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    local status_code=$(echo "$result" | tail -n1)
    local response_body=$(echo "$result" | head -n -1)
    
    echo "📊 状态码: $status_code (期望: $expected_status)" | tee -a "$LOG_FILE"
    echo "⏱️ 响应时间: ${duration}ms" | tee -a "$LOG_FILE"
    echo "📄 响应: ${response_body:0:300}..." | tee -a "$LOG_FILE"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ 测试通过" | tee -a "$LOG_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ 测试失败" | tee -a "$LOG_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# ==================== 第一部分：基础功能测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第一部分：基础功能测试" | tee -a "$LOG_FILE"

# 1. 健康检查
test_api "健康检查" "GET" "/" "" "" "200"

# 2. 模型列表测试 - 各种认证情况
test_api "模型列表-无认证" "GET" "/v1/models" "" "" "401"
test_api "模型列表-空认证头" "GET" "/v1/models" "-H 'Authorization: '" "" "401"
test_api "模型列表-错误格式" "GET" "/v1/models" "-H 'Authorization: InvalidFormat'" "" "401"
test_api "模型列表-无效Key" "GET" "/v1/models" "-H 'Authorization: Bearer $INVALID_KEY'" "" "401"
test_api "模型列表-有效Key" "GET" "/v1/models" "-H 'Authorization: Bearer $SINGLE_KEY'" "" "200"

# 3. 负载均衡测试
test_api "负载均衡-多Key" "GET" "/v1/models" "-H 'Authorization: Bearer $TRUSTED_KEYS'" "" "200"
test_api "负载均衡-混合Key" "GET" "/v1/models" "-H 'Authorization: Bearer $SINGLE_KEY,$INVALID_KEY'" "" "200"

# ==================== 第二部分：聊天API测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第二部分：聊天API测试 - 各种模型和参数" | tee -a "$LOG_FILE"

# 4. 基础聊天测试
test_api "聊天-简单请求" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}],"max_tokens":10}' "200" 25

# 5. 各种模型测试
test_api "聊天-Gemini1.5Pro" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-pro","messages":[{"role":"user","content":"Hello"}],"max_tokens":20}' "200" 30

test_api "聊天-Gemini2.5Flash" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hello"}],"max_tokens":20}' "200" 30

test_api "聊天-Gemini2.0Flash" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-2.0-flash","messages":[{"role":"user","content":"Hello"}],"max_tokens":20}' "200" 30

# 6. 大量token测试
LARGE_PROMPT="请详细介绍人工智能的发展历史，包括早期的理论基础、关键的技术突破、重要的里程碑事件、主要的研究机构和科学家贡献、以及当前的发展趋势和未来展望。请从多个角度进行分析，包括技术层面、应用层面、社会影响层面等。"

test_api "聊天-大量输入token" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "{\"model\":\"gemini-1.5-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"$LARGE_PROMPT\"}],\"max_tokens\":1000}" "200" 45

test_api "聊天-超大输出token" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"请写一篇2000字的文章介绍机器学习"}],"max_tokens":2000}' "200" 60

# 7. 多轮对话测试
MULTI_TURN='{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"你好"},{"role":"assistant","content":"你好！有什么可以帮助你的吗？"},{"role":"user","content":"请介绍一下Python"}],"max_tokens":200}'

test_api "聊天-多轮对话" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "$MULTI_TURN" "200" 35

# ==================== 第三部分：错误处理测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第三部分：错误处理测试" | tee -a "$LOG_FILE"

# 8. 各种错误情况
test_api "聊天-无认证" "POST" "/v1/chat/completions" "" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}]}' "401"

test_api "聊天-无效模型" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"invalid-model","messages":[{"role":"user","content":"Hi"}]}' "400" 20

test_api "聊天-空消息" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[]}' "400" 20

test_api "聊天-无效JSON" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}' "400" 20

test_api "聊天-超大token请求" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}],"max_tokens":100000}' "400" 20

# 9. 不存在的端点
test_api "不存在的端点" "GET" "/v1/nonexistent" "-H 'Authorization: Bearer $SINGLE_KEY'" "" "404"

test_api "错误的HTTP方法" "PUT" "/v1/models" "-H 'Authorization: Bearer $SINGLE_KEY'" "" "405"

# ==================== 第四部分：性能和压力测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第四部分：性能和压力测试" | tee -a "$LOG_FILE"

# 10. 连续请求测试（模拟负载）
for i in {1..5}; do
    test_api "连续请求-$i" "GET" "/v1/models" "-H 'Authorization: Bearer $SINGLE_KEY'" "" "200" 10
done

# 11. 不同API Key轮询测试
test_api "轮询测试-Key1" "GET" "/v1/models" "-H 'Authorization: Bearer $SINGLE_KEY'" "" "200"
test_api "轮询测试-Key2" "GET" "/v1/models" "-H 'Authorization: Bearer AIzaSyAim8GjbyZmjKHdRE7rMNG8KO33DQ--Udk'" "" "200"
test_api "轮询测试-多Key" "GET" "/v1/models" "-H 'Authorization: Bearer $TRUSTED_KEYS'" "" "200"

# ==================== 第五部分：特殊参数测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第五部分：特殊参数测试" | tee -a "$LOG_FILE"

# 12. 各种temperature值
test_api "聊天-低温度" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}],"temperature":0.1,"max_tokens":20}' "200" 25

test_api "聊天-高温度" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}],"temperature":1.5,"max_tokens":20}' "200" 25

# 13. 流式响应测试
test_api "聊天-流式响应" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}],"stream":true,"max_tokens":20}' "200" 30

# ==================== 第六部分：Gemini原生API测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第六部分：Gemini原生API测试" | tee -a "$LOG_FILE"

# 14. Gemini原生generateContent
test_api "Gemini原生-简单生成" "POST" "/v1/models/gemini-1.5-flash:generateContent" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"contents":[{"parts":[{"text":"Hello"}]}]}' "200" 25

test_api "Gemini原生-带配置" "POST" "/v1/models/gemini-1.5-flash:generateContent" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"contents":[{"parts":[{"text":"介绍Python"}]}],"generationConfig":{"maxOutputTokens":100,"temperature":0.7}}' "200" 30

# 15. 各种Gemini模型原生测试
test_api "Gemini原生-2.5Pro" "POST" "/v1/models/gemini-2.5-pro:generateContent" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"contents":[{"parts":[{"text":"Hello"}]}]}' "200" 35

test_api "Gemini原生-2.0Flash" "POST" "/v1/models/gemini-2.0-flash:generateContent" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"contents":[{"parts":[{"text":"Hello"}]}]}' "200" 30

# ==================== 第七部分：边界条件测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第七部分：边界条件测试" | tee -a "$LOG_FILE"

# 16. 超长内容测试
SUPER_LONG_CONTENT=$(printf 'A%.0s' {1..5000})
test_api "超长内容测试" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "{\"model\":\"gemini-1.5-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"$SUPER_LONG_CONTENT\"}],\"max_tokens\":10}" "200" 45

# 17. 特殊字符测试
SPECIAL_CHARS='{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"测试特殊字符: !@#$%^&*()_+-=[]{}|;:,.<>? 中文 🚀🎉💻"}],"max_tokens":50}'
test_api "特殊字符测试" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "$SPECIAL_CHARS" "200" 25

# 18. 空白内容测试
test_api "空白内容测试" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"   "}],"max_tokens":20}' "200" 25

# ==================== 第八部分：并发和时序测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第八部分：并发和时序测试" | tee -a "$LOG_FILE"

# 19. 快速连续请求（测试时间窗口负载均衡）
echo "开始快速连续请求测试..." | tee -a "$LOG_FILE"
for i in {1..10}; do
    test_api "快速请求-$i" "GET" "/v1/models" "-H 'Authorization: Bearer $TRUSTED_KEYS'" "" "200" 5 &
    sleep 0.1
done
wait

# 20. 不同时间间隔的请求（测试时间窗口切换）
test_api "时间窗口-请求1" "GET" "/v1/models" "-H 'Authorization: Bearer $TRUSTED_KEYS'" "" "200"
echo "等待5秒..." | tee -a "$LOG_FILE"
sleep 5
test_api "时间窗口-请求2" "GET" "/v1/models" "-H 'Authorization: Bearer $TRUSTED_KEYS'" "" "200"
echo "等待10秒..." | tee -a "$LOG_FILE"
sleep 10
test_api "时间窗口-请求3" "GET" "/v1/models" "-H 'Authorization: Bearer $TRUSTED_KEYS'" "" "200"

# ==================== 第九部分：错误恢复测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第九部分：错误恢复测试" | tee -a "$LOG_FILE"

# 21. 故意触发各种错误后恢复
test_api "错误恢复-无效Key" "GET" "/v1/models" "-H 'Authorization: Bearer invalid_key'" "" "401"
test_api "错误恢复-正常请求" "GET" "/v1/models" "-H 'Authorization: Bearer $SINGLE_KEY'" "" "200"

test_api "错误恢复-无效JSON" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"invalid_json":}' "400"
test_api "错误恢复-正常聊天" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hi"}],"max_tokens":10}' "200" 25

# ==================== 第十部分：真实使用场景测试 ====================
echo "" | tee -a "$LOG_FILE"
echo "🔥 第十部分：真实使用场景测试" | tee -a "$LOG_FILE"

# 22. 代码生成场景
CODE_REQUEST='{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"请用Python写一个快速排序算法"}],"max_tokens":500}'
test_api "代码生成场景" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "$CODE_REQUEST" "200" 40

# 23. 翻译场景
TRANSLATE_REQUEST='{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"请将以下英文翻译成中文: Hello, how are you today? I hope you are doing well."}],"max_tokens":200}'
test_api "翻译场景" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "$TRANSLATE_REQUEST" "200" 30

# 24. 问答场景
QA_REQUEST='{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"什么是机器学习？请简要解释其基本概念和应用领域。"}],"max_tokens":300}'
test_api "问答场景" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "$QA_REQUEST" "200" 35

# 25. 创意写作场景
CREATIVE_REQUEST='{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"请写一首关于春天的诗"}],"max_tokens":200}'
test_api "创意写作场景" "POST" "/v1/chat/completions" "-H 'Authorization: Bearer $SINGLE_KEY'" "$CREATIVE_REQUEST" "200" 30

# ==================== 测试总结 ====================
echo "" | tee -a "$LOG_FILE"
echo "===========================================" | tee -a "$LOG_FILE"
echo "📊 测试总结:" | tee -a "$LOG_FILE"
echo "   总测试数: $TOTAL_TESTS" | tee -a "$LOG_FILE"
echo "   通过: $PASSED_TESTS" | tee -a "$LOG_FILE"
echo "   失败: $FAILED_TESTS" | tee -a "$LOG_FILE"
echo "   成功率: $((PASSED_TESTS * 100 / TOTAL_TESTS))%" | tee -a "$LOG_FILE"
echo "🏁 测试完成: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📋 请在Vercel Dashboard查看详细的console.log输出:" | tee -a "$LOG_FILE"
echo "   https://vercel.com/showlin666s-projects/gemini-balance-lite22" | tee -a "$LOG_FILE"
echo "   观察新日志系统的实际效果！" | tee -a "$LOG_FILE"
