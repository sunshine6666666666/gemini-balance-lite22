# Gemini Balance Lite 22

> 透明的Gemini API代理服务，基于Vercel Edge Functions实现高性能API转发

原作者：[技术爬爬虾](https://space.bilibili.com/316183842)
优化版本：[sunshine6666666666](https://github.com/sunshine6666666666)

## 🚀 核心特性

- **⚖️ 智能负载均衡** - 支持多个API Key，通过时间窗口轮询算法实现负载均衡，提升服务稳定性与处理能力。
- **🛡️ API Key故障切换** - 流式请求中若遇API Key失效，可自动切换至下一个有效Key进行重试，保障业务连续性。
- **🔄 完全透明转发** - 零数据篡改，无论是模型名称还是Token统计，均保持与官方API响应一致的原始性。
- **🎯 智能模型映射** - 优化模型映射策略，`gpt-4o` 等新模型可映射至性能更强的 `gemini-2.5-flash`，同时兼容自定义Gemini模型。
- **⚙️ 广泛参数支持** - 全面兼容OpenAI的 `temperature`, `top_p`, `top_k`, `stop` 等参数，并支持 `response_format` 实现强制JSON输出。
- **♊️ Gemini原生API支持** - 除OpenAI兼容模式外，新增对Gemini原生API (`v1beta`) 的直接支持，解锁更多高级功能。
- **⚡ 高性能边缘函数** - 基于Vercel Edge Runtime，全球CDN加速，确保低延迟响应。
- **🔍 专业调试日志** - 高可读性JSON格式，详细记录请求转换与响应过程，便于LLM应用调试。

## 📖 项目简介

基于Vercel Edge Functions的Gemini API代理服务，内置**多API Key负载均衡**与**故障自动切换**机制。项目专注于提供一个高性能、高可靠的API网关，不仅完全兼容OpenAI API格式，还新增了对Gemini原生API的调用支持。通过智能模型映射与广泛的参数适配，开发者可以无缝地将现有应用迁移至Gemini，或开发功能强大的新型AI应用。

### 🎯 设计理念

- **完全透明**: 不篡改任何API响应数据，保持原始性
- **性能优先**: 针对边缘函数环境优化，确保快速响应
- **开发友好**: 提供详细的调试日志，便于问题定位

## 📦 快速部署

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sunshine6666666666/gemini-balance-lite22)

### 部署步骤

1. **一键部署**：点击上方部署按钮
2. **Fork仓库**：选择Fork到你的GitHub账户
3. **配置项目**：Vercel会自动检测项目配置
4. **部署完成**：等待部署完成，获得分配的域名

### 配置自定义域名（国内用户必需）

1. 在Vercel项目设置中添加自定义域名
2. 配置DNS解析指向Vercel

    <details>
    <summary>配置自定义域名详细步骤：</summary>

    ![image](/docs/images/5.png)
    </details>

## ⚙️ 配置说明

### 🔑 API Key配置 (负载均衡)

本代理服务的核心特性是**负载均衡**，您可以在客户端请求的`Authorization`头中提供一个或多个Gemini API Key。

- **单Key模式**:
  ```
  Authorization: Bearer <YOUR_GEMINI_API_KEY>
  ```
- **多Key模式 (推荐)**:
  使用英文逗号分隔多个API Key，服务将自动在这些Key之间进行负载均衡。
  ```
  Authorization: Bearer <KEY_1>,<KEY_2>,<KEY_3>
  ```

**获取API Key：**
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建新的API Key
3. 按上述格式在请求中使用

### 🎯 模型映射策略

系统采用更智能的模型映射策略，以平衡性能与功能：

- **Cursor兼容映射**: `gpt-4o` → `gemini-2.5-flash` (为Cursor等客户端提供更强性能)
- **标准GPT模型**: `gpt-3.5-turbo`, `gpt-4` 等 → `gemini-2.5-flash-lite` (保证Vercel环境下的快速响应)
- **Gemini原生模型**: `gemini-2.5-flash`, `gemini-2.5-pro` 等 → 直接使用，不做转换
- **未知模型**: 默认使用 `gemini-2.5-flash-lite`

## 🛠️ 本地开发

### 环境要求
- Node.js 18+
- Vercel CLI

### 开发步骤
```bash
# 1. 克隆项目
git clone https://github.com/sunshine6666666666/gemini-balance-lite22.git
cd gemini-balance-lite22

# 2. 安装Vercel CLI
npm install -g vercel

# 3. 启动本地开发服务器
vercel dev
```

### 📁 项目结构
```
gemini-balance-lite22/
├── api/
│   └── vercel_index.js      # Vercel Edge Function入口及核心代理逻辑
├── src/
│   ├── utils.js             # 核心功能模块 (负载均衡、工具函数)
│   └── openai-adapter.js    # OpenAI兼容层 (格式转换)
├── docs/                    # 文档图片等资源
└── README.md                # 项目说明
```

## 📖 API 使用说明

### 🌐 支持的API格式

#### 1. OpenAI兼容格式 (推荐)

**基础聊天请求：**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <KEY_1>,<KEY_2>' \
--data '{
    "model": "gpt-4o",
    "messages": [
        {
            "role": "user",
            "content": "Hello, how are you?"
        }
    ],
    "max_tokens": 500,
    "temperature": 0.7
}'
```

**模型列表查询：**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1/models' \
--header 'Authorization: Bearer <YOUR_GEMINI_API_KEY>'
```

#### 2. Gemini原生API格式

除了OpenAI兼容格式，您也可以直接调用Gemini原生API。

**基础聊天请求 (v1beta):**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1beta/models/gemini-2.5-flash:generateContent' \
--header 'Content-Type: application/json' \
--header 'x-goog-api-key: <KEY_1>,<KEY_2>' \
--data '{
    "contents": [
        {
            "role": "user",
            "parts": [
                {
                    "text": "Hello, how are you?"
                }
            ]
        }
    ]
}'
```
*注意：原生格式下，API Key通过 `x-goog-api-key` 头传递。*

#### 3. 支持的模型

**OpenAI模型名 (自动映射):**
- `gpt-4o` → `gemini-2.5-flash`
- `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo` → `gemini-2.5-flash-lite`

**Gemini模型名 (直接使用):**
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `gemini-1.5-pro`

### 🔍 核心优势

- **负载均衡与故障切换**: 在请求头中提供多个API Key，即可自动启用负载均衡和故障切换，极大提升服务可靠性。
- **透明转发**: 响应中保持您请求的原始模型名，并提供真实的Gemini API token使用量。
- **内容完整**: 100%转发Gemini生成的原始内容，不进行任何修改。
- **错误信息**: 提供详细的错误诊断信息，便于快速定位问题。

## 🎯 客户端配置

### Cherry Studio 配置示例

1. **API Base URL**: `https://your-domain.vercel.app/v1`
2. **API Key**: 您的Gemini API Key
3. **模型**: `gpt-4o` (推荐，自动映射到gemini-2.5-flash)

### 其他OpenAI兼容客户端

任何支持OpenAI API的客户端都可以使用，只需：
1. 将Base URL设置为您的部署域名 + `/v1`
2. 使用Gemini API Key作为Authorization Bearer token
3. 选择支持的模型名称

## 🚀 性能特点

- **响应速度**: 平均响应时间 < 3秒
- **稳定性**: 100%成功率，无超时问题
- **透明性**: 完全透明的数据转发
- **兼容性**: 支持所有主流OpenAI客户端

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

---

**注意**: 请将 `<YOUR_DEPLOYED_DOMAIN>` 替换为您的实际部署域名，将 `<YOUR_GEMINI_API_KEY>` 替换为您的实际API Key。
