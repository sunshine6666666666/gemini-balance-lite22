/**
 * @功能概述: 统一日志中间件，提供结构化日志输出和敏感信息脱敏
 * @运行时: Edge Runtime (Web标准API)
 * @日志格式: 结构化日志，支持请求追踪和敏感信息脱敏
 * @日志级别: 支持不同级别的日志输出（info、warn、error）
 * @适用场景: 所有需要日志记录的模块，统一日志格式和输出标准
 */

import { maskApiKey } from '../core/security.js';

/**
 * @功能概述: 创建结构化日志前缀，统一日志格式
 * @param {string} fileName - 文件名
 * @param {string} moduleName - 模块名（中文）
 * @param {string} functionName - 函数名
 * @param {string} reqId - 请求ID
 * @returns {string} 格式化的日志前缀
 * @执行流程:
 *   1. 验证输入参数
 *   2. 生成标准格式的日志前缀
 *   3. 返回格式化字符串
 * @日志格式: [文件：文件名][模块名][函数名][ReqID:请求ID]
 */
export function createLogPrefix(fileName, moduleName, functionName, reqId = 'unknown') {
    // 验证必要参数
    if (!fileName || !moduleName || !functionName) {
        return `[日志格式错误] `;
    }
    
    return `[文件：${fileName}][${moduleName}][${functionName}][ReqID:${reqId}] `;
}

/**
 * @功能概述: 生成唯一请求ID，用于追踪完整的请求生命周期
 * @returns {string} 基于时间戳的唯一请求ID
 * @执行流程:
 *   1. 获取当前时间戳
 *   2. 添加随机数确保唯一性
 *   3. 返回请求ID字符串
 */
