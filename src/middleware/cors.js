/**
 * @功能概述: CORS处理中间件，统一跨域请求处理和OPTIONS预检请求
 * @运行时: Edge Runtime (Web标准API)
 * @CORS策略: 允许所有来源的跨域请求，支持常用HTTP方法和头部
 * @预检处理: 自动处理OPTIONS预检请求，返回适当的CORS头部
 * @适用场景: 所有需要跨域支持的API端点，确保前端应用正常访问
 */

import { createLogPrefix, structuredLog } from './logger.js';

/**
 * @功能概述: 默认CORS配置，定义允许的来源、方法和头部
 * @配置说明:
 *   - allowOrigin: 允许所有来源（*）
 *   - allowMethods: 支持常用HTTP方法
 *   - allowHeaders: 支持常用请求头，包括API Key相关头部
 *   - exposeHeaders: 暴露给客户端的响应头
 *   - maxAge: 预检请求缓存时间
 */
const DEFAULT_CORS_CONFIG = {
    allowOrigin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'DNT',
        'Cache-Control',
        'X-Mx-ReqToken',
        'Keep-Alive',
        'X-Requested-With',
        'If-Modified-Since',
        'x-goog-api-key',
        'x-vercel-protection-bypass'
    ],
    exposeHeaders: [
        'Content-Length',
        'Content-Type',
        'X-Processed-By',
        'X-Request-ID'
    ],
    credentials: false,
    maxAge: 86400 // 24小时
};

/**
 * @功能概述: 创建CORS响应头，根据配置生成标准的CORS头部
 * @param {Object} config - CORS配置对象，可选，使用默认配置
 * @param {Request} request - HTTP请求对象，用于获取Origin头部
 * @returns {Headers} 包含CORS头部的Headers对象
 * @执行流程:
 *   1. 合并用户配置和默认配置
 *   2. 处理Origin头部
 *   3. 生成标准CORS头部
 *   4. 返回Headers对象
 */
export function createCorsHeaders(config = {}, request = null) {
    const reqId = Date.now().toString();
    const logPrefix = createLogPrefix('cors.js', 'CORS中间件', 'createCorsHeaders', reqId);
    
    // 步骤 1: 合并配置
    const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config };
    structuredLog('info', logPrefix, '步骤 1', `创建CORS头部 - 配置合并完成`);
    
    // 步骤 2: 创建Headers对象
    const headers = new Headers();
    
    // 步骤 3: 处理Access-Control-Allow-Origin
    let allowOrigin = corsConfig.allowOrigin;
    if (request && corsConfig.allowOrigin === '*') {
        const requestOrigin = request.headers.get('origin');
        if (requestOrigin) {
            allowOrigin = requestOrigin; // 使用请求的Origin以支持credentials
            structuredLog('info', logPrefix, '步骤 3.1', `使用请求Origin: ${requestOrigin}`);
        }
    }
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    
    // 步骤 4: 设置其他CORS头部
    headers.set('Access-Control-Allow-Methods', corsConfig.allowMethods.join(', '));
    headers.set('Access-Control-Allow-Headers', corsConfig.allowHeaders.join(', '));
    headers.set('Access-Control-Expose-Headers', corsConfig.exposeHeaders.join(', '));
    headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
    
    if (corsConfig.credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
        structuredLog('info', logPrefix, '步骤 4.1', `启用凭据支持`);
    }
    
    // 步骤 5: 添加安全头部
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    
    structuredLog('info', logPrefix, '步骤 5[SUCCESS]', `CORS头部创建完成`);
    return headers;
}

/**
 * @功能概述: 处理OPTIONS预检请求，返回适当的CORS响应
 * @param {Request} request - HTTP请求对象
 * @param {Object} config - CORS配置对象，可选
 * @returns {Response} OPTIONS预检响应
 * @执行流程:
 *   1. 验证是否为OPTIONS请求
 *   2. 创建CORS头部
 *   3. 记录预检请求信息
 *   4. 返回204响应
 */
export function handleOptionsRequest(request, config = {}) {
    const reqId = Date.now().toString();
    const logPrefix = createLogPrefix('cors.js', 'CORS中间件', 'handleOptionsRequest', reqId);
    
    // 步骤 1: 验证请求方法
    if (request.method !== 'OPTIONS') {
        structuredLog('warn', logPrefix, '步骤 1[WARN]', `非OPTIONS请求: ${request.method}`);
        return null;
    }
    
    const url = new URL(request.url);
    structuredLog('info', logPrefix, '步骤 1', `处理OPTIONS预检请求: ${url.pathname}`);
    
    // 步骤 2: 记录预检请求详情
    const requestedMethod = request.headers.get('Access-Control-Request-Method');
    const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
    
    if (requestedMethod) {
        structuredLog('info', logPrefix, '步骤 2.1', `请求方法: ${requestedMethod}`);
    }
    if (requestedHeaders) {
        structuredLog('info', logPrefix, '步骤 2.2', `请求头部: ${requestedHeaders}`);
    }
    
    // 步骤 3: 创建CORS头部
    const corsHeaders = createCorsHeaders(config, request);
    
    // 步骤 4: 创建响应
    const response = new Response(null, {
        status: 204,
        statusText: 'No Content',
        headers: corsHeaders
    });
    
    structuredLog('info', logPrefix, '步骤 4[SUCCESS]', `OPTIONS预检响应已创建`);
    return response;
}

