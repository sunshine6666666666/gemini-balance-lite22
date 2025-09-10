#!/bin/bash

# 真实LLM测试脚本 - 大量提示词内容测试
# 测试目标：验证Gemini API代理在真实使用场景下的响应情况

# 配置
BASE_URL="http://localhost:3000"
# 从.env.local读取真实的API Key进行测试
TRUSTED_KEYS=$(grep "TRUSTED_API_KEYS=" .env.local | cut -d'=' -f2)
FIRST_KEY=$(echo "$TRUSTED_KEYS" | cut -d',' -f1)
TEST_API_KEY="$FIRST_KEY"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志文件
LOG_FILE="tests/local/real-llm-test-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# 执行LLM测试的通用函数
run_llm_test() {
    local test_name="$1"
    local endpoint="$2"
    local prompt="$3"
    local model="${4:-gemini-2.5-flash}"
    local max_tokens="${5:-1000}"
    local timeout="${6:-30}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log "${BLUE}[LLM TEST START]${NC} $test_name"
    log "----------------------------------------"
    log "端点: $endpoint"
    log "模型: $model"
    log "提示词长度: ${#prompt} 字符"
    log "最大tokens: $max_tokens"
    log "超时时间: ${timeout}秒"
    log ""
    
    # 转义JSON字符串中的特殊字符
    local escaped_prompt=$(echo "$prompt" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')

    # 构建请求数据
    local request_data
    if [[ "$endpoint" == *"chat/completions"* ]]; then
        # OpenAI格式
        request_data=$(cat <<EOF
{
  "model": "$model",
  "messages": [
    {"role": "user", "content": "$escaped_prompt"}
  ],
  "max_tokens": $max_tokens,
  "temperature": 0.7
}
EOF
)
    else
        # Gemini原生格式
        request_data=$(cat <<EOF
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "$escaped_prompt"}]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": $max_tokens,
    "temperature": 0.7
  }
}
EOF
)
    fi
    
    # 发送请求
    local start_time=$(date +%s)
    local response=$(curl.exe -s -w '\n%{http_code}' --max-time $timeout \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TEST_API_KEY" \
        -d "$request_data" \
        "$BASE_URL$endpoint" 2>/dev/null)
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 解析响应
    local http_code=$(echo "$response" | tail -n 1)
    local response_body=$(echo "$response" | head -n -1)
    
    # 记录详细信息
    {
        echo "请求时间: $(date)"
        echo "响应时间: ${duration}秒"
        echo "HTTP状态码: $http_code"
        echo "提示词内容:"
        echo "$prompt"
        echo ""
        echo "响应内容:"
        echo "$response_body"
        echo "========================================"
        echo ""
    } >> "$LOG_FILE"
    
    # 判断测试结果
    if [ "$http_code" = "200" ]; then
        # 检查响应内容是否包含实际的AI回复
        if echo "$response_body" | grep -q '"text":\|"content":'; then
            log "${GREEN}[PASS]${NC} $test_name"
            log "  响应时间: ${duration}秒"
            log "  响应长度: ${#response_body} 字符"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            log "${RED}[FAIL]${NC} $test_name"
            log "  详情: 响应格式异常，未找到AI回复内容"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        log "${RED}[FAIL]${NC} $test_name"
        log "  详情: HTTP $http_code - $response_body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    log ""
}

