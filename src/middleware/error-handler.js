/**
 * @功能概述: 错误处理中间件，统一异常捕获和错误响应格式化
 * @运行时: Edge Runtime (Web标准API)
 * @错误类型: 支持HTTP错误、验证错误、网络错误、超时错误等
 * @响应格式: 统一的JSON错误响应格式，包含错误码、消息和追踪信息
 * @适用场景: 所有API端点的错误处理，确保一致的错误响应格式
 */

import { createLogPrefix, structuredLog, logError } from './logger.js';
import { addCorsHeaders } from './cors.js';

/**
 * @功能概述: 自定义HTTP错误类，用于标准化错误处理
 * @param {string} message - 错误消息
 * @param {number} status - HTTP状态码
 * @param {string} code - 错误代码
 * @param {Object} details - 错误详情
 */
export class HttpError extends Error {
    constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * @功能概述: 预定义的错误类型和状态码映射
 * @错误分类: 客户端错误(4xx)、服务器错误(5xx)、业务逻辑错误
 */
export const ERROR_TYPES = {
    // 客户端错误 (4xx)
    BAD_REQUEST: { status: 400, code: 'BAD_REQUEST' },
    UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
    FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
    NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
    METHOD_NOT_ALLOWED: { status: 405, code: 'METHOD_NOT_ALLOWED' },
    RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
    
    // 服务器错误 (5xx)
    INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
    BAD_GATEWAY: { status: 502, code: 'BAD_GATEWAY' },
    SERVICE_UNAVAILABLE: { status: 503, code: 'SERVICE_UNAVAILABLE' },
    GATEWAY_TIMEOUT: { status: 504, code: 'GATEWAY_TIMEOUT' },
    
    // 业务逻辑错误
    INVALID_API_KEY: { status: 401, code: 'INVALID_API_KEY' },
    API_KEY_EXHAUSTED: { status: 503, code: 'API_KEY_EXHAUSTED' },
    MODEL_NOT_FOUND: { status: 404, code: 'MODEL_NOT_FOUND' },
    QUOTA_EXCEEDED: { status: 429, code: 'QUOTA_EXCEEDED' }
};

/**
 * @功能概述: 创建标准化的错误响应对象
 * @param {Error|HttpError} error - 错误对象
 * @param {string} reqId - 请求ID
 * @param {boolean} includeStack - 是否包含错误堆栈（开发环境）
 * @returns {Object} 标准化的错误响应对象
 * @执行流程:
 *   1. 识别错误类型
 *   2. 提取错误信息
 *   3. 构建标准响应格式
 *   4. 返回错误响应对象
 */
export function createErrorResponse(error, reqId, includeStack = false) {
    const logPrefix = createLogPrefix('error-handler.js', '错误处理器', 'createErrorResponse', reqId);
    
    structuredLog('info', logPrefix, '步骤 1', `创建错误响应 - 错误类型: ${error.name || 'Error'}`);
    
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = '内部服务器错误';
    let details = null;
    
    // 步骤 1: 识别错误类型并提取信息
    if (error instanceof HttpError) {
        status = error.status;
        code = error.code;
        message = error.message;
        details = error.details;
        structuredLog('info', logPrefix, '步骤 1.1', `HttpError - 状态: ${status}, 代码: ${code}`);
    } else if (error.name === 'AbortError') {
        status = 504;
        code = 'GATEWAY_TIMEOUT';
        message = '请求超时';
        structuredLog('info', logPrefix, '步骤 1.2', `超时错误处理`);
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        status = 502;
        code = 'BAD_GATEWAY';
        message = '上游服务连接失败';
        structuredLog('info', logPrefix, '步骤 1.3', `网络错误处理`);
    } else {
        // 通用错误处理
        message = error.message || '未知错误';
        structuredLog('info', logPrefix, '步骤 1.4', `通用错误处理`);
    }
    
    // 步骤 2: 构建错误响应对象
    const errorResponse = {
        error: {
            type: 'error',
            code: code,
            message: message,
            status: status,
            timestamp: new Date().toISOString(),
            request_id: reqId
        }
    };
    
    // 步骤 3: 添加可选字段
    if (details) {
        errorResponse.error.details = details;
    }
    
    if (includeStack && error.stack) {
        errorResponse.error.stack = error.stack;
        structuredLog('info', logPrefix, '步骤 3.1', `包含错误堆栈信息`);
    }
    
    structuredLog('info', logPrefix, '步骤 4[SUCCESS]', `错误响应创建完成 - 状态: ${status}`);
    return errorResponse;
}

/**
 * @功能概述: 错误处理中间件主函数，捕获和处理所有异常
 * @param {Request} request - HTTP请求对象
 * @param {Function} handler - 实际的请求处理函数
 * @param {Object} options - 错误处理选项
 * @returns {Promise<Response>} 处理后的响应或错误响应
 * @执行流程:
 *   1. 执行请求处理函数
 *   2. 捕获任何抛出的异常
 *   3. 创建标准化错误响应
 *   4. 添加CORS头部并返回
 */
export async function errorHandler(request, handler, options = {}) {
    const reqId = Date.now().toString();
    const logPrefix = createLogPrefix('error-handler.js', '错误处理器', 'errorHandler', reqId);
    
    const {
        includeStack = false,
        corsConfig = {}
    } = options;
    
    const url = new URL(request.url);
    structuredLog('info', logPrefix, '步骤 1', `错误处理中间件启动: ${request.method} ${url.pathname}`);
    
    try {
        // 步骤 1: 执行实际的请求处理函数
        structuredLog('info', logPrefix, '步骤 1.1', `调用请求处理器`);
        const response = await handler(request);
        
        structuredLog('info', logPrefix, '步骤 1.2[SUCCESS]', `请求处理成功 - 状态: ${response.status}`);
        return response;
        
    } catch (error) {
        // 步骤 2: 捕获并处理异常
        structuredLog('error', logPrefix, '步骤 2[ERROR]', `捕获到异常: ${error.message}`);
        
        // 记录详细错误信息
        logError(error, reqId, `${request.method} ${url.pathname}`, {
            userAgent: request.headers.get('user-agent'),
            referer: request.headers.get('referer'),
            origin: request.headers.get('origin')
        });
        
        // 步骤 3: 创建错误响应
        const errorResponse = createErrorResponse(error, reqId, includeStack);
        
        // 步骤 4: 创建HTTP响应
        const response = new Response(
            JSON.stringify(errorResponse, null, 2),
            {
                status: errorResponse.error.status,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'X-Request-ID': reqId,
                    'X-Error-Code': errorResponse.error.code
                }
            }
        );
        
        // 步骤 5: 添加CORS头部
        const corsResponse = addCorsHeaders(response, request, corsConfig);
        
        structuredLog('info', logPrefix, '步骤 5[SUCCESS]', `错误响应已创建并返回`);
        return corsResponse;
    }
}

