<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Skill {
  id: number
  name: string
  description: string
  icon: string
  category: string
  author: string
  downloads: number
  content: string
}

const showUploadDialog = ref(false)

const newSkill = ref({
  name: '',
  description: '',
  category: '开发',
  icon: '⚡',
  content: ''
})

const skills = ref<Skill[]>([])

const selectedCategory = ref('全部')
const searchKeyword = ref('')
const categories = ['全部', '开发', '测试', '文档', '安全', '优化', '工具', '教育']
const icons = ['⚡', '🔍', '🐛', '🧪', '📄', '🔧', '🔒', '🌍', '💡', '🎯', '🚀']

// 从 JSON 文件加载 skills 数据
onMounted(async () => {
  try {
    const res = await fetch('/skills/index.json')
    const data = await res.json()
    // 将数据转换为统一的Skill格式
    skills.value = await transformSkillsData(data)
  } catch (error) {
    console.error('加载Skills失败:', error)
  }
})

// 技能名称和描述的中文映射
const skillChineseMap: Record<string, { name: string, description: string }> = {
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
}

// 转换skills数据到统一格式
async function transformSkillsData(rawData: any[]): Promise<Skill[]> {
  const seenIds = new Set<number>()
  const skillsList: Skill[] = []

  for (const item of rawData) {
    // 处理重复ID（如id=8有多个版本）
    let id = Number(item.id)
    if (seenIds.has(id)) {
      // 为重复ID生成新ID（基于内容哈希）
      const hash = await hashString(JSON.stringify(item))
      id = 10000 + (hash % 1000)
    }
    seenIds.add(id)

    // 根据不同的数据格式提取字段
    const displayName = item.displayName || item.name || '未命名Skill'
    const originalDescription = item.description || '无描述'

    // 使用中文映射替换标题和描述
    const chineseMapping = skillChineseMap[displayName]
    const name = chineseMapping ? chineseMapping.name : displayName
    const description = chineseMapping ? chineseMapping.description : originalDescription

    // 旧数据可能没有这些字段，设置默认值
    const category = item.category || getDefaultCategory(name, description)
    const icon = item.icon || getDefaultIcon(category || name)
    const author = item.author || item.owner || '未知'
    const downloads = item.downloads || 0

    // 尝试读取skill文件内容
    let content = item.content || ''
    if (!content && item.file) {
      // 尝试从文件读取（需要知道技能目录，假设在数字目录下）
      const skillDir = item.id.toString()
      try {
        const filePath = `/skills/${skillDir}/${item.file}`
        const response = await fetch(filePath)
        if (response.ok) {
          content = await response.text()
        }
      } catch (error) {
        console.warn(`无法读取skill内容 ${item.id}:`, error)
      }
    }

    skillsList.push({
      id,
      name,
      description,
      icon,
      category,
      author,
      downloads,
      content
    })
  }

  return skillsList
}

// 简单哈希函数
async function hashString(str: string): Promise<number> {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// 根据分类或名称获取默认图标
function getDefaultIcon(categoryOrName: string | undefined | null): string {
  if (!categoryOrName) {
    // 默认返回第一个图标
    return '⚡'
  }

  // 此时 categoryOrName 一定是 string
  const name = categoryOrName as string

  const iconMap: Record<string, string> = {
    '开发': '⚡',
    '测试': '🧪',
    '文档': '📄',
    '安全': '🔒',
    '优化': '🚀',
    '工具': '🔧',
    '教育': '🎓',
    'conatus': '🧠',
    'order': '🛒',
    'github': '🐙',
    'gog': '📧',
    'ontology': '🔗',
    'proactive-agent': '🚀',
    'summarize': '📝',
    'nano-pdf': '📄',
    'find-skills': '🔍',
    'curriculum': '📚',
    'learning': '🧠',
    'study': '📖',
    'school': '🏫',
    'tutor': '👨‍🏫',
    'quiz': '📝',
    'flashcard': '🔁',
    'medicine': '🏥',
    'coach': '👨‍🏫'
  }

  const searchString = name.toLowerCase()
  for (const [key, icon] of Object.entries(iconMap)) {
    if (searchString.includes(key.toLowerCase())) {
      return icon
    }
  }

  // 默认图标列表
  const defaultIcons = ['⚡', '🔍', '🐛', '🧪', '📄', '🔧', '🔒', '🌍', '💡', '🎯', '🚀', '🎓', '📚', '🧠', '📖', '🏫']
  const hash = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))
  return defaultIcons[hash % defaultIcons.length]!
}

