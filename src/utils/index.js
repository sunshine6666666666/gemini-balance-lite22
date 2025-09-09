/**
 * @功能概述: 通用工具函数模块，提供项目中常用的辅助功能
 * @运行时: Edge Runtime (Web标准API)
 * @工具分类: 字符串处理、对象操作、时间处理、URL处理、验证函数等
 * @适用场景: 所有需要通用工具函数的模块，避免重复实现
 */

import { createLogPrefix, structuredLog } from '../middleware/logger.js';
import { SECURITY_CONFIG, CONTENT_TYPES } from '../config/constants.js';

/**
 * @功能概述: 安全地解析JSON字符串，避免解析错误导致程序崩溃
 * @param {string} jsonString - 待解析的JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析后的对象或默认值
 * @执行流程:
 *   1. 验证输入参数
 *   2. 尝试解析JSON
 *   3. 捕获解析错误
 *   4. 返回结果或默认值
 */
export function safeJsonParse(jsonString, defaultValue = null) {
    const logPrefix = createLogPrefix('index.js', '工具函数', 'safeJsonParse');
    
    if (typeof jsonString !== 'string') {
        structuredLog('warn', logPrefix, '步骤 1[WARN]', `输入不是字符串类型: ${typeof jsonString}`);
        return defaultValue;
    }
    
    if (jsonString.trim() === '') {
        structuredLog('warn', logPrefix, '步骤 1[WARN]', '输入为空字符串');
        return defaultValue;
    }
    
    try {
        const result = JSON.parse(jsonString);
        structuredLog('info', logPrefix, '步骤 2[SUCCESS]', 'JSON解析成功');
        return result;
    } catch (error) {
        structuredLog('warn', logPrefix, '步骤 2[WARN]', `JSON解析失败: ${error.message}`);
        return defaultValue;
    }
}

/**
 * @功能概述: 安全地序列化对象为JSON字符串，处理循环引用和特殊值
 * @param {*} obj - 待序列化的对象
 * @param {number} space - 缩进空格数，默认0（紧凑格式）
 * @returns {string} JSON字符串或错误标识
 * @执行流程:
 *   1. 检查输入类型
 *   2. 处理特殊值
 *   3. 尝试序列化
 *   4. 处理循环引用
 */
export function safeJsonStringify(obj, space = 0) {
    const logPrefix = createLogPrefix('index.js', '工具函数', 'safeJsonStringify');
    
    if (obj === undefined) {
        structuredLog('warn', logPrefix, '步骤 1[WARN]', '输入为undefined');
        return 'undefined';
    }
    
    if (obj === null) {
        return 'null';
    }
    
    try {
        const result = JSON.stringify(obj, null, space);
        structuredLog('info', logPrefix, '步骤 2[SUCCESS]', 'JSON序列化成功');
        return result;
    } catch (error) {
        if (error.message.includes('circular')) {
            structuredLog('warn', logPrefix, '步骤 2[WARN]', '检测到循环引用，使用简化序列化');
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    return '[Circular Reference]';
                }
                return value;
            }, space);
        }
        
        structuredLog('error', logPrefix, '步骤 2[ERROR]', `JSON序列化失败: ${error.message}`);
        return '[Serialization Error]';
    }
}

/**
 * @功能概述: 深度克隆对象，避免引用传递问题
 * @param {*} obj - 待克隆的对象
 * @returns {*} 克隆后的对象
 * @执行流程:
 *   1. 处理基本类型
 *   2. 处理null和undefined
 *   3. 使用JSON方法进行深度克隆
 *   4. 处理克隆失败的情况
 */
export function deepClone(obj) {
    const logPrefix = createLogPrefix('index.js', '工具函数', 'deepClone');
    
    // 处理基本类型
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    try {
        const cloned = JSON.parse(JSON.stringify(obj));
        structuredLog('info', logPrefix, '步骤 1[SUCCESS]', '对象深度克隆成功');
        return cloned;
    } catch (error) {
        structuredLog('error', logPrefix, '步骤 1[ERROR]', `深度克隆失败: ${error.message}`);
        return obj; // 返回原对象作为fallback
    }
}

/**
 * @功能概述: 格式化文件大小，将字节数转换为可读的大小格式
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数，默认2位
 * @returns {string} 格式化后的大小字符串
 * @执行流程:
 *   1. 验证输入参数
 *   2. 计算合适的单位
 *   3. 格式化数值
 *   4. 返回格式化字符串
 */
export function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 0) return 'Invalid Size';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    
    return `${size} ${sizes[i]}`;
}

/**
 * @功能概述: 格式化时间间隔，将毫秒转换为可读的时间格式
 * @param {number} milliseconds - 毫秒数
 * @returns {string} 格式化后的时间字符串
 * @执行流程:
 *   1. 验证输入参数
 *   2. 计算时间单位
 *   3. 选择合适的显示格式
 *   4. 返回格式化字符串
 */
export function formatDuration(milliseconds) {
    if (milliseconds < 0) return 'Invalid Duration';
    if (milliseconds === 0) return '0ms';
    
    const units = [
        { name: 'd', value: 24 * 60 * 60 * 1000 },
        { name: 'h', value: 60 * 60 * 1000 },
        { name: 'm', value: 60 * 1000 },
        { name: 's', value: 1000 },
        { name: 'ms', value: 1 }
    ];
    
    for (const unit of units) {
        if (milliseconds >= unit.value) {
            const value = Math.floor(milliseconds / unit.value);
            const remainder = milliseconds % unit.value;
            
            if (remainder === 0 || unit.name === 'ms') {
                return `${value}${unit.name}`;
            } else {
                const nextUnit = units[units.indexOf(unit) + 1];
                if (nextUnit) {
                    const nextValue = Math.floor(remainder / nextUnit.value);
                    return `${value}${unit.name} ${nextValue}${nextUnit.name}`;
                }
                return `${value}${unit.name}`;
            }
        }
    }
    
    return `${milliseconds}ms`;
}

