//Author: PublicAffairs
//Project: https://github.com/PublicAffairs/openai-gemini
//MIT License : https://github.com/PublicAffairs/openai-gemini/blob/main/LICENSE


import { Buffer } from "node:buffer";

/**
 * 安全模块：API Key白名单验证 - OpenAI模式专用
 * 只允许可信的API Key使用备用Key池，防止恶意用户盗用API配额
 *
 * @param {string} inputApiKey - 需要验证的API Key
 * @returns {boolean} 验证结果，true表示在白名单中，false表示不在白名单中或未配置白名单
 */
function validateTrustedApiKey(inputApiKey) {
  const trustedKeys = process.env.TRUSTED_API_KEYS;
  if (!trustedKeys) {
    console.log(`⚠️ OpenAI模式未配置TRUSTED_API_KEYS，禁用备用Key池功能`);
    return false;
  }

  const trustedKeyArray = trustedKeys.split(',').map(k => k.trim()).filter(k => k);
  const isValid = trustedKeyArray.includes(inputApiKey);

  if (isValid) {
    console.log(`✅ OpenAI模式API Key白名单验证通过: ${inputApiKey?.substring(0,8)}...`);
  } else {
    console.log(`🚫 OpenAI模式API Key不在白名单中，拒绝使用备用Key池: ${inputApiKey?.substring(0,8)}...`);
  }

  return isValid;
}

/**
 * 时间窗口轮询算法 - 负载均衡API Key选择（保持原有特色）
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

  console.log(`OpenAI Time-Window Load Balancer - Selected API Key index: ${index}/${apiKeys.length-1}, window offset: ${offsetInWindow}ms`);
  return apiKeys[index];
}

/**
 * OpenAI兼容API处理器 - 主要导出对象
 * 提供与OpenAI API兼容的接口，支持chat/completions、embeddings、models等端点
 */
