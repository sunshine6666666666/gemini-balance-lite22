/**
 * 独立代理 - 完全自包含，无外部依赖
 * 用于测试Edge Runtime兼容性
 */

/**
 * 主请求处理函数
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
      return new Response('Proxy is Running! Standalone Version', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 处理OpenAI兼容请求
    if (url.pathname.startsWith('/v1/')) {
      console.log(`[${reqId}] OpenAI兼容请求`);
      return handleOpenAIRequest(request, reqId);
    }

    // 其他请求
    console.log(`[${reqId}] 未知请求`);
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.log(`[${reqId}] 错误: ${error.message}`);
    return new Response(JSON.stringify({
      error: {
        message: error.message,
        type: "proxy_error"
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 处理OpenAI兼容请求
 */
async function handleOpenAIRequest(request, reqId) {
  const url = new URL(request.url);
  
  // 获取API Key
  const auth = request.headers.get("Authorization");
  const apiKey = auth?.split(" ")[1];
  if (!apiKey) {
    throw new Error('缺少API Key');
  }
  
  console.log(`[${reqId}] API Key: ${apiKey.substring(0, 8)}...`);

  // 路由处理
  if (url.pathname.endsWith("/chat/completions")) {
    console.log(`[${reqId}] 聊天完成请求`);
    const chatBody = await request.json();
    return handleChatCompletions(chatBody, apiKey, reqId);
  }

  if (url.pathname.endsWith("/models")) {
    console.log(`[${reqId}] 模型列表请求`);
    return handleModels(reqId);
  }

  throw new Error(`不支持的端点: ${url.pathname}`);
}

/**
 * 处理聊天完成请求
 */
async function handleChatCompletions(openaiRequest, apiKey, reqId) {
  console.log(`[${reqId}] 开始格式转换`);

  // 转换消息格式
  const geminiContents = openaiRequest.messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }]
  }));

  // 构建Gemini请求
  const geminiRequest = {
    contents: geminiContents,
    generationConfig: {
      temperature: openaiRequest.temperature || 0.7,
      maxOutputTokens: openaiRequest.max_tokens || 1024,
      topP: openaiRequest.top_p || 1.0
    }
  };

  console.log(`[${reqId}] 转换完成: ${geminiContents.length}条消息`);

  // 发送请求到Gemini
  const model = 'gemini-2.5-flash';
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  console.log(`[${reqId}] 发送到Gemini: ${model}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequest)
    });

    if (!response.ok) {
      throw new Error(`Gemini API错误: ${response.status}`);
    }

    const geminiResponse = await response.json();
    console.log(`[${reqId}] Gemini响应成功`);

    // 转换为OpenAI格式
    const openaiResponse = {
      id: `chatcmpl-${reqId}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-3.5-turbo",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，无法生成回复。"
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    console.log(`[${reqId}] 格式转换完成`);
    
    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.log(`[${reqId}] Gemini请求失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理模型列表请求
 */
function handleModels(reqId) {
  console.log(`[${reqId}] 返回模型列表`);
  
  const models = {
    object: "list",
    data: [
      { id: "gpt-3.5-turbo", object: "model", created: 1677610602, owned_by: "openai" },
      { id: "gpt-4", object: "model", created: 1687882411, owned_by: "openai" },
      { id: "gemini-2.5-flash", object: "model", created: 1687882411, owned_by: "google" },
      { id: "gemini-2.5-pro", object: "model", created: 1687882411, owned_by: "google" }
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
