---
type: "always_apply"
description: "globs:"
---

# Vercel边缘函数项目代码注释标准
## gemini-balance-lite22专用版本

目标: 为gemini-balance-lite22这个Vercel边缘函数项目统一代码注释风格，提高代码的可读性和可维护性。

!!! 严格执行: AI 在编写或修改代码时，必须遵循以下注释标准添加注释。注释的目的是解释代码意图，而不是简单重复代码本身。

## 项目特定背景

本项目是基于Vercel Edge Functions的Gemini API代理服务，具有以下技术特征：
- **运行环境**: Vercel Edge Runtime (Web标准API，非Node.js)
- **核心功能**: 智能负载均衡、API Key轮询、故障切换、白名单验证
- **API格式**: 支持原生Gemini API和OpenAI兼容格式
- **响应类型**: 流式和非流式响应处理
- **日志方式**: 使用console.log进行详细的步骤追踪和emoji标识

## 注释优先级策略

### 必须注释 (严格执行)
- 所有导出的处理函数 (如handleRequest、fetch等)
- 负载均衡和故障切换相关函数
- API格式转换函数 (OpenAI ↔ Gemini)
- 白名单验证和安全相关函数
- 流式响应处理逻辑
- 复杂的算法实现 (时间窗口轮询等)
- 错误处理和重试机制

### 推荐注释 (重要功能)
- 工具函数和辅助方法
- 数据转换和格式化逻辑
- HTTP请求/响应处理
- 配置和环境变量处理

### 可选注释 (简单逻辑)
- 简单的getter/setter方法
- 一目了然的数据操作
- 标准的Web API调用

## 注释类型

主要使用两种类型的注释：块注释和行内注释。

### 1. 块注释 (Block Comments)

用于注释整个文件、类、函数、方法或复杂的代码块。

#### 基础结构要求

*   位置: 紧邻在被注释代码块的正上方。
*   语法: 使用JavaScript/TypeScript的标准块注释语法 (`/** ... */`)。
*   格式: 使用 JSDoc 风格，星号对齐，内部保持统一缩进。

#### 通用函数和方法注释模板

```javascript
/**
 * @功能概述: [1-3句话描述功能、目的和核心逻辑]
 * @param {类型} 参数名 - [参数用途和约束]
 * @returns {类型} [返回值描述或系统影响]
 * @执行流程: [可选，列出关键处理步骤]
 */
```

#### 项目特定注释模板

**Vercel边缘函数入口模板:**
```javascript
/**
 * @功能概述: [边缘函数的主要用途和处理逻辑]
 * @运行时: Edge Runtime (Web标准API)
 * @请求处理: [支持的HTTP方法和路径]
 * @响应格式: [返回的数据格式和状态码]
 * @性能特征: [超时时间、区域配置等]
 */
```

**API代理处理函数模板:**
```javascript
/**
 * @功能概述: [API代理的具体功能和转换逻辑]
 * @支持格式: [原生Gemini API / OpenAI兼容格式]
 * @负载均衡: [使用的负载均衡策略]
 * @故障切换: [错误处理和重试机制]
 * @安全验证: [白名单验证或其他安全措施]
 */
```

**负载均衡算法模板:**
```javascript
/**
 * @功能概述: [负载均衡算法的工作原理]
 * @算法类型: [时间窗口轮询/随机选择/其他]
 * @时间窗口: [窗口大小和分配策略]
 * @均衡效果: [预期的负载分布效果]
 * @适用场景: [最适合的使用场景]
 */
```

**API格式转换模板:**
```javascript
/**
 * @功能概述: [格式转换的具体内容和目标]
 * @输入格式: [OpenAI格式/Gemini格式的具体结构]
 * @输出格式: [转换后的目标格式]
 * @转换规则: [关键字段的映射和处理规则]
 * @兼容性: [支持的模型和参数范围]
 */
```

**流式响应处理模板:**
```javascript
/**
 * @功能概述: [流式响应的处理逻辑和数据流]
 * @流式协议: [SSE/WebSocket/其他协议]
 * @数据转换: [流数据的解析和转换过程]
 * @错误处理: [流中断或错误的处理策略]
 * @性能优化: [缓冲、背压等优化措施]
 */
```

#### 复杂代码段注释

对于函数内部的复杂逻辑段，使用分步说明：

```javascript
/**
 * @分步说明: [复杂逻辑段的总体描述]
 * 
 *   1. [主要步骤描述]
 *       1.1. [具体子步骤]
 *       1.2. [具体子步骤]
 *   2. [主要步骤描述]
 *       2.1. [具体子步骤]
 */
// --- 复杂代码段开始 ---
// 步骤 1.1: [对应具体实现]
// 步骤 1.2: [对应具体实现]
// --- 复杂代码段结束 ---
```