export default {
  /**
   * 处理OpenAI格式的HTTP请求
   * 支持chat/completions、embeddings、models等端点，自动进行格式转换
   *
   * @param {Request} request - HTTP请求对象
   * @returns {Promise<Response>} HTTP响应对象，包含OpenAI格式的响应数据
   */
  async fetch (request) {
    // 📊 OpenAI模式详细请求日志记录
    const url = new URL(request.url);
    console.log(`\n🤖 ===== OpenAI模式详细请求信息开始 =====`);
    console.log(`📥 请求方法: ${request.method}`);
    console.log(`🌐 完整URL: ${request.url}`);
    console.log(`📍 路径: ${url.pathname}`);
    console.log(`🔗 查询参数: ${url.search || '无'}`);

    // 记录所有请求头
    console.log(`📋 请求头详情:`);
    for (const [key, value] of request.headers.entries()) {
      // 对敏感信息进行部分遮蔽
      if (key.toLowerCase().includes('authorization')) {
        const maskedValue = value.length > 16 ? `${value.substring(0, 16)}...${value.substring(value.length - 8)}` : value;
        console.log(`  ${key}: ${maskedValue}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    if (request.method === "OPTIONS") {
      console.log(`🔧 处理OPTIONS预检请求`);
      console.log(`🤖 ===== OpenAI模式详细请求信息结束 =====\n`);
      return handleOPTIONS();
    }
    const errHandler = (err) => {
      console.error(err);
      return new Response(err.message, fixCors({ status: err.status ?? 500 }));
    };
    try {
      const auth = request.headers.get("Authorization");
      let apiKey = auth?.split(" ")[1];
      let apiKeys = [];

      if (apiKey && apiKey.includes(',')) {
        // 解析多个API Key（逗号分隔）
        apiKeys = apiKey.split(',').map(k => k.trim()).filter(k => k);
        console.log(`OpenAI发现多个API Key: ${apiKeys.length}个`);
      } else if (apiKey) {
        // 单个API Key也放入数组
        apiKeys = [apiKey];
        console.log(`OpenAI发现单个API Key: 1个`);
      }
      const assert = (success) => {
        if (!success) {
          throw new HttpError("The specified HTTP method is not allowed for the requested resource", 400);
        }
      };
      const { pathname } = new URL(request.url);

      // 记录请求体（如果有）
      let requestBody = null;
      if (request.method === "POST") {
        try {
          const requestClone = request.clone();
          requestBody = await requestClone.json();
          console.log(`📦 请求体内容:`);
          console.log(JSON.stringify(requestBody, null, 2));
        } catch (e) {
          console.log(`📦 请求体: 无法解析JSON`);
        }
      } else {
        console.log(`📦 请求体: 无 (GET请求)`);
      }
      console.log(`🤖 ===== OpenAI模式详细请求信息结束 =====\n`);

      switch (true) {
        case pathname.endsWith("/chat/completions"):
          console.log(`🗨️ 处理聊天完成请求`);
          assert(request.method === "POST");
          return handleCompletions(requestBody || await request.json(), apiKeys)
            .catch(errHandler);
        case pathname.endsWith("/embeddings"):
          console.log(`🔤 处理文本嵌入请求`);
          assert(request.method === "POST");
          return handleEmbeddings(requestBody || await request.json(), apiKeys.length > 0 ? apiKeys[0] : apiKey)
            .catch(errHandler);
        case pathname.endsWith("/models"):
          console.log(`📋 处理模型列表请求`);
          assert(request.method === "GET");
          return handleModels(apiKeys.length > 0 ? apiKeys[0] : apiKey)
            .catch(errHandler);
        default:
          console.log(`❌ 未知的OpenAI端点: ${pathname}`);
          throw new HttpError("404 Not Found", 404);
      }
    } catch (err) {
      return errHandler(err);
    }
  }
};

/**
 * HTTP错误类 - 用于处理API请求中的错误情况
 * 继承自Error类，添加了HTTP状态码支持
 */
class HttpError extends Error {
  /**
   * 创建HTTP错误实例
   *
   * @param {string} message - 错误消息
   * @param {number} status - HTTP状态码
   */
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

/**
 * 修复CORS响应头
 * 为响应添加必要的CORS头，允许跨域访问
 *
 * @param {Object} response - 响应对象，包含headers、status、statusText
 * @returns {Object} 修复后的响应对象，添加了CORS头
 */
const fixCors = ({ headers, status, statusText }) => {
  headers = new Headers(headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return { headers, status, statusText };
};

/**
 * 处理OPTIONS预检请求
 * 返回允许所有跨域请求的CORS头
 *
 * @returns {Promise<Response>} 包含CORS头的空响应
 */
const handleOPTIONS = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    }
  });
};

const BASE_URL = "https://generativelanguage.googleapis.com";
const API_VERSION = "v1beta";

// https://github.com/google-gemini/generative-ai-js/blob/cf223ff4a1ee5a2d944c53cddb8976136382bee6/src/requests/request.ts#L71
const API_CLIENT = "genai-js/0.21.0"; // npm view @google/generative-ai version
/**
 * 创建Gemini API请求头
 * 生成包含API Key和客户端信息的标准请求头
 *
 * @param {string} apiKey - Gemini API Key
 * @param {Object} more - 额外的请求头
 * @returns {Object} 完整的请求头对象
 */
const makeHeaders = (apiKey, more) => ({
  "x-goog-api-client": API_CLIENT,
  ...(apiKey && { "x-goog-api-key": apiKey }),
  ...more
});

/**
 * 处理模型列表请求
 * 获取可用的Gemini模型列表并转换为OpenAI格式
 *
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<Response>} 包含模型列表的响应，OpenAI格式
 */
async function handleModels (apiKey) {
  console.log(`\n🔄 ===== 发送Gemini API请求 =====`);
  const requestUrl = `${BASE_URL}/${API_VERSION}/models`;
  console.log(`🎯 请求URL: ${requestUrl}`);
  console.log(`🔑 使用API Key: ${apiKey?.substring(0, 8)}...${apiKey?.substring(apiKey.length - 8)}`);

  const response = await fetch(requestUrl, {
    headers: makeHeaders(apiKey),
  });

  console.log(`📊 Gemini响应状态: ${response.status} ${response.statusText}`);
  console.log(`📋 Gemini响应头:`);
  for (const [key, value] of response.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  let { body } = response;
  if (response.ok) {
    const responseText = await response.text();
    console.log(`📦 Gemini原始响应:`);
    console.log(responseText);

    const { models } = JSON.parse(responseText);
    const transformedBody = {
      object: "list",
      data: models.map(({ name }) => ({
        id: name.replace("models/", ""),
        object: "model",
        created: 0,
        owned_by: "",
      })),
    };
    body = JSON.stringify(transformedBody, null, "  ");

    console.log(`📦 转换后的OpenAI格式响应:`);
    console.log(body);
  } else {
    console.log(`❌ Gemini API请求失败`);
  }
  console.log(`🔄 ===== Gemini API请求结束 =====\n`);

  return new Response(body, fixCors(response));
}

const DEFAULT_EMBEDDINGS_MODEL = "text-embedding-004";
/**
 * 处理文本嵌入请求
 * 将OpenAI格式的嵌入请求转换为Gemini格式并处理
 *
 * @param {Object} req - OpenAI格式的嵌入请求对象
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<Response>} 包含嵌入向量的响应，OpenAI格式
 * @throws {HttpError} 当模型未指定或请求格式错误时抛出
 */
async function handleEmbeddings (req, apiKey) {
  console.log(`\n🔤 ===== 处理文本嵌入请求 =====`);
  console.log(`📋 原始请求参数:`);
  console.log(JSON.stringify(req, null, 2));

  if (typeof req.model !== "string") {
    throw new HttpError("model is not specified", 400);
  }
  let model;
  if (req.model.startsWith("models/")) {
    model = req.model;
  } else {
    if (!req.model.startsWith("gemini-")) {
      req.model = DEFAULT_EMBEDDINGS_MODEL;
    }
    model = "models/" + req.model;
  }
  console.log(`🤖 使用模型: ${model}`);

  if (!Array.isArray(req.input)) {
    req.input = [ req.input ];
  }
  console.log(`📝 输入文本数量: ${req.input.length}`);

  const requestBody = {
    "requests": req.input.map(text => ({
      model,
      content: { parts: { text } },
      outputDimensionality: req.dimensions,
    }))
  };

  console.log(`\n🔄 ===== 发送Gemini嵌入API请求 =====`);
  const requestUrl = `${BASE_URL}/${API_VERSION}/${model}:batchEmbedContents`;
  console.log(`🎯 请求URL: ${requestUrl}`);
  console.log(`🔑 使用API Key: ${apiKey?.substring(0, 8)}...${apiKey?.substring(apiKey.length - 8)}`);
  console.log(`📦 请求体:`);
  console.log(JSON.stringify(requestBody, null, 2));

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: makeHeaders(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify(requestBody)
  });

  console.log(`📊 Gemini响应状态: ${response.status} ${response.statusText}`);

  let { body } = response;
  if (response.ok) {
    const responseText = await response.text();
    console.log(`📦 Gemini原始响应:`);
    console.log(responseText);

    const { embeddings } = JSON.parse(responseText);
    const transformedBody = {
      object: "list",
      data: embeddings.map(({ values }, index) => ({
        object: "embedding",
        index,
        embedding: values,
      })),
      model: req.model,
    };
    body = JSON.stringify(transformedBody, null, "  ");

    console.log(`📦 转换后的OpenAI格式响应:`);
    console.log(body);
  } else {
    console.log(`❌ Gemini嵌入API请求失败`);
  }
  console.log(`🔄 ===== Gemini嵌入API请求结束 =====\n`);

  return new Response(body, fixCors(response));
}

/**
 * 增强的fetch函数 - OpenAI模式专用，在保持轮询机制基础上添加超时和故障切换
 * 优化策略：45秒超时，遇到任何错误立即换Key，零延迟切换提升响应速度
 *
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项，包含method、headers、body等
 * @param {Array<string>} apiKeys - API Key数组，用于负载均衡和故障切换
 * @returns {Promise<Response>} 响应对象，成功时返回有效响应，失败时抛出错误
 * @throws {Error} 当所有API Key都尝试失败时抛出错误
 */
async function enhancedFetch(url, options, apiKeys) {
  const maxRetries = apiKeys.length; // 每个Key给一次机会
  const timeout = 45000; // 45秒超时

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      // 使用原有的时间窗口轮询算法选择API Key
      const selectedKey = selectApiKeyBalanced(apiKeys);

      // 更新请求头中的API Key
      const headers = new Headers(options.headers);
      headers.set('x-goog-api-key', selectedKey);

      console.log(`🚀 OpenAI尝试 ${attempt}/${maxRetries} - 轮询选择Key: ${selectedKey.substring(0, 8)}...${selectedKey.substring(selectedKey.length - 8)}`);
      console.log(`📋 请求头详情:`);
      for (const [key, value] of headers.entries()) {
        if (key.toLowerCase().includes('key')) {
          console.log(`  ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 8)}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`⏰ OpenAI请求超时 (${timeout}ms) - Key: ${selectedKey.substring(0, 8)}...`);
      }, timeout);

      // 发送请求
      const response = await fetch(url, {
        ...options,
        headers: headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
      console.log(`📋 响应头:`);
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      if (response.ok) {
        console.log(`✅ OpenAI请求成功 - 耗时: ${duration}ms, 状态: ${response.status}, Key: ${selectedKey.substring(0, 8)}...`);
        return response;
      } else {
        console.log(`❌ OpenAI响应错误 - 状态: ${response.status}, 耗时: ${duration}ms, Key: ${selectedKey.substring(0, 8)}...`);
        // 尝试读取错误响应体
        try {
          const errorText = await response.text();
          console.log(`📦 错误响应体:`);
          console.log(errorText);
        } catch (e) {
          console.log(`📦 无法读取错误响应体`);
        }
        // 不返回错误响应，继续尝试下一个Key
        console.log(`🔄 OpenAI遇到错误，立即轮询到下一个Key`);
        // 继续循环，不return
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ OpenAI请求异常 - 耗时: ${duration}ms, 错误: ${error.message}`);

      // 最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }

      // 任何异常都立即轮询到下一个Key
      console.log(`🔄 OpenAI网络异常，立即轮询到下一个Key`);
    }

    // 移除延迟，立即切换到下一个Key
  }
}

const DEFAULT_MODEL = "gemini-2.5-flash";
/**
 * 处理聊天完成请求 - OpenAI格式转Gemini格式
 * 支持流式和非流式响应，包含智能负载均衡和白名单验证
 *
 * @param {Object} req - OpenAI格式的聊天完成请求对象
 * @param {Array<string>} apiKeys - API Key数组，用于负载均衡
 * @returns {Promise<Response>} 包含聊天完成结果的响应，OpenAI格式
 * @throws {HttpError} 当请求格式错误或API Key验证失败时抛出
 */
async function handleCompletions (req, apiKeys) {
  // 🎯 智能API Key管理：单Key时启用备用Key池（需要白名单验证）
  if (apiKeys.length <= 1) {
    const inputApiKey = apiKeys[0];

    // 🛡️ 白名单验证：只有可信Key才能使用备用Key池
    if (!validateTrustedApiKey(inputApiKey)) {
      console.log(`🚫 OpenAI模式API Key未通过白名单验证，拒绝请求: ${inputApiKey?.substring(0,8)}...`);
      return new Response(
        JSON.stringify({
          error: {
            message: 'API Key not in trusted whitelist. Access denied.',
            type: 'authentication_error',
            code: 'untrusted_api_key'
          }
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 白名单验证通过，启用备用Key池
    const backupKeys = process.env.BACKUP_API_KEYS;
    if (backupKeys) {
      const backupKeyArray = backupKeys.split(',').map(k => k.trim()).filter(k => k);
      console.log(`🔧 OpenAI模式白名单验证通过，启用备用Key池 (${backupKeyArray.length}个)`);
      apiKeys = backupKeyArray;
    } else {
      console.log(`⚠️ OpenAI模式白名单验证通过但未配置备用Key池，继续使用单Key`);
    }
  } else {
    console.log(`✅ OpenAI模式使用传入的多个API Key (${apiKeys.length}个)`);
  }

  let model = DEFAULT_MODEL;
  switch (true) {
    case typeof req.model !== "string":
      break;
    case req.model.startsWith("models/"):
      model = req.model.substring(7);
      break;
    case req.model.startsWith("gemini-"):
    case req.model.startsWith("gemma-"):
    case req.model.startsWith("learnlm-"):
      model = req.model;
  }
  let body = await transformRequest(req);
  const extra = req.extra_body?.google
  if (extra) {
    if (extra.safety_settings) {
      body.safetySettings = extra.safety_settings;
    }
    if (extra.cached_content) {
      body.cachedContent = extra.cached_content;
    }
    if (extra.thinking_config) {
      body.generationConfig.thinkingConfig = extra.thinking_config;
    }
  }
  switch (true) {
    case model.endsWith(":search"):
      model = model.substring(0, model.length - 7);
      // eslint-disable-next-line no-fallthrough
    case req.model.endsWith("-search-preview"):
    case req.tools?.some(tool => tool.function?.name === 'googleSearch'):
      body.tools = body.tools || [];
      body.tools.push({googleSearch: {}});
  }
  console.log(body.tools)
  const TASK = req.stream ? "streamGenerateContent" : "generateContent";
  let url = `${BASE_URL}/${API_VERSION}/models/${model}:${TASK}`;
  if (req.stream) { url += "?alt=sse"; }

  console.log(`\n🔄 ===== 发送Gemini聊天API请求 =====`);
  console.log(`🎯 请求URL: ${url}`);
  console.log(`🔑 可用API Key数量: ${apiKeys.length}`);
  console.log(`📦 发送给Gemini的请求体:`);
  console.log(JSON.stringify(body, null, 2));

  // 使用增强的fetch函数，支持超时和重试
  const response = await enhancedFetch(url, {
    method: "POST",
    headers: makeHeaders(apiKeys[0], { "Content-Type": "application/json" }), // 临时使用第一个key，会被enhancedFetch替换
    body: JSON.stringify(body),
  }, apiKeys);

  console.log(`📊 Gemini聊天API响应状态: ${response.status} ${response.statusText}`);
  console.log(`📋 Gemini响应头:`);
  for (const [key, value] of response.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  body = response.body;
  if (response.ok) {
    let id = "chatcmpl-" + generateId(); //"chatcmpl-8pMMaqXMK68B3nyDBrapTDrhkHBQK";
    const shared = {};
    if (req.stream) {
      console.log(`🌊 处理流式响应`);
      body = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TransformStream({
          transform: parseStream,
          flush: parseStreamFlush,
          buffer: "",
          shared,
        }))
        .pipeThrough(new TransformStream({
          transform: toOpenAiStream,
          flush: toOpenAiStreamFlush,
          streamIncludeUsage: req.stream_options?.include_usage,
          model, id, last: [],
          shared,
        }))
        .pipeThrough(new TextEncoderStream());
    } else {
      console.log(`📄 处理非流式响应`);
      body = await response.text();
      console.log(`📦 Gemini原始响应:`);
      console.log(body);

      try {
        const parsedBody = JSON.parse(body);
        if (!parsedBody.candidates) {
          throw new Error("Invalid completion object");
        }
        const transformedResponse = processCompletionsResponse(parsedBody, model, id);
        console.log(`📦 转换后的OpenAI格式响应:`);
        console.log(transformedResponse);
        body = transformedResponse;
      } catch (err) {
        console.error("Error parsing response:", err);
        console.log(`❌ 响应解析失败，返回原始响应`);
        return new Response(body, fixCors(response)); // output as is
      }
    }
    console.log(`🔄 ===== Gemini聊天API请求结束 =====\n`);
  }
  return new Response(body, fixCors(response));
}

/**
 * 调整JSON Schema属性
 * 递归处理schema对象，移除不兼容的属性
 *
 * @param {any} schemaPart - JSON Schema的一部分
 */
const adjustProps = (schemaPart) => {
  if (typeof schemaPart !== "object" || schemaPart === null) {
    return;
  }
  if (Array.isArray(schemaPart)) {
    schemaPart.forEach(adjustProps);
  } else {
    if (schemaPart.type === "object" && schemaPart.properties && schemaPart.additionalProperties === false) {
      delete schemaPart.additionalProperties;
    }
    Object.values(schemaPart).forEach(adjustProps);
  }
};
/**
 * 调整JSON Schema以兼容Gemini API
 * 移除strict属性并调整其他不兼容的属性
 *
 * @param {Object} schema - JSON Schema对象
 * @returns {any} 调整后的schema
 */
const adjustSchema = (schema) => {
  const obj = schema[schema.type];
  delete obj.strict;
  return adjustProps(schema);
};

const harmCategory = [
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_CIVIC_INTEGRITY",
];
const safetySettings = harmCategory.map(category => ({
  category,
  threshold: "BLOCK_NONE",
}));
const fieldsMap = {
  frequency_penalty: "frequencyPenalty",
  max_completion_tokens: "maxOutputTokens",
  max_tokens: "maxOutputTokens",
  n: "candidateCount", // not for streaming
  presence_penalty: "presencePenalty",
  seed: "seed",
  stop: "stopSequences",
  temperature: "temperature",
  top_k: "topK", // non-standard
  top_p: "topP",
};
const thinkingBudgetMap = {
  low: 1024,
  medium: 8192,
  high: 24576,
};
/**
 * 转换OpenAI请求配置为Gemini格式
 * 将OpenAI的参数名映射为Gemini API的参数名
 *
 * @param {Object} req - OpenAI格式的请求对象
 * @returns {Object} Gemini格式的配置对象
 * @throws {HttpError} 当response_format.type不支持时抛出
 */
const transformConfig = (req) => {
  let cfg = {};
  //if (typeof req.stop === "string") { req.stop = [req.stop]; } // no need
  for (let key in req) {
    const matchedKey = fieldsMap[key];
    if (matchedKey) {
      cfg[matchedKey] = req[key];
    }
  }
  if (req.response_format) {
    switch (req.response_format.type) {
      case "json_schema":
        adjustSchema(req.response_format);
        cfg.responseSchema = req.response_format.json_schema?.schema;
        if (cfg.responseSchema && "enum" in cfg.responseSchema) {
          cfg.responseMimeType = "text/x.enum";
          break;
        }
        // eslint-disable-next-line no-fallthrough
      case "json_object":
        cfg.responseMimeType = "application/json";
        break;
      case "text":
        cfg.responseMimeType = "text/plain";
        break;
      default:
        throw new HttpError("Unsupported response_format.type", 400);
    }
  }
  if (req.reasoning_effort) {
    cfg.thinkingConfig = { thinkingBudget: thinkingBudgetMap[req.reasoning_effort] };
  }
  return cfg;
};

/**
 * 解析图片URL或Data URL
 * 支持HTTP/HTTPS URL和base64 data URL格式
 *
 * @param {string} url - 图片URL或Data URL
 * @returns {Promise<Object>} 包含mimeType和base64数据的对象
 * @throws {Error} 当图片获取失败时抛出
 * @throws {HttpError} 当图片数据格式无效时抛出
 */
const parseImg = async (url) => {
  let mimeType, data;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} (${url})`);
      }
      mimeType = response.headers.get("content-type");
      data = Buffer.from(await response.arrayBuffer()).toString("base64");
    } catch (err) {
      throw new Error("Error fetching image: " + err.toString());
    }
  } else {
    const match = url.match(/^data:(?<mimeType>.*?)(;base64)?,(?<data>.*)$/);
    if (!match) {
      throw new HttpError("Invalid image data: " + url, 400);
    }
    ({ mimeType, data } = match.groups);
  }
  return {
    inlineData: {
      mimeType,
      data,
    },
  };
};

