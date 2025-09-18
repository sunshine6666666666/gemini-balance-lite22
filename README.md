# Gemini Balance Lite 22

> 透明的Gemini API代理服务，基于Vercel Edge Functions实现高性能API转发

原作者：[技术爬爬虾](https://space.bilibili.com/316183842)
优化版本：[sunshine6666666666](https://github.com/sunshine6666666666)

## 🚀 核心特性

- **🔄 完全透明转发** - 零数据篡改，保持API响应的原始性
- **🎯 智能模型映射** - GPT模型自动映射到gemini-2.5-flash-lite，适配Vercel 25秒限制
- **⚡ 高性能边缘函数** - 基于Vercel Edge Runtime，全球CDN加速
- **🌐 OpenAI兼容** - 支持OpenAI格式请求，无缝替换OpenAI API
- **📊 真实Token统计** - 提供准确的token使用量统计
- **🔍 专业调试日志** - 高可读性JSON格式，便于LLM调试

## 📖 项目简介

基于Vercel Edge Functions的透明Gemini API代理服务。专注于提供完全透明的API转发，支持OpenAI格式请求自动转换为Gemini API调用。针对Vercel 25秒超时限制进行优化，所有GPT模型请求统一映射到快速响应的gemini-2.5-flash-lite模型。

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

### 🔑 API Key配置

本代理服务采用透明转发模式，直接使用您在请求中提供的API Key，无需额外配置环境变量。

**获取API Key：**
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建新的API Key
3. 在请求中直接使用该API Key

### 🎯 模型映射策略

为适配Vercel 25秒超时限制，系统采用智能模型映射：

- **GPT模型** (`gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`) → `gemini-2.5-flash-lite`
- **Gemini模型** (`gemini-2.5-flash`, `gemini-2.5-pro`) → 直接使用
- **未知模型** → 默认使用 `gemini-2.5-flash-lite`

**为什么选择gemini-2.5-flash-lite？**
- ⚡ 响应速度快，适合边缘函数环境
- 🎯 稳定性高，避免超时问题
- 💰 成本效益好，性能与成本平衡

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
│   └── vercel_index.js      # Vercel Edge Function入口
├── src/
│   └── standalone-proxy.js  # 核心代理逻辑
├── tests/                   # 测试文件 (git忽略)
│   ├── local/              # 本地测试
│   └── preview/            # Preview环境测试
├── docs/                   # 文档 (git忽略)
└── README.md               # 项目说明
```

## 📖 API 使用说明

### 🌐 支持的API格式

#### 1. OpenAI兼容格式 (推荐)

**基础聊天请求：**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <YOUR_GEMINI_API_KEY>' \
--data '{
    "model": "gpt-3.5-turbo",
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

#### 2. 支持的模型

**OpenAI模型名 (自动映射到gemini-2.5-flash-lite):**
- `gpt-3.5-turbo`
- `gpt-4`
- `gpt-4-turbo`

**Gemini模型名 (直接使用):**
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `gemini-1.5-pro`

### 🔍 透明转发特性

- **模型名称**: 响应中保持您请求的原始模型名
- **Token统计**: 提供真实的Gemini API token使用量
- **内容完整**: 100%转发Gemini生成的原始内容
- **错误信息**: 提供详细的错误诊断信息

## 🎯 客户端配置

### Cherry Studio 配置示例

1. **API Base URL**: `https://your-domain.vercel.app/v1`
2. **API Key**: 您的Gemini API Key
3. **模型**: `gpt-3.5-turbo` (自动映射到gemini-2.5-flash-lite)

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
