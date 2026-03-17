<!-- src/views/SkillDetail.vue -->
<template>
  <div v-if="loading" class="detail-container">加载中...</div>
  <div v-else-if="error" class="detail-container error">{{ error }}</div>
  <div v-else class="skill-detail-container">
    <!-- 技能信息头部 -->
    <div class="skill-header">
      <h1>{{ skillName }}</h1>
      <div class="skill-meta">
        <div class="meta-item">
          <span class="label">👤 作者:</span>
          <span class="value">{{ skillOwner }}</span>
        </div>
        <div class="meta-item">
          <span class="label">🔗 Slug:</span>
          <span class="value">{{ skillSlug }}</span>
        </div>
        <div class="meta-item">
          <span class="label">📦 版本:</span>
          <span class="value">{{ skillVersion }}</span>
        </div>
        <div class="meta-item">
          <span class="label">⏱️ 发布时间:</span>
          <span class="value">{{ skillPublishedTime }}</span>
        </div>
      </div>
    </div>

    <div class="skill-detail-layout">
      <!-- 左侧文件列表 -->
      <aside class="file-sidebar">
        <h3>📁 文件目录</h3>
        <ul>
          <li
            v-for="file in files"
            :key="file.path"
            :class="[
              'file-item',
              file.type === 'directory' ? 'directory' : 'file',
              { active: currentFile && currentFile.path === file.path }
            ]"
            :style="{ paddingLeft: (file.indentLevel * 16 + 12) + 'px' }"
            @click="selectFile(file)"
          >
            {{ file.name }}
          </li>
        </ul>
      </aside>

      <!-- 右侧内容展示区 -->
      <main class="file-content">
        <div v-if="!currentFile" class="placeholder">请从左侧选择一个文件</div>
        <div v-else-if="contentLoading">加载内容中...</div>
        <div v-else>
          <div class="file-header">
            <h2>{{ currentFile.displayName }}</h2>
            <!-- Markdown文件切换按钮 -->
            <div v-if="currentFile.type === 'markdown'" class="view-mode-toggle">
              <button
                :class="{ active: markdownViewMode === 'preview' }"
                @click="markdownViewMode = 'preview'"
              >
                📖 预览
              </button>
              <button
                :class="{ active: markdownViewMode === 'source' }"
                @click="markdownViewMode = 'source'"
              >
                📝 源码
              </button>
            </div>
          </div>

          <!-- Markdown文件内容 -->
          <div v-if="currentFile.type === 'markdown'">
            <div v-if="markdownViewMode === 'preview'" class="markdown-body" v-html="renderedContent"></div>
            <div v-else-if="markdownViewMode === 'source'" class="source-code">
              <pre><code v-html="highlightedMarkdownCode"></code></pre>
            </div>
          </div>

          <!-- JSON文件内容 -->
          <div v-else-if="currentFile.type === 'json'" class="code-content">
            <pre><code v-html="highlightedJsonCode"></code></pre>
          </div>

          <!-- 其他代码文件 -->
          <div v-else class="code-content">
            <pre><code v-html="highlightedCode"></code></pre>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'

// 注册语言
hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)

interface FileItem {
  name: string
  displayName: string
  path: string
  type: string
  indentLevel: number
}

interface SkillItem {
  id: string | number
  file?: string
  name: string
  description?: string
  owner?: string
  slug?: string
  displayName?: string
  latest?: {
    version?: string
    publishedAt?: number
    commit?: string
  }
  history?: any[]
}

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

const route = useRoute()
const skillId = ref<string>((route.params.id as string) || '')

const loading = ref(true)
const error = ref<string | null>(null)
const files = ref<FileItem[]>([])               // 文件列表 { name, type }
const currentFile = ref<FileItem | null>(null)
const content = ref('')
const contentLoading = ref(false)
const renderedContent = ref('')
const formattedJson = ref('')
const skillName = ref('')
const skillOwner = ref('')
const skillSlug = ref('')
const skillVersion = ref('')
const skillPublishedTime = ref('')
const skillIndex = ref<SkillItem[]>([])
const fileTreeRaw = ref<any[]>([])     // 原始文件树结构
const markdownViewMode = ref<'preview' | 'source'>('preview') // 'preview' 或 'source'

// 计算属性：代码高亮
const highlightedMarkdownCode = computed(() => {
  if (!content.value || currentFile.value?.type !== 'markdown') return ''
  try {
    return hljs.highlight(content.value, { language: 'markdown' }).value
  } catch {
    return content.value
  }
})

const highlightedJsonCode = computed(() => {
  if (!formattedJson.value || currentFile.value?.type !== 'json') return ''
  try {
    return hljs.highlight(formattedJson.value, { language: 'json' }).value
  } catch {
    return formattedJson.value
  }
})

