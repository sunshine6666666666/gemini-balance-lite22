/**
 * 简化调试版本 - 定位错误
 */

export async function handleRequest(request) {
  const reqId = Date.now().toString();
  console.log(`[${reqId}] 请求开始: ${request.method} ${new URL(request.url).pathname}`);
  
  try {
    const url = new URL(request.url);
    
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      console.log(`[${reqId}] CORS预检请求`);
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
      console.log(`[${reqId}] 首页访问`);
      return new Response('Debug Version Running!', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 处理模型列表
    if (url.pathname.endsWith("/models")) {
      console.log(`[${reqId}] 模型列表请求`);
      const models = {
        object: "list",
        data: [
          { id: "gemini-2.5-flash", object: "model", created: 1687882411, owned_by: "google" }
        ]
      };
      return new Response(JSON.stringify(models), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 处理聊天请求
    if (url.pathname.endsWith("/chat/completions")) {
      console.log(`[${reqId}] 聊天请求`);
      
      // 获取API Key
      const auth = request.headers.get("Authorization");
      const apiKey = auth?.split(" ")[1];
      if (!apiKey) {
        throw new Error('缺少API Key');
      }
      
      console.log(`[${reqId}] API Key: ${apiKey.substring(0, 8)}...`);
      
      const chatBody = await request.json();
      console.log(`[${reqId}] 请求体: ${JSON.stringify(chatBody, null, 2)}`);
      
      // 简单的成功响应
      const response = {
        id: `chatcmpl-${reqId}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: chatBody.model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Debug test response - no data tampering"
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18
        }
      };
      
      console.log(`[${reqId}] 响应: ${JSON.stringify(response, null, 2)}`);
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 其他请求
    console.log(`[${reqId}] 未知请求`);
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.log(`[${reqId}] 错误: ${error.message}`);
    console.log(`[${reqId}] 错误堆栈: ${error.stack}`);

    const errorResponse = {
      error: {
        message: error.message,
        type: "debug_error",
        timestamp: new Date().toISOString(),
        requestId: reqId
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
