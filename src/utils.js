/**
 * 工具函数集合 - 负载均衡、验证、日志等核心功能
 * 专注于高可读性的日志输出和简洁的工具函数
 */

// 服务器调用Gemini时的Key黑名单（内存存储，重启后重置）
const leakedKeysBlacklist = new Set();

/**
 * 泄露Key黑名单管理
 */
export function addKeyToBlacklist(apiKey, reason = 'API Key reported as leaked') {
  const keyPreview = apiKey?.substring(0, 8) + '...';
  if (leakedKeysBlacklist.has(apiKey)) {
    console.log(`⚠️ Key ${keyPreview} 已在泄露黑名单中`);
    return;
  }

  leakedKeysBlacklist.add(apiKey);
  console.log(`🚫 Key ${keyPreview} 已加入泄露黑名单，原因: ${reason}`);
  console.log(`📊 当前泄露黑名单数量: ${leakedKeysBlacklist.size}`);
}

export function isKeyBlacklisted(apiKey) {
  const result = leakedKeysBlacklist.has(apiKey);
  console.log(`🔍 [DEBUG] isKeyBlacklisted检查: ${apiKey?.substring(0, 8)}... -> ${result}`);
  return result;
}

export function getBlacklistedKeysCount() {
  return leakedKeysBlacklist.size;
}

/**
 * 生成请求ID用于日志追踪
 */
export function generateRequestId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

/**
 * 高可读性日志输出 - 请求开始
 */
export function logRequestStart(reqId, method, path, apiKeyCount) {
  console.log(`\n🚀 [${reqId}] === 请求开始 ===`);
  console.log(`📝 [${reqId}] 方法: ${method} | 路径: ${path}`);
  console.log(`🔑 [${reqId}] API Key数量: ${apiKeyCount}`);
}

/**
 * 高可读性日志输出 - 负载均衡选择
 */
export function logLoadBalance(reqId, selectedKey, totalKeys, algorithm = "时间窗口轮询") {
  const maskedKey = selectedKey ? `${selectedKey.substring(0, 8)}...${selectedKey.slice(-4)}` : 'null';
  console.log(`⚖️ [${reqId}] 负载均衡: ${algorithm} | 选中: ${maskedKey} | 总数: ${totalKeys}`);
}

/**
 * 高可读性日志输出 - LLM请求
 */
export function logLLMRequest(reqId, url, model, isStreaming = false) {
  console.log(`🤖 [${reqId}] LLM请求: ${model} | 流式: ${isStreaming ? '是' : '否'}`);
  console.log(`🌐 [${reqId}] 目标URL: ${url}`);
}

/**
 * 高可读性日志输出 - LLM响应
 */
export function logLLMResponse(reqId, status, responseTime, tokenCount = null) {
  const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`${statusIcon} [${reqId}] LLM响应: ${status} | 耗时: ${responseTime}ms`);
  if (tokenCount) {
    console.log(`📊 [${reqId}] Token统计: ${tokenCount}`);
  }
}

/**
 * 高可读性日志输出 - 错误信息
 */
export function logError(reqId, error, context = '') {
  console.log(`💥 [${reqId}] 错误${context ? ` (${context})` : ''}: ${error.message}`);
  if (error.stack) {
    console.log(`📍 [${reqId}] 堆栈: ${error.stack.split('\n')[1]?.trim()}`);
  }
}

/**
 * 高可读性日志输出 - 请求完成
 */
export function logRequestEnd(reqId, finalStatus, totalTime) {
  const statusIcon = finalStatus >= 200 && finalStatus < 300 ? '🎉' : '💔';
  console.log(`${statusIcon} [${reqId}] === 请求完成 === 状态: ${finalStatus} | 总耗时: ${totalTime}ms\n`);
}

/**
 * API Key白名单验证 - 统一验证逻辑
 */
export function validateTrustedApiKey(inputApiKey, context = '') {
  const trustedKeys = process.env.TRUSTED_API_KEYS;
  if (!trustedKeys) {
    console.log(`⚠️ ${context}未配置TRUSTED_API_KEYS，禁用备用Key池功能`);
    return false;
  }

  const trustedKeyArray = trustedKeys.split(',').map(k => k.trim()).filter(k => k);
  const isValid = trustedKeyArray.includes(inputApiKey);
  const maskedKey = inputApiKey?.substring(0, 8) + '...';

  if (isValid) {
    console.log(`✅ ${context}API Key白名单验证通过: ${maskedKey}`);
  } else {
    console.log(`🚫 ${context}API Key不在白名单中: ${maskedKey}`);
  }

  return isValid;
}