const highlightedCode = computed(() => {
  if (!content.value || !currentFile.value) return ''

  // 根据文件类型选择合适的语言
  const fileType = currentFile.value.type
  const languageMap: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    css: 'css',
    html: 'html',
    xml: 'html',
    shell: 'bash',
    bash: 'bash',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    markdown: 'markdown'
  }

  const language = languageMap[fileType] || 'plaintext'

  try {
    return hljs.highlight(content.value, { language }).value
  } catch {
    return content.value
  }
})

// 格式化时间戳为相对时间
function formatTime(timestamp?: number): string {
  if (!timestamp) return '未知时间'
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

// 加载技能索引
async function loadSkillIndex() {
  try {
    const res = await fetch('/skills/index.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    skillIndex.value = await res.json()
  } catch (e: any) {
    console.warn('无法加载技能索引:', e.message)
  }
}

// 根据当前文件和技能ID更新技能信息
function updateSkillInfo(fileName: string | null = null) {
  if (!skillIndex.value.length) return

  // 查找匹配的技能条目
  let matchedSkills = skillIndex.value.filter(
    skill => String(skill.id) === skillId.value && (!fileName || skill.file === fileName)
  )

  if (matchedSkills.length === 0) {
    // 如果没有找到精确匹配的文件名，且fileName不是.md文件，则查找该技能ID的所有技能
    if (fileName && !fileName.endsWith('.md')) {
      matchedSkills = skillIndex.value.filter(skill => String(skill.id) === skillId.value)
    } else {
      return
    }
  }

  // 优先选择SKILL.md，然后按文件名排序
  matchedSkills.sort((a, b) => {
    // SKILL.md 优先
    if (a.file === 'SKILL.md') return -1
    if (b.file === 'SKILL.md') return 1
    // 其他按文件名排序
    return (a.file || '').localeCompare(b.file || '')
  })

  const skill = matchedSkills[0]
  if (!skill) return

  // 使用中文映射获取技能名称
  const displayName = skill.displayName || skill.name
  const chineseMapping = skillChineseMap[displayName]
  skillName.value = chineseMapping ? chineseMapping.name : displayName
  skillOwner.value = skill.owner || '未知作者'
  skillSlug.value = skill.slug || ''
  skillVersion.value = skill.latest?.version || '未版本化'
  skillPublishedTime.value = skill.latest?.publishedAt ? formatTime(skill.latest.publishedAt) : '未知时间'
}

// 扁平化文件树为列表
function flattenFileTree(tree: any[], prefix = '', result: FileItem[] = []): FileItem[] {
  for (const item of tree) {
    if (item.type === 'directory' && item.children) {
      // 目录项：添加自身，然后递归处理子项
      result.push({
        name: prefix + '📁 ' + item.name,
        displayName: item.name,
        path: item.path,
        type: 'directory',
        indentLevel: prefix.length / 2
      })
      flattenFileTree(item.children, prefix + '  ', result)
    } else {
      // 文件项
      const icon = getFileIcon(item.type)
      result.push({
        name: prefix + icon + ' ' + item.name,
        displayName: item.name,
        path: item.path,
        type: item.type,
        indentLevel: prefix.length / 2
      })
    }
  }
  return result
}

// 根据文件类型获取图标
function getFileIcon(fileType: string): string {
  const iconMap: Record<string, string> = {
    markdown: '📝',
    json: '📋',
    python: '🐍',
    javascript: '📜',
    typescript: '📘',
    vue: '🟢',
    css: '🎨',
    html: '🌐',
    shell: '🐚',
    bash: '🐚',
    sh: '🐚',
    sql: '🗃️',
    yaml: '📋',
    yml: '📋',
    txt: '📄',
    text: '📄',
    directory: '📁'
  }
  return iconMap[fileType] || '📄'
}

// 获取文件列表
async function loadFileList() {
  loading.value = true
  error.value = null
  try {
    // 先加载技能索引
    await loadSkillIndex()

    // 更新技能信息（无论第一个文件是什么类型）
    updateSkillInfo()

    // 尝试加载 files.json
    const res = await fetch(`/skills/${skillId.value}/files.json`)
    if (res.ok) {
      const fileTree = await res.json()
      // 扁平化文件树以便显示
      files.value = flattenFileTree(fileTree)
      // 保存原始文件树用于目录显示
      fileTreeRaw.value = fileTree
    } else {
      // 降级方案：尝试常见文件名（兼容你之前的上传）
      // 这里假设有 _meta.json 和 SKILL.md
      files.value = flattenFileTree([
        { name: '_meta.json', type: 'json', path: '_meta.json' },
        { name: 'SKILL.md', type: 'markdown', path: 'SKILL.md' }
      ])
      fileTreeRaw.value = [
        { name: '_meta.json', type: 'json', path: '_meta.json' },
        { name: 'SKILL.md', type: 'markdown', path: 'SKILL.md' }
      ]
    }

    // 如果有文件，默认选中第一个非目录文件
    const firstFile = files.value.find(f => f.type !== 'directory')
    if (firstFile) {
      await selectFile(firstFile)
    }
  } catch (e: any) {
    error.value = '无法加载文件列表：' + e.message
  } finally {
    loading.value = false
  }
}

// 选择文件并加载内容
async function selectFile(file: FileItem) {
  // 跳过目录
  if (file.type === 'directory') return

  if (currentFile.value && currentFile.value.path === file.path) return
  currentFile.value = file
  contentLoading.value = true
  content.value = ''
  renderedContent.value = ''
  formattedJson.value = ''
  // 重置Markdown视图模式为预览
  if (file.type === 'markdown') {
    markdownViewMode.value = 'preview'
  }

  try {
    // 更新技能信息（如果是.md文件）
    if (file.type === 'markdown' || file.displayName.endsWith('.md')) {
      updateSkillInfo(file.displayName)
    }

    const url = `/skills/${skillId.value}/${file.path}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    let text = await res.text()
    content.value = text

    // 去除 YAML front matter (--- ... ---)
    text = text.replace(/^---[\s\S]*?---\n*/, '')

    if (file.type === 'markdown') {
      renderedContent.value = await marked.parse(text)
    } else if (file.type === 'json') {
      try {
        const jsonObj = JSON.parse(text)
        formattedJson.value = JSON.stringify(jsonObj, null, 2)
      } catch {
        formattedJson.value = text // 如果解析失败，显示原文
      }
    }
  } catch (e: any) {
    content.value = '文件加载失败：' + e.message
  } finally {
    contentLoading.value = false
  }
}

onMounted(loadFileList)

// 监听路由参数变化（如果同一个组件内切换技能）
watch(() => route.params.id, async (newId) => {
  if (!newId) return
  const id = Array.isArray(newId) ? newId[0] : newId
  if (id && id !== skillId.value) {
    skillId.value = id
    await loadFileList()
  }
})
</script>

<style scoped>
.detail-container {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 16px;
}

.detail-container.error {
  color: #ef4444;
}

.skill-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.skill-header {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.skill-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #1e293b;
}

.skill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.meta-item .label {
  color: #64748b;
  font-weight: 500;
}

.meta-item .value {
  color: #334155;
  font-weight: 600;
}

.skill-detail-layout {
  display: flex;
  gap: 24px;
  background: white;
  border-radius: 16px;
  min-height: 500px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.file-sidebar {
  width: 260px;
  border-right: 1px solid #e4e7ec;
  padding: 20px;
}

.file-sidebar h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1e293b;
}

.file-sidebar ul {
  list-style: none;
  padding: 0;
}

.file-sidebar li {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
  margin-bottom: 4px;
  transition: background 0.2s;
  word-break: break-all;
}

.file-sidebar li:hover {
  background: #f1f5f9;
}

.file-sidebar li.active {
  background: #e6f0ff;
  color: #2563eb;
  font-weight: 500;
}

.file-content {
  flex: 1;
  padding: 24px;
  overflow-x: auto;
}

.file-content h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ec;
}

.file-content pre {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.placeholder {
  text-align: center;
  color: #94a3b8;
  padding: 60px 0;
}

.error {
  color: #ef4444;
  text-align: center;
  padding: 40px;
}

.markdown-body {
  font-size: 16px;
  line-height: 1.6;
  color: #334155;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  font-weight: 600;
  color: #1e293b;
}

.markdown-body p {
  margin-bottom: 1em;
}

.markdown-body ul,
.markdown-body ol {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

.markdown-body code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.markdown-body pre {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}

.markdown-body blockquote {
  border-left: 4px solid #e2e8f0;
  padding-left: 16px;
  margin-left: 0;
  color: #64748b;
  font-style: italic;
}

.file-sidebar li.directory {
  font-weight: 600;
  color: #1e293b;
}

.file-sidebar li.directory:hover {
  background: #e6f0ff;
}

.file-sidebar li.file {
  color: #334155;
}

.file-sidebar li.file:hover {
  background: #f1f5f9;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ec;
}

.file-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.view-mode-toggle {
  display: flex;
  gap: 8px;
}

.view-mode-toggle button {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.view-mode-toggle button:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.view-mode-toggle button.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.code-content,
.source-code {
  margin-top: 16px;
}

.code-content pre,
.source-code pre {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

.code-content code,
.source-code code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* highlight.js 主题样式 */
.hljs {
  background: transparent !important;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-title,
.hljs-section,
.hljs-doctag,
.hljs-name,
.hljs-strong {
  color: #d33682;
}

.hljs-comment {
  color: #6b7280;
  font-style: italic;
}

.hljs-string,
.hljs-title,
.hljs-section,
.hljs-built_in,
.hljs-literal,
.hljs-type,
.hljs-addition,
.hljs-tag,
.hljs-quote,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #059669;
}

.hljs-meta,
.hljs-subst,
.hljs-symbol,
.hljs-regexp,
.hljs-attribute,
.hljs-deletion,
.hljs-variable,
.hljs-template-variable,
.hljs-link,
.hljs-bullet {
  color: #d97706;
}

.hljs-emphasis {
  font-style: italic;
}
</style>
