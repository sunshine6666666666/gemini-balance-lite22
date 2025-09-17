/**
 * 调试版本的OpenAI适配器 - 简化版本用于定位问题
 */

// 简化的日志函数，避免复杂的导入
function debugLog(message) {
  console.log(`[DEBUG] ${message}`);
}

/**
 * 简化的OpenAI兼容API
 */
const openai = {
  async fetch(request) {
    debugLog('OpenAI adapter started');
    
    try {
      const url = new URL(request.url);
      debugLog(`Processing: ${request.method} ${url.pathname}`);
      
      // 获取API Key
      const auth = request.headers.get("Authorization");
      const apiKey = auth?.split(" ")[1];
      if (!apiKey) {
        throw new Error('Missing API Key');
      }
      debugLog(`API Key received: ${apiKey.substring(0, 8)}...`);
      
      // 路由处理
      if (url.pathname.endsWith("/chat/completions")) {
        debugLog('Handling chat completions');
        const chatBody = await request.json();
        debugLog(`Request body: ${JSON.stringify(chatBody, null, 2)}`);
        
        // 简单的响应
        const response = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "gpt-3.5-turbo",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: "Debug response from simplified adapter"
            },
            finish_reason: "stop"
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 10,
            total_tokens: 20
          }
        };
        
        debugLog('Returning debug response');
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname.endsWith("/models")) {
        debugLog('Handling models list');
        const models = {
          object: "list",
          data: [
            { id: "gpt-3.5-turbo", object: "model" },
            { id: "gpt-4", object: "model" }
          ]
        };
        
        return new Response(JSON.stringify(models), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      debugLog('Unknown endpoint');
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      debugLog(`Error: ${error.message}`);
      debugLog(`Stack: ${error.stack}`);
      
      return new Response(JSON.stringify({
        error: {
          message: error.message,
          type: "debug_error"
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

export default openai;