// 根据名称和描述推断分类
function getDefaultCategory(name: string, description: string): string {
  const categoryPatterns: Record<string, string[]> = {
    '开发': ['代码', '编程', '开发', 'bug', 'fix', 'review', 'refactor', 'github', 'conatus', 'proactive-agent', 'ontology'],
    '测试': ['测试', 'test', '单元测试', '集成测试'],
    '文档': ['文档', 'doc', '注释', 'comment', 'markdown', 'pdf', 'summarize', 'nano-pdf'],
    '安全': ['安全', 'security', '漏洞', '扫描', 'audit', '防护'],
    '优化': ['性能', '优化', 'perf', 'speed', '加速'],
    '工具': ['工具', 'tool', '实用', 'utility', '翻译', 'find', 'order', '点餐', 'ios', 'android'],
    '教育': ['教育', '学习', 'study', 'learning', '课程', 'curriculum', '教学', 'teacher', '学生', 'school', '学校', 'quiz', '测验', 'flashcard', '闪卡', 'tutor', '辅导', 'coach', '教练', 'medicine', '医学', 'ielts', '雅思', 'exam', '考试', '复习', 'revision', 'habits', '习惯', 'buddy', '伙伴', 'error-analysis', '错题分析']
  }

  const text = (name + ' ' + description).toLowerCase()
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some(pattern => text.includes(pattern.toLowerCase()))) {
      return category
    }
  }

  return '工具' // 默认分类
}

const filteredSkills = computed(() => {
  let result = skills.value

  // 分类筛选
  if (selectedCategory.value !== '全部') {
    result = result.filter(skill => skill.category === selectedCategory.value)
  }

  // 关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(skill =>
      skill.name.toLowerCase().includes(keyword) ||
      skill.description.toLowerCase().includes(keyword)
    )
  }

  return result
})

const openUploadDialog = () => {
  newSkill.value = {
    name: '',
    description: '',
    category: '开发',
    icon: '⚡',
    content: '# Skill文档\n\n在这里描述你的Skill...'
  }
  showUploadDialog.value = true
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      newSkill.value.content = e.target?.result as string
    }
    reader.readAsText(file)
  }
}

const submitSkill = () => {
  if (!newSkill.value.name.trim() || !newSkill.value.description.trim()) return
  if (!newSkill.value.content.trim()) {
    alert('请上传 skill.md 文件')
    return
  }

  const skill: Skill = {
    id: Date.now(),
    name: newSkill.value.name,
    description: newSkill.value.description,
    icon: newSkill.value.icon,
    category: newSkill.value.category,
    author: '我',
    downloads: 0,
    content: newSkill.value.content
  }

  skills.value.unshift(skill)
  showUploadDialog.value = false
}

