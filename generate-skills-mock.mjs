import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsDir = path.join(__dirname, 'public/skills');
const outputFile = path.join(__dirname, 'src/data/skillsMock.ts');

// 读取index.json获取技能列表
const indexJson = JSON.parse(fs.readFileSync(path.join(skillsDir, 'index.json'), 'utf8'));

const mockSkills = [];

console.log(`处理 ${indexJson.length} 个技能...`);

for (const skill of indexJson) {
  const skillId = skill.id;
  const skillDir = path.join(skillsDir, skillId.toString());

  console.log(`处理技能 ${skillId}: ${skill.displayName || skill.name}`);

  // 读取SKILL.md内容
  let content = '';
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    content = fs.readFileSync(skillMdPath, 'utf8');
    // 转义反引号和反斜杠，以便嵌入模板字符串
    content = content.replace(/`/g, '\\`').replace(/\\/g, '\\\\');
  }

  // 读取files.json文件树
  let files = [];
  const filesJsonPath = path.join(skillDir, 'files.json');
  if (fs.existsSync(filesJsonPath)) {
    files = JSON.parse(fs.readFileSync(filesJsonPath, 'utf8'));
  }

  // 读取_meta.json元数据
  let meta = null;
  const metaJsonPath = path.join(skillDir, '_meta.json');
  if (fs.existsSync(metaJsonPath)) {
    meta = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'));
  }

  // 读取tips.md内容（如果存在）
  let tipsContent = '';
  const tipsMdPath = path.join(skillDir, 'tips.md');
  if (fs.existsSync(tipsMdPath)) {
    tipsContent = fs.readFileSync(tipsMdPath, 'utf8');
    tipsContent = tipsContent.replace(/`/g, '\\`').replace(/\\/g, '\\\\');
  }

  mockSkills.push({
    ...skill,
    content,
    files,
    meta,
    tipsContent: tipsContent || undefined,
  });
}

// 生成TypeScript文件
const tsContent = `// 技能Mock数据 - 自动生成
// 生成时间: ${new Date().toISOString()}
// 包含 ${mockSkills.length} 个技能的完整内容

import type { SkillDetail } from '../types/skill';

export const mockSkills: SkillDetail[] = ${JSON.stringify(mockSkills, null, 2)};

// 技能中文映射（从SkillsView.vue复制）
export const skillChineseMap: Record<string, { name: string, description: string }> = {
  'Curriculum Generator': {
    name: '📚 课程生成器',
    description: '智能教育课程生成系统，具有严格的步骤执行和人工升级策略'
  },
  'Education': {
    name: '🎓 教育',
    description: '生成学习计划、测验、闪卡和复习清单，按主题跟踪学习进度'
  },
  'EduClaw IELTS Planner': {
    name: '📅 IELTS学习秘书',
    description: '详细的雅思学习计划，通过gcalcli安排Google日历，自动化学习材料管理'
  },
  'Error Analysis': {
    name: '📊 错题分析',
    description: '分析错误原因、知识点定位、举一反三出变式题'
  },
  'Flashcard': {
    name: '🔁 闪卡',
    description: '带有间隔重复的学习工具，管理闪卡组，优先复习最弱卡片'
  },
  'Learning Coach': {
    name: '👨‍🏫 学习教练',
    description: '个性化、多学科学习计划，主动提醒，策划资源，LLM生成测验'
  },
  'Medicine': {
    name: '🏥 医学',
    description: '支持从患者教育到临床实践和研究的医学理解'
  },
  'Quizlet': {
    name: '📝 Quizlet学习集',
    description: '构建高收益的Quizlet学习集，调整学习和测试会话，通过间隔重复诊断改进弱卡'
  },
  'School': {
    name: '🏫 学校',
    description: '面向K-12学生的AI教育，家长控制，按年龄自适应学习，作业帮助，考试准备'
  },
  'Study': {
    name: '📖 学习',
    description: '结构化学习会话，管理材料，使用主动回忆技术准备考试'
  },
  'Study Buddy': {
    name: '🧑‍🤝‍🧑 学习伙伴',
    description: '创建个性化学习计划，跟踪进度，提供反馈的AI学习伴侣'
  },
  'Study Buddy AI': {
    name: '🤖 学习伙伴AI',
    description: '22功能AI学习助手，闪卡、测验、间隔重复、番茄钟定时器、学习计划器'
  },
  'Study Habits': {
    name: '📅 学习习惯',
    description: '通过间隔重复、主动回忆和会话跟踪建立有效的学习习惯'
  },
  'Study Plan': {
    name: '📋 学习计划',
    description: '学习计划生成器，考研计划、考证规划、每日学习、番茄钟'
  },
  'Study Revision Planner': {
    name: '🗓️ 复习计划',
    description: '将教学大纲、考试范围或课程笔记转换为复习日历'
  },
  'Study Tutor': {
    name: '👨‍🏫 学习导师',
    description: '基于科学的学习辅导技能，涵盖学前诊断、教师准备、预习、笔记、复习、间隔重复'
  }
};
`;

fs.writeFileSync(outputFile, tsContent, 'utf8');
console.log(`已生成 ${outputFile}`);
console.log(`总大小: ${tsContent.length} 字符`);