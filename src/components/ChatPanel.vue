<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { currentReviewPaper, reviewOpinion, isGeneratingReview, generateReviewOpinion } from '@/stores/review'
import api, { AVAILABLE_MODELS, setModel, LLM_CONFIG } from '@/api/openclaw'
import { systemPrompts, processResponses, getModeList, selectorPrompt, selectorProcess, getModeType, type ModeType } from '@/prompts'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  modeSelect?: {
    mode: string
    reason: string
    systemPrompt: string
  }
}

interface UploadedFile {
  id: number
  name: string
  type: string
  content: string  // 解析后的文本内容或base64
  size: number
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  mode?: ModeType  // 当前模式（可选）
}

const props = defineProps<{
  isFloating?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// 当前模式
const currentMode = ref<ModeType | null>(null)
const isSelectingMode = ref(true)  // 是否正在选择模式

// 当前聊天会话
const currentSessionId = ref<string>('')
const messages = ref<Message[]>([])
const welcomeMessage = '你好！我是AI助手，有什么可以帮助你的吗？你可以问我任何问题，比如：\n- 学术论文相关的帮助（文献综述、论文润色、实验设计等）\n- 社区相关的问题\n- 日常聊天和问答'

// 初始化消息
messages.value = [
  { id: 1, role: 'assistant', content: welcomeMessage }
]

const inputMessage = ref('')
const isLoading = ref(false)
const selectedModel = ref(LLM_CONFIG.model)
const showModelDropdown = ref(false)

// 历史记录相关
const showHistory = ref(false)
const chatSessions = ref<ChatSession[]>([])
const STORAGE_KEY = 'chat_history'
const DEFAULT_SESSION_ID = 'default'

// 初始化历史记录 - 从服务器加载
const initHistory = async () => {
  // 默认使用 chat 模式
  isSelectingMode.value = false
  currentMode.value = 'chat'
  messages.value = [
    { id: 1, role: 'assistant', content: welcomeMessage }
  ]

  try {
    // 尝试获取聊天记录（使用 chat 模式作为默认）
    const response = await fetch('/api/chat/chat/list')
    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      // 有历史记录，加载第一个
      chatSessions.value = data
      const firstSession = data[0]

      // 如果已有模式（之前选择过），则跳过选择
      if (firstSession.mode) {
        currentSessionId.value = firstSession.id
        messages.value = [...firstSession.messages]
        currentMode.value = firstSession.mode
        isSelectingMode.value = false
      } else {
        // 没有模式，需要选择
        currentSessionId.value = firstSession.id
      }
    } else {
      // 没有历史记录，创建新会话
      const defaultSession: ChatSession = {
        id: DEFAULT_SESSION_ID,
        title: '新聊天',
        messages: [
          { id: 1, role: 'assistant', content: welcomeMessage }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
        // 不设置 mode，表示需要选择模式
      }
      chatSessions.value = [defaultSession]
      currentSessionId.value = defaultSession.id
      await saveToStorage()
    }
  } catch (e) {
    console.error('加载聊天记录失败:', e)
    // 创建默认会话
    const defaultSession: ChatSession = {
      id: DEFAULT_SESSION_ID,
      title: '新聊天',
      messages: [
        { id: 1, role: 'assistant', content: welcomeMessage }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    chatSessions.value = [defaultSession]
    currentSessionId.value = defaultSession.id
  }

  console.log('[DEBUG] 初始化完成, isSelectingMode:', isSelectingMode.value, 'currentMode:', currentMode.value)
}

// 保存到服务器 (JSON 文件)
const saveToStorage = async () => {
  // 始终使用 'chat' 模式保存到 chat-history/chat 文件夹
  const mode = 'chat'
  console.log('[保存] 开始保存, 模式:', mode, '会话数:', chatSessions.value.length)

  try {
    // 保存所有会话到单独的文件
    for (const session of chatSessions.value) {
      // 确保每个会话都有 mode 字段
      session.mode = session.mode || 'chat'
      console.log('[保存] 发送数据:', JSON.stringify(session).substring(0, 100) + '...')

      const res = await fetch(`/api/chat/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      })

      const result = await res.text()
      console.log('[保存] 响应:', res.status, result)
    }
  } catch (e) {
    console.error('保存聊天记录失败:', e)
  }
  // 同时保存到 localStorage 作为备份
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions.value))
}

// 保存当前会话
const saveCurrentSession = async () => {
  const session = chatSessions.value.find(s => s.id === currentSessionId.value)
  if (session) {
    session.messages = [...messages.value]
    session.updatedAt = new Date().toISOString()
    // 更新标题（使用第一条用户消息作为标题）
    const firstUserMsg = messages.value.find(m => m.role === 'user')
    if (firstUserMsg && session.title === '新聊天') {
      session.title = firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
    saveToStorage()
  }
}

// 创建新聊天
const createNewChat = () => {
  // 新建聊天使用默认 chat 模式
  isSelectingMode.value = false
  currentMode.value = 'chat'
  messages.value = [
    { id: Date.now(), role: 'assistant', content: welcomeMessage }
  ]

  const newSession: ChatSession = {
    id: Date.now().toString(),
    title: '新聊天',
    messages: messages.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: 'chat'
  }
  chatSessions.value.unshift(newSession)
  currentSessionId.value = newSession.id
  showHistory.value = false
  saveToStorage()
}

// 切换会话
const switchSession = (sessionId: string) => {
  // 先保存当前会话
  saveCurrentSession()

  const session = chatSessions.value.find(s => s.id === sessionId)
  if (session) {
    currentSessionId.value = session.id
    messages.value = [...session.messages]
  }
  showHistory.value = false
}

// 删除会话
const deleteSession = async (sessionId: string, event: Event) => {
  event.stopPropagation()
  if (chatSessions.value.length <= 1) {
    alert('至少保留一个聊天记录')
    return
  }

  const mode = currentMode.value || 'chat'

  // 从服务器删除 JSON 文件
  try {
    await fetch(`/api/chat/${mode}/${sessionId}`, { method: 'DELETE' })
  } catch (e) {
    console.error('删除文件失败:', e)
  }

  chatSessions.value = chatSessions.value.filter(s => s.id !== sessionId)

  // 如果删除的是当前会话，切换到第一个
  if (sessionId === currentSessionId.value) {
    const firstSession = chatSessions.value[0]
    currentSessionId.value = firstSession.id
    messages.value = [...firstSession.messages]
  }

  saveToStorage()
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 页面加载时初始化
onMounted(() => {
  initHistory()
})

// 文件上传相关
const uploadedFiles = ref<UploadedFile[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const isParsingFile = ref(false)

// 支持的文件类型
const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

// 触发文件选择
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

// 解析文件内容
const parseFile = async (file: File): Promise<string> => {
  const fileType = file.type

  // 图片文件 - 转为 base64
  if (fileType.startsWith('image/')) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // PDF 文件 - 尝试读取文本（简化版，实际需要 pdf.js）
  if (fileType === 'application/pdf') {
    const text = await file.text()
    return `[PDF文件内容]\n文件名: ${file.name}\n---\n${text.substring(0, 5000)}`
  }

  // DOCX 文件 - 尝试读取文本
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await file.text()
    return `[Word文档内容]\n文件名: ${file.name}\n---\n${text.substring(0, 5000)}`
  }

  // 其他文件 - 尝试读取文本
  return await file.text()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  isParsingFile.value = true

  for (const file of Array.from(files)) {
    // 检查文件类型
    if (!supportedTypes.includes(file.type)) {
      alert(`不支持的文件类型: ${file.type}`)
      continue
    }

    // 检查文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`文件过大: ${file.name} (最大 10MB)`)
      continue
    }

    try {
      const content = await parseFile(file)
      uploadedFiles.value.push({
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        content,
        size: file.size
      })
    } catch (error) {
      console.error('文件解析失败:', error)
      alert(`文件解析失败: ${file.name}`)
    }
  }

  isParsingFile.value = false
  // 清空 input 以便重复选择同一文件
  target.value = ''
}

// 移除已上传的文件
const removeFile = (fileId: number) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== fileId)
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 获取文件图标
const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf') return '📄'
  if (type.includes('word')) return '📝'
  return '📎'
}

// 切换模型
const changeModel = (modelId: string) => {
  setModel(modelId)
  selectedModel.value = modelId
  showModelDropdown.value = false
}

// 获取当前模型名称
const getCurrentModelName = () => {
  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel.value)
  return model ? model.name : selectedModel.value
}

// 监听当前审稿论文变化，更新欢迎消息
watch(currentReviewPaper, (paper) => {
  if (paper) {
    messages.value = [
      { id: 1, role: 'assistant', content: `你好！我正在分析论文"${paper.title}"，你可以问我关于这篇论文的问题，或者发送"生成审稿意见"获取完整审稿。` }
    ]
  } else {
    messages.value = [
      { id: 1, role: 'assistant', content: '你好！我是AI助手，有什么可以帮助你的吗？' }
    ]
  }
})

const sendMessage = async () => {
  if (!inputMessage.value.trim() && uploadedFiles.value.length === 0) return

  const question = inputMessage.value.trim()

  // 构建用户消息内容（包含文件内容）
  let userContent = question

  // 如果有上传的文件，添加到消息内容中
  if (uploadedFiles.value.length > 0) {
    const fileContents = uploadedFiles.value.map(f => {
      return `[文件: ${f.name}]\n${f.content}`
    }).join('\n\n')

    if (question) {
      userContent = `用户问题: ${question}\n\n附件内容:\n${fileContents}`
    } else {
      userContent = `请分析以下附件内容:\n\n${fileContents}`
    }
  }

  // 添加用户消息
  const userMsg: Message = {
    id: Date.now(),
    role: 'user',
    content: question || `[上传了 ${uploadedFiles.value.length} 个文件]`
  }
  messages.value.push(userMsg)
  inputMessage.value = ''
  isLoading.value = true

  try {
    // 第一步：调用模式选择器，让大模型判断应该用哪个模式
    console.log('[模式选择] 开始判断用户问题应该使用哪种模式...')
    console.log('[模式选择] 用户问题:', question)

    const selectResponse = await api.sendChatWithContext(
      0,
      `请判断用户以下问题应该使用哪种模式：${question}`,
      {},
      selectorPrompt
    )

    // 解析模式选择结果
    const selectResult = selectorProcess(selectResponse.reply || '{}')
    const selectedMode = getModeType(selectResult.mode)
    currentMode.value = selectedMode

    console.log('%c[模式选择] 选择的模式: ' + selectedMode, 'color: #10b981; font-weight: bold')
    console.log('[模式选择] 原因:', selectResult.reason)

    // 第二步：使用对应模式的 system prompt 调用大模型回答问题
    const modeSystemPrompt = systemPrompts[selectedMode]
    console.log('%c[模式选择] 使用的 System Prompt:', 'color: #3b82f6; font-weight: bold')
    console.log('[模式选择]', modeSystemPrompt.substring(0, 100) + '...')

    const response = await api.sendChatWithContext(
      currentReviewPaper.value?.id || 0,
      userContent,
      { reviewMarkdown: reviewOpinion.value },
      modeSystemPrompt
    )

    // 使用对应模式的处理函数格式化输出
    const processedContent = processResponses[selectedMode](response.reply || '')

    // 保存模式选择信息
    const modeSelectInfo = {
      mode: selectedMode,
      reason: selectResult.reason,
      systemPrompt: modeSystemPrompt
    }
    console.log('[保存] 模式选择信息:', modeSelectInfo)

    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: typeof processedContent === 'string' ? processedContent : response.reply || '抱歉，无法获取回复',
      modeSelect: modeSelectInfo
    }
    messages.value.push(aiMsg)
  } catch (error) {
    console.error('[DEBUG] 调用失败:', error)
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '抱歉，目前无法获取回复，请稍后重试。'
    }
    messages.value.push(aiMsg)
  }

  isLoading.value = false
  // 清空已上传的文件
  uploadedFiles.value = []
  // 保存会话
  saveCurrentSession()
}
</script>

<template>
  <div class="chat-panel" :class="{ 'is-floating': isFloating }">
    <!-- 历史记录侧边栏 -->
    <div v-if="showHistory" class="history-sidebar">
      <div class="history-header">
        <h4>历史记录</h4>
        <button class="new-chat-btn" @click="createNewChat">+ 新建聊天</button>
      </div>
      <div class="history-list">
        <div
          v-for="session in chatSessions"
          :key="session.id"
          class="history-item"
          :class="{ active: session.id === currentSessionId }"
          @click="switchSession(session.id)"
        >
          <div class="history-item-content">
            <span class="history-icon">🦞</span>
            <span class="history-title">{{ session.title }}</span>
          </div>
          <div class="history-item-actions">
            <span class="history-date">{{ formatDate(session.updatedAt) }}</span>
            <button class="history-delete" @click="deleteSession(session.id, $event)" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-header">
      <div class="header-left">
        <button class="history-toggle" @click="showHistory = !showHistory" title="历史记录">
          {{ showHistory ? '✕' : '📋' }}
        </button>
        <h3>AI 对话</h3>
      </div>
      <div class="header-actions">
        <!-- 模型选择器 -->
        <div class="model-selector">
          <button class="model-btn" @click="showModelDropdown = !showModelDropdown">
            <span class="model-icon">🦞</span>
            <span class="model-name">{{ getCurrentModelName() }}</span>
            <span class="model-arrow">▼</span>
          </button>
          <div v-if="showModelDropdown" class="model-dropdown">
            <div
              v-for="model in AVAILABLE_MODELS"
              :key="model.id"
              class="model-option"
              :class="{ active: selectedModel === model.id }"
              @click="changeModel(model.id)"
            >
              {{ model.name }}
            </div>
          </div>
        </div>
        <button v-if="isFloating" class="close-btn" @click="emit('close')">×</button>
      </div>
    </div>
    <div class="panel-messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message"
        :class="{ 'message-user': msg.role === 'user', 'message-assistant': msg.role === 'assistant' }"
      >
        <div class="message-avatar">
          <span v-if="msg.role === 'user'">🐙</span>
          <span v-else>🦞</span>
        </div>
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
        </div>
      </div>
      <div v-if="isLoading" class="message message-assistant">
        <div class="message-avatar">🦞</div>
        <div class="message-content">
          <div class="message-text loading">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
    <!-- 已上传文件列表 -->
    <div v-if="uploadedFiles.length > 0" class="file-list">
      <div v-for="file in uploadedFiles" :key="file.id" class="file-item">
        <span class="file-icon">{{ getFileIcon(file.type) }}</span>
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">{{ formatFileSize(file.size) }}</span>
        <button class="file-remove" @click="removeFile(file.id)">×</button>
      </div>
    </div>
    <div class="panel-input">
      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.webp"
        class="file-input"
        @change="handleFileSelect"
      />
      <!-- 上传按钮 -->
      <button
        class="upload-btn"
        @click="triggerFileSelect"
        :disabled="isLoading || isParsingFile"
        title="上传 PDF、DOCX 或图片"
      >
        <span v-if="isParsingFile">解析中...</span>
        <span v-else>📎</span>
      </button>
      <input
        v-model="inputMessage"
        type="text"
        placeholder="输入消息..."
        :disabled="isLoading"
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage" :disabled="isLoading || (!inputMessage.trim() && uploadedFiles.length === 0)">
        发送
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  position: relative;
}

.chat-panel.is-floating {
  border-left: 1px solid rgba(231, 237, 245, 0.95);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.panel-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 模型选择器 */
.model-selector {
  position: relative;
}

.model-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f6f9ff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #4f6bff;
  transition: all 0.2s;
}

.model-btn:hover {
  background: #eef2ff;
  border-color: #4f6bff;
}

.model-icon {
  font-size: 14px;
}

.model-name {
  font-weight: 500;
}

.model-arrow {
  font-size: 8px;
  opacity: 0.7;
}

.model-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.15);
  min-width: 140px;
  z-index: 100;
  overflow: hidden;
}

.model-option {
  padding: 10px 14px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s;
}

.model-option:hover {
  background: #f6f9ff;
  color: #4f6bff;
}

.model-option.active {
  background: #eef2ff;
  color: #4f6bff;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  color: #667085;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #4f6bff;
}

.panel-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  gap: 8px;
  max-width: 85%;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
}

.message-assistant .message-avatar {
  background: linear-gradient(135deg, #10a37f 0%, #1abc9c 100%);
  color: #fff;
}

.message-content {
  background: #ffffff;
  padding: 8px 12px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.08);
}

.message-user .message-content {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
}

.message-assistant .message-content {
  color: #1f2937;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
}

.message-text.loading {
  display: flex;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #667085;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.panel-input {
  padding: 12px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  gap: 8px;
}

.panel-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #1f2937;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(31, 41, 55, 0.04);
}

.panel-input input:focus {
  outline: none;
  border-color: #4f6bff;
  box-shadow: 0 0 0 3px rgba(79, 107, 255, 0.1);
}

.panel-input input:disabled {
  opacity: 0.5;
}

.panel-input button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.panel-input button:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(79, 107, 255, 0.3);
}

.panel-input button:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* 文件上传样式 */
.file-input {
  display: none;
}

.upload-btn {
  padding: 10px 12px;
  background: #f6f9ff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #4f6bff;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 文件列表样式 */
.file-list {
  padding: 8px 12px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f6f9ff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #374151;
}

.file-size {
  color: #9ca3af;
  font-size: 11px;
}

.file-remove {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 2px;
  font-size: 14px;
  line-height: 1;
}

.file-remove:hover {
  color: #ef4444;
}

/* 历史记录侧边栏 */
.history-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.history-header {
  padding: 16px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.history-header h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.new-chat-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  box-shadow: 0 4px 12px rgba(79, 107, 255, 0.3);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.history-item:hover {
  background: #f6f9ff;
}

.history-item.active {
  background: #eef2ff;
}

.history-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.history-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.history-title {
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.history-date {
  font-size: 11px;
  color: #9ca3af;
}

.history-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .history-delete {
  opacity: 1;
}

.history-delete:hover {
  transform: scale(1.1);
}

/* 头部左侧 */
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-toggle {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.history-toggle:hover {
  background: #f6f9ff;
}
</style>
