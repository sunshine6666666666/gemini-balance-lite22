/**
 * @功能概述: OpenAI兼容API处理器，提供与OpenAI API兼容的接口
 * @运行时: Edge Runtime (Web标准API)
 * @请求处理: 支持chat/completions、embeddings、models等端点
 * @响应格式: OpenAI格式响应，自动进行Gemini到OpenAI的格式转换
 * @性能特征: 45秒超时，支持流式和非流式响应
 * @作者信息: 基于PublicAffairs的openai-gemini项目改进
 * @许可证: MIT License
 */

// import { Buffer } from "node:buffer"; // Edge Runtime不支持Node.js Buffer

// 导入重构后的核心模块
import { enhancedFetch } from './core/api-client.js';
import { validateTrustedApiKey } from './core/security.js';
import { logRequest, logError, logWarning } from './middleware/logger.js';
import { GEMINI_API, MODEL_CONFIG, OPENAI_ENDPOINTS } from './config/index.js';
import { safeJsonStringify } from './utils/index.js';

/**
 * @功能概述: OpenAI兼容API处理器主要导出对象
 * @支持端点: chat/completions、embeddings、models、audio/speech等
 * @格式转换: 自动进行OpenAI到Gemini格式转换
 * @负载均衡: 支持多API Key负载均衡和故障切换
 */