### 2. 行内注释 (Inline Comments)

用于解释单行或小段代码的具体逻辑。

#### 使用场景
*   解释复杂的表达式、算法或非显而易见的逻辑
*   说明特定选择或"魔法值"的原因
*   标记临时解决方案 (`TODO`、`FIXME`)
*   解释关键变量的含义
*   异步操作的流程说明
*   **函数内部步骤标注**: 使用 `// 步骤 X:` 格式标记主要逻辑步骤
*   **console.log语句说明**: 对所有 `console.log()` 语句添加行内注释

#### 行内注释示例

```javascript
// 步骤 1: 解析和验证API Key
const apiKeys = authHeader.split(',').map(k => k.trim()).filter(k => k); // 支持逗号分隔的多个API Key
console.log(`📋 从请求头提取到${apiKeys.length}个API Key`); // 记录提取到的API Key数量

// 步骤 2: 白名单验证（单Key时启用备用Key池）
if (apiKeys.length <= 1) {
    const inputApiKey = apiKeys[0]; // 获取用户提供的单个API Key
    if (!validateTrustedApiKey(inputApiKey)) { // 检查是否在可信白名单中
        console.log(`🚫 API Key未通过白名单验证: ${inputApiKey?.substring(0,8)}...`); // 记录验证失败
        return new Response(/* 401错误响应 */); // 返回未授权错误
    }
}

// 步骤 3: 使用时间窗口轮询算法选择API Key
const selectedKey = selectApiKeyBalanced(apiKeys); // 基于时间窗口的负载均衡选择
console.log(`🎯 选中API Key: ${selectedKey.substring(0, 8)}...`); // 记录选中的Key（脱敏显示）
```

## 通用原则

*   **清晰胜于冗余**: 优先编写清晰、自解释的代码，注释作为辅助
*   **关注"为什么"**: 注释不仅说明代码"做什么"，更要解释"为什么"这么做
*   **保持更新**: 修改代码时，务必同步更新相关注释
*   **分层应用**: 根据注释优先级策略，合理分配注释详细程度
*   **模板化**: 使用项目提供的注释模板，保持一致性
*   **Vercel特性**: 注释中体现Edge Runtime的特性和限制

## 调试与追踪日志 (Debugging and Tracing Logs)

**注意：以下日志规范针对Vercel边缘函数环境进行了优化**

除了上述规范化的代码块注释和行内注释外，在开发和调试过程中，使用详细的追踪日志至关重要。请务必使用中文记录日志。

*   目标:
    *   清晰展示代码执行的关键步骤和分支。
    *   记录重要的数据状态（输入、中间处理、输出）。
    *   在出现问题时，能够快速定位错误来源和上下文。
*   主要工具: 使用 `console.log()`, `console.warn()`, `console.error()` 等方法。
    ```javascript
    // Vercel边缘函数环境中直接使用console方法
    console.log('📥 收到请求:', req.method, url.pathname);
    console.warn('⚠️ 配置缺失:', missingConfig);
    console.error('❌ 请求失败:', error.message);
    ```
*   日志位置: 在Vercel环境中，日志输出到Vercel的函数日志系统，可通过Vercel Dashboard查看。

### 日志结构化最佳实践

1.  统一模块/处理器前缀 (Consistent Module/Handler Prefix):
    *   为每个主要模块、类或处理器函数定义一个独特且一致的日志前缀，必须严格遵循以下格式：
    *   规范格式: `[文件：文件名.js][文件名中文翻译][函数名][ReqID:${reqId || 'unknown'}]`
    *   格式说明:
        *   `[文件：文件名.js]`: 当前文件的名称，包含扩展名
        *   `[文件名中文翻译]`: 文件名的中文含义，如 `handle_request.js` 翻译为 `请求处理器`
        *   `[函数名]`: 当前执行的函数名，如 `handleRequest`
        *   `[ReqID:${reqId || 'unknown'}]`: 请求ID，用于追踪完整的请求生命周期
    *   示例:
        ```javascript
        // 在 handle_request.js 文件中，handleRequest 函数内定义日志前缀
        const reqId = Date.now().toString(); // 生成请求ID
        const logPrefix = `[文件：handle_request.js][请求处理器][handleRequest][ReqID:${reqId}] `;
        
        // 在 openai.mjs 文件中，handleCompletions 函数内定义日志前缀
        const logPrefix = `[文件：openai.mjs][OpenAI兼容器][handleCompletions][ReqID:${reqId || 'unknown'}] `;
        
        // 对于模块级别的日志（函数外部），可使用模块初始化作为函数名部分
        const moduleLogPrefix = `[文件：verify_keys.js][密钥验证器][模块初始化]`;
        ```
    *   目的: 确保所有日志具有统一且清晰的标识，便于在Vercel日志中筛选和识别特定模块的输出。