const transformFnResponse = ({ content, tool_call_id }, parts) => {
  if (!parts.calls) {
    throw new HttpError("No function calls found in the previous message", 400);
  }
  let response;
  try {
    response = JSON.parse(content);
  } catch (err) {
    console.error("Error parsing function response content:", err);
    throw new HttpError("Invalid function response: " + content, 400);
  }
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    response = { result: response };
  }
  if (!tool_call_id) {
    throw new HttpError("tool_call_id not specified", 400);
  }
  const { i, name } = parts.calls[tool_call_id] ?? {};
  if (!name) {
    throw new HttpError("Unknown tool_call_id: " + tool_call_id, 400);
  }
  if (parts[i]) {
    throw new HttpError("Duplicated tool_call_id: " + tool_call_id, 400);
  }
  parts[i] = {
    functionResponse: {
      id: tool_call_id.startsWith("call_") ? null : tool_call_id,
      name,
      response,
    }
  };
};

const transformFnCalls = ({ tool_calls }) => {
  const calls = {};
  const parts = tool_calls.map(({ function: { arguments: argstr, name }, id, type }, i) => {
    if (type !== "function") {
      throw new HttpError(`Unsupported tool_call type: "${type}"`, 400);
    }
    let args;
    try {
      args = JSON.parse(argstr);
    } catch (err) {
      console.error("Error parsing function arguments:", err);
      throw new HttpError("Invalid function arguments: " + argstr, 400);
    }
    calls[id] = {i, name};
    return {
      functionCall: {
        id: id.startsWith("call_") ? null : id,
        name,
        args,
      }
    };
  });
  parts.calls = calls;
  return parts;
};

