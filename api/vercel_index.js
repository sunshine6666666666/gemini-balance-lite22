// 直接内联standalone-proxy.js的内容以避免导入问题

export const config = {
  runtime: 'edge'
};

// 导入核心负载均衡功能
import {
  getEffectiveApiKeys,
  selectApiKeyBalanced,
  logLoadBalance,
  enhancedFetch,
  enhancedFetchOpenAI
} from '../src/utils.js';

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

    // 检查是否为流式请求
    const isStreaming = openaiRequest.stream === true;
    console.log(`[${reqId}] 流式请求: ${isStreaming}`);

    // 检查并记录所有OpenAI参数
    console.log(`[${reqId}] 📊 OpenAI参数解析:`);
    console.log(`[${reqId}]   - temperature: ${openaiRequest.temperature} (默认: 0.7)`);
    console.log(`[${reqId}]   - max_tokens: ${openaiRequest.max_tokens} (计算默认值)`);
    console.log(`[${reqId}]   - top_p: ${openaiRequest.top_p} (默认: 1.0)`);
    console.log(`[${reqId}]   - top_k: ${openaiRequest.top_k} (可选)`);
    console.log(`[${reqId}]   - frequency_penalty: ${openaiRequest.frequency_penalty} (可选)`);
    console.log(`[${reqId}]   - presence_penalty: ${openaiRequest.presence_penalty} (可选)`);
    console.log(`[${reqId}]   - stop: ${openaiRequest.stop ? JSON.stringify(openaiRequest.stop) : '未设置'}`);
    console.log(`[${reqId}]   - n: ${openaiRequest.n} (生成数量)`);
    console.log(`[${reqId}]   - stream: ${openaiRequest.stream} (流式模式)`);

    if (openaiRequest.response_format) {
      console.log(`[${reqId}] 检测到response_format: ${JSON.stringify(openaiRequest.response_format)}`);
      if (openaiRequest.response_format.type === 'json_object') {
        console.log(`[${reqId}] 启用强制JSON模式: responseMimeType = application/json`);
      }
    }

    // 扩展模型映射：所有非Gemini模型映射到gemini-2.5-flash-lite
    let model = openaiRequest.model;
    if (model.startsWith('gemini-')) {
      console.log(`[${reqId}] 保持Gemini模型: ${model}`);
      // Gemini模型保持不变
    } else {
      console.log(`[${reqId}] 非Gemini模型映射: ${model} -> gemini-2.5-flash-lite`);
      model = 'gemini-2.5-flash-lite';
    }

    // 获取API Key - 使用项目核心负载均衡功能
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Missing or invalid Authorization header', { status: 401 });
    }

    // 恢复核心功能：解析多API Key并启用负载均衡
    const apiKeyString = authHeader.substring(7);
    const apiKeys = getEffectiveApiKeys(apiKeyString, `[${reqId}] OpenAI模式: `);
    console.log(`[${reqId}] 🔑 获得${apiKeys.length}个有效API Key，启用负载均衡`);

    // 使用负载均衡选择API Key
    const selectedApiKey = selectApiKeyBalanced(apiKeys);
    logLoadBalance(reqId, selectedApiKey, apiKeys.length, "时间窗口轮询");

    // 转换为Gemini格式 - 正确处理角色映射和复杂content格式
    console.log(`[${reqId}] 开始消息格式转换，共${openaiRequest.messages.length}条消息`);

    // 智能计算默认token数量
    const calculateDefaultTokens = (messages) => {
      const totalLength = messages.reduce((sum, msg) => {
        if (typeof msg.content === 'string') {
          return sum + msg.content.length;
        } else if (Array.isArray(msg.content)) {
          return sum + msg.content.reduce((contentSum, item) =>
            contentSum + (item.text ? item.text.length : 0), 0);
        } else {
          return sum + JSON.stringify(msg.content).length;
        }
      }, 0);

      console.log(`[${reqId}] 消息总长度: ${totalLength} 字符`);

      // 根据内容长度和复杂度动态调整token限制
      if (totalLength > 8000) {
        console.log(`[${reqId}] 复杂请求，设置token限制: 8192`);
        return 8192;  // 非常复杂的请求
      } else if (totalLength > 5000) {
        console.log(`[${reqId}] 中等复杂请求，设置token限制: 7000`);
        return 7000;  // 复杂请求
      } else if (totalLength > 2000) {
        console.log(`[${reqId}] 标准请求，设置token限制: 7000`);
        return 7000;  // 标准请求（用户要求的默认值）
      } else {
        console.log(`[${reqId}] 简单请求，设置token限制: 7000`);
        return 7000;  // 简单请求也使用7000（用户要求的默认值）
      }
    };

    const geminiRequest = {
      contents: openaiRequest.messages.map((msg, index) => {
        let role;
        if (msg.role === 'assistant') {
          role = 'model';
        } else if (msg.role === 'system') {
          // Gemini不支持system角色，将其转换为user角色
          role = 'user';
        } else {
          role = msg.role; // user角色保持不变
        }

        // 处理复杂的content格式，确保透明转发所有信息
        let textContent;
        if (typeof msg.content === 'string') {
          // 简单字符串格式
          textContent = msg.content;
          console.log(`[${reqId}] 消息${index}: 字符串格式，长度${textContent.length}`);
        } else if (Array.isArray(msg.content)) {
          // 复杂数组格式 - 提取所有text内容并保持完整性
          console.log(`[${reqId}] 消息${index}: 数组格式，包含${msg.content.length}个元素`);
          textContent = msg.content
            .filter(item => item && item.type === 'text' && item.text)
            .map(item => item.text)
            .join('\n'); // 使用换行符连接，保持内容结构
          console.log(`[${reqId}] 消息${index}: 提取文本长度${textContent.length}`);
        } else if (msg.content && typeof msg.content === 'object') {
          // 对象格式转为字符串
          textContent = JSON.stringify(msg.content);
          console.log(`[${reqId}] 消息${index}: 对象格式，转换为JSON字符串`);
        } else {
          // 其他格式转为字符串
          textContent = String(msg.content || '');
          console.log(`[${reqId}] 消息${index}: 其他格式，转换为字符串`);
        }

        // 验证转换结果
        if (!textContent) {
          console.warn(`[${reqId}] 消息${index}: 内容为空，使用默认文本`);
          textContent = '[Empty message]';
        }

        return {
          role: role,
          parts: [{ text: textContent }]
        };
      }),
      generationConfig: {
        // 基础参数映射
        temperature: openaiRequest.temperature !== undefined ? openaiRequest.temperature : 0.7,
        maxOutputTokens: openaiRequest.max_tokens || calculateDefaultTokens(openaiRequest.messages),
        topP: openaiRequest.top_p !== undefined ? openaiRequest.top_p : 1.0,

        // 新增参数映射
        ...(openaiRequest.top_k !== undefined && { topK: openaiRequest.top_k }),
        // 注意：gemini-2.5-flash-lite不支持penalty参数，只有完整版gemini模型支持
        ...(model !== 'gemini-2.5-flash-lite' && openaiRequest.frequency_penalty !== undefined && { frequencyPenalty: openaiRequest.frequency_penalty }),
        ...(model !== 'gemini-2.5-flash-lite' && openaiRequest.presence_penalty !== undefined && { presencePenalty: openaiRequest.presence_penalty }),
        ...(openaiRequest.stop && { stopSequences: Array.isArray(openaiRequest.stop) ? openaiRequest.stop : [openaiRequest.stop] }),

        // 处理OpenAI的response_format参数
        ...(openaiRequest.response_format?.type === 'json_object' && {
          responseMimeType: 'application/json'
        }),

        // 处理其他高级参数
        ...(openaiRequest.seed !== undefined && { seed: openaiRequest.seed }),
        ...(openaiRequest.logit_bias && { logitBias: openaiRequest.logit_bias })
      },

      // 处理安全设置（如果需要）
      ...(openaiRequest.safety_settings && {
        safetySettings: openaiRequest.safety_settings
      }),

      // 处理工具调用（如果需要）
      ...(openaiRequest.tools && {
        tools: openaiRequest.tools
      }),

      // 处理系统指令（如果需要）
      ...(openaiRequest.system && {
        systemInstruction: {
          parts: [{ text: openaiRequest.system }]
        }
      })
    };

    console.log(`[${reqId}] Gemini请求: ${JSON.stringify(geminiRequest, null, 2)}`);

    // 根据请求类型选择不同的处理方式
    if (isStreaming) {
      console.log(`[${reqId}] 使用真正的流式处理: streamGenerateContent`);
      return handleRealStreamingResponse(geminiRequest, openaiRequest, model, apiKeys, reqId);
    } else {
      console.log(`[${reqId}] 使用非流式端点: generateContent`);
      return handleNonStreamingResponse(geminiRequest, openaiRequest, model, apiKeys, reqId);
    }
  } catch (error) {
    console.error(`[${reqId}] 处理错误: ${error.message}`);
    return new Response(JSON.stringify({
      error: {
        message: error.message,
        type: "internal_error"
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理非流式响应 - 使用负载均衡
async function handleNonStreamingResponse(geminiRequest, openaiRequest, model, apiKeys, reqId) {
  console.log(`[${reqId}] 🔄 非流式请求使用负载均衡，共${apiKeys.length}个API Key`);

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // 使用OpenAI兼容的fetch函数，内置轮询负载均衡和重试机制
  const geminiResponse = await enhancedFetchOpenAI(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiRequest)
  }, apiKeys, reqId, 'OpenAI->Gemini非流式');

  if (!geminiResponse.ok) {
    const errorData = await geminiResponse.json();
    console.error(`[${reqId}] Gemini API错误: ${JSON.stringify(errorData, null, 2)}`);
    throw new Error(`Gemini API错误: ${errorData.error?.message || 'Unknown error'}`);
  }

  // 获取Gemini响应
  const geminiData = await geminiResponse.json();
  console.log(`[${reqId}] Gemini响应: ${JSON.stringify(geminiData, null, 2)}`);

  // 提取内容
  const candidate = geminiData.candidates?.[0];
  const geminiContent = candidate?.content?.parts?.[0]?.text || '';

  // 处理各种完成原因
  if (!geminiContent && candidate?.finishReason !== "MAX_TOKENS") {
    throw new Error(`Gemini API未返回文本内容，finishReason: ${candidate?.finishReason || 'unknown'}`);
  }

  // 记录完成原因（包括MAX_TOKENS）
  if (candidate?.finishReason === "MAX_TOKENS") {
    console.log(`[${reqId}] 响应因达到max_tokens限制而截断，思考token: ${geminiData.usageMetadata?.thoughtsTokenCount || 0}`);
  }

  // 映射Gemini的finishReason到OpenAI格式
  let finishReason = "stop";
  if (candidate?.finishReason === "MAX_TOKENS") {
    finishReason = "length";
  } else if (candidate?.finishReason === "SAFETY") {
    finishReason = "content_filter";
  } else if (candidate?.finishReason === "RECITATION") {
    finishReason = "content_filter";
  }

  // 完整的OpenAI非流式响应格式
  const openaiResponse = {
    id: `chatcmpl-${reqId}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: openaiRequest.model, // 保持原始模型名
    system_fingerprint: null, // OpenAI标准字段
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: geminiContent,
        tool_calls: null, // 工具调用支持
        function_call: null // 兼容旧版本
      },
      logprobs: null, // 日志概率
      finish_reason: finishReason
    }],
    usage: {
      prompt_tokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiData.usageMetadata?.totalTokenCount || 0,
      // 添加详细的token使用信息
      prompt_tokens_details: geminiData.usageMetadata?.promptTokensDetails ? {
        cached_tokens: 0,
        audio_tokens: 0
      } : undefined,
      completion_tokens_details: geminiData.usageMetadata?.candidatesTokenCount ? {
        reasoning_tokens: geminiData.usageMetadata?.thoughtsTokenCount || 0,
        audio_tokens: 0,
        accepted_prediction_tokens: 0,
        rejected_prediction_tokens: 0
      } : undefined
    }
  };

  console.log(`[${reqId}] OpenAI非流式响应: ${JSON.stringify(openaiResponse, null, 2)}`);

  return new Response(JSON.stringify(openaiResponse), {
    headers: { 'Content-Type': 'application/json' }
  });
}



// 处理真正的流式响应 - 使用负载均衡和API Key故障切换
async function handleRealStreamingResponse(geminiRequest, openaiRequest, model, apiKeys, reqId) {
  console.log(`[${reqId}] 🌊 流式请求使用负载均衡，共${apiKeys.length}个API Key`);

  // API Key重试机制 - 修复：尝试所有可用的API Key
  let lastError = null;
  let attemptCount = 0;
  const maxAttempts = apiKeys.length; // 尝试所有可用的API Key
  const usedKeys = new Set(); // 记录已使用的Key，避免重复

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attemptCount++;

    // 选择未使用过的API Key - 修复：直接使用轮询避免重复选择
    let selectedApiKey = apiKeys[attempt % apiKeys.length];

    // 确保不重复使用已失败的Key
    let keyAttempts = 0;
    while (usedKeys.has(selectedApiKey) && keyAttempts < apiKeys.length) {
      keyAttempts++;
      selectedApiKey = apiKeys[(attempt + keyAttempts) % apiKeys.length];
    }

    usedKeys.add(selectedApiKey);
    logLoadBalance(reqId, selectedApiKey, apiKeys.length, `流式请求尝试${attemptCount}`);

    const geminiStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${selectedApiKey}`;
    console.log(`[${reqId}] 🌐 尝试${attemptCount}: Gemini流式请求URL: ${geminiStreamUrl.replace(selectedApiKey, selectedApiKey.substring(0, 8) + '...')}`);
    console.log(`[${reqId}] 📤 尝试${attemptCount}: Gemini流式请求体: ${JSON.stringify(geminiRequest, null, 2)}`);

    try {
      const geminiResponse = await fetch(geminiStreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest)
      });

      console.log(`[${reqId}] 📥 尝试${attemptCount}: Gemini流式响应状态: ${geminiResponse.status}`);
      console.log(`[${reqId}] 📥 尝试${attemptCount}: Gemini流式响应头: ${JSON.stringify(Object.fromEntries(geminiResponse.headers.entries()))}`);

      // 检查是否需要重试（认证错误）
      if (geminiResponse.status === 400 || geminiResponse.status === 401 || geminiResponse.status === 403) {
        const errorData = await geminiResponse.text();
        console.warn(`[${reqId}] ⚠️ 尝试${attemptCount}: API Key认证失败 (${geminiResponse.status}): ${errorData}`);
        lastError = new Error(`API Key认证失败: ${geminiResponse.status} - ${errorData}`);

        if (attempt < maxAttempts - 1) {
          console.log(`[${reqId}] 🔄 尝试${attemptCount}: 切换到下一个API Key...`);
          continue; // 尝试下一个API Key
        }
      } else if (!geminiResponse.ok) {
        // 其他错误直接抛出，不重试
        const errorData = await geminiResponse.text();
        console.error(`[${reqId}] ❌ 尝试${attemptCount}: Gemini流式API错误: ${geminiResponse.status} - ${errorData}`);
        throw new Error(`Gemini流式API错误: ${geminiResponse.status} - ${errorData}`);
      } else {
        // 成功，处理流式响应
        console.log(`[${reqId}] ✅ 尝试${attemptCount}: API Key验证成功，开始处理流式响应`);
        return await processStreamingResponse(geminiResponse, openaiRequest, reqId);
      }
    } catch (error) {
      console.error(`[${reqId}] ❌ 尝试${attemptCount}: 请求异常: ${error.message}`);
      lastError = error;

      if (attempt < maxAttempts - 1) {
        console.log(`[${reqId}] 🔄 尝试${attemptCount}: 发生异常，切换到下一个API Key...`);
        continue; // 尝试下一个API Key
      }
    }
  }

  // 所有API Key都失败了
  console.error(`[${reqId}] 💥 所有${attemptCount}个API Key尝试都失败了`);
  throw lastError || new Error('所有API Key都无法使用');
}

// 处理流式响应的核心函数
async function processStreamingResponse(geminiResponse, openaiRequest, reqId) {
  console.log(`[${reqId}] 🌊 开始处理Gemini流式响应`);

  const stream = new ReadableStream({
    async start(controller) {
      const reader = geminiResponse.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;
      let accumulatedContent = '';
      let sseBuffer = ''; // 用于缓冲不完整的SSE数据

      console.log(`[${reqId}] 🔧 开始读取Gemini流式响应...`);

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`[${reqId}] 🏁 Gemini流式响应完成，共处理${chunkCount}个数据块`);

            // 发送标准OpenAI格式的完成块
            const finalChunk = {
              id: `chatcmpl-${reqId}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: openaiRequest.model,
              system_fingerprint: null,
              choices: [{
                index: 0,
                delta: {},
                logprobs: null,
                finish_reason: "stop"
              }]
            };

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
            controller.close();
            return;
          }

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          console.log(`[${reqId}] 📦 处理流式数据块 ${chunkCount}，长度: ${chunk.length}`);

          // 使用缓冲机制处理分割的SSE数据
          sseBuffer += chunk;
          console.log(`[${reqId}] 📄 原始Gemini数据: ${chunk.substring(0, 200)}...`);

          // 按行分割处理SSE数据
          const lines = sseBuffer.split('\n');

          // 保留最后一行（可能不完整）
          sseBuffer = lines.pop() || '';

          console.log(`[${reqId}] 处理${lines.length}行数据，缓冲区剩余: ${sseBuffer.length}字符`);

          // 处理每一行
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              console.log(`[${reqId}] 📋 提取JSON: ${jsonStr.substring(0, 100)}...`);

              if (jsonStr && jsonStr !== '[DONE]') {
                try {
                  const geminiData = JSON.parse(jsonStr);
                  console.log(`[${reqId}] ✅ 解析Gemini数据成功:`, JSON.stringify(geminiData, null, 2));

                  // 提取文本内容
                  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

                  if (text) {
                    console.log(`[${reqId}] 📝 提取到文本: "${text}"`);

                    // 转换为标准OpenAI流式格式
                    const openaiChunk = {
                      id: `chatcmpl-${reqId}`,
                      object: "chat.completion.chunk",
                      created: Math.floor(Date.now() / 1000),
                      model: openaiRequest.model,
                      system_fingerprint: null,
                      choices: [{
                        index: 0,
                        delta: { content: text },
                        logprobs: null,
                        finish_reason: null
                      }]
                    };

                    const sseData = `data: ${JSON.stringify(openaiChunk)}\n\n`;
                    console.log(`[${reqId}] 🚀 发送OpenAI SSE数据: ${text}`);
                    controller.enqueue(new TextEncoder().encode(sseData));
                  }

                  // 检查是否有完成标记
                  if (geminiData.candidates?.[0]?.finishReason) {
                    console.log(`[${reqId}] Gemini完成原因: ${geminiData.candidates[0].finishReason}`);
                  }
                } catch (parseError) {
                  console.warn(`[${reqId}] JSON解析失败: ${parseError.message}, 数据: ${jsonStr.substring(0, 100)}...`);
                }
              }
            }
          }
        }
      } catch (streamError) {
        console.error(`[${reqId}] 流式处理错误: ${streamError.message}`);
        controller.error(streamError);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
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
    let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${action}`;

    // 为流式请求添加alt=sse参数
    if (action === 'streamGenerateContent') {
      geminiUrl += '?alt=sse';
      console.log(`[${reqId}] 添加SSE参数用于流式响应`);
    }

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
      console.log(`[${reqId}] 开始处理SSE流式响应`);

      // 创建一个可读流来拦截和记录流式数据
      const reader = geminiResponse.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;

      const stream = new ReadableStream({
        start(controller) {
          function pump() {
            return reader.read().then(({ done, value }) => {
              if (done) {
                console.log(`[${reqId}] 流式响应完成，总共处理 ${chunkCount} 个数据块`);
                controller.close();
                return;
              }

              chunkCount++;
              const chunk = decoder.decode(value, { stream: true });
              console.log(`[${reqId}] 流式数据块 ${chunkCount}:`);
              console.log(`[${reqId}] 原始数据长度: ${chunk.length} 字符`);

              // 解析并美化显示SSE数据
              const lines = chunk.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('data: ')) {
                  const jsonData = line.substring(6); // 移除 "data: " 前缀
                  if (jsonData && jsonData !== '[DONE]') {
                    try {
                      const parsed = JSON.parse(jsonData);
                      console.log(`[${reqId}] SSE数据块 ${chunkCount} JSON内容:`);
                      console.log(JSON.stringify(parsed, null, 2));

                      // 提取关键信息
                      if (parsed.candidates && parsed.candidates[0]) {
                        const candidate = parsed.candidates[0];
                        if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                          const text = candidate.content.parts[0].text;
                          console.log(`[${reqId}] 生成文本: "${text}"`);
                        }
                        if (candidate.finishReason) {
                          console.log(`[${reqId}] 完成原因: ${candidate.finishReason}`);
                        }
                      }
                      if (parsed.usageMetadata) {
                        console.log(`[${reqId}] Token使用: prompt=${parsed.usageMetadata.promptTokenCount}, candidates=${parsed.usageMetadata.candidatesTokenCount}, total=${parsed.usageMetadata.totalTokenCount}`);
                      }
                    } catch (e) {
                      console.log(`[${reqId}] JSON解析失败: ${e.message}`);
                      console.log(`[${reqId}] 原始数据: ${jsonData}`);
                    }
                  }
                } else if (line) {
                  console.log(`[${reqId}] SSE其他行: ${line}`);
                }
              }

              controller.enqueue(value);
              return pump();
            });
          }
          return pump();
        }
      });

      console.log(`[${reqId}] 返回增强日志的SSE流式响应`);
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key'
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

