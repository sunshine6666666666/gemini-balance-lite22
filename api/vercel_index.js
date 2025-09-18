// 直接内联standalone-proxy.js的内容以避免导入问题

export const config = {
  runtime: 'edge'
};

// 内联的handleRequest函数
async function handleRequest(request) {
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
      return new Response('Proxy is Running! Inline Version', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 处理OpenAI兼容请求 (支持v1和简化路径)
    if (url.pathname.startsWith('/v1/') ||
        url.pathname === '/chat/completions' ||
        url.pathname === '/models' ||
        url.pathname === '/completions') {
      console.log(`[${reqId}] OpenAI兼容请求`);
      return handleOpenAIRequest(request, reqId);
    }

    // 处理Gemini原生API请求 (支持v1beta路径)
    if (url.pathname.startsWith('/v1beta/models/') &&
        (url.pathname.includes(':generateContent') || url.pathname.includes(':streamGenerateContent'))) {
      console.log(`[${reqId}] Gemini原生API请求`);
      return handleGeminiNativeRequest(request, reqId);
    }

    // 其他请求
    console.log(`[${reqId}] 未知请求`);
    return new Response('Not Found', { status: 404 });

  } catch (error) {
    console.log(`[${reqId}] 错误: ${error.message}`);
    return new Response(`服务器错误: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// 处理OpenAI兼容请求
async function handleOpenAIRequest(request, reqId) {
  const url = new URL(request.url);

  // 路径标准化：将简化路径转换为v1路径
  let normalizedPath = url.pathname;
  if (normalizedPath === '/models') {
    normalizedPath = '/v1/models';
    console.log(`[${reqId}] 路径标准化: /models -> /v1/models`);
  } else if (normalizedPath === '/chat/completions') {
    normalizedPath = '/v1/chat/completions';
    console.log(`[${reqId}] 路径标准化: /chat/completions -> /v1/chat/completions`);
  } else if (normalizedPath === '/completions') {
    normalizedPath = '/v1/completions';
    console.log(`[${reqId}] 路径标准化: /completions -> /v1/completions`);
  }

  if (normalizedPath === '/v1/models') {
    console.log(`[${reqId}] 模型列表请求`);
    return new Response(JSON.stringify({
      object: "list",
      data: [
        { id: "gpt-3.5-turbo", object: "model", created: 1677610602, owned_by: "openai" },
        { id: "gpt-4", object: "model", created: 1687882411, owned_by: "openai" },
        { id: "gemini-2.5-flash", object: "model", created: 1687882411, owned_by: "google" },
        { id: "gemini-2.5-flash-lite", object: "model", created: 1687882411, owned_by: "google" }
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (normalizedPath === '/v1/chat/completions') {
    console.log(`[${reqId}] 聊天完成请求`);
    return handleChatCompletions(request, reqId);
  }

  return new Response('Not Found', { status: 404 });
}

// 处理聊天完成请求
async function handleChatCompletions(request, reqId) {
  try {
    const openaiRequest = await request.json();
    console.log(`[${reqId}] OpenAI请求: ${JSON.stringify(openaiRequest, null, 2)}`);

    // 扩展模型映射：所有非Gemini模型映射到gemini-2.5-flash-lite
    let model = openaiRequest.model;
    if (model.startsWith('gemini-')) {
      console.log(`[${reqId}] 保持Gemini模型: ${model}`);
      // Gemini模型保持不变
    } else {
      console.log(`[${reqId}] 非Gemini模型映射: ${model} -> gemini-2.5-flash-lite`);
      model = 'gemini-2.5-flash-lite';
    }

    // 获取API Key
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Missing or invalid Authorization header', { status: 401 });
    }
    const apiKey = authHeader.substring(7);

    // 转换为Gemini格式 - 正确处理角色映射
    const geminiRequest = {
      contents: openaiRequest.messages.map(msg => {
        let role;
        if (msg.role === 'assistant') {
          role = 'model';
        } else if (msg.role === 'system') {
          // Gemini不支持system角色，将其转换为user角色
          role = 'user';
        } else {
          role = msg.role; // user角色保持不变
        }

        return {
          role: role,
          parts: [{ text: msg.content }]
        };
      }),
      generationConfig: {
        temperature: openaiRequest.temperature || 0.7,
        maxOutputTokens: openaiRequest.max_tokens || 1024,
        topP: openaiRequest.top_p || 1.0
      }
    };

    console.log(`[${reqId}] Gemini请求: ${JSON.stringify(geminiRequest, null, 2)}`);

    // 调用Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequest)
    });

    const geminiData = await geminiResponse.json();
    console.log(`[${reqId}] Gemini响应: ${JSON.stringify(geminiData, null, 2)}`);

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API错误: ${geminiData.error?.message || 'Unknown error'}`);
    }

    // 提取内容
    const candidate = geminiData.candidates?.[0];
    const geminiContent = candidate?.content?.parts?.[0]?.text;

    if (!geminiContent) {
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new Error(`响应被截断：max_tokens过小，Gemini使用了${geminiData.usageMetadata?.thoughtsTokenCount || 0}个思考token`);
      } else {
        throw new Error(`Gemini API未返回文本内容，finishReason: ${candidate?.finishReason || 'unknown'}`);
      }
    }

    // 转换为OpenAI格式响应
    const openaiResponse = {
      id: `chatcmpl-${reqId}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: openaiRequest.model, // 保持原始模型名
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: geminiContent
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: geminiData.usageMetadata?.promptTokenCount || 0,
        completion_tokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: geminiData.usageMetadata?.totalTokenCount || 0
      }
    };

    console.log(`[${reqId}] OpenAI响应: ${JSON.stringify(openaiResponse, null, 2)}`);

    return new Response(JSON.stringify(openaiResponse), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${reqId}] 处理错误: ${error.message}`);
    return new Response(JSON.stringify({
      error: {
        message: error.message,
        type: "invalid_request_error"
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 主处理函数
export default async function handler(req) {
  // 过滤静态文件请求
  const url = new URL(req.url);
  console.log(`📥 收到请求: ${req.method} ${url.pathname}`);

  if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {
    console.log(`🚫 拦截favicon请求: ${url.pathname}`);
    return new Response('', { status: 404 });
  }

  if (url.pathname.match(/\.(ico|png|jpg|jpeg|gif|css|js|svg|webp)$/)) {
    console.log(`🚫 拦截静态文件请求: ${url.pathname}`);
    return new Response('Not Found', { status: 404 });
  }

  console.log(`✅ 处理API请求: ${req.method} ${url.pathname}`);
  return handleRequest(req);
}

// 处理Gemini原生API请求
async function handleGeminiNativeRequest(request, reqId) {
  const url = new URL(request.url);

  console.log(`[${reqId}] 处理Gemini原生API: ${url.pathname}`);

  try {
    // 提取模型名称
    const pathMatch = url.pathname.match(/\/v1beta\/models\/([^:]+):(.+)/);
    if (!pathMatch) {
      console.log(`[${reqId}] 无效的Gemini API路径格式`);
      return new Response('Invalid Gemini API path format', { status: 400 });
    }

    const [, modelName, action] = pathMatch;
    console.log(`[${reqId}] 模型: ${modelName}, 操作: ${action}`);

    // 获取API Key
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('x-goog-api-key');

    let apiKey;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    } else if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else {
      console.log(`[${reqId}] 缺少API Key`);
      return new Response('Missing API key', { status: 401 });
    }

    // 获取请求体
    const requestBody = await request.json();
    console.log(`[${reqId}] Gemini原生请求体: ${JSON.stringify(requestBody, null, 2)}`);

    // 构建Gemini API URL
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${action}`;
    console.log(`[${reqId}] 转发到Gemini API: ${geminiUrl}`);

    // 转发请求到Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`[${reqId}] Gemini API响应状态: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.log(`[${reqId}] Gemini API错误: ${errorText}`);
      return new Response(errorText, {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 处理流式响应
    if (action === 'streamGenerateContent') {
      console.log(`[${reqId}] 返回流式响应`);
      return new Response(geminiResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // 处理普通响应
      const responseData = await geminiResponse.json();
      console.log(`[${reqId}] Gemini API响应: ${JSON.stringify(responseData, null, 2)}`);

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error(`[${reqId}] Gemini原生API处理错误: ${error.message}`);
    return new Response(`Gemini Native API Error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}