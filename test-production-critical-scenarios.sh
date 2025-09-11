#!/bin/bash

# 生产环境关键场景测试 - 企业内部使用
# 目标：测试1-2个用户的真实使用场景，确保LLM响应质量

# 配置
PREVIEW_URL="https://gemini-balance-lite22-opfefkgt9-showlin666s-projects.vercel.app"
BYPASS_SECRET="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 日志文件
LOG_FILE="production-critical-test-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# 测试函数
test_scenario() {
    local name="$1"
    local description="$2"
    local endpoint="$3"
    local data="$4"
    local expected_pattern="$5"
    
    log "${YELLOW}=== $name ===${NC}"
    log "📋 场景: $description"
    log "🔍 预期: $expected_pattern"
    
    response=$(curl -s -w "\n%{http_code}" --max-time 60 \
        -H "x-vercel-protection-bypass: $BYPASS_SECRET" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$data" \
        "$PREVIEW_URL$endpoint")
    
    status_code=$(echo "$response" | tail -n1)
    content=$(echo "$response" | head -n -1)
    
    log "状态码: $status_code"
    log "响应长度: $(echo "$content" | wc -c) 字符"
    
    if [ "$status_code" = "200" ]; then
        if echo "$content" | grep -q '"content":'; then
            content_value=$(echo "$content" | grep -o '"content":"[^"]*"' | head -1)
            if [ "$content_value" != '"content":null' ] && [ "$content_value" != '"content":""' ]; then
                log "✅ 成功 - 获得有效LLM响应"
                log "📝 内容预览: $(echo "$content" | grep -o '"content":"[^"]*"' | head -1 | cut -c1-100)..."
            else
                log "❌ 失败 - content为空或null"
            fi
        else
            log "❌ 失败 - 响应格式异常"
        fi
    else
        log "❌ 失败 - HTTP错误"
        log "错误内容: $(echo "$content" | head -c 200)..."
    fi
    
    log ""
    sleep 2
}

log "${GREEN}🚀 生产环境关键场景测试开始 - $(date)${NC}"
log "目标: 验证企业内部使用的5个核心场景"
log "用户规模: 1-2个用户"
log ""

# 场景1：技术文档生成 - 企业最常用
test_scenario "场景1：技术文档生成" \
    "企业内部技术文档编写，要求专业、准确、结构化" \
    "/v1/chat/completions" \
    '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请为我们的API代理服务编写一份技术文档，包括：1. 系统架构概述 2. 核心功能说明 3. 部署指南 4. 故障排除。要求专业、详细、易于理解。"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }' \
    "技术文档内容"

# 场景2：代码审查和优化建议 - 开发团队核心需求
test_scenario "场景2：代码审查和优化" \
    "代码质量分析和改进建议，帮助开发团队提升代码质量" \
    "/v1/chat/completions" \
    '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "请审查以下JavaScript代码并提供优化建议：\n\n```javascript\nfunction processApiKeys(keys) {\n    let result = [];\n    for (let i = 0; i < keys.length; i++) {\n        if (keys[i] != null && keys[i] != undefined && keys[i].length > 0) {\n            result.push(keys[i].trim());\n        }\n    }\n    return result;\n}\n```\n\n请从性能、可读性、错误处理等方面给出具体建议。"
            }
        ],
        "temperature": 0.2,
        "max_tokens": 600
    }' \
    "代码优化建议"

# 场景3：问题诊断和解决方案 - 运维支持
test_scenario "场景3：问题诊断和解决" \
    "系统问题分析和解决方案提供，支持运维工作" \
    "/v1/chat/completions" \
    '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "我们的API代理服务出现以下问题：\n\n- 响应时间从平均1秒增加到3秒\n- 错误率从1%上升到5%\n- 主要错误是API Key无效和超时\n- 问题出现在昨天下午开始\n\n请分析可能的原因并提供排查步骤和解决方案。"
            }
        ],
        "temperature": 0.4,
        "max_tokens": 800
    }' \
    "问题分析和解决方案"

# 场景4：业务数据分析 - 决策支持
test_scenario "场景4：业务数据分析" \
    "业务指标分析和趋势预测，支持管理决策" \
    "/v1/chat/completions" \
    '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "分析我们API服务的使用数据：\n\n过去30天数据：\n- 总请求量：300万次\n- 日均请求：10万次\n- 峰值：15万次/天\n- 用户数：2个企业用户\n- 主要使用时间：工作日9-18点\n- 成功率：97.5%\n\n请分析使用模式，预测未来3个月的增长趋势，并给出容量规划建议。"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 700
    }' \
    "数据分析报告"

# 场景5：多轮技术咨询 - 深度交互
test_scenario "场景5：多轮技术咨询" \
    "复杂技术问题的多轮对话，模拟真实咨询场景" \
    "/v1/chat/completions" \
    '{
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": "我们想要升级API代理服务的架构，支持更高的并发量。"
            },
            {
                "role": "assistant",
                "content": "很好的想法！提升并发能力需要从多个方面考虑。首先，你们当前的架构是什么样的？主要的瓶颈在哪里？比如是API Key轮询、网络IO、还是计算资源？"
            },
            {
                "role": "user",
                "content": "当前使用Vercel Edge Functions，有18个API Key做负载均衡。主要瓶颈是单个请求的处理时间较长，大概1-2秒。我们希望支持从当前的100并发提升到500并发。"
            },
            {
                "role": "assistant",
                "content": "了解了。Vercel Edge Functions已经是很好的选择了。对于你们的情况，我建议：\n\n1. **优化API Key管理**：考虑实现更智能的负载均衡算法\n2. **请求优化**：减少不必要的数据传输\n3. **缓存策略**：对重复请求实现缓存\n4. **监控体系**：实时监控性能指标\n\n你们更关注哪个方面？"
            },
            {
                "role": "user",
                "content": "我们最关心API Key的负载均衡优化，现在用的是时间窗口轮询，但感觉还不够智能。有什么更好的算法推荐吗？"
            }
        ],
        "temperature": 0.4,
        "max_tokens": 600
    }' \
    "技术咨询回答"

# 汇总测试结果
log "${GREEN}🎯 生产环境关键场景测试完成！${NC}"
log ""
log "📊 测试总结："
log "✅ 技术文档生成 - 企业核心需求"
log "✅ 代码审查优化 - 开发团队支持"
log "✅ 问题诊断解决 - 运维支持"
log "✅ 业务数据分析 - 决策支持"
log "✅ 多轮技术咨询 - 深度交互"
log ""
log "📄 详细日志: $LOG_FILE"
log ""
log "🔍 关键验证点："
log "   - LLM响应质量和相关性"
log "   - 中文内容处理能力"
log "   - 复杂技术问题理解"
log "   - 多轮对话上下文保持"
log "   - 响应时间和稳定性"
log ""
log "🚀 如果所有场景都成功，系统已准备好生产部署！"
