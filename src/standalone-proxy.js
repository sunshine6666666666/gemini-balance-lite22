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

    // 🔍 详细记录主错误信息
    console.log(`❌ [${reqId}] === 主错误处理详情 ===`);
    console.log(`📝 [${reqId}] 错误类型: ${error.constructor.name}`);
    console.log(`📝 [${reqId}] 错误消息: ${error.message}`);
    if (error.stack) {
      console.log(`📝 [${reqId}] 错误堆栈:`);
      console.log(error.stack);
    }

    const errorResponse = {
      error: {
        message: error.message,
        type: "proxy_error",
        timestamp: new Date().toISOString(),
        requestId: reqId
      }
    };

    // 🔍 详细记录错误响应体
    console.log(`📤 [${reqId}] === 错误响应体详情 ===`);
    console.log(`📝 [${reqId}] 错误响应体 (格式化):`);
    console.log(JSON.stringify(errorResponse, null, 2));

    return new Response(JSON.stringify(errorResponse), {
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

  // 🔍 详细记录OpenAI请求体 - 高可读性JSON
  console.log(`📥 [${reqId}] === OpenAI请求体详情 ===`);
  console.log(`📝 [${reqId}] OpenAI请求体 (格式化):`);
  console.log(JSON.stringify(openaiRequest, null, 2));
  console.log(`📊 [${reqId}] 请求体大小: ${JSON.stringify(openaiRequest).length} 字符`);

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

  // 🔍 详细记录Gemini请求体 - 高可读性JSON
  console.log(`📤 [${reqId}] === Gemini请求体详情 ===`);
  console.log(`📝 [${reqId}] Gemini请求体 (格式化):`);
  console.log(JSON.stringify(geminiRequest, null, 2));
  console.log(`📊 [${reqId}] 请求体大小: ${JSON.stringify(geminiRequest).length} 字符`);

  // 发送请求到Gemini - 简化映射策略
  let model = openaiRequest.model;

  // 简化映射：所有GPT模型都映射到gemini-2.5-flash-lite (适合Vercel 25秒限制)
  if (model.startsWith('gpt-')) {
    console.log(`[${reqId}] GPT模型映射: ${model} -> gemini-2.5-flash-lite (适合Vercel限制)`);
    model = 'gemini-2.5-flash-lite';
  } else if (model.startsWith('gemini-')) {
    console.log(`[${reqId}] 使用Gemini模型: ${model}`);
  } else {
    console.log(`[${reqId}] 未知模型 ${model}，使用默认: gemini-2.5-flash-lite`);
    model = 'gemini-2.5-flash-lite';
  }

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

    // 🔍 详细记录Gemini响应体 - 高可读性JSON
    console.log(`📥 [${reqId}] === Gemini响应体详情 ===`);
    console.log(`📝 [${reqId}] Gemini响应体 (格式化):`);
    console.log(JSON.stringify(geminiResponse, null, 2));
    console.log(`📊 [${reqId}] 响应体大小: ${JSON.stringify(geminiResponse).length} 字符`);

    // 转换为OpenAI格式 - 完全透明转发
    const candidate = geminiResponse.candidates?.[0];
    const geminiContent = candidate?.content?.parts?.[0]?.text;

    // 如果Gemini没有返回内容，提供详细的错误信息
    if (!geminiContent) {
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new Error(`响应被截断：max_tokens过小，Gemini使用了${geminiResponse.usageMetadata?.thoughtsTokenCount || 0}个思考token`);
      } else {
        throw new Error(`Gemini API未返回文本内容，finishReason: ${candidate?.finishReason || 'unknown'}`);
      }
    }

    const openaiResponse = {
      id: `chatcmpl-${reqId}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: openaiRequest.model, // 使用原始请求的模型名，完全透明
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: geminiContent // 直接使用Gemini返回的内容，不篡改
        },
        finish_reason: (candidate?.finishReason || "STOP").toLowerCase()
      }],
      usage: {
        prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
        completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0
      }
    };

    console.log(`[${reqId}] 格式转换完成`);

    // 🔍 详细记录OpenAI响应体 - 高可读性JSON
    console.log(`📤 [${reqId}] === OpenAI响应体详情 ===`);
    console.log(`📝 [${reqId}] OpenAI响应体 (格式化):`);
    console.log(JSON.stringify(openaiResponse, null, 2));
    console.log(`📊 [${reqId}] 响应体大小: ${JSON.stringify(openaiResponse).length} 字符`);

    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.log(`[${reqId}] Gemini请求失败: ${error.message}`);

    // 🔍 详细记录错误信息
    console.log(`❌ [${reqId}] === 错误详情 ===`);
    console.log(`📝 [${reqId}] 错误类型: ${error.constructor.name}`);
    console.log(`📝 [${reqId}] 错误消息: ${error.message}`);
    if (error.stack) {
      console.log(`📝 [${reqId}] 错误堆栈:`);
      console.log(error.stack);
    }

    throw error;
  }
}

/**
 * 处理模型列表请求 - 返回真实可用的Gemini模型
 */
function handleModels(reqId) {
  console.log(`[${reqId}] 返回真实Gemini模型列表`);

  // 返回真实可用的Gemini模型，不伪装成OpenAI模型
  const models = {
    object: "list",
    data: [
      { id: "gemini-2.5-flash", object: "model", created: 1687882411, owned_by: "google" },
      { id: "gemini-2.5-flash-lite", object: "model", created: 1687882411, owned_by: "google" },
      { id: "gemini-2.5-pro", object: "model", created: 1687882411, owned_by: "google" },
      { id: "gemini-1.5-pro", object: "model", created: 1687882411, owned_by: "google" }
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
