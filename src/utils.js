/**
 * 工具函数集合 - 负载均衡、验证、日志等核心功能
 * 专注于高可读性的日志输出和简洁的工具函数
 */

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
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('API Key数组不能为空');
  }

  const now = Date.now();
  const windowSize = 10000; // 10秒时间窗口
  const windowStart = Math.floor(now / windowSize) * windowSize;
  const offsetInWindow = now - windowStart;

  // 在时间窗口内进行轮询分配
  const slotSize = windowSize / apiKeys.length;
  const index = Math.floor(offsetInWindow / slotSize) % apiKeys.length;

  return apiKeys[index];
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
 * 增强的fetch函数 - 支持超时和重试
 */
export async function enhancedFetch(url, options, apiKeys, reqId, context = '') {
  const timeout = 45000; // 45秒超时
  let lastError;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = selectApiKeyBalanced(apiKeys);
    logLoadBalance(reqId, apiKey, apiKeys.length);

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
