/**
 * OpenAI兼容适配器 - 纯粹的格式转换层
 * 专注于OpenAI到Gemini的格式转换，移除重复的验证和日志逻辑
 */

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
 * OpenAI兼容API主入口
 */
const openai = {
  async fetch(request) {
    const reqId = generateRequestId();
    const startTime = Date.now();
    const url = new URL(request.url);
    
    try {
      logRequestStart(reqId, request.method, url.pathname, 0);

      // 获取API Key
      const auth = request.headers.get("Authorization");
      const apiKey = auth?.split(" ")[1];
      if (!apiKey) {
        throw new Error('缺少API Key');
      }

      // 获取有效的API Key池 - 传递完整的API Key字符串
      const apiKeys = getEffectiveApiKeys(apiKey, 'OpenAI模式: ');
      console.log(`🔑 [${reqId}] OpenAI模式获得${apiKeys.length}个有效API Key`);

      // 路由处理
      switch (true) {
        case url.pathname.endsWith("/chat/completions"):
          console.log(`💬 [${reqId}] 处理聊天完成请求`);
          const chatBody = await request.json();
          return await handleChatCompletions(chatBody, apiKeys, reqId);

        case url.pathname.endsWith("/models"):
          console.log(`📋 [${reqId}] 处理模型列表请求`);
          return handleModels();

        case url.pathname.endsWith("/embeddings"):
          console.log(`🔤 [${reqId}] 处理文本嵌入请求`);
          const embedBody = await request.json();
          return await handleEmbeddings(embedBody, apiKeys[0], reqId);

        default:
          throw new Error(`不支持的OpenAI端点: ${url.pathname}`);
      }

    } catch (error) {
      logError(reqId, error, 'OpenAI适配器');
      return createErrorResponse(error, reqId);
    } finally {
      const totalTime = Date.now() - startTime;
      logRequestEnd(reqId, 200, totalTime);
    }
  }
};

/**
 * 处理聊天完成请求 - OpenAI到Gemini格式转换
 */
async function handleChatCompletions(openaiRequest, apiKeys, reqId) {
  console.log(`🔄 [${reqId}] 开始OpenAI到Gemini格式转换`);

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

  console.log(`📝 [${reqId}] 转换完成: ${geminiContents.length}条消息`);

  // 确定是否为流式请求
  const isStreaming = openaiRequest.stream === true;
  const endpoint = isStreaming ? 'streamGenerateContent' : 'generateContent';
  const model = mapOpenAIModelToGemini(openaiRequest.model);
  
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}`;
  logLLMRequest(reqId, targetUrl, model, isStreaming);

  // 发送请求到Gemini
  const response = await enhancedFetch(
    targetUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(geminiRequest)
    },
    apiKeys,
    reqId,
    'OpenAI->Gemini'
  );

  // 处理响应
  if (isStreaming) {
    return handleStreamingResponse(response, reqId);
  } else {
    return handleNormalResponse(response, reqId);
  }
}

/**
 * 处理普通响应 - Gemini到OpenAI格式转换
 */
async function handleNormalResponse(response, reqId) {
  const geminiResponse = await response.json();
  console.log(`🔄 [${reqId}] 开始Gemini到OpenAI格式转换`);

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

  console.log(`✅ [${reqId}] 格式转换完成`);

  const newResponse = new Response(safeJsonStringify(openaiResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  return addCorsHeaders(newResponse);
}

/**
 * 处理流式响应 - Gemini到OpenAI SSE格式转换
 */
async function handleStreamingResponse(response, reqId) {
  console.log(`🌊 [${reqId}] 开始流式响应转换`);

  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const geminiData = JSON.parse(data);
                const openaiChunk = convertGeminiToOpenAIChunk(geminiData, reqId);
                const sseData = `data: ${safeJsonStringify(openaiChunk)}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              } catch (e) {
                console.log(`⚠️ [${reqId}] 流数据解析失败: ${e.message}`);
              }
            }
          }
        }

        // 发送结束标记
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        logError(reqId, error, '流式转换');
        controller.error(error);
      } finally {
        controller.close();
      }
    }
  });

  const streamResponse = new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });

  return addCorsHeaders(streamResponse);
}

/**
 * 转换Gemini流数据块为OpenAI格式
 */
function convertGeminiToOpenAIChunk(geminiData, reqId) {
  return {
    id: `chatcmpl-${reqId}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-3.5-turbo",
    choices: [{
      index: 0,
      delta: {
        content: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""
      },
      finish_reason: null
    }]
  };
}

/**
 * 处理模型列表请求
 */
function handleModels() {
  const models = {
    object: "list",
    data: [
      {
        id: "gpt-3.5-turbo",
        object: "model",
        created: 1677610602,
        owned_by: "openai"
      },
      {
        id: "gpt-4",
        object: "model", 
        created: 1687882411,
        owned_by: "openai"
      }
    ]
  };

  const response = new Response(safeJsonStringify(models), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  return addCorsHeaders(response);
}

/**
 * 处理嵌入请求（简化版）
 */
async function handleEmbeddings(request, apiKey, reqId) {
  console.log(`🔤 [${reqId}] 嵌入功能暂不支持`);
  
  const response = {
    object: "list",
    data: [],
    model: "text-embedding-ada-002",
    usage: { prompt_tokens: 0, total_tokens: 0 }
  };

  const newResponse = new Response(safeJsonStringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  return addCorsHeaders(newResponse);
}

/**
 * OpenAI模型到Gemini模型映射
 */
function mapOpenAIModelToGemini(openaiModel) {
  const modelMap = {
    'gpt-3.5-turbo': 'gemini-2.5-flash',
    'gpt-4': 'gemini-2.5-pro',
    'gpt-4-turbo': 'gemini-2.5-pro'
  };
  
  return modelMap[openaiModel] || 'gemini-2.5-flash';
}

/**
 * 创建错误响应
 */
function createErrorResponse(error, reqId) {
  const errorResponse = {
    error: {
      message: error.message,
      type: "openai_adapter_error",
      request_id: reqId
    }
  };

  const response = new Response(safeJsonStringify(errorResponse), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });

  return addCorsHeaders(response);
}

export default openai;
