# Gemini Balance Lite 22

> 🚀 **重构版本** - 智能负载均衡的Gemini API代理服务，专为解决API配额限制而设计

原作者：[技术爬爬虾](https://space.bilibili.com/316183842)
重构优化：[sunshine6666666666](https://github.com/sunshine6666666666)

## 🎯 项目状态

**当前版本**: v2.0 (重构版)
**开发分支**: refactor-architecture
**部署状态**: ✅ Preview环境已部署
**测试状态**: ✅ 本地测试通过，Preview测试就绪

## 🚀 核心特性

### 🏗️ 架构升级
- **🔧 模块化架构** - 分层设计，职责分离，易于维护
- **📝 完整文档** - JSDoc注释，中文说明，开发友好
- **🧪 测试体系** - 本地测试 + Preview环境测试
- **📊 结构化日志** - 生产级日志系统，便于问题定位

### ⚡ 性能特性
- **🎯 智能负载均衡** - 时间窗口轮询算法，解决配额限制
- **⏱️ 45秒超时机制** - 适应大数据量LLM请求处理
- **🔄 智能故障切换** - 遇到错误立即切换API Key
- **⚡ 零延迟切换** - 移除重试延迟，提升响应速度

### 🌐 API兼容性
- **🔗 OpenAI兼容** - 完整支持OpenAI API格式
- **🎨 Gemini原生** - 支持原生Gemini API格式
- **🔄 格式转换** - 自动进行OpenAI ↔ Gemini格式转换
- **📡 流式响应** - 支持实时数据流处理

### 🛡️ 安全机制
- **🔐 白名单验证** - 可信API Key验证机制
- **🎭 API Key脱敏** - 日志中自动脱敏显示
- **🚫 访问控制** - 防止配额盗用和恶意访问
- **📋 详细审计** - 完整的访问日志记录

## 📖 项目简介

专业的Gemini API代理服务，使用Vercel Edge Functions实现高性能API中转。经过全面重构，采用模块化分层架构，通过创新的时间窗口轮询算法和智能故障切换机制，解决单API Key配额限制问题，大幅提升API可用性和稳定性。

### 🔄 重构亮点
- **代码质量提升**: 消除重复代码，统一核心功能模块
- **架构清晰**: 分层架构，职责分离明确
- **测试完善**: 本地测试 + Preview环境测试覆盖
- **文档齐全**: 完整的开发文档和使用指南

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

#### 📋 必需配置

**备用API Key池：**
```
Name: BACKUP_API_KEYS
Value: your_api_key_1,your_api_key_2,your_api_key_3,your_api_key_4,your_api_key_5
Environment: Production, Preview, Development (全选)
```

**🛡️ 安全白名单（重要）：**
```
Name: TRUSTED_API_KEYS
Value: your_trusted_key_1,your_trusted_key_2,your_trusted_key_3
Environment: Production, Preview, Development (全选)
```

**本地开发配置：**
1. 复制 `.env.sample` 为 `.env`
2. 填入您的API Keys：

```bash
cp .env.sample .env
# 编辑 .env 文件，填入实际的API Keys
```

### 🛡️ 安全机制说明

**API Key白名单保护：**
- **单个API Key请求**：系统首先检查该Key是否在`TRUSTED_API_KEYS`白名单中
- **白名单验证通过**：允许使用`BACKUP_API_KEYS`进行负载均衡
- **白名单验证失败**：直接拒绝请求，返回401未授权错误
- **多个API Key请求**：正常处理，不启用备用Key池

**安全优势：**
- 🔒 **防止配额盗用**：只有可信用户才能使用您的备用Key池
- 🛡️ **访问控制**：恶意用户无法通过发送无效Key来免费使用您的配额
- 📊 **清晰日志**：详细记录白名单验证过程，便于监控

### 🔧 负载均衡工作原理

- **智能故障切换** → 遇到配额限制自动切换到下一个Key
- **时间窗口轮询** → 确保API Key使用均匀分布
- **安全保护** → 只有白名单Key才能触发备用Key池

## 🧪 测试验证

### Preview环境测试
项目提供完整的测试套件，支持Preview环境功能验证：

```bash
# 1. 环境检查
bash tests/preview/check-environment.sh

# 2. 快速测试（推荐）
bash tests/preview/quick-preview-test.sh

# 3. 全面测试
bash tests/preview/comprehensive-preview-test.sh
```

**测试覆盖**:
- ✅ API功能测试（Gemini原生 + OpenAI兼容）
- ✅ 负载均衡验证
- ✅ 安全机制测试
- ✅ 错误处理验证
- ✅ Gemini 2.5思考机制测试

**详细指南**: 参见 `tests/preview/README.md`

### 本地开发测试
```bash
# 本地综合测试
bash tests/local/comprehensive-test.sh

# 日志验证测试
bash tests/local/log-validation-test.sh
```

## 🛠️ 本地开发

### 环境要求
- Node.js 16+
- Vercel CLI
- Git Bash (Windows) 或 Terminal (macOS/Linux)

### 开发步骤
```bash
# 1. 克隆项目
git clone https://github.com/sunshine6666666666/gemini-balance-lite22.git
cd gemini-balance-lite22

# 2. 切换到重构分支
git checkout refactor-architecture

# 3. 安装Vercel CLI
npm install -g vercel

# 4. 配置环境变量
cp .env.sample .env.local
# 编辑 .env.local 文件，填入您的API Keys

# 5. 启动本地开发服务器
vercel dev

# 6. 运行测试验证
bash tests/local/comprehensive-test.sh
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

## 📊 项目文档

### 核心文档
- **📋 项目状态**: [PROJECT_STATUS.md](PROJECT_STATUS.md) - 完整的项目状态总结
- **🔧 重构方案**: [docs/重构方案文档.md](docs/重构方案文档.md) - 详细的重构设计
- **🧪 测试指南**: [tests/preview/README.md](tests/preview/README.md) - 测试套件说明
- **🔍 日志分析**: [tests/preview/console-log-analysis.md](tests/preview/console-log-analysis.md) - Console.log观察指南

### 开发文档
- **🏗️ 架构设计**: 模块化分层架构，职责分离
- **📝 代码注释**: 完整的JSDoc注释和中文说明
- **🔧 配置管理**: 统一的配置管理和环境变量
- **📊 日志系统**: 结构化日志和请求追踪

## 🔍 已知问题

### Gemini 2.5思考机制
- **现象**: 部分请求返回 `content: null`
- **原因**: `thoughtsTokenCount` 过高，占用大部分token
- **解决方案**:
  1. 使用 `enableThoughts: false` 参数
  2. 切换到 `gemini-1.5-flash` 模型
  3. 调整 `max_tokens` 参数

### 性能表现
- **响应时间**: 2-10秒（正常范围）
- **成功率**: 77%（本地测试结果）
- **负载均衡**: 正常工作，API Key轮询正确

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

### 贡献指南
1. Fork 项目到您的GitHub账户
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📞 支持

如需帮助，请：
1. 查看项目文档和测试指南
2. 提交 Issue 描述具体问题
3. 提供测试日志和错误信息

---

**注意**:
- 请将 `<YOUR_DEPLOYED_DOMAIN>` 替换为您的实际部署域名
- 请将 `<YOUR_GEMINI_API_KEY>` 替换为您的实际API Key
- 建议使用 `refactor-architecture` 分支获取最新功能
