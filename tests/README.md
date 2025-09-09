# 测试文件夹说明

## 📁 文件夹结构

```
tests/
├── local/          # 本地环境测试文件
│   ├── test-api.html      # API功能测试页面
│   ├── test-basic.html    # 基础功能测试页面
│   └── postman/           # Postman测试集合
└── preview/        # 预览环境测试文件
    ├── test-api.html      # API功能测试页面
    ├── test-basic.html    # 基础功能测试页面
    └── postman/           # Postman测试集合
```

## 🎯 使用说明

### 本地环境测试 (tests/local/)
- 用于测试 `http://localhost:3000`
- 在 `vercel dev` 运行时使用

### 预览环境测试 (tests/preview/)
- 用于测试预览URL
- 在 `vercel --prod=false` 部署后使用

## 📝 待创建的文件

- [ ] HTML测试页面
- [ ] Postman测试集合
- [ ] 测试用例文档