# 主测试函数
main() {
    log "${GREEN}开始真实LLM测试 - $(date)${NC}"
    log "测试目标: $BASE_URL"
    log "日志文件: $LOG_FILE"
    log "使用API Key: ${TEST_API_KEY:0:20}..."
    log ""
    
    # 检查服务是否运行
    if ! curl.exe -s --max-time 5 "$BASE_URL" > /dev/null; then
        log "${RED}错误: 无法连接到 $BASE_URL${NC}"
        log "请确保本地服务正在运行"
        exit 1
    fi
    
    log "${YELLOW}=== 1. 基础对话测试 ===${NC}"
    
    # 简单问答
    run_llm_test \
        "简单问答" \
        "/v1/chat/completions" \
        "你好，请介绍一下你自己。"
    
    # 中文对话
    run_llm_test \
        "中文对话" \
        "/v1/chat/completions" \
        "请用中文详细解释什么是人工智能，包括其发展历史、主要技术和应用领域。"
    
    # 英文对话
    run_llm_test \
        "英文对话" \
        "/v1/chat/completions" \
        "Please explain the concept of machine learning in detail, including its types, algorithms, and real-world applications."
    
    log "${YELLOW}=== 2. 复杂推理测试 ===${NC}"
    
    # 数学推理
    run_llm_test \
        "数学推理" \
        "/v1/chat/completions" \
        "请解决这个数学问题：一个班级有30名学生，其中60%是女生。如果新来了5名男生，那么现在女生占总人数的百分比是多少？请详细说明解题步骤。"
    
    # 逻辑推理
    run_llm_test \
        "逻辑推理" \
        "/v1/chat/completions" \
        "有三个盒子，分别标记为A、B、C。其中一个盒子里有金币，另外两个是空的。你选择了盒子A。主持人知道哪个盒子有金币，他打开了盒子B，发现是空的。现在主持人问你是否要换到盒子C。请分析这种情况下，换与不换的概率分别是多少，并解释原因。"
    
    # 代码生成
    run_llm_test \
        "代码生成" \
        "/v1/chat/completions" \
        "请用Python编写一个函数，实现快速排序算法。要求包含详细的注释，并提供使用示例。"
    
    log "${YELLOW}=== 3. 长文本处理测试 ===${NC}"
    
    # 长文本摘要
    run_llm_test \
        "长文本摘要" \
        "/v1/chat/completions" \
        "请阅读以下文本并提供摘要：

人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。

人工智能的发展历史可以追溯到20世纪40年代。1943年，沃伦·麦卡洛克和沃尔特·皮茨发表了第一篇关于人工神经网络的论文。1950年，艾伦·图灵发表了著名的论文《计算机器与智能》，提出了图灵测试的概念。1956年，约翰·麦卡锡在达特茅斯会议上首次提出了"人工智能"这个术语。

在技术发展方面，人工智能经历了多个重要阶段。早期的符号主义方法试图通过逻辑推理来模拟人类思维。20世纪80年代，专家系统得到了广泛应用。90年代，机器学习开始兴起，特别是神经网络的复兴。进入21世纪，深度学习技术的突破带来了人工智能的新一轮发展高潮。

目前，人工智能在各个领域都有广泛应用，包括医疗诊断、金融分析、自动驾驶、语音识别、图像处理、自然语言处理等。随着计算能力的提升和数据量的增长，人工智能技术正在快速发展，并对社会产生深远影响。

请提供这段文本的主要内容摘要，不超过200字。"
    
    log "${YELLOW}=== 4. Gemini原生API测试 ===${NC}"
    
    # Gemini原生格式测试
    run_llm_test \
        "Gemini原生API" \
        "/v1beta/models/gemini-2.5-flash:generateContent" \
        "请详细介绍Vercel Edge Functions的特点和优势，以及它与传统服务器端渲染的区别。"
    
    log "${YELLOW}=== 5. 性能压力测试 ===${NC}"
    
    # 大提示词测试
    local large_prompt="请基于以下需求，设计一个完整的电商网站架构：

需求分析：
1. 用户管理：支持用户注册、登录、个人信息管理、收货地址管理
2. 商品管理：商品分类、商品详情、库存管理、价格管理
3. 购物车：添加商品、修改数量、删除商品、计算总价
4. 订单管理：下单流程、支付集成、订单状态跟踪、退款处理
5. 支付系统：支持多种支付方式（支付宝、微信、银行卡）
6. 物流管理：物流信息跟踪、配送状态更新
7. 客服系统：在线客服、工单系统、FAQ
8. 营销系统：优惠券、促销活动、会员积分
9. 数据分析：用户行为分析、销售数据统计、商品推荐
10. 管理后台：商家管理、财务管理、数据报表

技术要求：
- 前端：React + TypeScript + Next.js
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL + Redis
- 部署：Docker + Kubernetes
- 监控：Prometheus + Grafana
- 安全：JWT认证、HTTPS、数据加密

请提供详细的系统架构设计，包括：
1. 整体架构图
2. 数据库设计
3. API设计
4. 安全方案
5. 性能优化策略
6. 部署方案
7. 监控和日志方案

要求回答详细、专业，包含具体的技术实现细节。"
    
    run_llm_test \
        "大提示词测试" \
        "/v1/chat/completions" \
        "$large_prompt" \
        "gemini-2.5-flash" \
        "2000" \
        "60"
    
    # 测试结果统计
    log "${YELLOW}=== 真实LLM测试结果统计 ===${NC}"
    log "总测试数: $TOTAL_TESTS"
    log "通过: $PASSED_TESTS"
    log "失败: $FAILED_TESTS"
    log "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    log ""
    log "详细测试日志请查看: $LOG_FILE"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        log "${RED}有 $FAILED_TESTS 个测试失败${NC}"
        exit 1
    else
        log "${GREEN}所有测试通过！${NC}"
    fi
}

# 执行主函数
main "$@"
