/**
 * @功能概述: 统一API客户端模块，提供增强的fetch功能和超时控制
 * @运行时: Edge Runtime (Web标准API)
 * @核心功能: 统一的enhancedFetch函数，支持超时控制、重试机制、负载均衡
 * @适用场景: 所有对外API请求，包括Gemini原生API和OpenAI兼容API
 */

import { selectApiKeyBalanced } from './load-balancer.js';
import { maskApiKey } from './security.js';

/**
 * @功能概述: 增强的fetch函数，支持超时控制、故障切换和负载均衡
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项，包含method、headers、body等
 * @param {Array<string>} apiKeys - API Key数组，用于负载均衡和故障切换
 * @param {string} context - 请求上下文标识，用于日志区分（default/openai/gemini）
 * @returns {Promise<Response>} 响应对象，成功时返回有效响应，失败时抛出错误
 * @执行流程: 
 *   1. 遍历所有API Key进行重试
 *   2. 使用负载均衡算法选择API Key
 *   3. 设置超时控制器
 *   4. 发送请求并记录日志
 *   5. 处理响应或错误，自动切换到下一个Key
 * @throws {Error} 当所有API Key都尝试失败时抛出错误
 */
export async function enhancedFetch(url, options, apiKeys, context = 'default') {
    const reqId = Date.now().toString(); // 生成唯一请求ID
    const logPrefix = `[文件：api-client.js][API客户端][enhancedFetch][ReqID:${reqId}] `;
    
    const maxRetries = apiKeys.length; // 每个Key给一次机会
    const timeout = 45000; // 45秒超时
    
    console.log(`${logPrefix}[步骤 1] 开始API请求 - URL: ${url}, 可用Keys: ${apiKeys.length}, 上下文: ${context}`); // 记录请求开始

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        
        try {
            // 步骤 1: 使用负载均衡算法选择API Key
            const selectedKey = selectApiKeyBalanced(apiKeys, context);
            
            // 步骤 2: 更新请求头中的API Key
            const headers = new Headers(options.headers);
            headers.set('x-goog-api-key', selectedKey);
            
            console.log(`${logPrefix}[步骤 2] 尝试 ${attempt}/${maxRetries} - 使用Key: ${maskApiKey(selectedKey)}`); // 记录当前尝试
            
            // 步骤 3: 创建超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.log(`${logPrefix}[步骤 3][TIMEOUT] 请求超时 (${timeout}ms) - Key: ${maskApiKey(selectedKey)}`); // 记录超时
            }, timeout);
            
            // 步骤 4: 发送请求
            const response = await fetch(url, {
                ...options,
                headers: headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            console.log(`${logPrefix}[步骤 4] 响应: ${response.status} ${response.statusText}, 耗时: ${duration}ms`); // 记录响应状态
            
            if (response.ok) {
                console.log(`${logPrefix}[步骤 4][SUCCESS] 请求成功 - 状态: ${response.status}, Key: ${maskApiKey(selectedKey)}`); // 记录成功
                return response;
            } else {
                console.log(`${logPrefix}[步骤 4][ERROR] 响应错误 - 状态: ${response.status}, Key: ${maskApiKey(selectedKey)}`); // 记录响应错误
                
                // 步骤 5: 尝试读取错误响应体
                try {
                    const errorText = await response.text();
                    console.log(`${logPrefix}[步骤 5] 错误响应体: ${errorText.substring(0, 200)}...`); // 记录错误响应（截断）
                } catch (e) {
                    console.log(`${logPrefix}[步骤 5] 无法读取错误响应体`); // 记录读取失败
                }
                
                console.log(`${logPrefix}[步骤 6] 遇到错误，立即轮询到下一个Key`); // 记录切换Key
                // 继续循环，不return
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`${logPrefix}[步骤 4][EXCEPTION] 请求异常 - 耗时: ${duration}ms, 错误: ${error.message}`); // 记录异常
            
            // 最后一次尝试，抛出错误
            if (attempt === maxRetries) {
                console.log(`${logPrefix}[FINAL_ERROR] 所有API Key都已尝试，请求失败`); // 记录最终失败
                throw error;
            }
            
            console.log(`${logPrefix}[步骤 6] 网络异常，立即轮询到下一个Key`); // 记录异常切换
        }
        
        // 移除延迟，立即切换到下一个Key
    }
    
    // 理论上不会到达这里，但为了类型安全
    throw new Error('所有API Key都已尝试，请求失败');
}

/**
 * @功能概述: 创建API客户端实例，提供配置化的请求功能
 * @param {Object} config - 客户端配置
 * @param {number} config.timeout - 请求超时时间（毫秒）
 * @param {string} config.context - 默认请求上下文
 * @returns {Object} API客户端实例，包含fetch方法
 * @执行流程:
 *   1. 验证配置参数
 *   2. 创建客户端实例
 *   3. 返回包装的fetch方法
 */
export function createApiClient(config = {}) {
    const logPrefix = `[文件：api-client.js][API客户端][createApiClient] `;
    
    const {
        timeout = 45000,
        context = 'default'
    } = config;
    
    console.log(`${logPrefix}[步骤 1] 创建API客户端 - 超时: ${timeout}ms, 上下文: ${context}`); // 记录客户端创建
    
    return {
        /**
         * @功能概述: 客户端实例的fetch方法
         * @param {string} url - 请求URL
         * @param {Object} options - fetch选项
         * @param {Array<string>} apiKeys - API Key数组
         * @returns {Promise<Response>} 响应对象
         */
        fetch: async (url, options, apiKeys) => {
            return enhancedFetch(url, options, apiKeys, context);
        }
    };
}

/**
 * @功能概述: 默认API客户端实例，使用标准配置
 * @运行时: Edge Runtime兼容
 * @使用方式: 直接导入使用，适用于大部分场景
 */
export const defaultApiClient = createApiClient();
