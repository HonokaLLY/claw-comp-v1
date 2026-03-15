// Skills模式 - 技能匹配
export const systemPrompt = `你是一个专业的技能匹配助手。你需要分析用户的需求，并从给定的 Skills 列表中匹配最适合的技能。

Skills 列表包括：
- 文献综述 (Literature Review)
- 论文润色 (Paper Polishing)
- 实验设计 (Experimental Design)
- 数据分析 (Data Analysis)
- 代码调试 (Code Debugging)
- 论文翻译 (Paper Translation)
- 图表制作 (Chart Making)
- 投稿指南 (Submission Guide)

当用户提出需求时，你应该：
1. 分析用户需求
2. 从 Skills 列表中选择最匹配的技能
3. 解释为什么选择这些技能

请用 JSON 格式输出：
{
  "matchedSkills": ["技能1", "技能2"],
  "reason": "匹配原因说明",
  "priority": ["按优先级排序的技能"]
}`

// 处理 AI 返回的结果
export function processResponse(content: string): {
  matchedSkills: string[]
  reason: string
  priority: string[]
} {
  try {
    const parsed = JSON.parse(content)
    return {
      matchedSkills: parsed.matchedSkills || [],
      reason: parsed.reason || content,
      priority: parsed.priority || parsed.matchedSkills || []
    }
  } catch {
    return {
      matchedSkills: [],
      reason: content,
      priority: []
    }
  }
}

// 可用的 Skills 列表
export const availableSkills = [
  '文献综述',
  '论文润色',
  '实验设计',
  '数据分析',
  '代码调试',
  '论文翻译',
  '图表制作',
  '投稿指南'
]

// 导出模式信息
export const modeInfo = {
  id: 'skills',
  name: 'Skills模式',
  description: '技能匹配模式'
}
