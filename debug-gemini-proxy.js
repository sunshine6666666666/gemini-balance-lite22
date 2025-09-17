/**
 * 调试版本的Gemini代理 - 完全简化版本
 */

import openai from './debug-openai-adapter.js';

/**
 * 简化的请求处理函数
 */
export async function handleRequest(request) {
  console.log('[DEBUG] Gemini proxy started');
  
  try {
    const url = new URL(request.url);
    console.log(`[DEBUG] Processing: ${request.method} ${url.pathname}`);
    
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      console.log('[DEBUG] CORS preflight request');
      return new Response(null, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // 处理首页访问
    if (url.pathname === '/' || url.pathname === '/index.html') {
      console.log('[DEBUG] Homepage access');
      return new Response('Proxy is Running!  More Details: https://github.com/sunshine6666666666/gemini-balance-lite22', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 处理OpenAI兼容请求
    if (url.pathname.startsWith('/v1/')) {
      console.log('[DEBUG] OpenAI compatible request');
      return openai.fetch(request);
    }

    // 其他请求
    console.log('[DEBUG] Unknown request');
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.log(`[DEBUG] Error: ${error.message}`);
    console.log(`[DEBUG] Stack: ${error.stack}`);
    
    return new Response(JSON.stringify({
      error: {
        message: error.message,
        type: "debug_proxy_error"
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