/**
 * @功能概述: 为现有响应添加CORS头部，确保跨域兼容性
 * @param {Response} response - 原始响应对象
 * @param {Request} request - HTTP请求对象
 * @param {Object} config - CORS配置对象，可选
 * @returns {Response} 添加了CORS头部的新响应对象
 * @执行流程:
 *   1. 创建CORS头部
 *   2. 复制原响应头部
 *   3. 合并CORS头部
 *   4. 创建新响应对象
 */
export function addCorsHeaders(response, request = null, config = {}) {
    const reqId = Date.now().toString();
    const logPrefix = createLogPrefix('cors.js', 'CORS中间件', 'addCorsHeaders', reqId);
    
    structuredLog('info', logPrefix, '步骤 1', `为响应添加CORS头部 - 状态: ${response.status}`);
    
    try {
        // 步骤 1: 创建CORS头部
        const corsHeaders = createCorsHeaders(config, request);
        
        // 步骤 2: 复制原响应头部
        const newHeaders = new Headers(response.headers);
        
        // 步骤 3: 合并CORS头部
        for (const [key, value] of corsHeaders.entries()) {
            newHeaders.set(key, value);
        }
        
        // 步骤 4: 创建新响应
        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
        
        structuredLog('info', logPrefix, '步骤 4[SUCCESS]', `CORS头部添加完成`);
        return newResponse;
        
    } catch (error) {
        structuredLog('error', logPrefix, 'ERROR', `添加CORS头部失败: ${error.message}`);
        // 返回原响应，避免完全失败
        return response;
    }
}

/**
 * @功能概述: CORS中间件主函数，统一处理CORS相关逻辑
 * @param {Request} request - HTTP请求对象
 * @param {Function} handler - 实际的请求处理函数
 * @param {Object} config - CORS配置对象，可选
 * @returns {Promise<Response>} 处理后的响应，包含适当的CORS头部
 * @执行流程:
 *   1. 检查是否为OPTIONS预检请求
 *   2. 如果是预检请求，直接返回OPTIONS响应
 *   3. 如果不是，调用实际处理函数
 *   4. 为响应添加CORS头部
 */
export async function corsMiddleware(request, handler, config = {}) {
    const reqId = Date.now().toString();
    const logPrefix = createLogPrefix('cors.js', 'CORS中间件', 'corsMiddleware', reqId);
    
    const url = new URL(request.url);
    structuredLog('info', logPrefix, '步骤 1', `CORS中间件处理: ${request.method} ${url.pathname}`);
    
    try {
        // 步骤 1: 处理OPTIONS预检请求
        if (request.method === 'OPTIONS') {
            structuredLog('info', logPrefix, '步骤 1.1', `处理OPTIONS预检请求`);
            return handleOptionsRequest(request, config);
        }
        
        // 步骤 2: 调用实际处理函数
        structuredLog('info', logPrefix, '步骤 2', `调用实际请求处理器`);
        const response = await handler(request);
        
        // 步骤 3: 添加CORS头部
        structuredLog('info', logPrefix, '步骤 3', `为响应添加CORS头部`);
        return addCorsHeaders(response, request, config);
        
    } catch (error) {
        structuredLog('error', logPrefix, 'ERROR', `CORS中间件处理失败: ${error.message}`);
        
        // 创建错误响应并添加CORS头部
        const errorResponse = new Response(
            JSON.stringify({ error: 'Internal Server Error' }), 
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        return addCorsHeaders(errorResponse, request, config);
    }
}

/**
 * @功能概述: 验证请求是否符合CORS策略
 * @param {Request} request - HTTP请求对象
 * @param {Object} config - CORS配置对象
 * @returns {boolean} 验证结果，true表示符合CORS策略
 * @执行流程:
 *   1. 检查Origin头部
 *   2. 验证请求方法
 *   3. 验证请求头部
 *   4. 返回验证结果
 */
export function validateCorsRequest(request, config = {}) {
    const reqId = Date.now().toString();
    const logPrefix = createLogPrefix('cors.js', 'CORS中间件', 'validateCorsRequest', reqId);
    
    const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config };
    
    try {
        // 步骤 1: 检查Origin头部
        const origin = request.headers.get('origin');
        if (origin && corsConfig.allowOrigin !== '*') {
            const allowedOrigins = Array.isArray(corsConfig.allowOrigin) ? 
                corsConfig.allowOrigin : [corsConfig.allowOrigin];
            
            if (!allowedOrigins.includes(origin)) {
                structuredLog('warn', logPrefix, '步骤 1[WARN]', `Origin不被允许: ${origin}`);
                return false;
            }
        }
        
        // 步骤 2: 验证请求方法
        if (!corsConfig.allowMethods.includes(request.method)) {
            structuredLog('warn', logPrefix, '步骤 2[WARN]', `方法不被允许: ${request.method}`);
            return false;
        }
        
        structuredLog('info', logPrefix, '步骤 3[SUCCESS]', `CORS验证通过`);
        return true;
        
    } catch (error) {
        structuredLog('error', logPrefix, 'ERROR', `CORS验证失败: ${error.message}`);
        return false;
    }
}
