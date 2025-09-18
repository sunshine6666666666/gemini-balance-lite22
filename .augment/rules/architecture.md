---
type: "manual"
---

# Gemini Balance Lite 22 - 架构文档

## 🏗️ 项目架构概述

本项目是基于Vercel Edge Functions的Gemini API代理服务，采用极简三文件架构设计，专注于高可读性日志和简洁代码结构。

### 🎯 核心价值
- **LLM转发和调试工具**: 核心功能是API代理和请求调试
- **日志可读性**: 能在日志中清晰看到请求+LLM响应的全过程
- **代码简洁**: 避免过度模块化，专注核心功能

## 📁 文件结构

```
gemini-balance-lite22/
├── api/
│   └── vercel_index.js          # Vercel入口文件
├── src/
│   ├── utils.js                 # 工具函数集合 (232行)
│   ├── gemini-proxy.js          # 主代理逻辑 (200行)
│   ├── openai-adapter.js        # OpenAI兼容层 (300行)
│   └── verify_keys.js           # API Key验证工具
├── .env                         # 生产环境配置
├── .env.local                   # 本地开发配置
├── .env.preview                 # Preview环境配置
└── vercel.json                  # Vercel部署配置
```

## 📋 文件职责详解

### 1. `api/vercel_index.js` - Vercel入口文件
**职责**: Vercel Edge Function的入口点
- 过滤静态文件请求（favicon、图片等）
- 路由到主处理器
- 极简设计，仅做基础过滤

### 2. `src/utils.js` - 工具函数集合
**职责**: 提供所有核心工具函数和高可读性日志
- 🔍 **日志系统**: 请求追踪、错误记录、性能监控
- 🔐 **安全验证**: API Key白名单验证
- ⚖️ **负载均衡**: 时间窗口轮询算法
- 🌐 **网络工具**: 增强fetch、CORS处理、JSON安全解析
- 🛠️ **辅助函数**: 请求ID生成、错误处理等

### 3. `src/gemini-proxy.js` - 主代理逻辑
**职责**: 统一的请求处理入口和Gemini原生API处理
- 🚦 **路由分发**: 判断OpenAI兼容请求 vs Gemini原生请求
- 🏠 **基础服务**: 首页访问、CORS预检、API Key验证
- 🤖 **Gemini处理**: Gemini原生API请求代理
- 🌊 **响应处理**: 流式和普通响应处理

### 4. `src/openai-adapter.js` - OpenAI兼容层
**职责**: 纯粹的OpenAI到Gemini格式转换
- 🔄 **格式转换**: OpenAI请求格式 → Gemini请求格式
- 🔄 **响应转换**: Gemini响应格式 → OpenAI响应格式
- 🌊 **流式转换**: Gemini SSE → OpenAI SSE格式
- 📋 **模型映射**: OpenAI模型名 → Gemini模型名

### 5. `src/verify_keys.js` - API Key验证工具
**职责**: API Key有效性验证
- 🔍 **Key测试**: 向Gemini API发送测试请求
- 📊 **状态报告**: 返回Key的可用状态
- 🛠️ **工具功能**: 独立的验证工具，可单独调用

## 🔧 开发指南

### 新手参与指南

#### 🎯 我想修改某个功能，应该改哪个文件？

##### 📝 日志相关修改
**文件**: `src/utils.js`
**示例场景**:
- 想要修改日志格式或添加新的日志类型
- 需要调整日志的emoji图标或颜色
- 想要添加更详细的性能监控日志

```javascript
// 在 utils.js 中添加新的日志函数
export function logCustomEvent(reqId, eventType, details) {
  console.log(`🎯 [${reqId}] ${eventType}: ${details}`);
}
```

##### 🔐 API Key验证和安全相关
**文件**: `src/utils.js`
**示例场景**:
- 修改白名单验证逻辑
- 调整API Key的脱敏显示方式
- 添加新的安全检查机制

```javascript
// 在 utils.js 中修改验证逻辑
export function validateTrustedApiKey(inputApiKey, context = '') {
  // 在这里添加新的验证逻辑
}
```

##### ⚖️ 负载均衡算法调整
**文件**: `src/utils.js`
**示例场景**:
- 修改时间窗口大小（当前10秒）
- 改变负载均衡策略（轮询 → 随机 → 权重）
- 添加API Key健康检查

```javascript
// 在 utils.js 中修改负载均衡算法
export function selectApiKeyBalanced(apiKeys) {
  // 修改窗口大小或算法逻辑
  const windowSize = 15000; // 改为15秒窗口
}
```

##### 🚦 路由和请求分发
**文件**: `src/gemini-proxy.js`
**示例场景**:
- 添加新的API端点支持
- 修改路由判断逻辑
- 添加新的请求预处理

```javascript
// 在 gemini-proxy.js 的 handleRequest 函数中
if (url.pathname === '/new-endpoint') {
  console.log(`🆕 [${reqId}] 新端点请求`);
  return handleNewEndpoint(request, reqId);
}
```

##### 🤖 Gemini原生API处理
**文件**: `src/gemini-proxy.js`
**示例场景**:
- 修改Gemini API的请求参数
- 调整流式响应处理逻辑
- 添加Gemini特有的功能支持

