<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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
const showPreviewDialog = ref(false)
const previewContent = ref('')
const previewTitle = ref('')

const newSkill = ref({
  name: '',
  description: '',
  category: '开发',
  icon: '⚡',
  content: ''
})

const skills = ref<Skill[]>([
  {
    id: 1,
    name: 'Code Review',
    description: '代码审查助手，帮助审查代码质量和安全性',
    icon: '🔍',
    category: '开发',
    author: '系统',
    downloads: 156,
    content: `# Code Review Skill

## 功能描述
这是一个代码审查助手，可以帮助你审查代码质量和安全性。

## 使用方法
1. 输入待审查的代码
2. 系统自动分析代码问题
3. 返回审查建议

## 示例
\`\`\`python
def hello():
    print("Hello World")
\`\`\`

## 注意事项
- 请确保代码不包含敏感信息
- 建议分批次审查大型代码文件`
  },
  {
    id: 2,
    name: 'Bug Fix',
    description: '自动识别并修复常见Bug',
    icon: '🐛',
    category: '开发',
    author: '系统',
    downloads: 243,
    content: `# Bug Fix Skill

## 功能描述
自动识别并修复常见Bug，提供修复建议。

## 支持的语言
- JavaScript
- TypeScript
- Python
- Java

## 使用示例
输入有问题的代码，系统会自动分析并给出修复方案。`
  },
  {
    id: 3,
    name: 'Test Gen',
    description: '自动生成单元测试和集成测试',
    icon: '🧪',
    category: '测试',
    author: '用户A',
    downloads: 89,
    content: `# Test Gen Skill

## 功能描述
根据代码自动生成单元测试和集成测试用例。

## 支持框架
- Jest
- Mocha
- PyTest
- JUnit`
  },
  {
    id: 4,
    name: 'Doc Gen',
    description: '自动生成代码文档和注释',
    icon: '📄',
    category: '文档',
    author: '用户B',
    downloads: 67,
    content: `# Doc Gen Skill

## 功能描述
自动生成代码文档和注释，支持多种文档格式。`
  },
  {
    id: 5,
    name: 'Refactor',
    description: '智能代码重构建议',
    icon: '🔧',
    category: '开发',
    author: '系统',
    downloads: 198,
    content: `# Refactor Skill

## 功能描述
提供智能代码重构建议，优化代码结构。`
  },
  {
    id: 6,
    name: 'Security Scan',
    description: '安全漏洞扫描和修复建议',
    icon: '🔒',
    category: '安全',
    author: '用户C',
    downloads: 312,
    content: `# Security Scan Skill

## 功能描述
扫描代码中的安全漏洞并提供修复建议。

## 检查项目
- SQL注入
- XSS攻击
- 权限验证
- 敏感信息泄露`
  },
  {
    id: 7,
    name: 'Perf Opt',
    description: '性能优化建议',
    icon: '⚡',
    category: '优化',
    author: '系统',
    downloads: 145,
    content: `# Perf Opt Skill

## 功能描述
分析代码性能，提供优化建议。`
  },
  {
    id: 8,
    name: 'Translate',
    description: '多语言翻译支持',
    icon: '🌍',
    category: '工具',
    author: '用户D',
    downloads: 76,
    content: `# Translate Skill

## 功能描述
支持多语言翻译功能。`
  }
])

const selectedCategory = ref('全部')
const searchKeyword = ref('')
const categories = ['全部', '开发', '测试', '文档', '安全', '优化', '工具']
const icons = ['⚡', '🔍', '🐛', '🧪', '📄', '🔧', '🔒', '🌍', '💡', '🎯', '🚀']

// 从 JSON 文件加载 skills 数据
onMounted(async () => {
  try {
    const res = await fetch('/skills/index.json')
    const data = await res.json()
    // 将字符串 id 转换为数字
    skills.value = data.map((s: any) => ({
      ...s,
      id: Number(s.id)
    }))
  } catch (error) {
    console.error('加载Skills失败:', error)
  }
})

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

const previewSkill = (skill: Skill) => {
  previewTitle.value = skill.name
  previewContent.value = skill.content
  showPreviewDialog.value = true
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
          <button class="preview-btn" @click="previewSkill(skill)">
            查看
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

    <!-- 预览对话框 -->
    <div v-if="showPreviewDialog" class="dialog-overlay" @click.self="showPreviewDialog = false">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>{{ previewTitle }} - skill.md</h3>
          <button class="close-btn" @click="showPreviewDialog = false">×</button>
        </div>
        <div class="dialog-body">
          <pre class="markdown-content">{{ previewContent }}</pre>
        </div>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="showPreviewDialog = false">关闭</button>
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

.dialog-large {
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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

.dialog-large .dialog-body {
  flex: 1;
  max-height: 60vh;
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

.markdown-content {
  background: #f9fafb;
  padding: 20px;
  border-radius: 14px;
  color: #374151;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  background: #f9fafb;
}

.dialog-large .dialog-footer {
  flex-shrink: 0;
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
