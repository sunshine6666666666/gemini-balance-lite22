/**
 * @功能概述: Gemini API原生请求处理器，支持负载均衡和白名单验证
 * @运行时: Edge Runtime (Web标准API)
 * @请求处理: 处理原生Gemini API请求，支持多API Key负载均衡
 * @响应格式: 保持Gemini API原生响应格式
 * @性能特征: 45秒超时，支持流式和非流式响应
 */

import { handleVerification } from './verify_keys.js';
import openai from './openai-adapter.js';

// 导入重构后的核心模块
import { enhancedFetch } from './core/api-client.js';
import { selectApiKeyBalanced } from './core/load-balancer.js';
import { validateTrustedApiKey, getEffectiveApiKeys, maskApiKey } from './core/security.js';
import { generateRequestId, logRequest, logRequestDetails, logResponseContent, logLoadBalance, logPerformance, logError, logWarning, logDebug } from './middleware/logger.js';
import { addCorsHeaders } from './middleware/cors.js';
import { config, GEMINI_API, OPENAI_ENDPOINTS } from './config/index.js';
import { safeJsonParse, safeJsonStringify } from './utils/index.js';

/**
 * @功能概述: 主要请求处理函数，处理所有传入的HTTP请求
 * @param {Request} request - HTTP请求对象，包含URL、headers、body等信息
 * @returns {Promise<Response>} HTTP响应对象，包含处理结果或错误信息
 * @执行流程:
 *   1. 解析请求URL和路径
 *   2. 记录请求信息和关键头部
 *   3. 路由到相应的处理器
 *   4. 处理原生Gemini API请求
 *   5. 返回响应结果
 * @支持格式: 原生Gemini API格式和OpenAI兼容格式
 * @负载均衡: 智能API Key负载均衡和故障切换
 * @安全验证: API Key白名单验证和备用Key池管理
 */
