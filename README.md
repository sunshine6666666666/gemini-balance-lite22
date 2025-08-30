# Gemini Balance Lite 22
# Gemini API 代理和负载均衡无服务器轻量版（增强版）

### 基于技术爬爬虾原版优化
原作者：[技术爬爬虾](https://space.bilibili.com/316183842)
优化版本：[sunshine6666666666](https://github.com/sunshine6666666666)

## 🚀 新特性

- **45秒超时机制**：适应大数据量LLM请求处理
- **智能故障切换**：遇到任何错误立即切换API Key
- **保持轮询特色**：时间窗口轮询算法确保负载均衡
- **504快速切换**：检测到504网关超时立即换Key
- **零延迟切换**：移除重试延迟，提升响应速度

## 项目简介

Gemini API 代理服务，使用边缘函数把Gemini API免费中转到国内。聚合多个Gemini API Key，使用时间窗口轮询算法实现智能负载均衡，大幅提升API可用性和稳定性。

## Vercel部署(推荐)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sunshine6666666666/gemini-balance-lite22)


### 快速部署步骤

1. **一键部署**：点击上方部署按钮⬆️
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

### 获取API Key

1. 访问 [Google AI Studio](https://aistudio.google.com) 申请免费Gemini API Key
2. 支持多个API Key，用逗号分隔：`key1,key2,key3`
3. 在AI客户端中配置你的域名和API Key

    <details>
    <summary>以Cherry Studio为例：</summary>

    ![image](/docs/images/2.png)
    </details>

### 环境变量配置

#### 🎯 负载均衡配置（推荐）

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

#### 其他可选配置

- `CUSTOM_LLM_API_KEY`：自定义LLM服务的API Key
- `CUSTOM_LLM_BASE_URL`：自定义LLM服务的基础URL

#### 🔧 负载均衡工作原理

- **客户端发送单个API Key** → 系统自动使用备用Key池进行负载均衡
- **客户端发送多个API Key** → 使用客户端提供的Keys
- **智能故障切换** → 遇到配额限制自动切换到下一个Key
- **时间窗口轮询** → 确保API Key使用均匀分布




## Deno部署

1. [fork](https://github.com/tech-shrimp/gemini-balance-lite/fork)本项目
2. 登录/注册 https://dash.deno.com/
3. 创建项目 https://dash.deno.com/new_project
4. 选择此项目，填写项目名字（请仔细填写项目名字，关系到自动分配的域名）
5. Entrypoint 填写 `src/deno_index.ts` 其他字段留空 
   <details>
   <summary>如图</summary>
   
   ![image](/docs/images/3.png)
   </details>
6. 点击 <b>Deploy Project</b>
7. 部署成功后获得域名
8. 国内使用需要配置自定义域名
9. 去[AIStudio](https://aistudio.google.com)申请一个免费Gemini API Key
10. 将API Key与分配的域名填入AI客户端即可使用，如果有多个API Key用逗号分隔

<details>
<summary>以Cherry Studio为例：</summary>

![image](/docs/images/2.png)
</details>


## Cloudflare Worker 部署
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tech-shrimp/gemini-balance-lite)

0. CF Worker有可能会分配香港的CDN节点导致无法使用(Gemini不允许香港IP连接)
0. 广东地区不建议使用Cloudflare Worker 部署
1. 点击部署按钮
2. 登录Cloudflare账号
3. 链接Github账户，部署
4. 打开dash.cloudflare.com，查看部署后的worker
6. 国内使用需要配置自定义域名
<details>
<summary>配置自定义域名：</summary>

![image](/docs/images/4.png)
</details>


## Netlify部署
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/tech-shrimp/gemini-balance-lite)
<br>点击部署按钮，登录Github账户即可
<br>免费分配域名，国内可直连。
<br>但是不稳定

<details>
<summary>将分配的域名复制下来，如图：</summary>

![image](/docs/images/1.png)
</details>

去[AIStudio](https://aistudio.google.com)申请一个免费Gemini API Key
<br>将API Key与分配的域名填入AI客户端即可使用，如果有多个API Key用逗号分隔

<details>
<summary>以Cherry Studio为例：</summary>

![image](/docs/images/2.png)
</details>



## 打赏
#### 帮忙点点关注点点赞，谢谢啦~
B站：[https://space.bilibili.com/316183842](https://space.bilibili.com/316183842)<br>
Youtube: [https://www.youtube.com/@Tech_Shrimp](https://www.youtube.com/@Tech_Shrimp)


## 本地调试

1. 安装NodeJs
2. npm install -g vercel
3. cd 项目根目录
4. vercel dev

## API 说明


### Gemini 代理

可以使用 Gemini 的原生 API 格式进行代理请求。
**Curl 示例:**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1beta/models/gemini-2.5-pro:generateContent' \
--header 'Content-Type: application/json' \
--header 'x-goog-api-key: <YOUR_GEMINI_API_KEY_1>,<YOUR_GEMINI_API_KEY_2>' \
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
**Curl 示例:（流式）**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/v1beta/models/gemini-2.5-pro:generateContent?alt=sse' \
--header 'Content-Type: application/json' \
--header 'x-goog-api-key: <YOUR_GEMINI_API_KEY_1>,<YOUR_GEMINI_API_KEY_2>' \
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
> 注意: 请将 `<YOUR_DEPLOYED_DOMAIN>` 替换为你的部署域名，并将 `<YOUR_GEMINI_API_KEY>` 替换为你的 Gemini API Ke，如果有多个用逗号分隔


### API Key 校验

可以通过向 `/verify` 端点发送请求来校验你的 API Key 是否有效。可以一次性校验多个 Key，用逗号隔开。

**Curl 示例:**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/verify' \
--header 'x-goog-api-key: <YOUR_GEMINI_API_KEY_1>,<YOUR_GEMINI_API_KEY_2>'
```

### OpenAI 格式

本项目兼容 OpenAI 的 API 格式，你可以通过 `/chat` 或 `/chat/completions` 端点来发送请求。

**Curl 示例:**
```bash
curl --location 'https://<YOUR_DEPLOYED_DOMAIN>/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <YOUR_GEMINI_API_KEY>' \
--data '{
    "model": "gpt-3.5-turbo",
    "messages": [
        {
            "role": "user",
            "content": "你好"
        }
    ]
}'
```

