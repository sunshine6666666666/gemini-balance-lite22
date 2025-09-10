/**
 * @功能概述: 负载均衡器模块，实现时间窗口轮询算法
 * @运行时: Edge Runtime (Web标准API)
 * @算法类型: 时间窗口轮询算法，确保API Key使用的相对均匀分布
 * @时间窗口: 10秒窗口，在窗口内使用确定性轮询分配
 * @均衡效果: 短期内保证API Key使用的相对均匀，避免单点过载
 * @适用场景: 多API Key负载均衡，支持不同上下文的独立负载均衡
 */

/**
 * @功能概述: 时间窗口轮询算法 - 负载均衡API Key选择
 * @param {Array<string>} apiKeys - API Key数组
 * @param {string} context - 上下文标识，用于区分不同的负载均衡实例
 * @returns {string} 选中的API Key
 * @执行流程:
 *   1. 获取当前时间戳
 *   2. 计算时间窗口起始点
 *   3. 计算窗口内偏移量
 *   4. 根据偏移量选择API Key索引
 *   5. 返回选中的API Key
 * @算法原理: 将时间分割成固定窗口，在每个窗口内使用确定性轮询分配
 */
export function selectApiKeyBalanced(apiKeys, context = 'default') {
    const reqId = Date.now().toString(); // 生成请求ID用于日志追踪
    const logPrefix = `[文件：load-balancer.js][负载均衡器][selectApiKeyBalanced][ReqID:${reqId}] `;
    
    // 步骤 1: 验证输入参数
    if (!apiKeys || apiKeys.length === 0) {
        console.log(`${logPrefix}[步骤 1][ERROR] API Key数组为空`); // 记录参数错误
        throw new Error('API Key数组不能为空');
    }
    
    // 步骤 2: 获取当前时间和计算时间窗口
    const now = Date.now();
    const windowSize = 10000; // 10秒时间窗口
    const windowStart = Math.floor(now / windowSize) * windowSize;
    const offsetInWindow = now - windowStart;
    
    // 步骤 3: 在时间窗口内进行轮询分配
    // 将窗口时间平均分配给每个API Key
    const slotSize = windowSize / apiKeys.length;
    const index = Math.floor(offsetInWindow / slotSize) % apiKeys.length;
    
    const selectedKey = apiKeys[index];

    return selectedKey;
}

/**
 * @功能概述: 获取负载均衡器统计信息
 * @returns {Object} 负载均衡统计数据
 * @执行流程:
 *   1. 收集当前时间窗口信息
 *   2. 计算负载均衡状态
 *   3. 返回统计数据
 */
export function getLoadBalancerStats() {
    const logPrefix = `[文件：load-balancer.js][负载均衡器][getLoadBalancerStats] `;
    
    const now = Date.now();
    const windowSize = 10000; // 10秒时间窗口
    const windowStart = Math.floor(now / windowSize) * windowSize;
    const offsetInWindow = now - windowStart;
    const windowProgress = (offsetInWindow / windowSize) * 100;
    
    const stats = {
        currentTime: now,
        windowStart: windowStart,
        windowSize: windowSize,
        offsetInWindow: offsetInWindow,
        windowProgress: Math.round(windowProgress * 100) / 100, // 保留2位小数
        algorithm: 'time-window-polling'
    };
    
    return stats;
}

/**
 * @功能概述: 预测下一个时间窗口的API Key选择
 * @param {Array<string>} apiKeys - API Key数组
 * @param {string} context - 上下文标识
 * @returns {Object} 预测信息，包含下一个选择的索引和时间
 * @执行流程:
 *   1. 计算当前时间窗口信息
 *   2. 预测下一个时间片的选择
 *   3. 返回预测结果
 */
export function predictNextSelection(apiKeys, context = 'default') {
    const logPrefix = `[文件：load-balancer.js][负载均衡器][predictNextSelection] `;
    
    if (!apiKeys || apiKeys.length === 0) {
        console.log(`${logPrefix}[ERROR] API Key数组为空`); // 记录参数错误
        return null;
    }
    
    const now = Date.now();
    const windowSize = 10000; // 10秒时间窗口
    const windowStart = Math.floor(now / windowSize) * windowSize;
    const offsetInWindow = now - windowStart;
    
    // 计算当前时间片
    const slotSize = windowSize / apiKeys.length;
    const currentIndex = Math.floor(offsetInWindow / slotSize) % apiKeys.length;
    
    // 预测下一个时间片
    const nextSlotStart = windowStart + Math.ceil(offsetInWindow / slotSize) * slotSize;
    const nextIndex = Math.floor((nextSlotStart - windowStart) / slotSize) % apiKeys.length;
    
    const prediction = {
        currentIndex: currentIndex,
        nextIndex: nextIndex,
        nextSlotStart: nextSlotStart,
        timeToNext: nextSlotStart - now,
        context: context
    };
    
    return prediction;
}

/**
 * @功能概述: 验证负载均衡算法的均匀性
 * @param {Array<string>} apiKeys - API Key数组
 * @param {number} testDuration - 测试持续时间（毫秒）
 * @returns {Object} 均匀性测试结果
 * @执行流程:
 *   1. 在指定时间内模拟选择
 *   2. 统计每个Key的选择次数
 *   3. 计算分布均匀性
 */
export async function validateLoadBalancing(apiKeys, testDuration = 30000) {
    const logPrefix = `[文件：load-balancer.js][负载均衡器][validateLoadBalancing] `;
    
    const startTime = Date.now();
    const selections = {};
    let totalSelections = 0;
    
    // 初始化计数器
    apiKeys.forEach((key, index) => {
        selections[index] = 0;
    });
    
    // 模拟选择过程
    while (Date.now() - startTime < testDuration) {
        const selectedKey = selectApiKeyBalanced(apiKeys, 'validation');
        const index = apiKeys.indexOf(selectedKey);
        selections[index]++;
        totalSelections++;
        
        // 避免过于频繁的选择，每10ms选择一次
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // 计算分布统计
    const expectedPerKey = totalSelections / apiKeys.length;
    const deviations = Object.values(selections).map(count => 
        Math.abs(count - expectedPerKey) / expectedPerKey
    );
    const maxDeviation = Math.max(...deviations);
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    
    const result = {
        totalSelections: totalSelections,
        selections: selections,
        expectedPerKey: Math.round(expectedPerKey),
        maxDeviation: Math.round(maxDeviation * 10000) / 100, // 百分比，保留2位小数
        avgDeviation: Math.round(avgDeviation * 10000) / 100,
        isBalanced: maxDeviation < 0.2 // 偏差小于20%认为是均衡的
    };
    
    return result;
}