export async function handleRequest(request) {
    const reqId = generateRequestId();
    const startTime = Date.now();

    // 记录请求开始
    logDebug(reqId, '请求处理', `开始处理请求: ${request.method} ${request.url}`);

    const url = new URL(request.url);
    const pathname = url.pathname;

    logDebug(reqId, '请求解析', `路径: ${pathname}, 查询参数: ${url.search}`);

    // 处理首页访问
    if (pathname === '/' || pathname === '/index.html') {
        logDebug(reqId, '路由处理', '处理首页访问请求');
        return new Response('Proxy is Running!  More Details: https://github.com/sunshine6666666666/gemini-balance-lite22', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        });
    }

    // 处理API Key验证请求
    if (pathname === '/verify' && request.method === 'POST') {
        logDebug(reqId, '路由处理', '处理API Key验证请求');
        return handleVerification(request);
    }

    // 检查是否为OpenAI格式请求
    const openaiEndpoints = Object.values(OPENAI_ENDPOINTS);
    const isOpenAIRequest = openaiEndpoints.some(endpoint => pathname.endsWith(endpoint));

    if (isOpenAIRequest) {
        logDebug(reqId, '路由处理', `检测到OpenAI格式请求，路由到OpenAI适配器: ${pathname}`);
        return openai.fetch(request);
    }

    logDebug(reqId, '路由处理', `处理Gemini原生API请求: ${pathname}`);

    // 构建Gemini API目标URL
    const targetUrl = `${GEMINI_API.BASE_URL}${pathname}${url.search}`;

    try {
        // 提取API Keys
        const headers = new Headers();
        let apiKeys = [];

        // 从请求头中提取API Keys
        logDebug(reqId, 'API Key提取', '开始从请求头提取API Keys');
        for (const [key, value] of request.headers.entries()) {
            if (key.trim().toLowerCase() === 'x-goog-api-key') {
                apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
                logDebug(reqId, 'API Key提取', `从x-goog-api-key头提取到${apiKeys.length}个API Key`);
            } else if (key.trim().toLowerCase() === 'authorization') {
                const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
                if (bearerMatch && apiKeys.length === 0) {
                    const bearerToken = bearerMatch[1];
                    if (bearerToken.includes(',')) {
                        apiKeys = bearerToken.split(',').map(k => k.trim()).filter(k => k);
                        logDebug(reqId, 'API Key提取', `从Authorization头提取到${apiKeys.length}个API Key（逗号分隔）`);
                    } else {
                        apiKeys = [bearerToken];
                        logDebug(reqId, 'API Key提取', '从Authorization头提取到1个API Key');
                    }
                }
            } else if (key.trim().toLowerCase() === 'content-type') {
                headers.set(key, value);
            }
        }

        // 智能API Key管理
        logDebug(reqId, 'API Key管理', `当前API Key数量: ${apiKeys.length}`);
        if (apiKeys.length <= 1) {
            const inputApiKey = apiKeys[0];
            logDebug(reqId, 'API Key管理', `单Key模式，开始白名单验证: ${inputApiKey ? inputApiKey.substring(0, 8) + '...' : 'null'}`);

            // 白名单验证
            if (!validateTrustedApiKey(inputApiKey)) {
                logWarning(reqId, 'API Key验证', `API Key未通过白名单验证: ${inputApiKey ? inputApiKey.substring(0, 8) + '...' : 'null'}`);
                return new Response(
                    safeJsonStringify({
                        error: 'Unauthorized',
                        message: 'API Key not in trusted whitelist. Access denied.',
                        code: 'UNTRUSTED_API_KEY'
                    }, 2),
                    {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            logDebug(reqId, 'API Key验证', '白名单验证通过，检查备用Key池');
            // 获取备用Key池
            const backupKeys = process.env.BACKUP_API_KEYS;
            if (backupKeys) {
                const backupKeyArray = backupKeys.split(',').map(k => k.trim()).filter(k => k);
                apiKeys = backupKeyArray;
                logDebug(reqId, 'API Key管理', `使用备用Key池，共${backupKeyArray.length}个Key`);
            } else {
                logDebug(reqId, 'API Key管理', '未配置备用Key池，使用原始Key');
            }
        } else {
            logDebug(reqId, 'API Key管理', '多Key模式，跳过白名单验证');
        }

        // 验证API Key可用性
        if (apiKeys.length === 0) {
            logError(reqId, 'API Key验证', new Error('未找到API Key'));
            throw new Error('未找到API Key');
        }

        logDebug(reqId, 'API Key验证', `最终API Key数量: ${apiKeys.length}，准备发送请求`);

        // 处理请求体内容
        let requestBodyContent = null;
        if (request.body) {
            requestBodyContent = await request.text();
            logDebug(reqId, '请求体处理', `请求体长度: ${requestBodyContent.length} 字符`);
            // 记录请求体的前100个字符用于调试
            if (requestBodyContent.length > 0) {
                const preview = requestBodyContent.length > 100 ?
                    requestBodyContent.substring(0, 100) + '...' : requestBodyContent;
                logDebug(reqId, '请求体内容', `请求体预览: ${preview}`);
            }
        } else {
            logDebug(reqId, '请求体处理', '无请求体内容');
        }

        logDebug(reqId, '请求发送', `目标URL: ${targetUrl}`);
        logDebug(reqId, '请求发送', `请求方法: ${request.method}`);

        // 使用增强的fetch函数发送请求
        const response = await enhancedFetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: requestBodyContent
        }, apiKeys, 'gemini', reqId);

        const duration = Date.now() - startTime;
        logDebug(reqId, '请求完成', `请求耗时: ${duration}ms，响应状态: ${response.status}`);

        // 记录请求摘要
        logRequest(reqId, request.method, pathname, 'gemini-native', apiKeys[0], response.status, duration);

        // 处理响应头
        logDebug(reqId, '响应处理', '开始处理响应头');
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('transfer-encoding');
        responseHeaders.delete('connection');
        responseHeaders.delete('keep-alive');
        responseHeaders.delete('content-encoding');
        responseHeaders.set('Referrer-Policy', 'no-referrer');
        responseHeaders.set('X-Processed-By', 'Enhanced-Gemini-Proxy');
        responseHeaders.set('X-Request-ID', reqId);

        logDebug(reqId, '响应处理', `响应头处理完成，Content-Type: ${responseHeaders.get('content-type')}`);
        logDebug(reqId, '响应完成', `最终响应状态: ${response.status}, 总耗时: ${duration}ms`);

        // 返回最终响应
        return new Response(response.body, {
            status: response.status,
            headers: responseHeaders
        });

    } catch (error) {
        const errorDuration = Date.now() - startTime;
        logError(reqId, 'Gemini请求处理', error);
        logDebug(reqId, '错误处理', `错误类型: ${error.name}, 错误信息: ${error.message}`);
        logDebug(reqId, '错误处理', `错误发生时间: ${errorDuration}ms`);

        // 返回结构化错误响应
        const errorResponse = {
            error: {
                message: error.message,
                type: error.name || 'RequestError',
                timestamp: new Date().toISOString(),
                request_id: reqId,
                duration: errorDuration
            }
        };

        logDebug(reqId, '错误响应', `返回错误响应: ${error.name === 'AbortError' ? 408 : 500}`);

        return new Response(safeJsonStringify(errorResponse, 2), {
            status: error.name === 'AbortError' ? 408 : 500,
            headers: {
                'Content-Type': 'application/json',
                'X-Error-Source': 'Enhanced-Gemini-Proxy',
                'X-Request-ID': reqId
            }
        });
    }
}
