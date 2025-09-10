/**
 * @功能概述: 简洁高效的日志系统，专注关键信息和性能指标
 * @设计原则: 减少冗余、突出关键、保持可追踪、提高可读性
 * @日志层级: INFO(关键业务) | DEBUG(详细追踪) | WARN(异常恢复) | ERROR(失败错误)
 */

// 日志级别配置
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// 当前日志级别（可通过环境变量控制）
// 在Preview环境默认启用DEBUG级别，Production环境使用INFO级别
const getDefaultLogLevel = () => {
    // 检查是否为Vercel Preview环境
    if (process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development') {
        return 'DEBUG';
    }
    return 'INFO';
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || getDefaultLogLevel()];

/**
 * @功能概述: 核心日志函数，统一格式和过滤，针对Vercel Edge Runtime优化
 * @param {string} level - 日志级别
 * @param {string} reqId - 请求ID
 * @param {string} emoji - 表情符号
 * @param {string} message - 核心消息
 * @param {object} data - 关键数据（可选）
 */
function log(level, reqId, emoji, message, data = null) {
    if (LOG_LEVELS[level] > CURRENT_LEVEL) return;

    const prefix = `[${level}] [ReqID:${reqId || 'unknown'}] ${emoji}`;
    let logMessage = `${prefix} ${message}`;

    if (data) {
        // 确保数据序列化不会失败
        try {
            const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
            logMessage += ` | ${dataStr}`;
        } catch (e) {
            logMessage += ` | [数据序列化失败]`;
        }
    }

    // 根据日志级别使用不同的console方法，确保在Edge Runtime中正确显示
    switch (level) {
        case 'ERROR':
            console.error(logMessage);
            break;
        case 'WARN':
            console.warn(logMessage);
            break;
        case 'DEBUG':
            // 在Edge Runtime中，console.debug可能被过滤，使用console.log
            console.log(`[DEBUG] ${logMessage.substring(7)}`); // 移除重复的[DEBUG]前缀
            break;
        default:
            console.log(logMessage);
    }
}

/**
 * @功能概述: 生成唯一请求ID
 */
export function generateRequestId() {
    return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * @功能概述: 请求摘要日志 - 最重要的业务信息
 */
export function logRequest(reqId, method, path, model, apiKey, status, duration, tokens) {
    const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.slice(-4)}` : 'none';
    const tokenInfo = tokens ? `${tokens} tokens` : '';
    log('INFO', reqId, '📥', `${method} ${path} | Model: ${model || 'unknown'} | Key: ${maskedKey} | ${status} | ${duration}ms | ${tokenInfo}`);
}

/**
 * @功能概述: 详细响应内容日志 - 记录响应的关键信息
 */
export function logResponseContent(reqId, responseData, model, usage) {
    if (responseData && typeof responseData === 'object') {
        const content = responseData.choices?.[0]?.message?.content ||
                       responseData.candidates?.[0]?.content?.parts?.[0]?.text ||
                       '无内容';
        const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        const usageInfo = usage ? `输入:${usage.prompt_tokens} 输出:${usage.completion_tokens} 总计:${usage.total_tokens}` : '无使用统计';
        log('INFO', reqId, '📤', `响应内容: "${contentPreview}" | 模型: ${model} | Token使用: ${usageInfo}`);
    }
}

/**
 * @功能概述: 请求参数详情日志 - 记录重要的请求参数
 */
export function logRequestDetails(reqId, requestBody, model) {
    if (requestBody && typeof requestBody === 'object') {
        const messageCount = requestBody.messages?.length || 0;
        const temperature = requestBody.temperature || 'default';
        const maxTokens = requestBody.max_tokens || 'default';
        const stream = requestBody.stream ? '流式' : '非流式';
        const firstMessage = requestBody.messages?.[0]?.content || '无消息';
        const messagePreview = firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
        log('INFO', reqId, '📋', `请求详情: "${messagePreview}" | 消息数:${messageCount} | 模型:${model} | 温度:${temperature} | 最大Token:${maxTokens} | 类型:${stream}`);
    }
}

/**
 * @功能概述: 负载均衡日志 - 关键的分发信息
 */
export function logLoadBalance(reqId, selectedIndex, totalKeys, windowOffset, context) {
    log('INFO', reqId, '🎯', `负载均衡: ${selectedIndex}/${totalKeys-1} | 窗口偏移: ${windowOffset}ms | 上下文: ${context}`);
}

/**
 * @功能概述: 格式转换日志 - API兼容性信息
 */
export function logFormatConversion(reqId, from, to, messageCount, temperature) {
    log('DEBUG', reqId, '🔄', `格式转换: ${from} → ${to} | 消息数: ${messageCount} | 温度: ${temperature}`);
}

/**
 * @功能概述: 性能指标日志 - 关键性能数据
 */
export function logPerformance(reqId, operation, duration, status, keyUsed) {
    const maskedKey = keyUsed ? `${keyUsed.substring(0, 6)}...${keyUsed.slice(-4)}` : 'none';
    log('INFO', reqId, '⚡', `${operation}: ${duration}ms | ${status} | Key: ${maskedKey}`);
}

/**
 * @功能概述: LLM请求开始日志 - 详细的请求信息
 */
export function logLLMRequestStart(reqId, method, path, model, userAgent, apiKey) {
    console.log(`📥 收到请求: ${method} ${path}`);
    console.log(`✅ 处理API请求: ${method} ${path}`);
    console.log(`🔍 ===== LLM请求信息 =====`);
    console.log(`📥 ${method} ${path}`);
    console.log(`🌐 来源: ${userAgent || '未知'}`);
    console.log(`📋 关键请求头:`);
    console.log(`content-type: application/json`);
    console.log(`user-agent: ${userAgent || 'unknown'}`);
    if (apiKey) {
        const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.slice(-8)}`;
        console.log(`x-goog-api-key: ${maskedKey}`);
    }
}

