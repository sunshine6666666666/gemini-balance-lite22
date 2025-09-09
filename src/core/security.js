/**
 * @功能概述: 安全验证模块，提供API Key白名单验证和备用Key池管理
 * @运行时: Edge Runtime (Web标准API)
 * @安全验证: API Key白名单验证，防止未授权使用备用Key池
 * @备用机制: 单Key时启用备用Key池，多Key时使用原始Key池
 * @脱敏处理: 提供API Key脱敏显示功能，保护敏感信息
 */

/**
 * @功能概述: 验证API Key是否在可信白名单中
 * @param {string} apiKey - 待验证的API Key
 * @returns {boolean} 验证结果，true表示在白名单中
 * @执行流程:
 *   1. 获取环境变量中的可信API Key列表
 *   2. 解析逗号分隔的Key列表
 *   3. 检查输入Key是否在白名单中
 *   4. 返回验证结果
 * @安全策略: 只有白名单中的Key才能使用备用Key池
 */
export function validateTrustedApiKey(apiKey) {
    const reqId = Date.now().toString(); // 生成请求ID用于日志追踪
    const logPrefix = `[文件：security.js][安全验证器][validateTrustedApiKey][ReqID:${reqId}] `;
    
    // 步骤 1: 验证输入参数
    if (!apiKey || typeof apiKey !== 'string') {
        console.log(`${logPrefix}[步骤 1][ERROR] API Key参数无效`); // 记录参数错误
        return false;
    }
    
    // 步骤 2: 获取可信API Key列表
    const trustedKeys = process.env.TRUSTED_API_KEYS;
    if (!trustedKeys) {
        console.log(`${logPrefix}[步骤 2][WARN] 未配置TRUSTED_API_KEYS环境变量`); // 记录配置缺失
        return false;
    }
    
    // 步骤 3: 解析可信Key列表
    const trustedKeyList = trustedKeys.split(',').map(key => key.trim()).filter(key => key);
    console.log(`${logPrefix}[步骤 3] 可信Key列表包含${trustedKeyList.length}个Key`); // 记录Key数量
    
    // 步骤 4: 检查API Key是否在白名单中
    const isValid = trustedKeyList.includes(apiKey);
    console.log(`${logPrefix}[步骤 4] 白名单验证结果: ${isValid ? '通过' : '失败'} - Key: ${maskApiKey(apiKey)}`); // 记录验证结果
    
    return isValid;
}

/**
 * @功能概述: 获取备用API Key池，仅当输入Key通过白名单验证时启用
 * @param {string} inputApiKey - 输入的API Key，用于白名单验证
 * @returns {Array<string>} 备用API Key数组，验证失败时返回空数组
 * @执行流程:
 *   1. 验证输入Key是否在白名单中
 *   2. 如果验证通过，获取备用Key池
 *   3. 解析并返回备用Key数组
 *   4. 验证失败时返回空数组
 * @安全机制: 只有可信Key才能访问备用Key池，防止滥用
 */
export function getBackupApiKeys(inputApiKey) {
    const reqId = Date.now().toString(); // 生成请求ID用于日志追踪
    const logPrefix = `[文件：security.js][安全验证器][getBackupApiKeys][ReqID:${reqId}] `;
    
    console.log(`${logPrefix}[步骤 1] 开始获取备用Key池 - 输入Key: ${maskApiKey(inputApiKey)}`); // 记录开始获取
    
    // 步骤 1: 验证输入Key是否在白名单中
    if (!validateTrustedApiKey(inputApiKey)) {
        console.log(`${logPrefix}[步骤 1][SECURITY] 输入Key未通过白名单验证，拒绝访问备用Key池`); // 记录安全拒绝
        return [];
    }
    
    // 步骤 2: 获取备用API Key池
    const backupKeys = process.env.BACKUP_API_KEYS;
    if (!backupKeys) {
        console.log(`${logPrefix}[步骤 2][WARN] 未配置BACKUP_API_KEYS环境变量`); // 记录配置缺失
        return [];
    }
    
    // 步骤 3: 解析备用Key列表
    const backupKeyList = backupKeys.split(',').map(key => key.trim()).filter(key => key);
    console.log(`${logPrefix}[步骤 3][SUCCESS] 获取到${backupKeyList.length}个备用Key`); // 记录获取成功
    
    return backupKeyList;
}

/**
 * @功能概述: API Key脱敏显示，保护敏感信息
 * @param {string} apiKey - 原始API Key
 * @param {number} prefixLength - 前缀显示长度，默认8位
 * @param {number} suffixLength - 后缀显示长度，默认8位
 * @returns {string} 脱敏后的API Key字符串
 * @执行流程:
 *   1. 验证输入参数
 *   2. 计算前缀和后缀
 *   3. 生成脱敏字符串
 *   4. 返回脱敏结果
 * @脱敏格式: 前8位...后8位，中间用省略号代替
 */