/**
 * @功能概述: 验证URL格式的有效性
 * @param {string} url - 待验证的URL字符串
 * @returns {boolean} 验证结果
 * @执行流程:
 *   1. 检查输入类型
 *   2. 使用URL构造函数验证
 *   3. 检查协议有效性
 *   4. 返回验证结果
 */
export function isValidUrl(url) {
    const logPrefix = createLogPrefix('index.js', '工具函数', 'isValidUrl');
    
    if (typeof url !== 'string') {
        structuredLog('warn', logPrefix, '步骤 1[WARN]', `输入不是字符串: ${typeof url}`);
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        const validProtocols = ['http:', 'https:'];
        
        if (!validProtocols.includes(urlObj.protocol)) {
            structuredLog('warn', logPrefix, '步骤 2[WARN]', `无效的协议: ${urlObj.protocol}`);
            return false;
        }
        
        structuredLog('info', logPrefix, '步骤 2[SUCCESS]', 'URL格式验证通过');
        return true;
    } catch (error) {
        structuredLog('warn', logPrefix, '步骤 2[WARN]', `URL格式无效: ${error.message}`);
        return false;
    }
}

/**
 * @功能概述: 提取URL的查询参数为对象
 * @param {string} url - URL字符串
 * @returns {Object} 查询参数对象
 * @执行流程:
 *   1. 验证URL格式
 *   2. 解析查询参数
 *   3. 转换为对象格式
 *   4. 返回参数对象
 */
export function parseQueryParams(url) {
    const logPrefix = createLogPrefix('index.js', '工具函数', 'parseQueryParams');
    
    if (!isValidUrl(url)) {
        structuredLog('warn', logPrefix, '步骤 1[WARN]', 'URL格式无效');
        return {};
    }
    
    try {
        const urlObj = new URL(url);
        const params = {};
        
        for (const [key, value] of urlObj.searchParams.entries()) {
            params[key] = value;
        }
        
        structuredLog('info', logPrefix, '步骤 2[SUCCESS]', `解析到${Object.keys(params).length}个查询参数`);
        return params;
    } catch (error) {
        structuredLog('error', logPrefix, '步骤 2[ERROR]', `查询参数解析失败: ${error.message}`);
        return {};
    }
}

/**
 * @功能概述: 生成随机字符串，用于ID生成等场景
 * @param {number} length - 字符串长度，默认8位
 * @param {string} charset - 字符集，默认字母数字
 * @returns {string} 随机字符串
 * @执行流程:
 *   1. 验证输入参数
 *   2. 生成随机字符
 *   3. 组合成字符串
 *   4. 返回结果
 */
export function generateRandomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    if (length <= 0) return '';
    
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
}

/**
 * @功能概述: 延迟执行函数，返回Promise
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} 延迟Promise
 * @执行流程:
 *   1. 验证延迟时间
 *   2. 创建Promise
 *   3. 设置定时器
 *   4. 返回Promise
 */
export function delay(ms) {
    if (ms <= 0) return Promise.resolve();
    
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * @功能概述: 重试执行函数，支持指定重试次数和延迟
 * @param {Function} fn - 待执行的函数
 * @param {number} maxRetries - 最大重试次数，默认3次
 * @param {number} delayMs - 重试延迟，默认1000ms
 * @returns {Promise} 执行结果Promise
 * @执行流程:
 *   1. 尝试执行函数
 *   2. 捕获执行错误
 *   3. 延迟后重试
 *   4. 达到最大次数后抛出错误
 */
export async function retryWithDelay(fn, maxRetries = 3, delayMs = 1000) {
    const logPrefix = createLogPrefix('index.js', '工具函数', 'retryWithDelay');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            structuredLog('info', logPrefix, `步骤 ${attempt}`, `尝试执行函数 (${attempt}/${maxRetries})`);
            const result = await fn();
            structuredLog('info', logPrefix, `步骤 ${attempt}[SUCCESS]`, '函数执行成功');
            return result;
        } catch (error) {
            structuredLog('warn', logPrefix, `步骤 ${attempt}[WARN]`, `执行失败: ${error.message}`);
            
            if (attempt === maxRetries) {
                structuredLog('error', logPrefix, `步骤 ${attempt}[ERROR]`, '达到最大重试次数，执行失败');
                throw error;
            }
            
            if (delayMs > 0) {
                structuredLog('info', logPrefix, `步骤 ${attempt}.1`, `延迟${delayMs}ms后重试`);
                await delay(delayMs);
            }
        }
    }
}

/**
 * @功能概述: 检查对象是否为空（null、undefined或空对象）
 * @param {*} obj - 待检查的对象
 * @returns {boolean} 是否为空
 * @执行流程:
 *   1. 检查null和undefined
 *   2. 检查对象类型
 *   3. 检查对象属性
 *   4. 返回检查结果
 */
export function isEmpty(obj) {
    if (obj === null || obj === undefined) {
        return true;
    }
    
    if (typeof obj === 'string' || Array.isArray(obj)) {
        return obj.length === 0;
    }
    
    if (typeof obj === 'object') {
        return Object.keys(obj).length === 0;
    }
    
    return false;
}
