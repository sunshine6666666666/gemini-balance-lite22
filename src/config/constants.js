/**
 * @功能概述: 项目常量定义模块，集中管理所有常量和配置项
 * @运行时: Edge Runtime (Web标准API)
 * @常量分类: API配置、时间配置、错误码、模型映射、安全配置等
 * @维护原则: 所有硬编码值都应在此文件中定义，便于统一管理和修改
 */

/**
 * @功能概述: Gemini API相关常量配置
 * @API版本: 使用v1beta版本，支持最新功能
 * @基础URL: Google Generative Language API的基础地址
 * @模型前缀: Gemini模型的标准前缀
 */
export const GEMINI_API = {
    BASE_URL: 'https://generativelanguage.googleapis.com',
    API_VERSION: 'v1beta',
    MODEL_PREFIX: 'models/',
    
    // 支持的任务类型
    TASKS: {
        GENERATE_CONTENT: 'generateContent',
        STREAM_GENERATE_CONTENT: 'streamGenerateContent',
        EMBED_CONTENT: 'embedContent',
        LIST_MODELS: 'models'
    },
    
    // 流式响应配置
    STREAM: {
        ALT_PARAMETER: 'alt=sse',
        CONTENT_TYPE: 'text/plain; charset=utf-8'
    }
};

/**
 * @功能概述: OpenAI兼容API端点配置
 * @端点映射: OpenAI格式到Gemini格式的端点映射
 * @支持功能: 聊天完成、嵌入、模型列表、语音合成等
 */
export const OPENAI_ENDPOINTS = {
    CHAT_COMPLETIONS: '/chat/completions',
    COMPLETIONS: '/completions',
    EMBEDDINGS: '/embeddings',
    MODELS: '/models',
    AUDIO_SPEECH: '/audio/speech',
    AUDIO_TRANSCRIPTIONS: '/audio/transcriptions',
    AUDIO_TRANSLATIONS: '/audio/translations'
};

/**
 * @功能概述: 负载均衡配置常量
 * @时间窗口: 10秒窗口，确保短期内API Key使用均匀
 * @算法类型: 时间窗口轮询算法
 * @统计周期: 负载均衡统计的时间周期
 */
export const LOAD_BALANCER = {
    WINDOW_SIZE: 10000, // 10秒时间窗口（毫秒）
    ALGORITHM: 'time-window-polling',
    STATS_INTERVAL: 60000, // 1分钟统计周期
    MAX_RETRIES_PER_KEY: 1, // 每个Key最大重试次数
    
    // 负载均衡上下文
    CONTEXTS: {
        DEFAULT: 'default',
        OPENAI: 'openai',
        GEMINI: 'gemini',
        VALIDATION: 'validation'
    }
};

/**
 * @功能概述: 请求超时和重试配置
 * @超时时间: 45秒超时，适应Vercel Edge Functions限制
 * @重试策略: 立即切换到下一个API Key，无延迟重试
 * @性能阈值: 用于性能监控和告警的阈值设置
 */
export const TIMEOUT_CONFIG = {
    REQUEST_TIMEOUT: 45000, // 45秒请求超时
    ABORT_TIMEOUT: 45000, // 45秒abort超时
    
    // 性能阈值（毫秒）
    PERFORMANCE_THRESHOLDS: {
        NORMAL: 5000, // 5秒以内正常
        WARNING: 10000, // 10秒以内警告
        SLOW: 30000, // 30秒以内慢速
        CRITICAL: 45000 // 45秒临界
    },
    
    // 重试配置
    RETRY: {
        IMMEDIATE: true, // 立即重试
        DELAY: 0, // 重试延迟（毫秒）
        MAX_ATTEMPTS: 'auto' // 自动根据API Key数量确定
    }
};

/**
 * @功能概述: 模型映射和默认配置
 * @默认模型: gemini-2.5-flash作为默认模型
 * @模型映射: OpenAI模型名到Gemini模型名的映射
 * @模型特性: 各模型的特性和限制配置
 */
export const MODEL_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    
    // OpenAI到Gemini模型映射
    MODEL_MAPPING: {
        'gpt-4': 'gemini-2.5-pro',
        'gpt-4-turbo': 'gemini-2.5-pro',
        'gpt-3.5-turbo': 'gemini-2.5-flash',
        'text-embedding-ada-002': 'text-embedding-004',
        'text-embedding-3-small': 'text-embedding-004',
        'text-embedding-3-large': 'text-embedding-004'
    },
    
    // 支持的Gemini模型
    SUPPORTED_MODELS: [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'text-embedding-004'
    ],
    
    // 模型特性配置
    MODEL_FEATURES: {
        'gemini-2.5-pro': {
            maxTokens: 8192,
            supportsStreaming: true,
            supportsTools: true,
            supportsVision: true
        },
        'gemini-2.5-flash': {
            maxTokens: 8192,
            supportsStreaming: true,
            supportsTools: true,
            supportsVision: true
        }
    }
};

/**
 * @功能概述: 安全配置常量
 * @API Key格式: Gemini API Key的标准格式要求
 * @白名单配置: 可信API Key的验证配置
 * @脱敏配置: 敏感信息脱敏的显示配置
 */
