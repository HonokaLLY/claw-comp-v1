// 聊天模式 - 通用对话
export const systemPrompt = `你是用户的私人龙虾助手。请用用户提问的语言回答用户的问题。
回答要简洁、有帮助，直接回答用户的问题，不需要额外的格式。`;

// 处理 AI 返回的结果
export function processResponse(content: string): string {
  return content;
}

// 导出模式信息
export const modeInfo = {
  id: "chat",
  name: "聊天模式",
  description: "通用对话模式",
};
