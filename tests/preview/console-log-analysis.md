# Preview环境Console.log分析指南

## 🎯 Console.log观察重点

### 📋 日志格式标准
所有日志都应遵循以下格式：
```
[文件：filename.js][中文模块名][函数名][ReqID:${reqId}] [步骤 X] 具体信息
```

### 🔍 关键观察点

#### 1. 请求入口和路由
**文件**: `api/vercel_index.js`
**观察内容**:
```
[文件：vercel_index.js][边缘函数入口][handler][ReqID:xxx] [步骤 1] 收到请求: GET/POST /path
[文件：vercel_index.js][边缘函数入口][handler][ReqID:xxx] [步骤 1.1] 拦截静态文件请求: /favicon.ico
[文件：vercel_index.js][边缘函数入口][handler][ReqID:xxx] [步骤 2] 路由到核心处理器
```

#### 2. Gemini原生API处理
**文件**: `src/gemini-handler.js`
**观察内容**:
```
[文件：gemini-handler.js][Gemini处理器][handleRequest][ReqID:xxx] [步骤 1] 开始处理Gemini API请求
[文件：gemini-handler.js][Gemini处理器][handleRequest][ReqID:xxx] [步骤 2] 开始API Key验证
[文件：gemini-handler.js][Gemini处理器][handleRequest][ReqID:xxx] [步骤 3] 使用API Key: AIzaSyXXX... 发送请求
[文件：gemini-handler.js][Gemini处理器][handleRequest][ReqID:xxx] [步骤 4.1][SUCCESS] API请求成功，状态: 200
```

#### 3. OpenAI兼容API处理
**文件**: `src/openai-adapter.js`
**观察内容**:
```
[文件：openai-adapter.js][OpenAI适配器][handleCompletions][ReqID:xxx] [步骤 1] 开始OpenAI到Gemini格式转换
[文件：openai-adapter.js][OpenAI适配器][handleCompletions][ReqID:xxx] [步骤 1.2] 消息转换完成，共X条
[文件：openai-adapter.js][OpenAI适配器][handleCompletions][ReqID:xxx] [步骤 3][SUCCESS] 格式转换完成
```

#### 4. 负载均衡机制
**文件**: `src/core/load-balancer.js`
**观察内容**:
```
[文件：load-balancer.js][负载均衡器][selectApiKeyBalanced][ReqID:xxx] 时间窗口: X, 选中索引: Y
[文件：load-balancer.js][负载均衡器][selectApiKeyBalanced][ReqID:xxx] 选中API Key: AIzaSyXXX...
```

#### 5. 安全验证
**文件**: `src/core/security.js`
**观察内容**:
```
[文件：security.js][安全验证器][validateTrustedApiKey][ReqID:xxx] 检查白名单配置
[文件：security.js][安全验证器][validateTrustedApiKey][ReqID:xxx] API Key验证失败: AIzaSyXXX...
[文件：security.js][安全验证器][getEffectiveApiKeys][ReqID:xxx] 使用备用API Key池
```

#### 6. API客户端调用
**文件**: `src/core/api-client.js`
**观察内容**:
```
[文件：api-client.js][API客户端][enhancedFetch][ReqID:xxx] 发送请求到: https://generativelanguage.googleapis.com/...
[文件：api-client.js][API客户端][enhancedFetch][ReqID:xxx] 请求耗时: Xms, 状态: 200
[文件：api-client.js][API客户端][enhancedFetch][ReqID:xxx] [ERROR] 请求失败: timeout
```

### 🚨 重点关注的问题

#### 1. Gemini 2.5思考机制问题
**观察指标**:
```json
{
  "candidates": [{
    "content": {
      "parts": [],  // 空数组表示没有实际输出
      "role": "model"
    },
    "finishReason": "MAX_TOKENS",
    "thoughtsTokenCount": 999,  // 大部分token用于思考
    "candidatesTokenCount": 0   // 实际输出token为0
  }]
}
```

**问题表现**:
- OpenAI格式响应中 `content: null`
- 状态码200但没有实际内容
- `thoughtsTokenCount` 接近 `max_tokens`

#### 2. 负载均衡验证
**验证方法**: 连续发送多个请求，观察API Key选择
**期望结果**: 不同请求使用不同的API Key（时间窗口轮询）

#### 3. 错误处理验证
**常见错误场景**:
- JSON解析错误
- API Key验证失败
- 网络超时
- 无效端点

**观察重点**: 错误是否被正确捕获和记录

### 📊 性能指标观察

#### 响应时间
- **正常范围**: 2-10秒
- **警告范围**: 10-20秒
- **异常范围**: >20秒

#### 成功率
- **优秀**: >95%
- **良好**: 90-95%
- **需优化**: <90%

#### 负载分布
- **理想状态**: API Key使用均匀分布
- **异常状态**: 某个Key使用过多

### 🔧 问题诊断指南

#### 如果看到 `content: null`
1. 检查 `thoughtsTokenCount` 是否过高
2. 检查 `max_tokens` 设置是否合理
3. 考虑使用 `gemini-1.5-flash` 替代 `gemini-2.5-flash`

#### 如果看到负载均衡不工作
1. 检查时间窗口计算是否正确
2. 验证API Key数组是否正确传递
3. 观察选中索引的变化

#### 如果看到频繁错误
1. 检查API Key是否有效
2. 验证网络连接稳定性
3. 检查请求格式是否正确

### 📝 测试后分析模板

```
## Console.log分析报告

### 基础功能
- [ ] 健康检查正常
- [ ] 路由处理正确
- [ ] 静态文件过滤工作

### API功能
- [ ] OpenAI兼容API正常
- [ ] Gemini原生API正常
- [ ] 模型列表返回正确

### 负载均衡
- [ ] API Key轮询工作
- [ ] 时间窗口计算正确
- [ ] 负载分布均匀

### 安全机制
- [ ] 白名单验证正常
- [ ] API Key脱敏显示
- [ ] 错误处理优雅

### 性能表现
- 平均响应时间: X秒
- 成功率: X%
- 发现的问题: [列出具体问题]

### 需要优化的地方
1. [具体问题1]
2. [具体问题2]
3. [具体问题3]
```