2.  分步编号与清晰描述 (Step Numbering and Clear Descriptions):
    *   对一个复杂流程中的关键执行步骤使用层级化编号。
    *   重要：日志中的步骤编号应与代码注释中的步骤编号保持一致或清晰关联。
    *   示例:
        ```javascript
        // 步骤 1: 解析请求URL和参数
        console.log(`${logPrefix}[步骤 1] 开始处理API请求`);
        // ...
        // 步骤 2: 验证API Key和白名单
        console.log(`${logPrefix}[步骤 2] 开始API Key验证`);
        console.log(`${logPrefix}[步骤 2.1] 检查白名单配置`);
        // ...
        console.warn(`${logPrefix}[步骤 2.3][WARN] API Key验证失败`);
        ```
    *   目的: 清晰展示执行路径，尤其在有多个分支或条件判断时，能快速看出代码走了哪个分支。

3.  记录关键数据状态 (Logging Key Data States):
    *   输入参数: 记录从请求中获取的核心数据及其类型。
        ```javascript
        const url = new URL(request.url);
        console.log(`${logPrefix}[步骤 1.1] 请求URL: ${url.pathname}`); // 记录请求路径
        const apiKeys = extractApiKeys(request.headers);
        console.log(`${logPrefix}[步骤 1.2] 提取到API Key数量: ${apiKeys.length}`); // 记录API Key数量
        ```
    *   重要变量: 记录影响逻辑走向或重要的中间计算结果。
    *   复杂数据结构: 使用 `JSON.stringify()` 来记录数组或对象的结构和内容。
        ```javascript
        const requestBody = await request.json();
        console.log(`${logPrefix}[步骤 2.1] 请求体: ${JSON.stringify(requestBody, null, 2)}`); // 记录完整请求体
        ```
    *   目的: 验证数据在处理过程中的正确性，以及在出错时了解当时的数据状态。

4.  上下文信息 (Contextual Information):
    *   在日志中包含关键的上下文标识，如请求ID、用户标识、API Key标识等。
    *   示例: `console.log(`${logPrefix}[步骤 3] 使用API Key: ${selectedKey.substring(0, 8)}... 发送请求`);` // 记录使用的API Key（脱敏）
    *   目的: 能够将单条日志与特定的请求、会话或业务实体关联起来。

5.  明确记录操作结果 (Logging Operation Outcomes):
    *   成功标记: 清晰记录关键操作的成功完成。
        ```javascript
        console.log(`${logPrefix}[步骤 4.1][SUCCESS] API请求成功，状态: ${response.status}`); // 记录API请求成功
        ```
    *   失败/错误标记: 记录操作失败、参数验证不通过或任何不符合预期的情况。
        ```javascript
        console.warn(`${logPrefix}[步骤 2.2][WARN] API Key不在白名单中`); // 记录白名单验证失败
        console.error(`${logPrefix}[步骤 3.1][ERROR] API请求失败: ${error.message}`); // 记录API请求错误
        ```
    *   异常捕获: 在 `try-catch` 块中，务必记录捕获到的异常的详细信息。
        ```javascript
        try {
            // ... 业务逻辑 ...
        } catch (error) {
            console.error(`${logPrefix}[UNEXPECTED_EXCEPTION] 发生未预期错误: ${error.message}`); // 记录未预期异常
            console.error(`${logPrefix}[STACK_TRACE] ${error.stack}`); // 记录错误堆栈
        }
        ```
    *   目的: 快速识别操作是否成功，以及失败的具体原因和位置。

6.  日志标记/级别 (Log Markers/Levels):
    *   使用不同的console方法来标记日志的重要性：`.log()`, `.warn()`, `.error()`。
    *   可以在日志消息内容中添加额外的emoji标记，提高可读性。
    *   目的: 提高日志的可读性和可筛选性。

### 示例：综合应用场景

#### Vercel边缘函数入口完整示例

