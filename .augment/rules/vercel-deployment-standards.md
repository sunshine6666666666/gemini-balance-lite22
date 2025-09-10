---
type: "always_apply"
---

# Vercel部署规范文档
## 严格执行的部署命令标准

> **⚠️ 严重警告**: 错误的部署命令可能导致预览分支意外部署到生产环境，造成重大损失！

## 🚨 **关键原则**

### **绝对禁止的操作**
- ❌ **禁止在非main分支使用 `vercel --prod`**
- ❌ **禁止在开发/测试分支直接部署到生产环境**
- ❌ **禁止跳过环境验证直接生产部署**

### **严重后果警告**
将预览分支部署到生产环境是**严重的工作失误**，可能导致：
- 🔥 **生产环境故障**
- 💰 **重大经济损失**
- 🚫 **服务中断**
- 📉 **用户体验受损**
- ⚖️ **法律和合规风险**

## 📋 **标准部署命令**

### **1. 本地开发环境**

#### **启动本地开发服务器**
```bash
# 启动本地开发环境（推荐）
vercel dev

# 或者使用简写
vc dev
```

#### **本地构建测试**
```bash
# 本地构建（使用Preview环境变量）
vercel build

# 本地构建（使用Production环境变量）
vercel build --prod

# 本地构建指定环境
vercel build --target=staging
```

#### **环境变量管理**
```bash
# 拉取开发环境变量
vercel env pull --environment=development

# 拉取预览环境变量
vercel env pull --environment=preview

# 拉取生产环境变量
vercel env pull --environment=production
```

### **2. Preview环境部署**

#### **创建Preview部署**
```bash
# 标准Preview部署（默认行为）
vercel

# 明确指定Preview部署
vercel deploy

# 部署到自定义环境
vercel deploy --target=staging

# 预构建部署
vercel build
vercel deploy --prebuilt
```

#### **Preview环境特点**
- ✅ **自动触发**: 推送到非生产分支时自动创建
- ✅ **安全测试**: 可以安全测试功能而不影响生产
- ✅ **独立URL**: 每个Preview部署都有独立的URL
- ✅ **临时性**: 不会影响生产域名

### **3. 生产环境部署**

#### **⚠️ 生产部署前置条件**
1. **分支验证**: 必须在 `main` 或指定的生产分支
2. **代码审查**: 必须通过代码审查流程
3. **测试验证**: 必须通过所有自动化测试
4. **环境确认**: 确认当前环境配置正确

#### **生产部署命令**
```bash
# 🔴 仅在main分支执行！
git checkout main
git pull origin main

# 生产环境部署
vercel --prod

# 或者明确指定
vercel deploy --prod

# 分阶段生产部署（推荐）
vercel --prod --skip-domain
vercel promote [deployment-url]
```

#### **生产部署最佳实践**
```bash
# 1. 确认当前分支
git branch --show-current

# 2. 确认代码是最新的
git status
git pull origin main

# 3. 本地验证
vercel build --prod
vercel dev

# 4. 执行生产部署
vercel --prod

# 5. 验证部署结果
vercel list --environment=production
```

## 🔄 **部署流程规范**

### **开发流程**
```
1. 功能开发 → vercel dev (本地测试)
2. 提交代码 → 自动创建Preview部署
3. 代码审查 → 在Preview环境验证
4. 合并到main → vercel --prod (生产部署)
```

### **紧急修复流程**
```
1. 创建hotfix分支
2. vercel deploy (Preview测试)
3. 快速审查和验证
4. 合并到main
5. vercel --prod (紧急生产部署)
```

## 🛠️ **高级部署选项**

### **环境管理**
```bash
# 列出所有部署
vercel list

# 按环境过滤
vercel list --environment=production
vercel list --environment=preview

# 检查特定部署
vercel inspect [deployment-url]

# 查看构建日志
vercel inspect [deployment-url] --logs
```

### **回滚操作**
```bash
# 回滚到之前的部署
vercel rollback

# 回滚到指定部署
vercel rollback [deployment-url]

# 提升特定部署为生产
vercel promote [deployment-url]
```

### **安全选项**
```bash
# 安全删除（保护活跃部署）
vercel remove [project-name] --safe

# 设置超时
vercel deploy --timeout=10m

# 不等待完成
vercel deploy --no-wait
```

## 📊 **环境变量管理**

### **环境变量操作**
```bash
# 添加环境变量
vercel env add [name] [environment]

# 列出环境变量
vercel env ls [environment]

# 拉取环境变量到本地
vercel env pull --environment=[environment]

# 删除环境变量
vercel env rm [name] [environment]
```

### **环境类型**
- `development` - 本地开发环境
- `preview` - 预览/测试环境
- `production` - 生产环境
- `staging` - 自定义预发布环境

## 🔍 **故障排除**

### **常见错误及解决方案**

#### **错误1: 意外生产部署**
```bash
# 问题: 在feature分支执行了 vercel --prod
# 解决: 立即回滚
vercel rollback
```

#### **错误2: 环境变量不匹配**
```bash
# 问题: 本地环境变量与部署环境不一致
# 解决: 重新拉取环境变量
vercel env pull --environment=production
```

#### **错误3: 构建失败**
```bash
# 问题: 部署时构建失败
# 解决: 本地验证构建
vercel build --prod
vercel inspect [deployment-url] --logs
```

## 📋 **检查清单**

### **部署前检查**
- [ ] 确认当前分支 (`git branch --show-current`)
- [ ] 确认代码最新 (`git status`)
- [ ] 本地测试通过 (`vercel dev`)
- [ ] 环境变量正确 (`vercel env pull`)
- [ ] 构建成功 (`vercel build`)

### **生产部署检查**
- [ ] 在main分支
- [ ] 代码已审查
- [ ] 测试已通过
- [ ] 使用正确命令 (`vercel --prod`)
- [ ] 部署后验证

## 🎯 **总结**

### **记住这些关键点**
1. **本地开发**: `vercel dev`
2. **Preview测试**: `vercel` 或 `vercel deploy`
3. **生产部署**: `vercel --prod` (仅在main分支)
4. **环境管理**: 使用 `--environment` 和 `--target` 选项
5. **安全第一**: 始终验证分支和环境

### **🚨 最重要的规则**
**永远不要在非生产分支使用 `vercel --prod`！**

这个规范必须严格遵守，任何违反都可能导致严重后果。
