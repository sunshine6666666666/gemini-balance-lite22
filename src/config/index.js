/**
 * @功能概述: 配置管理主模块，统一管理环境变量和应用配置
 * @运行时: Edge Runtime (Web标准API)
 * @配置来源: 环境变量、默认值、常量定义
 * @配置验证: 自动验证必要配置项的有效性
 * @适用场景: 所有需要配置信息的模块，提供统一的配置访问接口
 */

import {
    GEMINI_API,
    OPENAI_ENDPOINTS,
    LOAD_BALANCER,
    TIMEOUT_CONFIG,
    MODEL_CONFIG,
    SECURITY_CONFIG,
    HTTP_STATUS,
    LOGGING_CONFIG,
    CORS_CONFIG,
    ENV_VARS,
    CONTENT_TYPES
} from './constants.js';

// 注意：避免循环导入，这里不导入logger

/**
 * @功能概述: 获取环境变量值，支持默认值和类型转换
 * @param {string} key - 环境变量名
 * @param {*} defaultValue - 默认值
 * @param {string} type - 值类型（string/number/boolean/array）
 * @returns {*} 环境变量值或默认值
 * @执行流程:
 *   1. 获取环境变量原始值
 *   2. 根据类型进行转换
 *   3. 返回转换后的值或默认值
 */
function getEnvVar(key, defaultValue = null, type = 'string') {
    const rawValue = process.env[key];

    if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (defaultValue !== null) {
            return defaultValue;
        }
        return null;
    }

    // 根据类型转换值
    switch (type) {
        case 'boolean':
            return rawValue.toLowerCase() === 'true';

        case 'number':
            const numValue = parseInt(rawValue, 10);
            if (isNaN(numValue)) {
                return defaultValue;
            }
            return numValue;

        case 'array':
            return rawValue.split(',').map(item => item.trim()).filter(item => item);

        case 'string':
        default:
            return rawValue;
    }
}

/**
 * @功能概述: 应用配置对象，集中管理所有配置项
 * @配置分类: API配置、安全配置、性能配置、功能开关等
 * @配置验证: 自动验证关键配置项的有效性
 */
export const config = {
    // API配置
    api: {
        gemini: {
            baseUrl: GEMINI_API.BASE_URL,
            version: GEMINI_API.API_VERSION,
            timeout: TIMEOUT_CONFIG.REQUEST_TIMEOUT
        },
        openai: {
            endpoints: OPENAI_ENDPOINTS,
            defaultModel: MODEL_CONFIG.DEFAULT_MODEL,
            modelMapping: MODEL_CONFIG.MODEL_MAPPING
        }
    },
    
    // 安全配置
    security: {
        trustedApiKeys: getEnvVar(ENV_VARS.TRUSTED_API_KEYS, '', 'array'),
        backupApiKeys: getEnvVar(ENV_VARS.BACKUP_API_KEYS, '', 'array'),
        apiKeyFormat: SECURITY_CONFIG.API_KEY_FORMAT,
        masking: SECURITY_CONFIG.MASKING,
        securityHeaders: SECURITY_CONFIG.SECURITY_HEADERS
    },
    
    // 负载均衡配置
    loadBalancer: {
        windowSize: LOAD_BALANCER.WINDOW_SIZE,
        algorithm: LOAD_BALANCER.ALGORITHM,
        maxRetries: LOAD_BALANCER.MAX_RETRIES_PER_KEY,
        contexts: LOAD_BALANCER.CONTEXTS
    },
    
    // 超时和性能配置
    performance: {
        requestTimeout: TIMEOUT_CONFIG.REQUEST_TIMEOUT,
        thresholds: TIMEOUT_CONFIG.PERFORMANCE_THRESHOLDS,
        retry: TIMEOUT_CONFIG.RETRY
    },
    
    // CORS配置
    cors: {
        allowOrigin: CORS_CONFIG.ALLOW_ORIGIN,
        allowMethods: CORS_CONFIG.ALLOW_METHODS,
        allowHeaders: CORS_CONFIG.ALLOW_HEADERS,
        exposeHeaders: CORS_CONFIG.EXPOSE_HEADERS,
        maxAge: CORS_CONFIG.MAX_AGE,
        credentials: CORS_CONFIG.CREDENTIALS
    },
    
    // 日志配置
    logging: {
        enabled: getEnvVar(ENV_VARS.ENABLE_LOGGING, ENV_VARS.DEFAULTS.ENABLE_LOGGING, 'boolean'),
        levels: LOGGING_CONFIG.LEVELS,
        format: LOGGING_CONFIG.FORMAT,
        markers: LOGGING_CONFIG.MARKERS
    },
    
    // 功能开关
    features: {
        performanceMonitoring: getEnvVar(ENV_VARS.ENABLE_PERFORMANCE_MONITORING, ENV_VARS.DEFAULTS.ENABLE_PERFORMANCE_MONITORING, 'boolean'),
        corsEnabled: getEnvVar(ENV_VARS.ENABLE_CORS, ENV_VARS.DEFAULTS.ENABLE_CORS, 'boolean')
    },
    
    // Vercel环境配置
    vercel: {
        env: getEnvVar(ENV_VARS.VERCEL_ENV, 'development'),
        bypassSecret: getEnvVar(ENV_VARS.VERCEL_AUTOMATION_BYPASS_SECRET, '')
    },
    
    // 内容类型配置
    contentTypes: CONTENT_TYPES,
    
    // HTTP状态码
    httpStatus: HTTP_STATUS
};