/**
 * 时间窗口轮询算法 - 负载均衡API Key选择
 * 核心特色算法，确保API Key使用的相对均匀分布
 */
export function selectApiKeyBalanced(apiKeys) {
  console.log(`🔍 [DEBUG] selectApiKeyBalanced开始，原始Keys数量: ${apiKeys?.length || 0}`);
  console.log(`🔍 [DEBUG] 当前黑名单Keys数量: ${leakedKeysBlacklist.size}`);
  console.log(`🔍 [DEBUG] 黑名单内容: ${Array.from(leakedKeysBlacklist).map(k => k.substring(0, 8) + '...').join(', ')}`);
  console.log(`🔍 [DEBUG] 原始Keys: ${apiKeys?.map(k => k.substring(0, 8) + '...').join(', ') || 'empty'}`);

  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('API Key数组不能为空');
  }

  // 过滤掉黑名单中的Key
  const availableKeys = apiKeys.filter(key => !isKeyBlacklisted(key));
  console.log(`🔍 [DEBUG] 过滤后可用Keys数量: ${availableKeys.length}`);
  console.log(`🔍 [DEBUG] 可用Keys: ${availableKeys.map(k => k.substring(0, 8) + '...').join(', ')}`);

  if (availableKeys.length === 0) {
    console.log(`🚫 所有API Key都在黑名单中，可用Key: ${apiKeys.length}, 黑名单: ${leakedKeysBlacklist.size}`);
    throw new Error('所有可用的API Key都被标记为泄露');
  }

  if (availableKeys.length < apiKeys.length) {
    console.log(`⚠️ 跳过${apiKeys.length - availableKeys.length}个黑名单Key，可用Key: ${availableKeys.length}`);
  }

  const now = Date.now();
  const windowSize = 10000; // 10秒时间窗口
  const windowStart = Math.floor(now / windowSize) * windowSize;
  const offsetInWindow = now - windowStart;

  // 在时间窗口内进行轮询分配（基于过滤后的可用Key）
  const slotSize = windowSize / availableKeys.length;
  const index = Math.floor(offsetInWindow / slotSize) % availableKeys.length;

  const selectedKey = availableKeys[index];
  console.log(`🔍 [DEBUG] 最终选中Key: ${selectedKey?.substring(0, 8)}... (index: ${index})`);
  return selectedKey;
}

/**
 * 获取有效的API Key池
 * 单Key时启用备用池（需白名单验证），多Key时使用原始池
 */
export function getEffectiveApiKeys(authHeader, context = '') {
  if (!authHeader) {
    throw new Error('缺少Authorization头');
  }

  // 解析API Key
  const apiKeys = authHeader.split(',').map(k => k.trim()).filter(k => k);
  
  if (apiKeys.length === 0) {
    throw new Error('未找到有效的API Key');
  }

  // 多Key模式：直接使用用户提供的Key池
  if (apiKeys.length > 1) {
    console.log(`🔄 ${context}多Key模式: 使用用户提供的${apiKeys.length}个API Key`);
    return apiKeys;
  }

  // 单Key模式：检查白名单，决定是否启用备用池
  const inputKey = apiKeys[0];
  if (!validateTrustedApiKey(inputKey, context)) {
    throw new Error('API Key未通过白名单验证');
  }

  // 启用备用Key池
  const backupKeys = process.env.BACKUP_API_KEYS;
  if (!backupKeys) {
    console.log(`⚠️ ${context}未配置BACKUP_API_KEYS，使用单Key模式`);
    return apiKeys;
  }

  const backupKeyArray = backupKeys.split(',').map(k => k.trim()).filter(k => k);
  console.log(`🎯 ${context}单Key模式: 启用备用Key池，共${backupKeyArray.length}个Key`);
  return backupKeyArray;
}

/**
 * OpenAI兼容模式专用的fetch函数 - 使用轮询算法确保重试时使用不同API Key
 */