const transformMsg = async ({ content }) => {
  const parts = [];
  if (!Array.isArray(content)) {
    // system, user: string
    // assistant: string or null (Required unless tool_calls is specified.)
    parts.push({ text: content });
    return parts;
  }
  // user:
  // An array of content parts with a defined type.
  // Supported options differ based on the model being used to generate the response.
  // Can contain text, image, or audio inputs.
  for (const item of content) {
    switch (item.type) {
      case "text":
        parts.push({ text: item.text });
        break;
      case "image_url":
        parts.push(await parseImg(item.image_url.url));
        break;
      case "input_audio":
        parts.push({
          inlineData: {
            mimeType: "audio/" + item.input_audio.format,
            data: item.input_audio.data,
          }
        });
        break;
      default:
        throw new HttpError(`Unknown "content" item type: "${item.type}"`, 400);
    }
  }
  if (content.every(item => item.type === "image_url")) {
    parts.push({ text: "" }); // to avoid "Unable to submit request because it must have a text parameter"
  }
  return parts;
};

const transformMessages = async (messages) => {
  if (!messages) { return; }
  const contents = [];
  let system_instruction;
  for (const item of messages) {
    switch (item.role) {
      case "system":
        system_instruction = { parts: await transformMsg(item) };
        continue;
      case "tool":
        // eslint-disable-next-line no-case-declarations
        let { role, parts } = contents[contents.length - 1] ?? {};
        if (role !== "function") {
          const calls = parts?.calls;
          parts = []; parts.calls = calls;
          contents.push({
            role: "function", // ignored
            parts
          });
        }
        transformFnResponse(item, parts);
        continue;
      case "assistant":
        item.role = "model";
        break;
      case "user":
        break;
      default:
        throw new HttpError(`Unknown message role: "${item.role}"`, 400);
    }
    contents.push({
      role: item.role,
      parts: item.tool_calls ? transformFnCalls(item) : await transformMsg(item)
    });
  }
  if (system_instruction) {
    if (!contents[0]?.parts.some(part => part.text)) {
      contents.unshift({ role: "user", parts: { text: " " } });
    }
  }
  //console.info(JSON.stringify(contents, 2));
  return { system_instruction, contents };
};