const downloadSkill = (skill: Skill) => {
  skill.downloads++

  // 创建并下载 markdown 文件
  const blob = new Blob([skill.content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'skill.md'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const viewSkillDetail = (skill: Skill) => {
  // 跳转到技能详情页
  router.push(`/skills/${skill.id}`)
}
</script>

<template>
  <div class="skills-view">
    <div class="skills-header">
      <h2>Skills</h2>
      <div class="header-right">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            placeholder="搜索Skills..."
          />
        </div>
        <button class="upload-btn" @click="openUploadDialog">
          + 上传Skill
        </button>
      </div>
    </div>

    <div class="category-filter">
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-btn"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <div class="skills-grid">
      <div v-for="skill in filteredSkills" :key="skill.id" class="skill-card">
        <div class="skill-icon">{{ skill.icon }}</div>
        <div class="skill-info">
          <h3>{{ skill.name }}</h3>
          <p>{{ skill.description }}</p>
          <div class="skill-meta">
            <span class="author">{{ skill.author }}</span>
            <span class="downloads">
              <span class="download-icon">⬇</span>
              {{ skill.downloads }}
            </span>
          </div>
        </div>
        <div class="skill-actions">
          <button class="preview-btn" @click="viewSkillDetail(skill)">
            查看详情
          </button>
          <button class="download-btn" @click="downloadSkill(skill)">
            下载
          </button>
        </div>
      </div>
    </div>

    <!-- 上传对话框 -->
    <div v-if="showUploadDialog" class="dialog-overlay" @click.self="showUploadDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>上传 Skill</h3>
          <button class="close-btn" @click="showUploadDialog = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>名称</label>
            <input v-model="newSkill.name" type="text" placeholder="输入Skill名称" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="newSkill.description" placeholder="输入Skill描述" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>分类</label>
            <select v-model="newSkill.category">
              <option v-for="cat in categories.slice(1)" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>图标</label>
            <div class="icon-selector">
              <button
                v-for="icon in icons"
                :key="icon"
                class="icon-option"
                :class="{ selected: newSkill.icon === icon }"
                @click="newSkill.icon = icon"
              >
                {{ icon }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>上传 skill.md 文件</label>
            <div class="file-upload">
              <input type="file" accept=".md,.markdown" @change="handleFileUpload" />
              <span class="file-hint">支持 .md 格式文件</span>
            </div>
            <div v-if="newSkill.content" class="file-preview">
              <span class="file-name">✓ 已选择文件</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="showUploadDialog = false">取消</button>
          <button class="submit-btn" @click="submitSkill">发布</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.skills-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skills-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skills-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 12px;
  width: 220px;
}

.search-box:focus-within {
  border-color: #4f6bff;
  box-shadow: 0 0 0 3px rgba(79, 107, 255, 0.1);
}

.search-icon {
  font-size: 14px;
  color: #9ca3af;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 8px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
}

.search-input::placeholder {
  color: #9ca3af;
}

.upload-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.upload-btn:hover {
  box-shadow: 0 4px 12px rgba(79, 107, 255, 0.3);
}

.category-filter {
  padding: 16px 24px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
  background: rgba(255, 255, 255, 0.5);
}

.category-btn {
  padding: 8px 16px;
  background: #ffffff;
  color: #667085;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.category-btn:hover {
  background: #f6f9ff;
  color: #4f6bff;
  border-color: #4f6bff;
}

.category-btn.active {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  border-color: transparent;
}

.skills-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  align-content: start;
}

.skill-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
  border: 1px solid rgba(231, 237, 245, 0.95);
  box-shadow: 0 4px 12px rgba(31, 41, 55, 0.06);
}

.skill-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(31, 41, 55, 0.12);
}

.skill-icon {
  font-size: 36px;
}

.skill-info h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.skill-info p {
  margin: 0 0 12px 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.5;
}

.skill-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author {
  color: #9ca3af;
  font-size: 12px;
}

.downloads {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #667085;
  font-size: 14px;
}

.download-icon {
  font-size: 14px;
}

.skill-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.preview-btn,
.download-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.preview-btn {
  background: transparent;
  color: #10a37f;
  border: 1px solid #10a37f;
}

.preview-btn:hover {
  background: #10a37f;
  color: #fff;
}

.download-btn {
  background: transparent;
  color: #4f6bff;
  border: 1px solid #4f6bff;
}

.download-btn:hover {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  border-color: transparent;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(31, 41, 55, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #ffffff;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(31, 41, 55, 0.2);
}


.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.dialog-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #667085;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #4f6bff;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
}


.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  color: #1f2937;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4f6bff;
  box-shadow: 0 0 0 3px rgba(79, 107, 255, 0.1);
  background: #ffffff;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group select {
  cursor: pointer;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 44px;
  height: 44px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  font-size: 22px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-option:hover {
  background: #f6f9ff;
  border-color: #4f6bff;
}

.icon-option.selected {
  border-color: #4f6bff;
  background: #eef2ff;
}

.file-upload {
  position: relative;
}

.file-upload input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.file-upload::before {
  content: '点击上传文件';
  display: block;
  padding: 16px;
  background: #f9fafb;
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
  text-align: center;
  color: #667085;
  font-size: 14px;
  transition: all 0.2s;
}

.file-upload:hover::before {
  border-color: #4f6bff;
  color: #4f6bff;
}

.file-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.file-preview {
  margin-top: 10px;
  padding: 10px 14px;
  background: #ecfdf5;
  border-radius: 10px;
}

.file-name {
  color: #059669;
  font-size: 14px;
  font-weight: 500;
}


.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  background: #f9fafb;
}


.cancel-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn {
  background: #ffffff;
  color: #667085;
  border: 1px solid #e5e7eb;
}

.cancel-btn:hover {
  background: #f6f9ff;
  color: #4f6bff;
  border-color: #4f6bff;
}

.submit-btn {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
}

.submit-btn:hover {
  box-shadow: 0 4px 12px rgba(79, 107, 255, 0.3);
}
</style>
