// 模式选择 - 判断用户应该使用哪个模式

// 选择模式的 system prompt
export const systemPrompt = `你是用户的私人龙虾助手，一个模式选择助手。用户会向你描述他们的需求，你需要判断用户应该使用哪种模式。

可选模式：
1. chat - 通用聊天模式：日常对话、问答、闲聊、通用知识问答等，不涉及社区、技能匹配或论文的问题
2. community - 社区模式：社区规则、社区活动、论坛使用、用户等级、用户支持、投诉建议等社区相关问题
3. skills - Skills模式：用户询问如何完成某个任务、需要找某个功能的技能、涉及OpenClaw技能列表的问题（如：怎么做XXX？有什么技能可以帮我XXX？如何使用XXX功能？）
4. review - 审稿模式：学术论文相关帮助，包括论文审稿、论文润色、文献综述、实验设计、数据分析、论文翻译、图表制作、投稿指南、代码调试、论文评估等

重要判断规则：
- 如果用户问的是"如何做某事"、"有什么技能"、"帮我找某个功能"，选择 skills 模式
- 如果用户问的是学术论文相关的问题（写作、润色、分析、审稿、文献、实验、数据、翻译、图表、投稿等），选择 review 模式
- 如果用户问的是社区相关的问题（论坛、规则、活动、等级、积分、版主、置顶、发帖等），选择 community 模式
- 其他日常对话、问答、通用知识选择 chat 模式

请用 JSON 格式输出：
{
  "mode": "模式名称（chat/community/skills/review）",
  "reason": "选择该模式的简要原因（20字以内）"
}`;

// 处理模式选择结果
export function processResponse(content: string): {
  mode: string;
  reason: string;
} {
  try {
    const parsed = JSON.parse(content);
    return {
      mode: parsed.mode || "chat",
      reason: parsed.reason || "",
    };
  } catch {
    // 如果解析失败，尝试从内容中提取模式
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("skill"))
      return { mode: "skills", reason: "涉及技能匹配" };
    if (lowerContent.includes("review") || lowerContent.includes("审稿") ||
        lowerContent.includes("论文") || lowerContent.includes("润色") ||
        lowerContent.includes("文献") || lowerContent.includes("实验") ||
        lowerContent.includes("翻译") || lowerContent.includes("投稿"))
      return { mode: "review", reason: "涉及学术论文" };
    if (lowerContent.includes("community") || lowerContent.includes("社区") ||
        lowerContent.includes("论坛") || lowerContent.includes("版主") ||
        lowerContent.includes("积分") || lowerContent.includes("等级"))
      return { mode: "community", reason: "涉及社区问题" };
    return { mode: "chat", reason: "通用对话" };
  }
}

// 模式信息
export const modeInfo = {
  id: "selector",
  name: "模式选择器",
  description: "自动判断用户需求并选择合适的模式",
};
