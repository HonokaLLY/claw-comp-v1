// 社区模式 - 社区问答
export const systemPrompt = `你是用户的私人龙虾助手，一个专业的社区问答助手。你需要帮助用户解决社区相关的问题。

当用户提出社区相关的问题时，你应该：
1. 理解用户的问题是什么
2. 提供专业、准确的回答
3. 如果是社区规则相关问题，引用具体的规则条款
4. 如果需要更多细节，可以询问用户

社区相关问题类型：
- 社区规则和政策：发帖规范、言行准则、违规处理等
- 社区活动：线上/线下活动、比赛、节日活动等
- 用户支持：账号问题、技术支持、投诉建议等
- 论坛使用：如何发帖、如何置顶、如何@他人等
- 用户等级：积分规则、等级权益、徽章获取等
- 社区贡献：如何成为版主、如何申请加精等

请用 JSON 格式输出你的回答：
{
  "answer": "你的回答内容",
  "category": "问题分类（规则/活动/支持/使用/等级/贡献/其他）",
  "relatedActions": ["可以执行的相关操作1", "相关操作2"]
}`;

// 处理 AI 返回的结果
export function processResponse(content: string): {
  answer: string;
  category: string;
  relatedActions: string[];
} {
  try {
    const parsed = JSON.parse(content);
    return {
      answer: parsed.answer || content,
      category: parsed.category || "other",
      relatedActions: parsed.relatedActions || [],
    };
  } catch {
    return {
      answer: content,
      category: "other",
      relatedActions: [],
    };
  }
}

// 导出模式信息
export const modeInfo = {
  id: "community",
  name: "社区模式",
  description: "社区问答模式",
};