const transformTools = (req) => {
  let tools, tool_config;
  if (req.tools) {
    const funcs = req.tools.filter(tool => tool.type === "function" && tool.function?.name !== 'googleSearch');
    if (funcs.length > 0) {
      funcs.forEach(adjustSchema);
      tools = [{ function_declarations: funcs.map(schema => schema.function) }];
    }
  }
  if (req.tool_choice) {
    const allowed_function_names = req.tool_choice?.type === "function" ? [ req.tool_choice?.function?.name ] : undefined;
    if (allowed_function_names || typeof req.tool_choice === "string") {
      tool_config = {
        function_calling_config: {
          mode: allowed_function_names ? "ANY" : req.tool_choice.toUpperCase(),
          allowed_function_names
        }
      };
    }
  }
  return { tools, tool_config };
};

/**
 * 转换OpenAI请求为Gemini格式
 * 整合消息、安全设置、生成配置和工具配置
 *
 * @param {Object} req - OpenAI格式的请求对象
 * @returns {Promise<Object>} Gemini格式的完整请求对象
 */
const transformRequest = async (req) => ({
  ...await transformMessages(req.messages),
  safetySettings,
  generationConfig: transformConfig(req),
  ...transformTools(req),
});

/**
 * 生成随机ID
 * 生成29位长度的随机字符串，用于聊天完成ID
 *
 * @returns {string} 29位随机字符串
 */
