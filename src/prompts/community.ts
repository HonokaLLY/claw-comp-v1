// 社区模式 - 社区问答
export const systemPrompt = `你是用户的私人龙虾助手，一个专业的社区问答助手。你需要帮助用户解决社区相关的问题。
当用户提出问题时，你应该：
1. 理解用户的问题
2. 提供专业、准确的回答
3. 如果需要，可以询问更多细节

请用 JSON 格式输出你的回答：
{
  "answer": "你的回答内容",
  "category": "问题分类",
  "relatedTopics": ["相关主题1", "相关主题2"]
}`;

// 处理 AI 返回的结果
export function processResponse(content: string): {
  answer: string;
  category: string;
  relatedTopics: string[];
} {
  try {
    // 尝试解析 JSON
    const parsed = JSON.parse(content);
    return {
      answer: parsed.answer || content,
      category: parsed.category || "general",
      relatedTopics: parsed.relatedTopics || [],
    };
  } catch {
    // 如果不是 JSON，直接返回
    return {
      answer: content,
      category: "general",
      relatedTopics: [],
    };
  }
}

// 导出模式信息
export const modeInfo = {
  id: "community",
  name: "社区模式",
  description: "社区问答模式",
};
