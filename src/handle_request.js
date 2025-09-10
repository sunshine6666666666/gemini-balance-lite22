/**
 * @功能概述: Gemini API原生请求处理器，支持负载均衡和白名单验证
 * @运行时: Edge Runtime (Web标准API)
 * @请求处理: 处理原生Gemini API请求，支持多API Key负载均衡
 * @响应格式: 保持Gemini API原生响应格式
 * @性能特征: 45秒超时，支持流式和非流式响应
 */

import { handleVerification } from './verify_keys.js';
import openai from './openai.mjs';

// 导入重构后的核心模块
import { enhancedFetch } from './core/api-client.js';
import { selectApiKeyBalanced } from './core/load-balancer.js';
import { validateTrustedApiKey, getEffectiveApiKeys, maskApiKey } from './core/security.js';
import { createLogPrefix, structuredLog, logRequestInfo, logResponseInfo, logError } from './middleware/logger.js';
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
    const reqId = Date.now().toString(); // 生成唯一请求ID
    const logPrefix = createLogPrefix('handle_request.js', '请求处理器', 'handleRequest', reqId);

    const url = new URL(request.url);
    const pathname = url.pathname;
    const search = url.search;

    // 步骤 1: 记录请求基本信息
    structuredLog('info', logPrefix, '步骤 1', `收到请求: ${request.method} ${pathname}`);
    logRequestInfo(request, reqId, 'Gemini原生API');

    // 步骤 2: 处理首页访问
    if (pathname === '/' || pathname === '/index.html') {
        structuredLog('info', logPrefix, '步骤 2', '首页访问');
        return new Response('Proxy is Running!  More Details: https://github.com/sunshine6666666666/gemini-balance-lite22', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        });
    }

    // 步骤 3: 处理API Key验证请求
    if (pathname === '/verify' && request.method === 'POST') {
        structuredLog('info', logPrefix, '步骤 3', 'API Key验证请求');
        return handleVerification(request);
    }

    // 步骤 4: 检查是否为OpenAI格式请求
    const openaiEndpoints = Object.values(OPENAI_ENDPOINTS);
    const isOpenAIRequest = openaiEndpoints.some(endpoint => pathname.endsWith(endpoint));

    if (isOpenAIRequest) {
        structuredLog('info', logPrefix, '步骤 4', '转发到OpenAI兼容模块');
        return openai.fetch(request);
    }

    // 步骤 5: 构建Gemini API目标URL
    const targetUrl = `${GEMINI_API.BASE_URL}${pathname}${search}`;
    structuredLog('info', logPrefix, '步骤 5', `目标URL: ${targetUrl}`);

    try {
        // 步骤 6: 提取API Keys
        const headers = new Headers();
        let apiKeys = [];

        // 从请求头中提取API Keys
        for (const [key, value] of request.headers.entries()) {
            if (key.trim().toLowerCase() === 'x-goog-api-key') {
                // 解析多个API Key（逗号分隔）
                apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
                structuredLog('info', logPrefix, '步骤 6.1', `从x-goog-api-key提取到${apiKeys.length}个API Key`);
            } else if (key.trim().toLowerCase() === 'authorization') {
                // 支持OpenAI格式的Authorization Bearer头
                const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
                if (bearerMatch && apiKeys.length === 0) {
                    const bearerToken = bearerMatch[1];
                    if (bearerToken.includes(',')) {
                        apiKeys = bearerToken.split(',').map(k => k.trim()).filter(k => k);
                        structuredLog('info', logPrefix, '步骤 6.2', `从Authorization头提取到${apiKeys.length}个API Key`);
                    } else {
                        apiKeys = [bearerToken];
                        structuredLog('info', logPrefix, '步骤 6.3', '从Authorization头提取到单个API Key');
                    }
                }
            } else if (key.trim().toLowerCase() === 'content-type') {
                headers.set(key, value);
            }
        }

        // 步骤 7: 智能API Key管理
        if (apiKeys.length <= 1) {
            const inputApiKey = apiKeys[0];
            structuredLog('info', logPrefix, '步骤 7', `单Key模式，检查白名单验证 - Key: ${inputApiKey?.substring(0,8)}...`);

            // 白名单验证
            if (!validateTrustedApiKey(inputApiKey)) {
                structuredLog('warn', logPrefix, '步骤 7[SECURITY]', 'API Key未通过白名单验证，拒绝请求');
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

            // 获取备用Key池
            const backupKeys = process.env.BACKUP_API_KEYS;
            if (backupKeys) {
                const backupKeyArray = backupKeys.split(',').map(k => k.trim()).filter(k => k);
                structuredLog('info', logPrefix, '步骤 7.1[SUCCESS]', `启用备用Key池 (${backupKeyArray.length}个)`);
                apiKeys = backupKeyArray;
            } else {
                structuredLog('warn', logPrefix, '步骤 7.2[WARN]', '未配置备用Key池，继续使用单Key');
            }
        } else {
            structuredLog('info', logPrefix, '步骤 7', `多Key模式，使用传入的${apiKeys.length}个API Key`);
        }

        // 步骤 8: 验证API Key可用性
        if (apiKeys.length === 0) {
            structuredLog('error', logPrefix, '步骤 8[ERROR]', '未找到可用的API Key');
            throw new Error('未找到API Key');
        }

        structuredLog('info', logPrefix, '步骤 8[SUCCESS]', `准备发送请求 - 可用Keys: ${apiKeys.length}`);

        // 步骤 9: 处理请求体内容
        let requestBodyContent = null;
        if (request.body) {
            requestBodyContent = await request.text();
            structuredLog('info', logPrefix, '步骤 9', '读取请求体内容');

            if (requestBodyContent) {
                const parsedBody = safeJsonParse(requestBodyContent);
                if (parsedBody) {
                    structuredLog('info', logPrefix, '步骤 9.1', '请求体JSON格式有效');
                } else {
                    structuredLog('info', logPrefix, '步骤 9.2', '请求体为非JSON格式');
                }
            } else {
                structuredLog('info', logPrefix, '步骤 9.3', '请求体为空');
            }
        } else {
            structuredLog('info', logPrefix, '步骤 9', '无请求体');
        }

        // 步骤 10: 使用增强的fetch函数发送请求
        structuredLog('info', logPrefix, '步骤 10', '开始发送API请求');
        const startTime = Date.now();

        const response = await enhancedFetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: requestBodyContent
        }, apiKeys, 'gemini');

        const duration = Date.now() - startTime;
        structuredLog('info', logPrefix, '步骤 10[SUCCESS]', `Gemini请求成功 - 状态: ${response.status}, 耗时: ${duration}ms`);

        // 步骤 11: 处理响应头
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('transfer-encoding');
        responseHeaders.delete('connection');
        responseHeaders.delete('keep-alive');
        responseHeaders.delete('content-encoding');
        responseHeaders.set('Referrer-Policy', 'no-referrer');
        responseHeaders.set('X-Processed-By', 'Enhanced-Gemini-Proxy');
        responseHeaders.set('X-Request-ID', reqId);

        structuredLog('info', logPrefix, '步骤 11', '响应头处理完成');

        // 步骤 12: 记录响应信息（非流式响应）
        if (!response.body || response.headers.get('content-type')?.includes('application/json')) {
            try {
                const responseClone = response.clone();
                const responseText = await responseClone.text();
                if (responseText) {
                    const parsedResponse = safeJsonParse(responseText);
                    if (parsedResponse) {
                        structuredLog('info', logPrefix, '步骤 12', '响应体JSON格式有效');
                    }
                }
            } catch (e) {
                structuredLog('info', logPrefix, '步骤 12', '响应体为流式响应，无法预览');
            }
        }

        // 步骤 13: 返回最终响应
        const finalResponse = new Response(response.body, {
            status: response.status,
            headers: responseHeaders
        });

        structuredLog('info', logPrefix, '步骤 13[SUCCESS]', '请求处理完成，返回响应');
        return finalResponse;

    } catch (error) {
        // 错误处理
        structuredLog('error', logPrefix, 'ERROR', `请求处理失败: ${error.message}`);
        logError(error, reqId, 'handleRequest', {
            url: targetUrl,
            method: request.method,
            pathname: pathname
        });

        // 返回结构化错误响应
        const errorResponse = {
            error: {
                message: error.message,
                type: error.name || 'RequestError',
                timestamp: new Date().toISOString(),
                request_id: reqId
            }
        };

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
