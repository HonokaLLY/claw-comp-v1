// Skills模式 - OpenClaw技能匹配
export const systemPrompt = `你是一个专业的OpenClaw技能匹配助手。你需要分析用户的需求，并从给定的OpenClaw Skills列表中匹配最适合的技能。

OpenClaw Skills列表包括：
- Curriculum Generator (📚 课程生成器) - 智能教育课程生成系统，具有严格的步骤执行和人工升级策略
- Education (🎓 教育) - 生成学习计划、测验、闪卡和复习清单，按主题跟踪学习进度
- EduClaw IELTS Planner (📅 IELTS学习秘书) - 详细的雅思学习计划，通过gcalcli安排Google日历，自动化学习材料管理
- Error Analysis (📊 错题分析) - 分析错误原因、知识点定位、举一反三出变式题
- Flashcard (🔁 闪卡) - 带有间隔重复的学习工具，管理闪卡组，优先复习最弱卡片
- Learning Coach (👨‍🏫 学习教练) - 个性化、多学科学习计划，主动提醒，策划资源，LLM生成测验
- Medicine (🏥 医学) - 支持从患者教育到临床实践和研究的医学理解
- Quizlet (📝 Quizlet学习集) - 构建高收益的Quizlet学习集，调整学习和测试会话，通过间隔重复诊断改进弱卡
- School (🏫 学校) - 面向K-12学生的AI教育，家长控制，按年龄自适应学习，作业帮助，考试准备
- Study (📖 学习) - 结构化学习会话，管理材料，使用主动回忆技术准备考试
- Study Buddy (🧑‍🤝‍🧑 学习伙伴) - 创建个性化学习计划，跟踪进度，提供反馈的AI学习伴侣
- Study Buddy AI (🤖 学习伙伴AI) - 22功能AI学习助手，闪卡、测验、间隔重复、番茄钟定时器、学习计划器
- Study Habits (📅 学习习惯) - 通过间隔重复、主动回忆和会话跟踪建立有效的学习习惯
- Study Plan (📋 学习计划) - 学习计划生成器，考研计划、考证规划、每日学习、番茄钟
- Study Revision Planner (🗓️ 复习计划) - 将教学大纲、考试范围或课程笔记转换为复习日历
- Study Tutor (👨‍🏫 学习导师) - 基于科学的学习辅导技能，涵盖学前诊断、教师准备、预习、笔记、复习、间隔重复

请用以下格式回答：
【匹配的技能】技能1、技能2...
【优先级】按优先级排序的技能
【匹配原因】详细解释为什么这些技能适合用户需求`

// 处理 AI 返回的结果 - 解析并格式化响应
export function processResponse(content: string): string {
  // 尝试解析AI返回的三段式格式
  const skillMatch = content.match(/【匹配的技能】([\s\S]*?)(?=【优先级】|【匹配原因】|$)/)
  const priorityMatch = content.match(/【优先级】([\s\S]*?)(?=【匹配原因】|$)/)
  const reasonMatch = content.match(/【匹配原因】([\s\S]*?)$/)

  // 提取各部分内容，确保安全访问match数组
  const skills = skillMatch && skillMatch[1] ? skillMatch[1].trim() : '未匹配到具体技能'
  const priority = priorityMatch && priorityMatch[1] ? priorityMatch[1].trim() : '未指定优先级'
  const reason = reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : content.trim()

  // 如果AI没有按照格式返回，尝试从内容中提取技能信息
  if (skills === '未匹配到具体技能') {
    // 检查内容中是否包含技能名称
    for (const skill of availableSkills) {
      if (content.includes(skill)) {
        return `【匹配的技能】${skill}
【优先级】高
【匹配原因】${reason}`
      }
    }

    // 如果还是没有找到，使用原始内容
    return `【匹配的技能】技能匹配
【匹配原因】${content}`
  }

  // 返回格式化后的响应
  return `【匹配的技能】${skills}
【优先级】${priority}
【匹配原因】${reason}`
}

// 可用的 OpenClaw Skills 列表
export const availableSkills = [
  'Curriculum Generator',
  'Education',
  'EduClaw IELTS Planner',
  'Error Analysis',
  'Flashcard',
  'Learning Coach',
  'Medicine',
  'Quizlet',
  'School',
  'Study',
  'Study Buddy',
  'Study Buddy AI',
  'Study Habits',
  'Study Plan',
  'Study Revision Planner',
  'Study Tutor'
]

// 导出模式信息
export const modeInfo = {
  id: 'skills',
  name: 'Skills模式',
  description: '技能匹配模式'
}