```javascript
/**
 * @功能概述: Vercel边缘函数入口，处理所有HTTP请求并路由到相应处理器
 * @运行时: Edge Runtime (Web标准API)
 * @请求处理: 支持GET/POST，过滤静态文件请求
 * @响应格式: 根据路径返回相应的API响应或错误信息
 * @性能特征: 45秒超时，支持全球边缘节点部署
 */
export default async function handler(req) {
    const reqId = Date.now().toString(); // 生成唯一请求ID
    const logPrefix = `[文件：vercel_index.js][边缘函数入口][handler][ReqID:${reqId}] `;
    
    console.log(`${logPrefix}[步骤 1] 收到请求: ${req.method} ${new URL(req.url).pathname}`); // 记录请求基本信息

    try {
        // 步骤 1: 过滤静态文件请求
        const url = new URL(req.url);
        if (url.pathname === '/favicon.ico' || url.pathname.match(/\.(ico|png|jpg|css|js)$/)) {
            console.log(`${logPrefix}[步骤 1.1] 拦截静态文件请求: ${url.pathname}`); // 记录静态文件拦截
            return new Response('', { status: 404 }); // 返回404避免API调用
        }

        // 步骤 2: 路由到核心处理器
        console.log(`${logPrefix}[步骤 2] 路由到核心处理器`); // 记录路由操作
        return handleRequest(req); // 调用核心请求处理函数
        
    } catch (error) {
        console.error(`${logPrefix}[UNEXPECTED_EXCEPTION] 边缘函数异常: ${error.message}`); // 记录边缘函数异常
        return new Response('Internal Server Error', { status: 500 });
    }
}
```

#### API格式转换函数完整示例

```javascript
/**
 * @功能概述: 将OpenAI格式的聊天请求转换为Gemini API格式
 * @输入格式: OpenAI chat/completions格式，包含messages、model等字段
 * @输出格式: Gemini generateContent格式，包含contents、generationConfig等
 * @转换规则: 消息角色映射、参数名转换、安全设置添加
 * @兼容性: 支持gemini-2.5-pro、gemini-2.5-flash等模型
 */
async function transformOpenAIToGemini(openaiRequest, reqId) {
    const logPrefix = `[文件：openai.mjs][格式转换器][transformOpenAIToGemini][ReqID:${reqId}] `;
    
    console.log(`${logPrefix}[步骤 1] 开始OpenAI到Gemini格式转换`); // 记录转换开始
    console.log(`${logPrefix}[步骤 1.1] 原始OpenAI请求: ${JSON.stringify(openaiRequest, null, 2)}`); // 记录原始请求

    try {
        // 步骤 1: 转换消息格式
        const geminiContents = []; // 初始化Gemini消息数组
        for (const message of openaiRequest.messages) {
            // 步骤 1.1: 角色映射 (user -> user, assistant -> model)
            const role = message.role === 'assistant' ? 'model' : message.role; // OpenAI assistant映射为Gemini model
            geminiContents.push({
                role: role,
                parts: [{ text: message.content }] // 文本内容包装为parts格式
            });
        }
        console.log(`${logPrefix}[步骤 1.2] 消息转换完成，共${geminiContents.length}条`); // 记录消息转换结果

        // 步骤 2: 转换生成配置
        const generationConfig = {
            temperature: openaiRequest.temperature || 0.7, // 温度参数转换
            maxOutputTokens: openaiRequest.max_tokens || 1024, // 最大输出token转换
            topP: openaiRequest.top_p || 1.0 // top_p参数转换
        };
        console.log(`${logPrefix}[步骤 2] 生成配置转换完成`); // 记录配置转换

        // 步骤 3: 构建最终Gemini请求
        const geminiRequest = {
            contents: geminiContents, // 转换后的消息内容
            generationConfig: generationConfig, // 生成配置
            safetySettings: getDefaultSafetySettings() // 默认安全设置
        };

        console.log(`${logPrefix}[步骤 3][SUCCESS] 格式转换完成`); // 记录转换成功
        console.log(`${logPrefix}[步骤 3.1] 转换后Gemini请求: ${JSON.stringify(geminiRequest, null, 2)}`); // 记录转换结果
        
        return geminiRequest; // 返回转换后的请求
        
    } catch (error) {
        console.error(`${logPrefix}[ERROR] 格式转换失败: ${error.message}`); // 记录转换失败
        throw error; // 重新抛出错误
    }
}
```

### Vercel边缘函数代码注释与日志规范总结

*   **注释风格**: 使用 JSDoc 块注释 (`/** ... */`) 和结构化标签，包括Vercel边缘函数特定的注释模板
*   **优先级策略**: 根据代码重要性分层应用注释，确保核心API处理功能有完整注释
*   **模板化**: 使用边缘函数入口、API代理、负载均衡、格式转换等专用注释模板
*   **行内注释**: 对复杂逻辑、异步操作、关键步骤和所有console.log语句添加说明
*   **日志记录**: 使用console方法进行日志记录，严格遵循日志前缀和步骤编号规范
*   **步骤对应**: 确保代码注释中的步骤编号与日志记录中的步骤编号一致
*   **上下文追踪**: 在日志中记录关键数据状态和上下文信息，便于问题定位
*   **Vercel特性**: 注释和日志中体现Edge Runtime的特性、限制和最佳实践

请 AI 严格遵循以上针对Vercel边缘函数项目优化的注释规范，特别是针对gemini-balance-lite22项目的API代理、负载均衡和格式转换等特定要求，以提高代码库的整体质量和可维护性。
