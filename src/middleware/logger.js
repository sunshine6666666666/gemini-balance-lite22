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

    switch (level) {
        case 'ERROR': console.error(logMessage); break;
        case 'WARN': console.warn(logMessage); break;

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