export default {
    /**
     * @功能概述: 处理OpenAI格式的HTTP请求
     * @param {Request} request - HTTP请求对象
     * @returns {Promise<Response>} HTTP响应对象，包含OpenAI格式的响应数据
     * @执行流程:
     *   1. 解析请求URL和头部信息
     *   2. 处理OPTIONS预检请求
     *   3. 提取和验证API Key
     *   4. 路由到相应的处理函数
     *   5. 返回格式化的响应
     */
    async fetch(request) {
        const reqId = Date.now().toString();
        const startTime = Date.now();

        const url = new URL(request.url);

        // 处理OPTIONS预检请求
        if (request.method === "OPTIONS") {
            return handleOPTIONS();
        }

        const errHandler = (err) => {
            logError(reqId, 'OpenAI请求处理', err);
            return new Response(err.message, fixCors({ status: err.status ?? 500 }));
        };

        try {
            // 提取API Key
            const auth = request.headers.get("Authorization");
            let apiKey = auth?.split(" ")[1];
            let apiKeys = [];

            if (apiKey && apiKey.includes(',')) {
                apiKeys = apiKey.split(',').map(k => k.trim()).filter(k => k);
            } else if (apiKey) {
                apiKeys = [apiKey];
            }

            // 验证API Key
            if (apiKeys.length === 0) {
                throw new HttpError("Missing API Key", 401);
            }

            const assert = (success) => {
                if (!success) {
                    throw new HttpError("The specified HTTP method is not allowed for the requested resource", 400);
                }
            };

            const { pathname } = url;

            // 解析请求体
            let requestBody = null;
            if (request.method === "POST") {
                try {
                    const requestClone = request.clone();
                    requestBody = await requestClone.json();
                } catch (e) {
                    logWarning(reqId, '请求体解析', '请求体JSON解析失败');
                }
            }

            // 路由到相应的处理函数
            switch (true) {
                case pathname.endsWith(OPENAI_ENDPOINTS.CHAT_COMPLETIONS):
                    assert(request.method === "POST");
                    return handleCompletions(requestBody || await request.json(), apiKeys, reqId)
                        .catch(errHandler);

                case pathname.endsWith(OPENAI_ENDPOINTS.EMBEDDINGS):
                    assert(request.method === "POST");
                    return handleEmbeddings(requestBody || await request.json(), apiKeys.length > 0 ? apiKeys[0] : apiKey)
                        .catch(errHandler);

                case pathname.endsWith(OPENAI_ENDPOINTS.MODELS):
                    assert(request.method === "GET");
                    return handleModels(apiKeys.length > 0 ? apiKeys[0] : apiKey)
                        .catch(errHandler);

                case pathname.endsWith(OPENAI_ENDPOINTS.AUDIO_SPEECH):
                    assert(request.method === "POST");
                    return handleAudioSpeech(requestBody || await request.json(), apiKeys)
                        .catch(errHandler);

                default:
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

  const requestUrl = `${BASE_URL}/${API_VERSION}/models`;

  const response = await fetch(requestUrl, {
    headers: makeHeaders(apiKey),
  });

  for (const [key, value] of response.headers.entries()) {

  }

  let { body } = response;
  if (response.ok) {
    const responseText = await response.text();

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

  } else {

  }

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

  if (!Array.isArray(req.input)) {
    req.input = [ req.input ];
  }

  const requestBody = {
    "requests": req.input.map(text => ({
      model,
      content: { parts: { text } },
      outputDimensionality: req.dimensions,
    }))
  };

  const requestUrl = `${BASE_URL}/${API_VERSION}/${model}:batchEmbedContents`;

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: makeHeaders(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify(requestBody)
  });

  let { body } = response;
  if (response.ok) {
    const responseText = await response.text();

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

  } else {

  }

  return new Response(body, fixCors(response));
}

/**
 * 处理语音合成请求 - OpenAI格式转Gemini格式
 * 注意：Gemini API目前不直接支持语音合成，这里返回适当的错误信息
 *
 * @param {Object} req - OpenAI格式的语音合成请求对象
 * @param {Array<string>} apiKeys - API Key数组
 * @returns {Promise<Response>} 错误响应，说明不支持语音合成
 */
async function handleAudioSpeech(req, apiKeys) {

  // 返回标准的OpenAI错误格式
  const errorResponse = {
    error: {
      message: 'Audio speech synthesis is not supported by Gemini API. Please use a different endpoint or service.',
      type: 'not_supported_error',
      code: 'audio_speech_not_supported'
    }
  };

  return new Response(JSON.stringify(errorResponse), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * @功能概述: 处理聊天完成请求，OpenAI格式转Gemini格式
 * @param {Object} req - OpenAI格式的聊天完成请求对象
 * @param {Array<string>} apiKeys - API Key数组，用于负载均衡
 * @returns {Promise<Response>} 包含聊天完成结果的响应，OpenAI格式
 * @执行流程:
 *   1. 智能API Key管理和白名单验证
 *   2. 模型名称处理和映射
 *   3. 请求格式转换
 *   4. 发送Gemini API请求
 *   5. 响应格式转换并返回
 * @支持功能: 流式和非流式响应、工具调用、安全设置
 * @throws {HttpError} 当请求格式错误或API Key验证失败时抛出
 */
async function handleCompletions(req, apiKeys, reqId) {
    const startTime = Date.now();

    // 智能API Key管理
    if (apiKeys.length <= 1) {
        const inputApiKey = apiKeys[0];

        // 白名单验证
        if (!validateTrustedApiKey(inputApiKey)) {
            logWarning(reqId, 'API Key验证', 'API Key未通过白名单验证');
            return new Response(
                safeJsonStringify({
                    error: {
                        message: 'API Key not in trusted whitelist. Access denied.',
                        type: 'authentication_error',
                        code: 'untrusted_api_key'
                    }
                }, 2),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 获取备用Key池
        const backupKeys = process.env.BACKUP_API_KEYS;
        if (backupKeys) {
            const backupKeyArray = backupKeys.split(',').map(k => k.trim()).filter(k => k);
            apiKeys = backupKeyArray;
        }
    }

    // 处理模型名称
    let model = MODEL_CONFIG.DEFAULT_MODEL;
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
            break;
        default:
            if (MODEL_CONFIG.MODEL_MAPPING[req.model]) {
                model = MODEL_CONFIG.MODEL_MAPPING[req.model];
            }
    }

    // 步骤 3: 转换请求格式
    let body = await transformRequest(req);
    const extra = req.extra_body?.google;
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

    // 步骤 4: 处理搜索工具
    switch (true) {
        case model.endsWith(":search"):
            model = model.substring(0, model.length - 7);
            // eslint-disable-next-line no-fallthrough
        case req.model.endsWith("-search-preview"):
        case req.tools?.some(tool => tool.function?.name === 'googleSearch'):
            body.tools = body.tools || [];
            body.tools.push({googleSearch: {}});

    }

    // 步骤 5: 构建请求URL
    const TASK = req.stream ? "streamGenerateContent" : "generateContent";
    let url = `${GEMINI_API.BASE_URL}/${GEMINI_API.API_VERSION}/models/${model}:${TASK}`;
    if (req.stream) {
        url += "?alt=sse";
    }

    // 发送Gemini API请求
    const apiStartTime = Date.now();
    const response = await enhancedFetch(url, {
        method: "POST",
        headers: makeHeaders(apiKeys[0], { "Content-Type": "application/json" }), // 临时使用第一个key，会被enhancedFetch替换
        body: safeJsonStringify(body),
    }, apiKeys, 'openai');

    const duration = Date.now() - apiStartTime;
    const totalDuration = Date.now() - startTime;
  // 注释：详细Gemini响应头信息（调试时可启用）

  // for (const [key, value] of response.headers.entries()) {

  // }

  body = response.body;
  if (response.ok) {
    let id = "chatcmpl-" + generateId(); //"chatcmpl-8pMMaqXMK68B3nyDBrapTDrhkHBQK";
    const shared = {};
    if (req.stream) {

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

      body = await response.text();

      try {
        const parsedBody = JSON.parse(body);
        if (!parsedBody.candidates) {
          throw new Error("Invalid completion object");
        }
        const transformedResponse = processCompletionsResponse(parsedBody, model, id);

        body = transformedResponse;
      } catch (err) {
        console.error("Error parsing response:", err);

        return new Response(body, fixCors(response)); // output as is
      }
    }

  }

  // 记录请求摘要
  logRequest(reqId, 'POST', '/v1/chat/completions', model, apiKeys[0], response.status, totalDuration);

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
      // 使用Web标准API替代Node.js Buffer
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      data = btoa(String.fromCharCode(...uint8Array));
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

    if (promptFeedback.blockReason === "SAFETY") {
      promptFeedback.safetyRatings
        .filter(r => r.blocked)

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
