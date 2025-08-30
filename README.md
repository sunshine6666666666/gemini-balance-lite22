# Gemini Balance Lite 22

> 智能负载均衡的Gemini API代理服务，专为解决API配额限制而设计

原作者：[技术爬爬虾](https://space.bilibili.com/316183842)  
优化版本：[sunshine6666666666](https://github.com/sunshine6666666666)

## 🚀 核心特性

- **🎯 智能负载均衡** - 解决Cherry Studio等客户端单API Key配额问题
- **⏱️ 45秒超时机制** - 适应大数据量LLM请求处理
- **🔄 智能故障切换** - 遇到任何错误立即切换API Key
- **🕐 时间窗口轮询算法** - 确保API Key使用均匀分布
- **⚡ 零延迟切换** - 移除重试延迟，提升响应速度
- **🌐 OpenAI兼容** - 支持OpenAI格式和原生Gemini API格式

## 📖 项目简介

专业的Gemini API代理服务，使用Vercel Edge Functions实现高性能API中转。通过创新的时间窗口轮询算法和智能故障切换机制，解决单API Key配额限制问题，大幅提升API可用性和稳定性。

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

## ⚙️ 环境变量配置

### 🎯 负载均衡配置（推荐）

为了解决Cherry Studio等客户端单API Key配额限制问题，建议配置备用API Key池：

**Vercel部署配置：**
1. 进入Vercel项目Dashboard
2. 点击 **Settings** → **Environment Variables**
3. 添加以下环境变量：

```
Name: BACKUP_API_KEYS
Value: your_api_key_1,your_api_key_2,your_api_key_3,your_api_key_4,your_api_key_5
Environment: Production, Preview, Development (全选)
```

**本地开发配置：**
1. 复制 `.env.sample` 为 `.env`
2. 填入您的API Keys：

```bash
cp .env.sample .env
# 编辑 .env 文件，填入实际的API Keys
```

### 🔧 负载均衡工作原理

- **客户端发送单个API Key** → 系统自动使用备用Key池进行负载均衡
- **客户端发送多个API Key** → 使用客户端提供的Keys
- **智能故障切换** → 遇到配额限制自动切换到下一个Key
- **时间窗口轮询** → 确保API Key使用均匀分布

## 🛠️ 本地开发

### 环境要求
- Node.js 16+
- Vercel CLI

### 开发步骤
```bash
# 1. 克隆项目
git clone https://github.com/sunshine6666666666/gemini-balance-lite22.git
cd gemini-balance-lite22

# 2. 安装Vercel CLI
npm install -g vercel

# 3. 配置环境变量
cp .env.sample .env
# 编辑 .env 文件，填入您的API Keys

# 4. 启动本地开发服务器
vercel dev
```

## 📖 API 使用说明

### 🔑 获取API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建新的API Key
3. 建议申请多个API Key以获得更好的负载均衡效果

### 🌐 支持的API格式

#### 1. 原生Gemini API格式

**标准请求示例：**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1beta/models/gemini-2.5-pro:generateContent' \
--header 'Content-Type: application/json' \
--header 'x-goog-api-key: <YOUR_GEMINI_API_KEY>' \
--data '{
    "contents": [
        {
         "role": "user",
         "parts": [
            {
               "text": "Hello"
            }
         ]
      }
    ]
}'
```

**流式请求示例：**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse' \
--header 'Content-Type: application/json' \
--header 'x-goog-api-key: <YOUR_GEMINI_API_KEY>' \
--data '{
    "contents": [
        {
         "role": "user",
         "parts": [
            {
               "text": "Hello"
            }
         ]
      }
    ]
}'
```

#### 2. OpenAI兼容格式

```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <YOUR_GEMINI_API_KEY>' \
--data '{
    "model": "gemini-2.5-pro",
    "messages": [
        {
            "role": "user",
            "content": "Hello"
        }
    ]
}'
```

### 🔍 API Key 校验

```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/verify' \
--header 'x-goog-api-key: <YOUR_GEMINI_API_KEY_1>,<YOUR_GEMINI_API_KEY_2>'
```

## 🎯 客户端配置

### Cherry Studio 配置示例

<details>
<summary>配置截图：</summary>

![image](/docs/images/2.png)
</details>

1. **API Base URL**: `https://your-domain.vercel.app`
2. **API Key**: 您的Gemini API Key
3. **模型**: `gemini-2.5-pro` 或其他支持的模型

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

---

**注意**: 请将 `<YOUR_DEPLOYED_DOMAIN>` 替换为您的实际部署域名，将 `<YOUR_GEMINI_API_KEY>` 替换为您的实际API Key。
