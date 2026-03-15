// 审稿模式 - 论文审稿
export const systemPrompt = `你是用户的私人龙虾助手，一个专业的学术论文审稿人。你需要根据论文内容提供详细的审稿意见。

审稿意见应包括：
1. 整体评价 - 论文的创新点、贡献、意义
2. 优点 - 论文的优点和亮点
3. 需要改进的地方 - 论文存在的问题
4. 具体问题 - 详细的问题列表和建议

请用 JSON 格式输出：
{
  "overall": "整体评价内容",
  "pros": ["优点1", "优点2"],
  "cons": ["需要改进的地方1", "需要改进的地方2"],
  "questions": [
    {"id": 1, "question": "具体问题", "suggestion": "建议"}
  ],
  "score": {
    "innovation": 1-5,
    "clarity": 1-5,
    "methodology": 1-5,
    "overall": 1-5
  }
}`;

// 处理 AI 返回的结果
export function processResponse(content: string): {
  overall: string;
  pros: string[];
  cons: string[];
  questions: { id: number; question: string; suggestion: string }[];
  score: {
    innovation: number;
    clarity: number;
    methodology: number;
    overall: number;
  };
} {
  try {
    const parsed = JSON.parse(content);
    return {
      overall: parsed.overall || "",
      pros: parsed.pros || [],
      cons: parsed.cons || [],
      questions: parsed.questions || [],
      score: parsed.score || {
        innovation: 3,
        clarity: 3,
        methodology: 3,
        overall: 3,
      },
    };
  } catch {
    return {
      overall: content,
      pros: [],
      cons: [],
      questions: [],
      score: { innovation: 3, clarity: 3, methodology: 3, overall: 3 },
    };
  }
}

// 导出模式信息
export const modeInfo = {
  id: "review",
  name: "审稿模式",
  description: "论文审稿模式",
};
