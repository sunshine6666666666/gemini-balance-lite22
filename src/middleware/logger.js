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
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

/**
 * @功能概述: 核心日志函数，统一格式和过滤
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
        logMessage += ` | ${JSON.stringify(data)}`;
    }

    // 在Vercel环境中，所有日志都使用console.log以确保显示
    // 但保留级别标识以便区分
    console.log(logMessage);
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
