import { handleVerification } from './verify_keys.js';
import openai from './openai.mjs';

/**
 * 时间窗口轮询算法 - 负载均衡API Key选择（保持原有特色）
 * 将时间分割成固定窗口，在每个窗口内使用确定性轮询分配
 * 这样可以在短期内保证API Key使用的相对均匀分布
 *
 * @param {Array} apiKeys - API Key数组
 * @returns {string} 选中的API Key
 */
function selectApiKeyBalanced(apiKeys) {
  const now = Date.now();
  const windowSize = 10000; // 10秒时间窗口
  const windowStart = Math.floor(now / windowSize) * windowSize;
  const offsetInWindow = now - windowStart;

  // 在时间窗口内进行轮询分配
  // 将窗口时间平均分配给每个API Key
  const slotSize = windowSize / apiKeys.length;
  const index = Math.floor(offsetInWindow / slotSize) % apiKeys.length;

  console.log(`Time-Window Load Balancer - Selected API Key index: ${index}, window offset: ${offsetInWindow}ms`);
  return apiKeys[index];
}

/**
 * 增强的fetch函数 - 在保持轮询机制基础上添加超时和故障切换
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @param {Array} apiKeys - API Key数组
 * @returns {Promise<Response>} 响应对象
 */
async function enhancedFetch(url, options, apiKeys) {
  const maxRetries = Math.min(3, apiKeys.length); // 最多重试3次
  const timeout = 5000; // 5秒超时

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      // 使用原有的时间窗口轮询算法选择API Key
      const selectedKey = selectApiKeyBalanced(apiKeys);

      // 更新请求头中的API Key
      const headers = new Headers(options.headers);
      headers.set('x-goog-api-key', selectedKey);

      console.log(`🚀 尝试 ${attempt}/${maxRetries} - 轮询选择Key: ${selectedKey.substring(0, 8)}...${selectedKey.substring(selectedKey.length - 8)}`);

      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`⏰ 请求超时 (${timeout}ms) - Key: ${selectedKey.substring(0, 8)}...`);
      }, timeout);

      // 发送请求
      const response = await fetch(url, {
        ...options,
        headers: headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (response.ok) {
        console.log(`✅ 请求成功 - 耗时: ${duration}ms, 状态: ${response.status}, Key: ${selectedKey.substring(0, 8)}...`);
        return response;
      } else {
        console.log(`❌ 响应错误 - 状态: ${response.status}, 耗时: ${duration}ms, Key: ${selectedKey.substring(0, 8)}...`);
        if (response.status >= 500) {
          // 5xx错误，重试（轮询会自动选择下一个Key）
          console.log(`🔄 服务器错误，将重试并轮询到下一个Key`);
        } else {
          // 4xx错误，直接返回
          console.log(`🚫 客户端错误，不重试`);
          return response;
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ 请求异常 - 耗时: ${duration}ms, 错误: ${error.message}`);

      // 最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }

      // 超时或网络错误，重试（轮询会自动选择下一个Key）
      console.log(`🔄 网络异常，将重试并轮询到下一个Key`);
    }

    // 短暂延迟，让时间窗口轮询选择到不同的Key
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function handleRequest(request) {

  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;

  if (pathname === '/' || pathname === '/index.html') {
    return new Response('Proxy is Running!  More Details: https://github.com/tech-shrimp/gemini-balance-lite', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (pathname === '/verify' && request.method === 'POST') {
    return handleVerification(request);
  }

  // 处理OpenAI格式请求
  if (url.pathname.endsWith("/chat/completions") || url.pathname.endsWith("/completions") || url.pathname.endsWith("/embeddings") || url.pathname.endsWith("/models")) {
    return openai.fetch(request);
  }

  const targetUrl = `https://generativelanguage.googleapis.com${pathname}${search}`;

  try {
    const headers = new Headers();
    let apiKeys = [];

    // 收集API Keys和其他headers
    for (const [key, value] of request.headers.entries()) {
      if (key.trim().toLowerCase() === 'x-goog-api-key') {
        // 解析多个API Key（逗号分隔）
        apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
      } else if (key.trim().toLowerCase() === 'content-type') {
        headers.set(key, value);
      }
    }

    if (apiKeys.length === 0) {
      throw new Error('未找到API Key');
    }

    console.log(`🎯 开始请求 - URL: ${targetUrl}, 可用Keys: ${apiKeys.length}`);

    // 使用增强的fetch函数
    const response = await enhancedFetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    }, apiKeys);

    console.log(`✅ Gemini请求成功 - 状态: ${response.status}`);

    // 处理响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');
    responseHeaders.delete('keep-alive');
    responseHeaders.delete('content-encoding');
    responseHeaders.set('Referrer-Policy', 'no-referrer');
    responseHeaders.set('X-Processed-By', 'Enhanced-Gemini-Proxy');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error(`❌ 请求最终失败: ${error.message}`);
    console.error(`📊 错误堆栈: ${error.stack}`);

    // 返回结构化错误响应
    const errorResponse = {
      error: {
        message: error.message,
        type: error.name || 'RequestError',
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: error.name === 'AbortError' ? 408 : 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Source': 'Enhanced-Gemini-Proxy'
      }
    });
  }
};