/**
 * @功能概述: 创建特定类型的HTTP错误
 * @param {string} type - 错误类型（ERROR_TYPES中的键）
 * @param {string} message - 自定义错误消息（可选）
 * @param {Object} details - 错误详情（可选）
 * @returns {HttpError} HTTP错误对象
 * @执行流程:
 *   1. 查找错误类型配置
 *   2. 创建HttpError实例
 *   3. 返回错误对象
 */
export function createHttpError(type, message = null, details = null) {
    const errorConfig = ERROR_TYPES[type];
    
    if (!errorConfig) {
        throw new Error(`未知的错误类型: ${type}`);
    }
    
    const errorMessage = message || `${type.toLowerCase().replace(/_/g, ' ')}`;
    
    return new HttpError(
        errorMessage,
        errorConfig.status,
        errorConfig.code,
        details
    );
}

/**
 * @功能概述: 验证错误处理器，专门用于参数验证失败的情况
 * @param {string} field - 验证失败的字段名
 * @param {string} reason - 验证失败的原因
 * @param {*} value - 验证失败的值
 * @returns {HttpError} 验证错误对象
 * @执行流程:
 *   1. 构建验证错误消息
 *   2. 创建错误详情
 *   3. 返回BAD_REQUEST错误
 */
export function createValidationError(field, reason, value = null) {
    const message = `参数验证失败: ${field} - ${reason}`;
    const details = {
        field: field,
        reason: reason,
        value: value !== null ? value : undefined
    };
    
    return createHttpError('BAD_REQUEST', message, details);
}

/**
 * @功能概述: API Key相关错误处理器
 * @param {string} type - API Key错误类型
 * @param {string} keyHint - API Key提示信息（脱敏）
 * @returns {HttpError} API Key错误对象
 * @执行流程:
 *   1. 根据类型选择错误配置
 *   2. 构建错误消息
 *   3. 返回相应的HTTP错误
 */
export function createApiKeyError(type, keyHint = null) {
    const logPrefix = createLogPrefix('error-handler.js', '错误处理器', 'createApiKeyError');
    
    let errorType, message;
    
    switch (type) {
        case 'missing':
            errorType = 'UNAUTHORIZED';
            message = 'API Key缺失，请在请求头中提供有效的API Key';
            break;
        case 'invalid':
            errorType = 'INVALID_API_KEY';
            message = 'API Key无效或格式错误';
            break;
        case 'exhausted':
            errorType = 'API_KEY_EXHAUSTED';
            message = '所有API Key都已耗尽或不可用';
            break;
        case 'quota_exceeded':
            errorType = 'QUOTA_EXCEEDED';
            message = 'API Key配额已超限';
            break;
        default:
            errorType = 'INVALID_API_KEY';
            message = 'API Key相关错误';
    }
    
    const details = keyHint ? { key_hint: keyHint } : null;
    
    structuredLog('info', logPrefix, '步骤 1', `创建API Key错误 - 类型: ${type}, 错误: ${errorType}`);
    
    return createHttpError(errorType, message, details);
}
