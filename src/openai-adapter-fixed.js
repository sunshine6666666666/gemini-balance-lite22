/**
 * OpenAI兼容适配器 - Edge Runtime优化版本
 * 专注于OpenAI到Gemini的格式转换，确保Edge Runtime兼容性
 */

// 导入工具函数 - 使用明确的导入语法
import * as utils from './utils.js';

/**
 * OpenAI兼容API主入口
 */
const openai = {
  async fetch(request) {
    const reqId = utils.generateRequestId();
    const startTime = Date.now();
    const url = new URL(request.url);
    
    try {
      utils.logRequestStart(reqId, request.method, url.pathname, 0);

      // 获取API Key
      const auth = request.headers.get("Authorization");
      const apiKey = auth?.split(" ")[1];
      if (!apiKey) {
        throw new Error('缺少API Key');
      }

      // 获取有效的API Key池
      const apiKeys = utils.getEffectiveApiKeys(apiKey, 'OpenAI模式: ');
      console.log(`🔑 [${reqId}] OpenAI模式获得${apiKeys.length}个有效API Key`);

      // 路由处理
      if (url.pathname.endsWith("/chat/completions")) {
        console.log(`💬 [${reqId}] 处理聊天完成请求`);
        const chatBody = await request.json();
        return await handleChatCompletions(chatBody, apiKeys, reqId);
      }

      if (url.pathname.endsWith("/models")) {
        console.log(`📋 [${reqId}] 处理模型列表请求`);
        return handleModels();
      }

      throw new Error(`不支持的端点: ${url.pathname}`);

    } catch (error) {
      utils.logError(reqId, error, 'OpenAI适配器');
      const totalTime = Date.now() - startTime;
      utils.logRequestEnd(reqId, 500, totalTime);
      
      return utils.addCorsHeaders(new Response(utils.safeJsonStringify({
        error: {
          message: error.message,
          type: "invalid_request_error"
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
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
  utils.logLLMRequest(reqId, targetUrl, model, isStreaming);

  // 发送请求到Gemini
  const response = await utils.enhancedFetch(
    targetUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: utils.safeJsonStringify(geminiRequest)
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
  
  return utils.addCorsHeaders(new Response(utils.safeJsonStringify(openaiResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
}

/**
 * 处理流式响应 - Gemini SSE到OpenAI SSE格式转换
 */
async function handleStreamingResponse(response, reqId) {
  console.log(`🌊 [${reqId}] 开始流式响应转换`);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const geminiData = JSON.parse(data);
                const openaiData = {
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

                controller.enqueue(encoder.encode(`data: ${utils.safeJsonStringify(openaiData)}\n\n`));
              } catch (e) {
                console.log(`⚠️ [${reqId}] 流式数据解析错误: ${e.message}`);
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ [${reqId}] 流式处理错误: ${error.message}`);
      } finally {
        controller.close();
      }
    }
  });

  return utils.addCorsHeaders(new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  }));
}

/**
 * 处理模型列表请求
 */
function handleModels() {
  const models = {
    object: "list",
    data: [
      { id: "gpt-3.5-turbo", object: "model", created: 1677610602, owned_by: "openai" },
      { id: "gpt-4", object: "model", created: 1687882411, owned_by: "openai" },
      { id: "gemini-2.5-flash", object: "model", created: 1687882411, owned_by: "google" },
      { id: "gemini-2.5-flash-lite", object: "model", created: 1687882411, owned_by: "google" },
      { id: "gemini-2.5-pro", object: "model", created: 1687882411, owned_by: "google" }
    ]
  };

  return utils.addCorsHeaders(new Response(utils.safeJsonStringify(models), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
}

/**
 * OpenAI模型名到Gemini模型名的映射
 */
function mapOpenAIModelToGemini(openaiModel) {
  const modelMap = {
    'gpt-3.5-turbo': 'gemini-2.5-flash',
    'gpt-4': 'gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'gemini-2.5-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro'
  };

  return modelMap[openaiModel] || 'gemini-2.5-flash';
}

export default openai;
