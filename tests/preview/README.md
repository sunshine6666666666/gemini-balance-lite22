# Preview环境测试套件

## 📋 概述

这是 `gemini-balance-lite22` 项目的Preview环境测试套件，用于验证Vercel生产环境中的API代理功能、负载均衡机制、安全验证等核心特性。

## 🎯 测试目标

- ✅ 验证Gemini API代理功能正常工作
- ✅ 验证OpenAI兼容API格式转换正确
- ✅ 验证负载均衡算法有效运行
- ✅ 验证安全机制和白名单验证
- ✅ 识别Gemini 2.5思考机制问题
- ✅ 验证错误处理和日志记录

## 📁 文件结构

```
tests/preview/
├── README.md                          # 本文件，测试套件说明
├── check-environment.sh               # 环境检查脚本
├── BYPASS_TOKEN_SETUP.md             # 绕过令牌设置指南
├── quick-preview-test.sh              # 快速测试脚本（5项核心测试）
├── comprehensive-preview-test.sh      # 全面测试脚本（14项完整测试）
└── console-log-analysis.md           # Console.log分析指南
```

## 🚀 快速开始

### 1. 环境检查
```bash
bash tests/preview/check-environment.sh
```

### 2. 配置绕过令牌
按照 `BYPASS_TOKEN_SETUP.md` 的指引：
1. 从Vercel Dashboard获取绕过令牌
2. 更新测试脚本中的 `BYPASS_SECRET`

### 3. 运行测试
```bash
# 快速测试（推荐）
bash tests/preview/quick-preview-test.sh

# 全面测试
bash tests/preview/comprehensive-preview-test.sh
```

### 4. 观察结果
- 查看测试脚本输出的本地日志
- 访问 **Vercel Dashboard → Functions → View Function Logs**
- 参考 `console-log-analysis.md` 分析Console.log

## 📊 测试内容

### 快速测试 (5项)
1. **健康检查** - 验证服务基本可用性
2. **OpenAI聊天API** - 验证格式转换和思考机制
3. **Gemini原生API** - 验证原生API处理
4. **模型列表** - 验证API端点响应
5. **错误处理** - 验证Missing API Key处理

### 全面测试 (14项)
- **基础连通性** (1项): 健康检查
- **OpenAI兼容API** (3项): 聊天、模型列表、错误处理
- **Gemini原生API** (2项): 原生API、错误处理
- **负载均衡** (3项): 连续请求验证轮询
- **安全机制** (2项): 无效Key、白名单验证
- **错误处理** (2项): 无效JSON、不存在端点
- **特殊场景** (1项): Gemini 2.5思考机制

## 🔍 Console.log观察重点

### 日志格式标准
```
[文件：filename.js][中文模块名][函数名][ReqID:xxx] [步骤 X] 具体信息
```

### 关键观察点
1. **负载均衡**: API Key选择和轮询过程
2. **格式转换**: OpenAI ↔ Gemini 转换详情
3. **思考机制**: `thoughtsTokenCount` 和 `content` 字段
4. **安全验证**: 白名单验证和API Key脱敏
5. **错误处理**: 异常捕获和堆栈信息

### 问题诊断
- **content: null** → 检查 `thoughtsTokenCount` 是否过高
- **负载均衡不工作** → 观察时间窗口计算和索引选择
- **频繁错误** → 检查API Key有效性和网络连接

## ⚠️ 注意事项

### 安全
- 绕过令牌具有敏感性，不要提交到代码仓库
- 仅用于Preview环境测试，不影响生产环境
- 确保API Key的安全性

### 性能
- 测试间隔2秒，避免请求过快
- 超时设置30秒，适应网络延迟
- 并发测试验证负载均衡效果

### 环境
- 需要Windows环境和curl.exe工具
- 需要bash支持（Git Bash或WSL）
- 需要网络连接到Vercel和Google API

## 📈 成功标志

### 测试通过标准
- ✅ 状态码返回正常HTTP状态码（200、400、401等）
- ✅ 不出现 "Authentication Required" HTML页面
- ✅ API响应包含预期的JSON格式数据
- ✅ Console.log显示完整的处理步骤

### 功能验证标准
- ✅ 负载均衡: API Key轮询选择正确
- ✅ 格式转换: OpenAI ↔ Gemini 转换无误
- ✅ 安全机制: 白名单验证和错误处理正常
- ✅ 性能表现: 响应时间在合理范围内

## 🔧 故障排除

### 常见问题
1. **401错误** → 检查绕过令牌配置
2. **超时错误** → 检查网络连接和API Key
3. **JSON解析错误** → 检查请求格式和参数

### 获取帮助
1. 查看测试日志文件
2. 截图Vercel Dashboard错误信息
3. 提供具体的错误现象描述

## 📞 支持

如需帮助，请提供：
- 测试日志文件内容
- Vercel Function Logs截图
- 具体错误现象描述
- 环境检查脚本输出

---

**准备好开始测试了吗？运行 `bash tests/preview/check-environment.sh` 检查环境！** 🚀