export function maskApiKey(apiKey, prefixLength = 8, suffixLength = 8) {
    // 验证输入参数
    if (!apiKey || typeof apiKey !== 'string') {
        return '[无效Key]';
    }
    
    // 如果Key太短，直接返回星号
    if (apiKey.length <= prefixLength + suffixLength) {
        return '*'.repeat(apiKey.length);
    }
    
    // 生成脱敏字符串
    const prefix = apiKey.substring(0, prefixLength);
    const suffix = apiKey.substring(apiKey.length - suffixLength);
    
    return `${prefix}...${suffix}`;
}

/**
 * @功能概述: 智能API Key管理，根据输入Key数量决定是否启用备用Key池
 * @param {Array<string>} inputApiKeys - 输入的API Key数组
 * @returns {Array<string>} 最终使用的API Key数组
 * @执行流程:
 *   1. 检查输入Key数量
 *   2. 单Key时验证白名单并启用备用Key池
 *   3. 多Key时直接使用输入Key
 *   4. 返回最终Key数组
 * @智能策略: 单Key启用备用池，多Key保持原样，平衡安全性和灵活性
 */
export function getEffectiveApiKeys(inputApiKeys) {
    const reqId = Date.now().toString(); // 生成请求ID用于日志追踪
    const logPrefix = `[文件：security.js][安全验证器][getEffectiveApiKeys][ReqID:${reqId}] `;
    
    console.log(`${logPrefix}[步骤 1] 智能Key管理 - 输入Key数量: ${inputApiKeys.length}`); // 记录输入Key数量
    
    // 步骤 1: 验证输入参数
    if (!inputApiKeys || inputApiKeys.length === 0) {
        console.log(`${logPrefix}[步骤 1][ERROR] 输入Key数组为空`); // 记录参数错误
        return [];
    }
    
    // 步骤 2: 单Key时启用备用Key池（需要白名单验证）
    if (inputApiKeys.length <= 1) {
        const inputApiKey = inputApiKeys[0];
        console.log(`${logPrefix}[步骤 2] 单Key模式，尝试启用备用Key池 - Key: ${maskApiKey(inputApiKey)}`); // 记录单Key模式
        
        // 获取备用Key池
        const backupKeys = getBackupApiKeys(inputApiKey);
        if (backupKeys.length > 0) {
            console.log(`${logPrefix}[步骤 2.1][SUCCESS] 启用备用Key池，总Key数: ${backupKeys.length}`); // 记录备用池启用
            return backupKeys;
        } else {
            console.log(`${logPrefix}[步骤 2.2][FALLBACK] 备用Key池不可用，使用原始Key`); // 记录回退到原始Key
            return inputApiKeys;
        }
    }
    
    // 步骤 3: 多Key时直接使用输入Key
    console.log(`${logPrefix}[步骤 3] 多Key模式，直接使用输入Key - 数量: ${inputApiKeys.length}`); // 记录多Key模式
    return inputApiKeys;
}

/**
 * @功能概述: 验证API Key格式的有效性
 * @param {string} apiKey - 待验证的API Key
 * @returns {boolean} 格式验证结果
 * @执行流程:
 *   1. 检查Key是否为字符串
 *   2. 检查Key长度是否合理
 *   3. 检查Key是否符合Gemini API Key格式
 *   4. 返回验证结果
 * @格式要求: Gemini API Key通常以AIzaSy开头，长度在30-50字符之间
 */
export function validateApiKeyFormat(apiKey) {
    const logPrefix = `[文件：security.js][安全验证器][validateApiKeyFormat] `;
    
    // 步骤 1: 基本类型检查
    if (!apiKey || typeof apiKey !== 'string') {
        console.log(`${logPrefix}[步骤 1][ERROR] API Key不是有效字符串`); // 记录类型错误
        return false;
    }
    
    // 步骤 2: 长度检查
    if (apiKey.length < 20 || apiKey.length > 100) {
        console.log(`${logPrefix}[步骤 2][ERROR] API Key长度不合理: ${apiKey.length}`); // 记录长度错误
        return false;
    }
    
    // 步骤 3: 格式检查（Gemini API Key通常以AIzaSy开头）
    if (!apiKey.startsWith('AIzaSy')) {
        console.log(`${logPrefix}[步骤 3][WARN] API Key格式可能不正确，不以AIzaSy开头`); // 记录格式警告
        // 不返回false，因为可能有其他格式的有效Key
    }
    
    console.log(`${logPrefix}[步骤 4][SUCCESS] API Key格式验证通过 - Key: ${maskApiKey(apiKey)}`); // 记录验证通过
    return true;
}
