import { handleVerification } from './verify_keys.js';
import openai from './openai.mjs';

/**
 * 时间窗口轮询算法 - 负载均衡API Key选择
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
    for (const [key, value] of request.headers.entries()) {
      if (key.trim().toLowerCase() === 'x-goog-api-key') {
        // 解析多个API Key（逗号分隔）
        const apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
        if (apiKeys.length > 0) {
          // 使用时间窗口轮询算法选择API Key，替代原来的随机选择
          // 这样可以在短期内保证负载均衡的相对均匀分布
          const selectedKey = selectApiKeyBalanced(apiKeys);
          console.log(`Gemini Load Balancer - Selected API Key: ${selectedKey.substring(0, 8)}...${selectedKey.substring(selectedKey.length - 8)}`);
          headers.set('x-goog-api-key', selectedKey);
        }
      } else {
        if (key.trim().toLowerCase()==='content-type')
        {
           headers.set(key, value);
        }
      }
    }

    console.log('Request Sending to Gemini')
    console.log('targetUrl:'+targetUrl)
    console.log(headers)

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    console.log("Call Gemini Success")

    const responseHeaders = new Headers(response.headers);

    console.log('Header from Gemini:')
    console.log(responseHeaders)

    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');
    responseHeaders.delete('keep-alive');
    responseHeaders.delete('content-encoding');
    responseHeaders.set('Referrer-Policy', 'no-referrer');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
   console.error('Failed to fetch:', error);
   return new Response('Internal Server Error\n' + error?.stack, {
    status: 500,
    headers: { 'Content-Type': 'text/plain' }
   });
}
};