const generateId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
  return Array.from({ length: 29 }, randomChar).join("");
};

const reasonsMap = { //https://ai.google.dev/api/rest/v1/GenerateContentResponse#finishreason
  //"FINISH_REASON_UNSPECIFIED": // Default value. This value is unused.
  "STOP": "stop",
  "MAX_TOKENS": "length",
  "SAFETY": "content_filter",
  "RECITATION": "content_filter",
  //"OTHER": "OTHER",
};
const SEP = "\n\n|>";
const transformCandidates = (key, cand) => {
  const message = { role: "assistant", content: [] };
  for (const part of cand.content?.parts ?? []) {
    if (part.functionCall) {
      const fc = part.functionCall;
      message.tool_calls = message.tool_calls ?? [];
      message.tool_calls.push({
        id: fc.id ?? "call_" + generateId(),
        type: "function",
        function: {
          name: fc.name,
          arguments: JSON.stringify(fc.args),
        }
      });
    } else {
      message.content.push(part.text);
    }
  }
  message.content = message.content.join(SEP) || null;
  return {
    index: cand.index || 0, // 0-index is absent in new -002 models response
    [key]: message,
    logprobs: null,
    finish_reason: message.tool_calls ? "tool_calls" : reasonsMap[cand.finishReason] || cand.finishReason,
    //original_finish_reason: cand.finishReason,
  };
};
const transformCandidatesMessage = transformCandidates.bind(null, "message");
const transformCandidatesDelta = transformCandidates.bind(null, "delta");