```javascript
// 在 gemini-proxy.js 的 handleGeminiRequest 函数中
// 修改目标URL构建或请求选项
const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;
```

##### 🔄 OpenAI兼容性相关
**文件**: `src/openai-adapter.js`
**示例场景**:
- 添加新的OpenAI端点支持（如embeddings、images）
- 修改模型映射关系
- 调整格式转换逻辑

```javascript
// 在 openai-adapter.js 中添加新端点
case url.pathname.endsWith("/images/generations"):
  console.log(`🖼️ [${reqId}] 处理图像生成请求`);
  return await handleImageGeneration(imageBody, apiKeys, reqId);
```

##### 🌊 流式响应处理
**文件**: `src/openai-adapter.js` 或 `src/gemini-proxy.js`
**示例场景**:
- 修改SSE格式转换
- 调整流数据的缓冲策略
- 添加流式响应的错误处理

```javascript
// 在相应文件的流处理函数中
const stream = new ReadableStream({
  async start(controller) {
    // 修改流处理逻辑
  }
});
```

##### 🔧 工具函数和辅助功能
**文件**: `src/utils.js`
**示例场景**:
- 添加新的工具函数
- 修改CORS处理
- 调整JSON解析逻辑

```javascript
// 在 utils.js 中添加新工具函数
export function newUtilityFunction(param) {
  // 新的工具函数逻辑
}
```

### 🚨 重要原则

#### ✅ 推荐做法
1. **保持日志清晰**: 任何修改都要确保日志的可读性
2. **单一职责**: 不要在一个文件中混合多种职责
3. **使用现有工具**: 优先使用utils.js中的现有函数
4. **测试驱动**: 修改后要测试相关功能

#### ❌ 避免做法
1. **不要创建新文件**: 除非绝对必要，否则不要增加文件数量
2. **不要重复代码**: 如果需要相同功能，提取到utils.js
3. **不要破坏日志**: 修改时要保持日志的一致性和可读性
4. **不要过度抽象**: 保持代码的直观性和可理解性

### 📊 性能考虑

- **Edge Runtime限制**: 注意Vercel Edge Functions的限制
- **内存使用**: 避免大量数据缓存
- **响应时间**: 保持快速响应，目标<100ms
- **并发处理**: 考虑多请求并发的影响

### 🔍 调试技巧

1. **使用请求ID**: 每个请求都有唯一ID，便于追踪
2. **查看完整日志**: 从请求开始到结束的完整流程
3. **关注错误堆栈**: 错误日志包含具体的堆栈信息
4. **监控性能**: 注意总耗时和各步骤耗时

## 🧪 测试架构

### 🚨 重要测试规范 - 必须遵守

#### **测试脚本语言要求**
- ✅ **必须使用JavaScript**: 所有测试脚本必须用JavaScript编写
- ❌ **禁止使用PowerShell**: 绝对不允许使用PowerShell (.ps1) 进行测试
- 🎯 **原因**: JavaScript提供更好的跨平台兼容性和JSON处理能力

#### **测试文件目录结构**
```
tests/
├── local/          # 本地开发测试 (使用JavaScript)
│   ├── test-basic-params.js      # 基础参数测试
│   ├── test-advanced-features.js # 高级功能测试
│   ├── test-models-mapping.js    # 模型映射测试
│   └── test-stress-load.js       # 压力测试
├── preview/        # Preview环境测试 (使用JavaScript)
│   ├── test-api-compatibility.js # API兼容性测试
│   ├── test-streaming-response.js # 流式响应测试
│   ├── test-json-mode.js         # JSON模式测试
│   └── test-integration-full.js  # 完整集成测试
└── README.md       # 测试文档
```

### 测试文件规范
- **本地测试**: 放在 `tests/local/` 目录下，用于开发调试
- **Preview测试**: 放在 `tests/preview/` 目录下，用于真实环境验证
- **命名规范**: `test-{功能}-{描述}.js` (必须是JavaScript文件)
- **执行方式**: 使用 `node tests/preview/test-xxx.js` 执行
- **敏感数据**: 测试文件包含API Key等敏感信息，已在.gitignore中排除

### JavaScript测试脚本模板
```javascript
#!/usr/bin/env node
// 标准的JavaScript测试脚本模板

const https = require('https');

// 测试配置
const config = {
  hostname: 'your-preview-url.vercel.app',
  apiKey: 'your-api-key',
  timeout: 30000
};

// 测试函数
async function runTest() {
  console.log('🧪 开始测试...');

  try {
    const result = await makeRequest({
      // 测试参数
    });

    console.log('✅ 测试成功:', result);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 执行测试
runTest().catch(console.error);
```

### 文档目录结构
```
docs/
├── api/           # API文档
├── deployment/    # 部署文档
├── development/   # 开发文档
└── README.md      # 文档索引
```

**重要**: `tests/` 和 `docs/` 目录已在.gitignore中排除，避免敏感信息泄露到开源仓库。

---

这个架构设计的核心思想是：**简单、清晰、高效**。每个文件都有明确的职责，新手可以快速理解和参与开发。