/**
 * @功能概述: LLM请求体日志 - 详细的请求内容
 */
export function logLLMRequestBody(reqId, targetUrl, requestBody, apiKeyCount) {
    console.log(`🎯 目标URL: ${targetUrl}`);
    if (apiKeyCount > 1) {
        console.log(`✅ 使用传入的多个API Key (${apiKeyCount}个)`);
    }
    console.log(`🎯 开始请求 - URL: ${targetUrl}, 可用Keys: ${apiKeyCount}`);
    console.log(`📦 请求体内容:`);
    try {
        const bodyStr = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody, null, 2);
        console.log(bodyStr);
    } catch (e) {
        console.log('[请求体序列化失败]');
    }
    console.log(`🔍 ===== LLM请求信息结束 =====`);
}

/**
 * @功能概述: LLM响应开始日志 - 响应状态信息
 */
export function logLLMResponseStart(reqId, status, duration, apiKey) {
    const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'unknown';
    console.log(`📊 响应: ${status} OK`);
    console.log(`✅ 请求成功 - 耗时: ${duration}ms, 状态: ${status}, Key: ${maskedKey}`);
    console.log(`✅ Gemini请求成功 - 状态: ${status}`);
    console.log(`📤 ===== LLM响应信息 =====`);
    console.log(`📊 最终响应: ${status} OK`);
    console.log(`📦 响应体内容:`);
}

/**
 * @功能概述: LLM响应体日志 - 详细的响应内容
 */
export function logLLMResponseBody(reqId, responseBody) {
    try {
        const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2);
        console.log(bodyStr);
    } catch (e) {
        console.log('[响应体序列化失败]');
    }
    console.log(`📤 ===== LLM响应信息结束 =====`);
}

/**
 * @功能概述: 错误日志 - 失败和异常信息
 */
export function logError(reqId, operation, error, context = null) {
    const errorInfo = error.message || error.toString();
    const contextInfo = context ? ` | 上下文: ${JSON.stringify(context)}` : '';
    log('ERROR', reqId, '❌', `${operation} 失败: ${errorInfo}${contextInfo}`);
}

/**
 * @功能概述: 警告日志 - 重试和降级信息
 */
export function logWarning(reqId, operation, message, data = null) {
    log('WARN', reqId, '⚠️', `${operation}: ${message}`, data);
}

/**
 * @功能概述: 调试日志 - 详细追踪信息（仅DEBUG模式）
 */
export function logDebug(reqId, operation, message, data = null) {
    log('DEBUG', reqId, '🔍', `${operation}: ${message}`, data);
}