const transformUsage = (data) => ({
  completion_tokens: data.candidatesTokenCount,
  prompt_tokens: data.promptTokenCount,
  total_tokens: data.totalTokenCount
});

const checkPromptBlock = (choices, promptFeedback, key) => {
  if (choices.length) { return; }
  if (promptFeedback?.blockReason) {
    console.log("Prompt block reason:", promptFeedback.blockReason);
    if (promptFeedback.blockReason === "SAFETY") {
      promptFeedback.safetyRatings
        .filter(r => r.blocked)
        .forEach(r => console.log(r));
    }
    choices.push({
      index: 0,
      [key]: null,
      finish_reason: "content_filter",
      //original_finish_reason: data.promptFeedback.blockReason,
    });
  }
  return true;
};

const processCompletionsResponse = (data, model, id) => {
  const obj = {
    id,
    choices: data.candidates.map(transformCandidatesMessage),
    created: Math.floor(Date.now()/1000),
    model: data.modelVersion ?? model,
    //system_fingerprint: "fp_69829325d0",
    object: "chat.completion",
    usage: data.usageMetadata && transformUsage(data.usageMetadata),
  };
  if (obj.choices.length === 0 ) {
    checkPromptBlock(obj.choices, data.promptFeedback, "message");
  }
  return JSON.stringify(obj);
};

const responseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
/**
 * 解析流式响应数据
 * 从缓冲区中提取完整的数据行，用于TransformStream
 *
 * @param {string} chunk - 接收到的数据块
 * @param {TransformStreamDefaultController} controller - 流控制器
 */
function parseStream (chunk, controller) {
  this.buffer += chunk;
  do {
    const match = this.buffer.match(responseLineRE);
    if (!match) { break; }
    controller.enqueue(match[1]);
    this.buffer = this.buffer.substring(match[0].length);
  } while (true); // eslint-disable-line no-constant-condition
}
/**
 * 流解析完成时的清理函数
 * 处理缓冲区中剩余的数据，用于TransformStream的flush阶段
 *
 * @param {TransformStreamDefaultController} controller - 流控制器
 */
function parseStreamFlush (controller) {
  if (this.buffer) {
    console.error("Invalid data:", this.buffer);
    controller.enqueue(this.buffer);
    this.shared.is_buffers_rest = true;
  }
}

const delimiter = "\n\n";
/**
 * 生成Server-Sent Events格式的数据行
 * 添加时间戳并格式化为SSE格式
 *
 * @param {Object} obj - 要发送的数据对象
 * @returns {string} SSE格式的数据行
 */
const sseline = (obj) => {
  obj.created = Math.floor(Date.now()/1000);
  return "data: " + JSON.stringify(obj) + delimiter;
};
/**
 * 将Gemini流式响应转换为OpenAI格式
 * 处理每一行Gemini响应数据，转换为OpenAI兼容的流式格式
 *
 * @param {string} line - Gemini响应的一行数据
 * @param {TransformStreamDefaultController} controller - 流控制器
 */
function toOpenAiStream (line, controller) {
  let data;
  try {
    data = JSON.parse(line);
    if (!data.candidates) {
      throw new Error("Invalid completion chunk object");
    }
  } catch (err) {
    console.error("Error parsing response:", err);
    if (!this.shared.is_buffers_rest) { line =+ delimiter; }
    controller.enqueue(line); // output as is
    return;
  }
  const obj = {
    id: this.id,
    choices: data.candidates.map(transformCandidatesDelta),
    //created: Math.floor(Date.now()/1000),
    model: data.modelVersion ?? this.model,
    //system_fingerprint: "fp_69829325d0",
    object: "chat.completion.chunk",
    usage: data.usageMetadata && this.streamIncludeUsage ? null : undefined,
  };
  if (checkPromptBlock(obj.choices, data.promptFeedback, "delta")) {
    controller.enqueue(sseline(obj));
    return;
  }
  console.assert(data.candidates.length === 1, "Unexpected candidates count: %d", data.candidates.length);
  const cand = obj.choices[0];
  cand.index = cand.index || 0; // absent in new -002 models response
  const finish_reason = cand.finish_reason;
  cand.finish_reason = null;
  if (!this.last[cand.index]) { // first
    controller.enqueue(sseline({
      ...obj,
      choices: [{ ...cand, tool_calls: undefined, delta: { role: "assistant", content: "" } }],
    }));
  }
  delete cand.delta.role;
  if ("content" in cand.delta) { // prevent empty data (e.g. when MAX_TOKENS)
    controller.enqueue(sseline(obj));
  }
  cand.finish_reason = finish_reason;
  if (data.usageMetadata && this.streamIncludeUsage) {
    obj.usage = transformUsage(data.usageMetadata);
  }
  cand.delta = {};
  this.last[cand.index] = obj;
}
/**
 * OpenAI流转换完成时的清理函数
 * 发送最后的数据块并结束流，用于TransformStream的flush阶段
 *
 * @param {TransformStreamDefaultController} controller - 流控制器
 */
function toOpenAiStreamFlush (controller) {
  if (this.last.length > 0) {
    for (const obj of this.last) {
      controller.enqueue(sseline(obj));
    }
    controller.enqueue("data: [DONE]" + delimiter);
  }
}
