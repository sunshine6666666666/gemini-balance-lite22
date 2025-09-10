# Vercel部署保护绕过令牌设置指南

## 🚨 重要提醒
Preview环境启用了Vercel部署保护，需要绕过令牌才能进行API测试。

## 📋 获取绕过令牌步骤

### 1. 访问Vercel Dashboard
- 打开 https://vercel.com/dashboard
- 登录您的Vercel账户

### 2. 进入项目设置
- 找到 `gemini-balance-lite22` 项目
- 点击项目名称进入项目详情

### 3. 获取绕过令牌
- 点击 **Settings** 标签
- 在左侧菜单中选择 **Deployment Protection**
- 找到 **Automation Bypass for CI/CD** 部分
- 复制 **Secret Value** (格式类似: `dpl_xxx...`)

### 4. 更新测试脚本
将获取到的令牌更新到以下文件中：

#### 方法1：直接修改测试脚本
编辑 `tests/preview/quick-preview-test.sh`：
```bash
# 将这行：
BYPASS_SECRET="your_bypass_secret_here"
# 改为：
BYPASS_SECRET="dpl_你的实际令牌"
```

#### 方法2：使用环境变量
```bash
export VERCEL_AUTOMATION_BYPASS_SECRET="dpl_你的实际令牌"
```

## 🧪 运行测试

### 快速测试
```bash
bash tests/preview/quick-preview-test.sh
```

### 全面测试
```bash
bash tests/preview/comprehensive-preview-test.sh
```

## 🔍 测试结果观察

### 成功标志
- 状态码应该是 200、400、401 等正常HTTP状态码
- 不再出现 "Authentication Required" HTML页面
- 可以看到实际的API响应内容

### Console.log观察重点
1. **Vercel Dashboard** → **Functions** → **View Function Logs**
2. 观察以下日志模式：
   ```
   [文件：xxx.js][模块名][函数名][ReqID:xxx] [步骤 X] 具体信息
   ```

### 重点观察项目
- **负载均衡**: API Key轮询选择
- **格式转换**: OpenAI ↔ Gemini 转换过程
- **思考机制**: thoughtsTokenCount 和 content 字段
- **错误处理**: 异常捕获和堆栈信息
- **安全验证**: 白名单验证和API Key脱敏

## ⚠️ 注意事项

1. **令牌安全**: 绕过令牌具有敏感性，不要提交到代码仓库
2. **测试环境**: 仅用于Preview环境测试，不影响生产环境
3. **有效期**: 令牌可能有有效期限制，失效后需重新获取
4. **权限**: 确保您有项目的管理员权限才能获取令牌

## 🔧 故障排除

### 如果仍然看到401错误
1. 检查令牌是否正确复制（包含 `dpl_` 前缀）
2. 确认令牌没有过期
3. 验证URL构建是否正确

### 如果看到其他错误
1. 检查API Key是否有效
2. 验证请求格式是否正确
3. 查看Vercel Function Logs获取详细错误信息

## 📞 需要帮助？
如果遇到问题，请：
1. 提供测试日志文件内容
2. 截图Vercel Dashboard的错误信息
3. 说明具体的错误现象

**准备好绕过令牌后，就可以开始真正的Preview环境测试了！** 🚀
