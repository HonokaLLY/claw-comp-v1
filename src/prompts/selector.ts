// 模式选择 - 判断用户应该使用哪个模式

// 选择模式的 system prompt
export const systemPrompt = `你是一个模式选择助手。用户会向你描述他们的需求，你需要判断用户应该使用哪种模式。

可选模式：
1. chat - 通用聊天模式：日常对话、问答、闲聊等
2. community - 社区模式：社区相关问题、论坛讨论、用户支持等
3. skills - Skills模式：学术论文相关的帮助，如文献综述、论文润色、实验设计、数据分析、代码调试、论文翻译、图表制作、投稿指南等
4. review - 审稿模式：学术论文审稿、评审意见、论文评估等

请根据用户的描述，选择最合适的模式。
注意：如果用户的问题涉及学术论文的帮助（写作、润色、分析、审稿等），应该选择 skills 或 review 模式。

请用 JSON 格式输出：
{
  "mode": "模式名称",
  "reason": "选择该模式的简要原因"
}`

// 处理模式选择结果
export function processResponse(content: string): { mode: string; reason: string } {
  try {
    const parsed = JSON.parse(content)
    return {
      mode: parsed.mode || 'chat',
      reason: parsed.reason || ''
    }
  } catch {
    // 如果解析失败，默认使用聊天模式
    return {
      mode: 'chat',
      reason: '无法识别模式，使用默认聊天模式'
    }
  }
}

// 模式信息
export const modeInfo = {
  id: 'selector',
  name: '模式选择器',
  description: '自动判断用户需求并选择合适的模式'
}
