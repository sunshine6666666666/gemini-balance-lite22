import { handleVerification } from './verify_keys.js';
import openai from './openai.mjs';



/**
 * 安全模块：API Key白名单验证
 * 只允许可信的API Key使用备用Key池，防止恶意用户盗用API配额
 *
 * @param {string} inputApiKey - 需要验证的API Key
 * @returns {boolean} 验证结果，true表示在白名单中，false表示不在白名单中或未配置白名单
 */
function validateTrustedApiKey(inputApiKey) {
  const trustedKeys = process.env.TRUSTED_API_KEYS;
  if (!trustedKeys) {
    console.log(`⚠️ 未配置TRUSTED_API_KEYS，禁用备用Key池功能`);
    return false;
  }

  const trustedKeyArray = trustedKeys.split(',').map(k => k.trim()).filter(k => k);
  const isValid = trustedKeyArray.includes(inputApiKey);

  if (isValid) {
    console.log(`✅ API Key白名单验证通过: ${inputApiKey?.substring(0,8)}...`);
  } else {
    console.log(`🚫 API Key不在白名单中，拒绝使用备用Key池: ${inputApiKey?.substring(0,8)}...`);
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

  console.log(`Time-Window Load Balancer - Selected API Key index: ${index}, window offset: ${offsetInWindow}ms`);
  return apiKeys[index];
}

/**
 * 增强的fetch函数 - 在保持轮询机制基础上添加超时和故障切换
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

      console.log(`🚀 尝试 ${attempt}/${maxRetries} - 使用Key: ${selectedKey.substring(0, 8)}...${selectedKey.substring(selectedKey.length - 8)}`);
      // 注释：详细请求头信息（调试时可启用）
      // console.log(`📋 请求头详情:`);
      // for (const [key, value] of headers.entries()) {
      //   if (key.toLowerCase().includes('key')) {
      //     console.log(`  ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 8)}`);
      //   } else {
      //     console.log(`  ${key}: ${value}`);
      //   }
      // }

      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`⏰ 请求超时 (${timeout}ms) - Key: ${selectedKey.substring(0, 8)}...`);
      }, timeout);

      // 发送请求
      const response = await fetch(url, {
        ...options,
        headers: headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      console.log(`📊 响应: ${response.status} ${response.statusText}`);
      // 注释：详细响应头信息（调试时可启用）
      // console.log(`📋 响应头:`);
      // for (const [key, value] of response.headers.entries()) {
      //   console.log(`  ${key}: ${value}`);
      // }

      if (response.ok) {
        console.log(`✅ 请求成功 - 耗时: ${duration}ms, 状态: ${response.status}, Key: ${selectedKey.substring(0, 8)}...`);
        return response;
      } else {
        console.log(`❌ 响应错误 - 状态: ${response.status}, 耗时: ${duration}ms, Key: ${selectedKey.substring(0, 8)}...`);
        // 尝试读取错误响应体
        try {
          const errorText = await response.text();
          console.log(`📦 错误响应体:`);
          console.log(errorText);
        } catch (e) {
          console.log(`📦 无法读取错误响应体`);
        }
        // 不返回错误响应，继续尝试下一个Key
        console.log(`🔄 遇到错误，立即轮询到下一个Key`);
        // 继续循环，不return
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ 请求异常 - 耗时: ${duration}ms, 错误: ${error.message}`);

      // 最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }

      // 任何异常都立即轮询到下一个Key
      console.log(`🔄 网络异常，立即轮询到下一个Key`);
    }

    // 移除延迟，立即切换到下一个Key
  }

  // 修复：所有重试都失败时，抛出错误而不是返回undefined
  throw new Error('所有API Key都已尝试，请求失败');
}



/**
 * 主要请求处理函数 - 处理所有传入的HTTP请求
 * 支持原生Gemini API格式和OpenAI兼容格式，包含智能负载均衡和安全验证
 *
 * @param {Request} request - HTTP请求对象，包含URL、headers、body等信息
 * @returns {Promise<Response>} HTTP响应对象，包含处理结果或错误信息
 */
export async function handleRequest(request) {

  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;

  // 📊 LLM请求核心信息记录
  console.log(`\n🔍 ===== LLM请求信息 =====`);
  console.log(`📥 ${request.method} ${pathname}`);
  console.log(`🌐 来源: ${request.headers.get('origin') || request.headers.get('referer') || '未知'}`);

  // 只记录关键请求头
  console.log(`📋 关键请求头:`);
  for (const [key, value] of request.headers.entries()) {
    // 只记录与API和内容相关的头
    if (key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('authorization') ||
        key.toLowerCase() === 'content-type' ||
        key.toLowerCase() === 'user-agent') {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('authorization')) {
        const maskedValue = value.length > 16 ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}` : value;
        console.log(`  ${key}: ${maskedValue}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    // 注释：记录Vercel相关信息（部署环境、地区等）
    // else if (key.startsWith('x-vercel-')) {
    //   console.log(`  ${key}: ${value} // Vercel部署信息`);
    // }
  }

  if (pathname === '/' || pathname === '/index.html') {
    console.log(`🏠 首页访问`);
    console.log(`🔍 ===== LLM请求信息结束 =====\n`);
    return new Response('Proxy is Running!  More Details: https://github.com/sunshine6666666666/gemini-balance-lite22', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (pathname === '/verify' && request.method === 'POST') {
    console.log(`🔍 API Key验证请求`);
    console.log(`🔍 ===== LLM请求信息结束 =====\n`);
    return handleVerification(request);
  }

  // 处理OpenAI格式请求
  if (url.pathname.endsWith("/chat/completions") || url.pathname.endsWith("/completions") || url.pathname.endsWith("/embeddings") || url.pathname.endsWith("/models") || url.pathname.endsWith("/audio/speech")) {
    console.log(`🤖 转发到OpenAI兼容模块`);
    console.log(`🔍 ===== LLM请求信息结束 =====\n`);
    return openai.fetch(request);
  }

  const targetUrl = `https://generativelanguage.googleapis.com${pathname}${search}`;
  console.log(`🎯 目标URL: ${targetUrl}`);

  try {
    const headers = new Headers();
    let apiKeys = [];

    // 收集API Keys和其他headers
    for (const [key, value] of request.headers.entries()) {
      if (key.trim().toLowerCase() === 'x-goog-api-key') {
        // 解析多个API Key（逗号分隔）
        apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
      } else if (key.trim().toLowerCase() === 'authorization') {
        // 支持OpenAI格式的Authorization Bearer头
        const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
        if (bearerMatch && apiKeys.length === 0) {
          // 只有在没有找到x-goog-api-key时才使用Authorization头
          const bearerToken = bearerMatch[1];
          if (bearerToken.includes(',')) {
            // 解析多个API Key（逗号分隔）
            apiKeys = bearerToken.split(',').map(k => k.trim()).filter(k => k);
            console.log(`📋 从Authorization头提取到多个API Key: ${apiKeys.length}个`);
          } else {
            // 单个API Key
            apiKeys = [bearerToken];
            console.log(`📋 从Authorization头提取到单个API Key`);
          }
        }
      } else if (key.trim().toLowerCase() === 'content-type') {
        headers.set(key, value);
      }
    }

    // 🎯 智能API Key管理：单Key时启用备用Key池（需要白名单验证）
    if (apiKeys.length <= 1) {
      const inputApiKey = apiKeys[0];

      // 🛡️ 白名单验证：只有可信Key才能使用备用Key池
      if (!validateTrustedApiKey(inputApiKey)) {
        console.log(`🚫 API Key未通过白名单验证，拒绝请求: ${inputApiKey?.substring(0,8)}...`);
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'API Key not in trusted whitelist. Access denied.',
            code: 'UNTRUSTED_API_KEY'
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
        console.log(`🔧 白名单验证通过，启用备用Key池 (${backupKeyArray.length}个)`);
        apiKeys = backupKeyArray;
      } else {
        console.log(`⚠️ 白名单验证通过但未配置备用Key池，继续使用单Key`);
      }
    } else {
      console.log(`✅ 使用传入的多个API Key (${apiKeys.length}个)`);
    }

    if (apiKeys.length === 0) {
      throw new Error('未找到API Key');
    }

    console.log(`🎯 开始请求 - URL: ${targetUrl}, 可用Keys: ${apiKeys.length}`);

    // 修复ReadableStream重复读取问题：先读取请求体内容
    let requestBodyContent = null;
    if (request.body) {
      requestBodyContent = await request.text();
      console.log(`📦 请求体内容:`);
      if (requestBodyContent) {
        try {
          // 尝试格式化JSON
          const jsonBody = JSON.parse(requestBodyContent);
          console.log(JSON.stringify(jsonBody, null, 2));
        } catch (e) {
          // 如果不是JSON，直接显示
          console.log(requestBodyContent);
        }
      } else {
        console.log(`  (空请求体)`);
      }
    } else {
      console.log(`📦 请求体: 无`);
    }
    console.log(`🔍 ===== LLM请求信息结束 =====\n`);

    // 使用增强的fetch函数
    const response = await enhancedFetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: requestBodyContent  // 使用字符串内容而不是ReadableStream
    }, apiKeys);

    console.log(`✅ Gemini请求成功 - 状态: ${response.status}`);

    // 记录响应详情
    console.log(`\n📤 ===== LLM响应信息 =====`);
    console.log(`📊 最终响应: ${response.status} ${response.statusText}`);

    // 注释：详细响应头信息（调试时可启用）
    // console.log(`📋 原始响应头:`);
    // for (const [key, value] of response.headers.entries()) {
    //   console.log(`  ${key}: ${value}`);
    // }

    // 处理响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');
    responseHeaders.delete('keep-alive');
    responseHeaders.delete('content-encoding');
    responseHeaders.set('Referrer-Policy', 'no-referrer');
    responseHeaders.set('X-Processed-By', 'Enhanced-Gemini-Proxy');

    // 注释：处理后响应头信息（调试时可启用）
    // console.log(`📋 处理后响应头:`);
    // for (const [key, value] of responseHeaders.entries()) {
    //   console.log(`  ${key}: ${value}`);
    // }

    // 如果是非流式响应，记录响应体
    if (!response.body || response.headers.get('content-type')?.includes('application/json')) {
      try {
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        console.log(`📦 响应体内容:`);
        if (responseText) {
          try {
            const jsonResponse = JSON.parse(responseText);
            console.log(JSON.stringify(jsonResponse, null, 2));
          } catch (e) {
            console.log(responseText);
          }
        } else {
          console.log(`  (空响应体)`);
        }
      } catch (e) {
        console.log(`📦 响应体: 无法读取 (可能是流式响应)`);
      }
    } else {
      console.log(`📦 响应体: 流式响应，无法预览`);
    }
    console.log(`📤 ===== LLM响应信息结束 =====\n`);

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error(`❌ 请求最终失败: ${error.message}`);
    console.error(`📊 错误堆栈: ${error.stack}`);

    // 记录错误响应详情
    console.log(`\n📤 ===== 错误响应信息开始 =====`);
    console.log(`❌ 错误类型: ${error.name || 'RequestError'}`);
    console.log(`❌ 错误消息: ${error.message}`);
    console.log(`❌ 错误时间: ${new Date().toISOString()}`);

    // 返回结构化错误响应
    const errorResponse = {
      error: {
        message: error.message,
        type: error.name || 'RequestError',
        timestamp: new Date().toISOString()
      }
    };

    console.log(`📦 错误响应体:`);
    console.log(JSON.stringify(errorResponse, null, 2));
    console.log(`📤 ===== 错误响应信息结束 =====\n`);

    return new Response(JSON.stringify(errorResponse), {
      status: error.name === 'AbortError' ? 408 : 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Source': 'Enhanced-Gemini-Proxy'
      }
    });
  }
};