export async function enhancedFetchOpenAI(url, options, apiKeys, reqId, context = '') {
  const timeout = 45000; // 45秒超时
  let lastError;

  // 预先过滤掉黑名单中的Key
  const availableKeys = apiKeys.filter(key => !isKeyBlacklisted(key));

  if (availableKeys.length === 0) {
    throw new Error('OpenAI兼容模式：所有可用的API Key都在黑名单中');
  }

  for (let i = 0; i < availableKeys.length; i++) {
    // OpenAI兼容模式：使用轮询算法确保每次重试使用不同的API Key
    const apiKey = availableKeys[i % availableKeys.length];
    console.log(`⚖️ [${reqId}] OpenAI兼容负载均衡: 轮询算法 | 尝试${i+1}/${availableKeys.length} | 选中: ${apiKey.substring(0, 8)}... | 总数: ${availableKeys.length}`);

    try {
      // 设置API Key
      const headers = new Headers(options.headers);
      headers.set('x-goog-api-key', apiKey);

      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const startTime = Date.now();

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        console.log(`✅ [${reqId}] OpenAI兼容请求成功: ${context} | 响应时间: ${responseTime}ms | API Key: ${apiKey.substring(0, 8)}...`);
        return response;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ [${reqId}] API Key ${apiKey.substring(0, 8)}... 返回错误: ${response.status}`);

        // 检测403泄露错误并自动加入黑名单
        if (response.status === 403 && errorText.includes('reported as leaked')) {
          console.log(`🚨 [${reqId}] OpenAI兼容模式检测到API Key泄露: ${apiKey.substring(0, 8)}... 自动加入黑名单`);
          addKeyToBlacklist(apiKey, 'OpenAI兼容模式API返回403: reported as leaked');
        }

        lastError = new Error(`HTTP ${response.status}: ${errorText}`);

        // 如果是400错误且包含特定消息，跳过后续重试
        if (response.status === 400 && errorText.includes('Penalty is not enabled')) {
          console.log(`🚫 [${reqId}] 检测到模型不支持penalty参数，停止重试`);
          throw lastError;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ [${reqId}] API Key ${apiKey.substring(0, 8)}... 请求超时`);
        lastError = new Error(`Request timeout after ${timeout}ms`);
      } else {
        console.log(`❌ [${reqId}] API Key ${apiKey.substring(0, 8)}... 请求失败: ${error.message}`);
        lastError = error;
      }
    }
  }

  console.error(`💥 [${reqId}] 所有API Key都失败了: ${context}`);
  throw lastError || new Error('All API keys failed');
}

/**
 * 增强的fetch函数 - 支持超时和重试
 */
export async function enhancedFetch(url, options, apiKeys, reqId, context = '') {
  const timeout = 45000; // 45秒超时
  let lastError;

  console.log(`🔍 [DEBUG][${reqId}] enhancedFetch开始，输入Keys数量: ${apiKeys.length}`);
  console.log(`🔍 [DEBUG][${reqId}] 输入Keys: ${apiKeys.map(k => k.substring(0, 8) + '...').join(', ')}`);

  // 预先过滤掉黑名单中的Key
  const availableKeys = apiKeys.filter(key => !isKeyBlacklisted(key));
  console.log(`🔍 [DEBUG][${reqId}] 过滤后可用Keys数量: ${availableKeys.length}`);
  console.log(`🔍 [DEBUG][${reqId}] 可用Keys: ${availableKeys.map(k => k.substring(0, 8) + '...').join(', ')}`);

  if (availableKeys.length === 0) {
    throw new Error('所有可用的API Key都在黑名单中');
  }

  for (let i = 0; i < availableKeys.length; i++) {
    console.log(`🔍 [DEBUG][${reqId}] 循环 ${i+1}/${availableKeys.length} 开始`);

    // 使用时间窗口轮询算法选择可用的Key
    const apiKey = selectApiKeyBalanced(availableKeys);
    console.log(`🔍 [DEBUG][${reqId}] 循环 ${i+1} 选中Key: ${apiKey?.substring(0, 8)}...`);

    logLoadBalance(reqId, apiKey, availableKeys.length);

    try {
      // 设置API Key
      const headers = new Headers(options.headers);
      headers.set('x-goog-api-key', apiKey);

      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const startTime = Date.now();
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        logLLMResponse(reqId, response.status, responseTime);
        return response;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ [${reqId}] API Key ${apiKey.substring(0, 8)}... 返回错误: ${response.status}`);

        // 检测403泄露错误并自动加入黑名单
        if (response.status === 403 && errorText.includes('reported as leaked')) {
          console.log(`🚨 [${reqId}] 检测到API Key泄露: ${apiKey.substring(0, 8)}... 自动加入黑名单`);
          addKeyToBlacklist(apiKey, 'API返回403: reported as leaked');
        }

        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      logError(reqId, error, `API Key ${apiKey.substring(0, 8)}...`);
      lastError = error;
    }
  }

  throw lastError || new Error('所有API Key都尝试失败');
}

/**
 * CORS头部处理
 */
export function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.log(`⚠️ JSON解析失败: ${error.message}`);
    return fallback;
  }
}

/**
 * 安全的JSON字符串化
 */
export function safeJsonStringify(obj, fallback = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.log(`⚠️ JSON字符串化失败: ${error.message}`);
    return fallback;
  }
}