export const SECURITY_CONFIG = {
    // API Key格式验证
    API_KEY_FORMAT: {
        MIN_LENGTH: 20,
        MAX_LENGTH: 100,
        PREFIX: 'AIzaSy',
        PATTERN: /^AIzaSy[A-Za-z0-9_-]+$/
    },
    
    // 脱敏配置
    MASKING: {
        PREFIX_LENGTH: 8,
        SUFFIX_LENGTH: 8,
        MASK_CHAR: '*',
        SEPARATOR: '...'
    },
    
    // 白名单配置
    WHITELIST: {
        ENABLED: true,
        ENV_VAR: 'TRUSTED_API_KEYS',
        BACKUP_ENV_VAR: 'BACKUP_API_KEYS',
        SEPARATOR: ','
    },
    
    // 安全头部
    SECURITY_HEADERS: {
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Processed-By': 'Enhanced-Gemini-Proxy'
    }
};

/**
 * @功能概述: HTTP状态码和错误码常量
 * @状态码: 标准HTTP状态码定义
 * @错误码: 业务逻辑错误码定义
 * @错误消息: 标准化错误消息模板
 */
export const HTTP_STATUS = {
    // 成功状态码
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    
    // 客户端错误状态码
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    RATE_LIMITED: 429,
    
    // 服务器错误状态码
    INTERNAL_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};

/**
 * @功能概述: 日志配置常量
 * @日志级别: 支持的日志级别定义
 * @日志格式: 标准化日志格式配置
 * @日志标记: 用于日志分类的emoji标记
 */
export const LOGGING_CONFIG = {
    // 日志级别
    LEVELS: {
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error',
        DEBUG: 'debug'
    },
    
    // 日志格式
    FORMAT: {
        PREFIX_TEMPLATE: '[文件：{fileName}][{moduleName}][{functionName}][ReqID:{reqId}]',
        STEP_TEMPLATE: '[步骤 {step}]',
        STATUS_TEMPLATE: '[{status}]'
    },
    
    // 日志标记（emoji）
    MARKERS: {
        REQUEST: '📥',
        RESPONSE: '📤',
        SUCCESS: '✅',
        ERROR: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️',
        SECURITY: '🔒',
        PERFORMANCE: '📊',
        NETWORK: '🌐',
        KEY: '🔑',
        LOAD_BALANCER: '⚖️',
        TIMEOUT: '⏰',
        RETRY: '🔄'
    }
};

/**
 * @功能概述: CORS配置常量
 * @允许来源: 跨域请求的允许来源配置
 * @允许方法: 支持的HTTP方法列表
 * @允许头部: 支持的请求头部列表
 */
export const CORS_CONFIG = {
    ALLOW_ORIGIN: '*',
    ALLOW_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    ALLOW_HEADERS: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'DNT',
        'Cache-Control',
        'X-Mx-ReqToken',
        'Keep-Alive',
        'If-Modified-Since',
        'x-goog-api-key',
        'x-vercel-protection-bypass'
    ],
    EXPOSE_HEADERS: [
        'Content-Length',
        'Content-Type',
        'X-Processed-By',
        'X-Request-ID'
    ],
    MAX_AGE: 86400, // 24小时
    CREDENTIALS: false
};

/**
 * @功能概述: 环境变量名称常量
 * @配置变量: 所有使用的环境变量名称定义
 * @默认值: 环境变量的默认值配置
 */
export const ENV_VARS = {
    // API Key相关
    TRUSTED_API_KEYS: 'TRUSTED_API_KEYS',
    BACKUP_API_KEYS: 'BACKUP_API_KEYS',
    
    // Vercel相关
    VERCEL_AUTOMATION_BYPASS_SECRET: 'VERCEL_AUTOMATION_BYPASS_SECRET',
    VERCEL_ENV: 'VERCEL_ENV',
    
    // 功能开关
    ENABLE_LOGGING: 'ENABLE_LOGGING',
    ENABLE_PERFORMANCE_MONITORING: 'ENABLE_PERFORMANCE_MONITORING',
    ENABLE_CORS: 'ENABLE_CORS',
    
    // 默认值
    DEFAULTS: {
        ENABLE_LOGGING: 'true',
        ENABLE_PERFORMANCE_MONITORING: 'true',
        ENABLE_CORS: 'true'
    }
};

/**
 * @功能概述: 内容类型常量
 * @MIME类型: 常用的MIME类型定义
 * @字符编码: 标准字符编码配置
 */
export const CONTENT_TYPES = {
    JSON: 'application/json',
    JSON_UTF8: 'application/json; charset=utf-8',
    TEXT_PLAIN: 'text/plain',
    TEXT_PLAIN_UTF8: 'text/plain; charset=utf-8',
    TEXT_HTML: 'text/html',
    TEXT_HTML_UTF8: 'text/html; charset=utf-8',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
    MULTIPART_FORM: 'multipart/form-data',
    OCTET_STREAM: 'application/octet-stream'
};
