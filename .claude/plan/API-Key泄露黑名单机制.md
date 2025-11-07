# API Key泄露黑名单机制实施计划

## 任务背景
用户访问中转服务时使用的Key `AIzaSyBx...` 被Google报告为泄露，需要确保服务器在调用Gemini API时不再使用这个Key。

## 问题分析
1. 用户的Key `AIzaSyBx...` 同时存在于 TRUSTED_API_KEYS 和 BACKUP_API_KEYS 中
2. 负载均衡算法 `selectApiKeyBalanced` 可能会选择这个泄露的Key去调用Gemini
3. 当使用泄露Key时，Google返回403错误：Your API key was reported as leaked

## 解决方案
实施内存黑名单机制：
1. 添加泄露Key黑名单管理函数
2. 修改 `selectApiKeyBalanced` 函数过滤黑名单中的Key
3. 修改 `enhancedFetch` 函数自动检测403泄露错误并加入黑名单

## 实施内容

### 1. 新增黑名单管理函数 (utils.js)
- `addKeyToBlacklist(apiKey, reason)`: 添加Key到黑名单
- `isKeyBlacklisted(apiKey)`: 检查Key是否在黑名单中
- `getBlacklistedKeysCount()`: 获取黑名单Key数量

### 2. 修改 selectApiKeyBalanced 函数
- 在Key选择前过滤黑名单中的Key
- 确保不会选择被标记为泄露的Key
- 保持现有时间窗口轮询逻辑

### 3. 修改 enhancedFetch 函数
- 检测403错误响应中的"reported as leaked"消息
- 自动将泄露Key加入黑名单
- 同时支持Gemini原生和OpenAI兼容模式

## 预期效果
- ✅ 自动跳过被标记为泄露的API Key
- ✅ 保持现有负载均衡算法不变
- ✅ 支持自动检测和手动管理黑名单
- ✅ 内存存储，重启后自动重置
- ✅ 零停机部署，Vercel自动更新

## 测试结果
✅ 语法检查通过
✅ 模块导入成功
✅ 黑名单功能正常工作
✅ Key选择过滤功能正常

## 部署信息
- 目标分支：main
- 部署平台：Vercel（自动部署）
- 回滚版本：4b12a8e