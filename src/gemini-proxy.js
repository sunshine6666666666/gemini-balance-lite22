/**
 * Gemini API代理主文件 - 统一请求处理入口
 * 专注于核心代理功能和高可读性日志
 */

import { handleVerification } from './verify_keys.js';
import openai from './openai-adapter.js';
import {
  generateRequestId,
  logRequestStart,
  logRequestEnd,
  logLLMRequest,
  logError,
  getEffectiveApiKeys,
  enhancedFetch,
  addCorsHeaders,
  safeJsonParse,
  safeJsonStringify
} from './utils.js';

/**
 * 主请求处理函数 - 统一入口
 */
export async function handleRequest(request) {
  const reqId = generateRequestId();
  const startTime = Date.now();
  const url = new URL(request.url);
  
  try {
    logRequestStart(reqId, request.method, url.pathname, 0);

    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      console.log(`🔄 [${reqId}] CORS预检请求`);
      return addCorsHeaders(new Response(null, { status: 200 }));
    }

    // 处理首页访问
    if (url.pathname === '/' || url.pathname === '/index.html') {
      console.log(`🏠 [${reqId}] 首页访问`);
      return new Response('Gemini Balance Lite 22 - Proxy is Running!', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 处理API Key验证请求
    if (url.pathname === '/verify' && request.method === 'POST') {
      console.log(`🔍 [${reqId}] API Key验证请求`);
      return handleVerification(request);
    }

    // 检查是否为OpenAI格式请求
    const openaiEndpoints = ['/v1/chat/completions', '/v1/completions', '/v1/models', '/v1/embeddings'];
    const isOpenAIRequest = openaiEndpoints.some(endpoint => url.pathname.endsWith(endpoint));

    if (isOpenAIRequest) {
      console.log(`🔄 [${reqId}] OpenAI兼容请求: ${url.pathname}`);
      return openai.fetch(request);
    }

    // 处理Gemini原生API请求
    return await handleGeminiRequest(request, reqId);

  } catch (error) {
    logError(reqId, error, '主处理函数');
    const response = new Response(
      safeJsonStringify({
        error: {
          message: error.message,
          type: 'proxy_error',
          request_id: reqId
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return addCorsHeaders(response);
  } finally {
    const totalTime = Date.now() - startTime;
    logRequestEnd(reqId, 200, totalTime);
  }
}

/**
 * 处理Gemini原生API请求
 */
async function handleGeminiRequest(request, reqId) {
  const url = new URL(request.url);
  
  // 获取Authorization头
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-goog-api-key');
  if (!authHeader) {
    throw new Error('缺少API Key (Authorization 或 x-goog-api-key 头)');
  }

  // 获取有效的API Key池
  const apiKeys = getEffectiveApiKeys(authHeader, 'Gemini模式: ');
  console.log(`🔑 [${reqId}] 获得${apiKeys.length}个有效API Key`);

  // 构建目标URL
  const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;
  logLLMRequest(reqId, targetUrl, 'Gemini', url.pathname.includes('streamGenerateContent'));

  // 准备请求选项
  const requestOptions = {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  // 添加请求体（如果有）
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text();
    if (body) {
      requestOptions.body = body;
      console.log(`📝 [${reqId}] 请求体大小: ${body.length} 字符`);
    }
  }

  // 发送请求
  const response = await enhancedFetch(targetUrl, requestOptions, apiKeys, reqId, 'Gemini');

  // 处理响应
  return await handleGeminiResponse(response, reqId);
}

/**
 * 处理Gemini API响应
 */
async function handleGeminiResponse(response, reqId) {
  const contentType = response.headers.get('content-type') || '';
  
  // 流式响应处理
  if (contentType.includes('text/plain') || response.headers.get('transfer-encoding') === 'chunked') {
    console.log(`🌊 [${reqId}] 流式响应处理`);
    return handleStreamResponse(response, reqId);
  }

  // 普通JSON响应处理
  console.log(`📄 [${reqId}] JSON响应处理`);
  const responseText = await response.text();
  
  try {
    const responseData = safeJsonParse(responseText);
    console.log(`✅ [${reqId}] 响应解析成功`);
    
    const newResponse = new Response(safeJsonStringify(responseData), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    return addCorsHeaders(newResponse);
  } catch (error) {
    logError(reqId, error, '响应解析');
    throw new Error('响应格式错误');
  }
}

/**
 * 处理流式响应
 */
async function handleStreamResponse(response, reqId) {
  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`🚀 [${reqId}] 开始流式传输`);
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`🏁 [${reqId}] 流式传输完成`);
            break;
          }

          // 处理流数据
          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        logError(reqId, error, '流式传输');
        controller.error(error);
      } finally {
        controller.close();
      }
    }
  });

  const streamResponse = new Response(stream, {
    status: response.status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });

  return addCorsHeaders(streamResponse);
}

/**
 * 错误响应创建
 */
function createErrorResponse(error, reqId, status = 500) {
  const errorResponse = {
    error: {
      message: error.message,
      type: 'gemini_proxy_error',
      request_id: reqId,
      timestamp: new Date().toISOString()
    }
  };

  const response = new Response(safeJsonStringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

  return addCorsHeaders(response);
}