export function generateRequestId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp}-${random}`;
}

/**
 * @功能概述: 结构化日志记录器，支持不同级别和格式化输出
 * @param {string} level - 日志级别（info/warn/error）
 * @param {string} logPrefix - 日志前缀
 * @param {string} step - 步骤标识
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据（可选）
 * @returns {void}
 * @执行流程:
 *   1. 验证日志级别
 *   2. 格式化日志消息
 *   3. 输出到相应的console方法
 *   4. 处理附加数据
 */
export function structuredLog(level, logPrefix, step, message, data = null) {
    // 验证日志级别
    const validLevels = ['info', 'warn', 'error'];
    if (!validLevels.includes(level)) {
        console.error(`[日志系统错误] 无效的日志级别: ${level}`);
        return;
    }
    
    // 格式化日志消息
    const formattedMessage = `${logPrefix}[${step}] ${message}`;
    
    // 根据级别输出日志
    switch (level) {
        case 'info':
            console.log(formattedMessage);
            break;
        case 'warn':
            console.warn(formattedMessage);
            break;
        case 'error':
            console.error(formattedMessage);
            break;
    }
    
    // 输出附加数据
    if (data !== null && data !== undefined) {
        if (typeof data === 'object') {
            try {
                console.log(`${logPrefix}[${step}][数据] ${JSON.stringify(data, null, 2)}`);
            } catch (e) {
                console.log(`${logPrefix}[${step}][数据] [无法序列化的对象]`);
            }
        } else {
            console.log(`${logPrefix}[${step}][数据] ${data}`);
        }
    }
}

/**
 * @功能概述: 请求信息日志记录器，专门用于记录HTTP请求详情
 * @param {Request} request - HTTP请求对象
 * @param {string} reqId - 请求ID
 * @param {string} context - 上下文标识
 * @returns {void}
 * @执行流程:
 *   1. 解析请求URL和方法
 *   2. 提取关键请求头
 *   3. 脱敏处理敏感信息
 *   4. 输出结构化日志
 */
export function logRequestInfo(request, reqId, context = 'default') {
    const logPrefix = createLogPrefix('logger.js', '日志中间件', 'logRequestInfo', reqId);
    
    try {
        const url = new URL(request.url);
        
        // 记录基本请求信息
        structuredLog('info', logPrefix, '步骤 1', `收到${context}请求: ${request.method} ${url.pathname}`);
        
        // 记录关键请求头（脱敏处理）
        const authHeader = request.headers.get('authorization');
        const apiKeyHeader = request.headers.get('x-goog-api-key');
        
        if (authHeader) {
            const maskedAuth = authHeader.length > 16 ? 
                `${authHeader.substring(0, 16)}...${authHeader.substring(authHeader.length - 8)}` : 
                authHeader;
            structuredLog('info', logPrefix, '步骤 1.1', `Authorization: ${maskedAuth}`);
        }
        
        if (apiKeyHeader) {
            structuredLog('info', logPrefix, '步骤 1.2', `API Key: ${maskApiKey(apiKeyHeader)}`);
        }
        
        // 记录查询参数
        if (url.search) {
            structuredLog('info', logPrefix, '步骤 1.3', `查询参数: ${url.search}`);
        }
        
    } catch (error) {
        structuredLog('error', logPrefix, 'ERROR', `记录请求信息失败: ${error.message}`);
    }
}

/**
 * @功能概述: 响应信息日志记录器，专门用于记录HTTP响应详情
 * @param {Response} response - HTTP响应对象
 * @param {string} reqId - 请求ID
 * @param {number} duration - 请求耗时（毫秒）
 * @param {string} context - 上下文标识
 * @returns {void}
 * @执行流程:
 *   1. 记录响应状态和耗时
 *   2. 记录关键响应头
 *   3. 根据状态码选择日志级别
 *   4. 输出结构化日志
 */
export function logResponseInfo(response, reqId, duration, context = 'default') {
    const logPrefix = createLogPrefix('logger.js', '日志中间件', 'logResponseInfo', reqId);
    
    try {
        // 根据响应状态选择日志级别
        const level = response.ok ? 'info' : 'warn';
        const status = response.ok ? 'SUCCESS' : 'ERROR';
        
        structuredLog(level, logPrefix, `步骤 1[${status}]`, 
            `${context}响应: ${response.status} ${response.statusText}, 耗时: ${duration}ms`);
        
        // 记录关键响应头
        const contentType = response.headers.get('content-type');
        if (contentType) {
            structuredLog('info', logPrefix, '步骤 1.1', `Content-Type: ${contentType}`);
        }
        
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            structuredLog('info', logPrefix, '步骤 1.2', `Content-Length: ${contentLength}`);
        }
        
    } catch (error) {
        structuredLog('error', logPrefix, 'ERROR', `记录响应信息失败: ${error.message}`);
    }
}

/**
 * @功能概述: 错误信息日志记录器，专门用于记录错误和异常
 * @param {Error} error - 错误对象
 * @param {string} reqId - 请求ID
 * @param {string} context - 错误上下文
 * @param {Object} additionalInfo - 附加错误信息
 * @returns {void}
 * @执行流程:
 *   1. 记录错误基本信息
 *   2. 记录错误堆栈（如果可用）
 *   3. 记录附加上下文信息
 *   4. 输出结构化错误日志
 */
export function logError(error, reqId, context = 'unknown', additionalInfo = null) {
    const logPrefix = createLogPrefix('logger.js', '日志中间件', 'logError', reqId);
    
    try {
        // 记录错误基本信息
        structuredLog('error', logPrefix, 'ERROR', `${context}发生错误: ${error.message}`);
        
        // 记录错误堆栈
        if (error.stack) {
            structuredLog('error', logPrefix, 'STACK_TRACE', error.stack);
        }
        
        // 记录错误类型
        if (error.name && error.name !== 'Error') {
            structuredLog('error', logPrefix, 'ERROR_TYPE', `错误类型: ${error.name}`);
        }
        
        // 记录附加信息
        if (additionalInfo) {
            structuredLog('error', logPrefix, 'ADDITIONAL_INFO', '附加错误信息', additionalInfo);
        }
        
    } catch (logError) {
        // 如果日志记录本身出错，使用基本console.error
        console.error(`[日志系统错误] 无法记录错误信息: ${logError.message}`);
        console.error(`[原始错误] ${error.message}`);
    }
}

/**
 * @功能概述: 性能监控日志记录器，用于记录性能指标
 * @param {string} operation - 操作名称
 * @param {number} duration - 操作耗时（毫秒）
 * @param {string} reqId - 请求ID
 * @param {Object} metrics - 性能指标
 * @returns {void}
 * @执行流程:
 *   1. 记录操作基本信息
 *   2. 分析性能指标
 *   3. 根据性能阈值选择日志级别
 *   4. 输出性能日志
 */
export function logPerformance(operation, duration, reqId, metrics = {}) {
    const logPrefix = createLogPrefix('logger.js', '日志中间件', 'logPerformance', reqId);
    
    try {
        // 根据耗时选择日志级别
        let level = 'info';
        let status = 'NORMAL';
        
        if (duration > 30000) { // 超过30秒
            level = 'error';
            status = 'SLOW';
        } else if (duration > 10000) { // 超过10秒
            level = 'warn';
            status = 'WARNING';
        }
        
        structuredLog(level, logPrefix, `性能[${status}]`, 
            `操作: ${operation}, 耗时: ${duration}ms`);
        
        // 记录详细性能指标
        if (Object.keys(metrics).length > 0) {
            structuredLog('info', logPrefix, '性能指标', '详细性能数据', metrics);
        }
        
    } catch (error) {
        structuredLog('error', logPrefix, 'ERROR', `记录性能信息失败: ${error.message}`);
    }
}
