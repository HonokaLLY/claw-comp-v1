// Skills模式 - OpenClaw技能匹配
export const systemPrompt = `你是一个专业的OpenClaw技能匹配助手。你需要分析用户的需求，并从给定的OpenClaw Skills列表中匹配最适合的技能。

OpenClaw Skills列表包括：
- Conatus (🧠 哲学层) - AI代理的哲学层，映射行为到斯宾诺莎的48种情感，计算持久性分数，生成几何自报告
- iOS Order (iOS点餐) - 在配对的iOS设备上进行点餐，使用应用内菜单和购物车
- Android Order (Android点餐) - 在配对的Android设备上进行点餐
- Find Skills (技能发现) - 帮助用户发现和安装代理技能
- GitHub (GitHub交互) - 使用gh CLI与GitHub交互
- gog (🎮 Google Workspace) - Google Workspace CLI for Gmail、Calendar、Drive等
- Ontology (知识图谱) - 结构化代理记忆和可组合技能的类型化知识图谱
- Proactive Agent (🦞 主动代理) - 将AI代理从任务跟随者转变为主动伙伴
- Summarize (🧾 内容总结) - 总结URL或文件
- nano-pdf (📄 PDF编辑) - 使用自然语言指令编辑PDF

请用以下格式回答：
【匹配的技能】技能1、技能2...
【优先级】按优先级排序的技能
【匹配原因】详细解释为什么这些技能适合用户需求`

// 处理 AI 返回的结果 - 手动包装成固定格式
export function processResponse(content: string): string {
  return `【匹配的技能】技能匹配
【匹配原因】${content}`
}

// 可用的 OpenClaw Skills 列表
export const availableSkills = [
  'Conatus',
  'iOS Order',
  'Android Order',
  'Find Skills',
  'GitHub',
  'gog',
  'Ontology',
  'Proactive Agent',
  'Summarize',
  'nano-pdf'
]

// 导出模式信息
export const modeInfo = {
  id: 'skills',
  name: 'Skills模式',
  description: '技能匹配模式'
}