/**
 * @功能概述: 验证配置的有效性，检查必要配置项
 * @returns {Object} 验证结果，包含是否有效和错误信息
 * @执行流程:
 *   1. 检查API Key配置
 *   2. 验证超时配置
 *   3. 检查模型配置
 *   4. 返回验证结果
 */
export function validateConfig() {
    const errors = [];
    const warnings = [];

    // 验证API Key配置
    if (config.security.trustedApiKeys.length === 0) {
        warnings.push('未配置可信API Key列表 (TRUSTED_API_KEYS)');
    }

    if (config.security.backupApiKeys.length === 0) {
        warnings.push('未配置备用API Key列表 (BACKUP_API_KEYS)');
    }

    // 验证超时配置
    if (config.performance.requestTimeout <= 0) {
        errors.push('请求超时时间必须大于0');
    }

    if (config.performance.requestTimeout > 60000) {
        warnings.push('请求超时时间超过60秒，可能超出Vercel限制');
    }

    // 验证负载均衡配置
    if (config.loadBalancer.windowSize <= 0) {
        errors.push('负载均衡时间窗口必须大于0');
    }

    // 验证模型配置
    if (!config.api.openai.defaultModel) {
        errors.push('未配置默认模型');
    }

    const isValid = errors.length === 0;

    return {
        isValid,
        errors,
        warnings
    };
}

/**
 * @功能概述: 获取运行时环境信息
 * @returns {Object} 环境信息对象
 * @执行流程:
 *   1. 检测运行环境
 *   2. 收集环境信息
 *   3. 返回环境对象
 */
export function getEnvironmentInfo() {
    const envInfo = {
        // 基本环境信息
        isVercel: !!process.env.VERCEL,
        vercelEnv: config.vercel.env,
        isProduction: config.vercel.env === 'production',
        isDevelopment: config.vercel.env === 'development',
        isPreview: config.vercel.env === 'preview',

        // 运行时信息
        runtime: 'edge',
        platform: 'vercel',

        // 功能开关状态
        features: {
            logging: config.logging.enabled,
            performanceMonitoring: config.features.performanceMonitoring,
            cors: config.features.corsEnabled
        },

        // 配置统计
        stats: {
            trustedKeysCount: config.security.trustedApiKeys.length,
            backupKeysCount: config.security.backupApiKeys.length,
            supportedModelsCount: MODEL_CONFIG.SUPPORTED_MODELS.length
        }
    };

    return envInfo;
}

/**
 * @功能概述: 获取特定模块的配置
 * @param {string} module - 模块名称
 * @returns {Object} 模块配置对象
 * @执行流程:
 *   1. 验证模块名称
 *   2. 返回对应配置
 *   3. 处理不存在的模块
 */
export function getModuleConfig(module) {
    if (!config[module]) {
        return {};
    }

    return config[module];
}

/**
 * @功能概述: 初始化配置系统，执行配置验证和环境检查
 * @returns {Object} 初始化结果
 * @执行流程:
 *   1. 验证配置有效性
 *   2. 收集环境信息
 *   3. 记录初始化状态
 *   4. 返回初始化结果
 */
export function initializeConfig() {
    // 验证配置
    const validation = validateConfig();

    // 收集环境信息
    const environment = getEnvironmentInfo();

    // 记录初始化状态
    const initResult = {
        success: validation.isValid,
        validation,
        environment,
        timestamp: new Date().toISOString()
    };

    return initResult;
}

// 导出常量以便其他模块使用
export {
    GEMINI_API,
    OPENAI_ENDPOINTS,
    LOAD_BALANCER,
    TIMEOUT_CONFIG,
    MODEL_CONFIG,
    SECURITY_CONFIG,
    HTTP_STATUS,
    LOGGING_CONFIG,
    CORS_CONFIG,
    ENV_VARS,
    CONTENT_TYPES
};
