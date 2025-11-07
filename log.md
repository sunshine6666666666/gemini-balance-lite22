2025-11-07 08:32:16.238 [info] 📥 收到请求: POST /v1beta/models/gemini-flash-latest:generateContent
2025-11-07 08:32:16.240 [info] ✅ 处理API请求: POST /v1beta/models/gemini-flash-latest:generateContent
2025-11-07 08:32:16.241 [info] [1762504336236] 请求开始: POST /v1beta/models/gemini-flash-latest:generateContent
2025-11-07 08:32:16.241 [info] [1762504336236] Gemini原生API请求
2025-11-07 08:32:16.241 [info] [1762504336236] 处理Gemini原生API: /v1beta/models/gemini-flash-latest:generateContent
2025-11-07 08:32:16.242 [info] [1762504336236] 模型: gemini-flash-latest, 操作: generateContent
2025-11-07 08:32:16.242 [info] ✅ [1762504336236] Gemini原生: API Key白名单验证通过: AIzaSyBx...
2025-11-07 08:32:16.242 [info] 🎯 [1762504336236] Gemini原生: 单Key模式: 启用备用Key池，共22个Key
2025-11-07 08:32:16.242 [info] [1762504336236] 🔑 获得22个有效API Key，启用负载均衡
2025-11-07 08:32:16.243 [info] ⚖️ [1762504336236] 负载均衡: 时间窗口轮询 | 选中: AIzaSyCx...tCEs | 总数: 22
2025-11-07 08:32:16.243 [info] [1762504336236] Gemini原生请求体: {
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "# 新闻标题生成任务\n\n## 系统角色\n你是一个专业的新闻编辑，具备12年新闻写作与标题制作经验。你的任务是为提供的文本内容生成客观、准确、吸引人的新闻标题和简要详情。\n\n## 文本内容\n以下是需要分析的完整文本内容：\n\n```\nGood evening and thank you for joining us. Nestle, the world's largest packaged food company, says it's cutting 16,000 jobs globally over the next two years. The Swiss food giant says 12,000 white-collar positions are affected. The rest of the cuts will come from manufacturing and supply chains.\n```\n\n## 任务要求\n\n### 1. 新闻标题生成要求\n- **风格导向**：新闻导向，准确概括主要内容\n- **字数控制**：严格控制在15个中文字以内\n- **客观公允**：保持中性立场，避免主观色彩\n- **核心突出**：突出最重要的事件或信息\n- **简洁明了**：用最少的字表达最多的信息\n\n### 2. 详情总结要求\n- **字数控制**：严格控制在20个中文字左右\n- **补充信息**：提供标题未涵盖的重要细节\n- **逻辑清晰**：与标题形成良好的信息层次\n- **完整性**：确保标题+详情能够完整概括文章要点\n\n### 3. 内容安全要求（重要）\n**严格禁止使用以下负面表达：**\n- **暴力词汇**：刺杀、谋杀、爆炸、袭击、恐怖、威胁等\n- **死亡词汇**：死亡、丧生、遇难、尸体、伤亡等\n- **灾难词汇**：灾难、毁灭、摧毁、崩溃、破坏等\n- **冲突词汇**：战争、冲突、暴力、危机、动乱等\n- **其他负面**：失败、拒绝、禁止、暂停、否认等\n\n**替代策略：**\n- **事件中性化**：用\"事件\"、\"情况\"、\"状况\"替代负面描述\n- **过程描述**：关注应对措施、处理过程、解决方案\n- **结果导向**：突出积极的应对和处理结果\n- **机构行动**：强调相关部门的响应和措施\n\n### 4. 新闻标题特征要求\n- **时效性**：体现事件的时间特征\n- **地域性**：明确事件发生的地点\n- **主体性**：明确事件的主要参与者\n- **客观性**：避免情感色彩和主观判断\n- **准确性**：确保信息的真实和准确\n\n## 内容安全示例\n\n### 负面内容转换示例：\n\n**原始负面内容** → **安全替代表达**\n- \"酒店爆炸\" → \"酒店发生安全事故\"\n- \"人员伤亡\" → \"相关人员接受救助\"\n- \"建筑被毁\" → \"建筑受损需要修复\"\n- \"恐怖袭击\" → \"安全事件调查中\"\n- \"死亡人数\" → \"救援工作持续进行\"\n\n### 标题生成示例：\n\n**示例1：酒店事故**\n- 原文：酒店发生火灾，造成严重损失\n- ❌ 负面标题：\"酒店大火造成严重损失\"\n- ✅ 安全标题：\"度假村发生安全事故\"\n- 详情：\"相关部门正在调查事故原因\"\n\n**示例2：商业新闻**\n- 原文：公司总经理宣布新政策\n- ✅ 标题：\"公司宣布新管理政策\"\n- 详情：\"总经理介绍政策具体实施方案\"\n\n## 输出格式\n\n请严格按照以下JSON格式输出结果：\n\n```json\n{\n  \"newsTitle\": \"新闻标题（15个中文字以内）\",\n  \"newsDetail\": \"详情总结（20个中文字左右）\"\n}\n```\n\n## 质量检查清单\n\n### 标题检查：\n- [ ] 字数是否在15个中文字以内？\n- [ ] 是否避免了所有负面词汇？\n- [ ] 是否客观中性，无主观色彩？\n- [ ] 是否准确概括了主要内容？\n- [ ] 是否符合新闻标题规范？\n\n### 详情检查：\n- [ ] 字数是否在20个中文字左右？\n- [ ] 是否提供了有价值的补充信息？\n- [ ] 是否与标题形成良好配合？\n- [ ] 是否避免了负面表达？\n- [ ] 是否保持客观中性？\n\n### 整体检查：\n- [ ] 标题+详情是否完整概括文章要点？\n- [ ] 是否符合内容安全要求？\n- [ ] 是否适合作为文件命名前缀？\n- [ ] 是否具有良好的可读性？\n\n## 注意事项\n\n1. **安全第一**：内容安全是最高优先级，宁可信息不完整也不能包含负面内容\n2. **字数严格**：严格遵守字数限制，超出限制的内容一律不合格\n3. **客观中性**：保持新闻的客观性和中性立场\n4. **信息完整**：在安全和字数限制下，尽可能提供完整信息\n5. **格式规范**：严格按照JSON格式输出，不得有格式错误\n"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "maxOutputTokens": 50000,
    "responseMimeType": "application/json"
  },
  "systemInstruction": {
    "parts": [
      {
        "text": "Strictly follow the user prompt instructions.\n"
      }
    ]
  }
}
2025-11-07 08:32:16.243 [info] [1762504336236] 转发到Gemini API: https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent
2025-11-07 08:32:16.243 [info] [1762504336236] 🔄 Gemini原生尝试1/22: 使用API Key AIzaSyBx...
2025-11-07 08:32:16.282 [info] [1762504336236] 📥 Gemini原生尝试1: 响应状态 403
2025-11-07 08:32:16.282 [warning] [1762504336236] ⚠️ Gemini原生尝试1: API Key认证失败 (403): {
  "error": {
    "code": 403,
    "message": "Your API key was reported as leaked. Please use another API key.",
    "status": "PERMISSION_DENIED"
  }
}
2025-11-07 08:32:16.283 [info] [1762504336236] 🔄 Gemini原生: 切换到下一个API Key...
2025-11-07 08:32:16.283 [info] [1762504336236] 🔄 Gemini原生尝试2/22: 使用API Key AIzaSyAi...
2025-11-07 08:32:21.377 [info] [1762504336236] 📥 Gemini原生尝试2: 响应状态 200
2025-11-07 08:32:21.377 [info] [1762504336236] ✅ Gemini原生尝试2: API Key验证成功
2025-11-07 08:32:21.378 [info] [1762504336236] Gemini API响应: {
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{\n  \"newsTitle\": \"雀巢宣布全球削减1.6万职位\",\n  \"newsDetail\": \"两年内完成调整，其中1.2万为白领岗位。\"\n}",
            "thoughtSignature": "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"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 1154,
    "candidatesTokenCount": 44,
    "totalTokenCount": 1956,
    "promptTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 1154
      }
    ],
    "thoughtsTokenCount": 758
  },
  "modelVersion": "gemini-2.5-flash-preview-09-2025",
  "responseId": "la4NaeTCCd_XjuMPm8Hu4AI"
}