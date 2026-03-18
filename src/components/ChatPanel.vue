<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api, { AVAILABLE_MODELS, setModel, LLM_CONFIG } from '@/api/openclaw'
import { systemPrompts, processResponses, selectorPrompt, selectorProcess, getModeType, type ModeType } from '@/prompts'
import { isInReviewDetail, isInReviewMain, triggerRecommend, currentReviewPaper, reviewOpinion } from '@/stores/review'
import { usePapersStore } from '@/stores/papers'
import type { PaperAttachment } from '@/types/paper'

const route = useRoute()
const papersStore = usePapersStore()

// 只有在详情页面才显示聊天面板
const showInReviewDetail = computed(() => {
  return route.path === '/review'
})

// 上传文件相关
interface UploadedFile {
  id: number
  name: string
  content: string
  type: string
}

const uploadedFiles = ref<UploadedFile[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const awaitingPaperDetail = ref(false)

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  Array.from(input.files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      uploadedFiles.value.push({
        id: Date.now() + Math.random(),
        name: file.name,
        content: content,
        type: file.name.split('.').pop() || 'unknown'
      })
    }
    reader.readAsText(file)
  })
  input.value = ''
}

const removeFile = (fileId: number) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== fileId)
}

const toPaperAttachments = (): PaperAttachment[] => {
  return uploadedFiles.value.map(file => ({
    id: `att-${file.id}`,
    name: file.name,
    type: file.type,
    content: file.content
  }))
}

// 历史记录相关
interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const chatHistory = ref<ChatSession[]>([])
const showHistory = ref(false)
const currentSessionId = ref<string | null>(null)

// 加载历史记录
const loadHistory = async () => {
  try {
    const res = await fetch('/api/chat-history/list')
    if (res.ok) {
      chatHistory.value = await res.json()
      // 如果没有历史记录，自动创建一个默认会话
      if (chatHistory.value.length === 0) {
        await createDefaultSession()
      }
    }
  } catch (e) {
    console.log('加载历史记录失败', e)
  }
}

// 创建默认会话
const createDefaultSession = async () => {
  const defaultSession: ChatSession = {
    id: String(Date.now()),
    title: '新对话',
    messages: [
      { id: 1, role: 'assistant' as const, content: '你好！我是AI助手，有什么可以帮助你的吗？' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  try {
    await fetch('/api/chat-history/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultSession)
    })
    currentSessionId.value = defaultSession.id
    messages.value = defaultSession.messages
    chatHistory.value = [defaultSession]
  } catch (e) {
    console.log('创建默认会话失败', e)
  }
}

// 保存当前会话
const saveCurrentSession = async () => {
  if (!messages.value.length) return

  const sessionId = currentSessionId.value || String(Date.now())
  const session: ChatSession = {
    id: sessionId,
    title: messages.value.find(m => m.role === 'user')?.content.substring(0, 20) || '新对话',
    messages: messages.value,
    createdAt: chatHistory.value.find(c => c.id === sessionId)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  try {
    await fetch('/api/chat-history/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    })
    currentSessionId.value = sessionId
    loadHistory()
  } catch (e) {
    console.log('保存失败', e)
  }
}

// 加载指定会话
const loadSession = (session: ChatSession) => {
  messages.value = session.messages
  currentSessionId.value = session.id
  showHistory.value = false
}

// 新建对话
const createNewChat = () => {
  messages.value = [
    { id: Date.now(), role: 'assistant', content: '你好！我是AI助手，有什么可以帮助你的吗？' }
  ]
  currentSessionId.value = null
  uploadedFiles.value = []
  // 保存新对话到历史记录
  saveCurrentSession()
}

// 删除会话
const deleteSession = async (sessionId: string, event: Event) => {
  event.stopPropagation()
  try {
    await fetch(`/api/chat-history/delete/${sessionId}`, { method: 'DELETE' })
    if (currentSessionId.value === sessionId) {
      createNewChat()
    }
    loadHistory()
  } catch (e) {
    console.log('删除失败', e)
  }
}

onMounted(() => {
  loadHistory()
  papersStore.bootstrap()
})

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  modeSelect?: {
    mode: string
    reason: string
    systemPrompt: string
  }
  isStreaming?: boolean  // 是否正在流式输出
  phase?: 'thinking' | 'typing' | 'done'
}

const props = defineProps<{
  isFloating?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const messages = ref<Message[]>([
  { id: 1, role: 'assistant', content: '你好！我是AI助手，有什么可以帮助你的吗？' }
])

const inputMessage = ref('')
const isLoading = ref(false)
const selectedModel = ref(LLM_CONFIG.model)
const showModelDropdown = ref(false)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const AGENT_AMANYY_NAME = 'Lobster-Amanyy'
const AGENT_AMANYY_AVATAR = 'https://i.pravatar.cc/40?img=12'

const parsePaperDetail = (raw: string) => {
  const normalized = raw.replace(/\r/g, '').trim()
  const segments = normalized
    .split(/[\n;\uFF1B]+/)
    .map(s => s.trim())
    .filter(Boolean)

  let title = ''
  let content = ''
  let author = ''
  let pendingField: 'title' | 'content' | 'author' | null = null

  const fieldRegex = /^(?:\u6807\u9898|title|\u6458\u8981|abstract|summary|\u4f5c\u8005|author)\s*(?:\:|\uFF1A)?\s*(.*)$/i
  const labelRegex = /^(\u6807\u9898|title|\u6458\u8981|abstract|summary|\u4f5c\u8005|author)/i

  const mapLabelToField = (label: string): 'title' | 'content' | 'author' => {
    const l = label.toLowerCase()
    if (l === 'title' || label === '\u6807\u9898') return 'title'
    if (l === 'author' || label === '\u4f5c\u8005') return 'author'
    return 'content'
  }

  const assignField = (field: 'title' | 'content' | 'author', value: string) => {
    const v = value.trim()
    if (!v) return
    if (field === 'title') title = v
    if (field === 'author') author = v
    if (field === 'content') content = content ? `${content}\n${v}` : v
  }

  for (const seg of segments) {
    const labelMatch = seg.match(labelRegex)
    const fullMatch = seg.match(fieldRegex)
    if (labelMatch && fullMatch) {
      const field = mapLabelToField(labelMatch[1]!)
      const value = fullMatch[1] || ''
      if (value.trim()) {
        assignField(field, value)
        pendingField = null
      } else {
        pendingField = field
      }
      continue
    }

    if (pendingField) {
      assignField(pendingField, seg)
      pendingField = null
      continue
    }

    // 未标注字段的残余文本，优先补到摘要
    assignField('content', seg)
  }

  if (!title) {
    const titleMatch = normalized.match(/(?:\u6807\u9898|title)\s*(?:\:|\uFF1A)\s*([^\n;\uFF1B]+)/i)
    title = titleMatch?.[1]?.trim() || ''
  }
  if (!content) {
    const summaryMatch = normalized.match(/(?:\u6458\u8981|abstract|summary)\s*(?:\:|\uFF1A)\s*([\s\S]+)/i)
    content = summaryMatch?.[1]?.trim() || ''
  }
  if (!author) {
    const authorMatch = normalized.match(/(?:\u4f5c\u8005|author)\s*(?:\:|\uFF1A)\s*([^\n;\uFF1B]+)/i)
    author = authorMatch?.[1]?.trim() || ''
  }

  if (!title) title = normalized.slice(0, 30) || '新论文'
  if (!content) content = normalized || '暂无摘要'
  if (!author) author = '用户'
  if (title.length > 120) {
    title = `${title.slice(0, 120).trim()}...`
  }

  const tags: string[] = []
  if (raw.toLowerCase().includes('agent')) tags.push('Agent')
  if (/(\u591a\u6a21\u6001|multimodal)/i.test(raw)) tags.push('Multimodal')
  return { title, content, author, tags }
}

const pushAgentStep = async (content: string, phase: 'thinking' | 'done' = 'thinking') => {
  messages.value.push({
    id: Date.now() + Math.random(),
    role: 'assistant',
    content,
    phase
  })
  if (phase === 'thinking') {
    await delay(500 + Math.random() * 500)
  }
}

const buildHallucinationSummary = () => {
  const references = papersStore.papers
    .filter(p => p.tags.some(tag => /multimodal|vision|gpt-4|clip/i.test(tag)) || /multimodal|vision|gpt-4|clip/i.test(p.title))
    .slice(0, 3)
    .map(p => `- ${p.title}（${p.venue || '未知会议'})`)

  const referenceSection = references.length
    ? references.join('\n')
    : '- GPT-4 Technical Report（arXiv 2023）\n- CLIP（ICML 2021）\n- PaLM-E（ICRA 2023）'

  return [
    '好的，我给你一份结构化的多模态幻觉调研总结：',
    '【1】问题分层\n- 感知层幻觉：识别错误与 OCR 噪声传递\n- 对齐层幻觉：图文证据不一致却强行解释\n- 推理层幻觉：跨模态链路中自洽但不真实的结论',
    '【2】评测基准\n- 指标：Hallucination Rate、Evidence Consistency、Faithfulness\n- 数据集：MMVet、POPE、HallusionBench\n- 方案：单模态 vs 多模态对照，并拆分感知错误与推理错误占比',
    '【3】抑制策略\n- 检索增强：回答前先列证据片段\n- 一致性校验：图像证据与文本结论做 NLI 对齐打分\n- 双阶段生成：先证据清单，再输出结论',
    '【4】7天执行计划\n- Day1-2：整理 30 个高风险样例并标注错误类型\n- Day3-4：接入证据约束提示词与拒答策略\n- Day5-6：跑基准并做误差分解\n- Day7：产出复盘报告（有效策略、失败案例、下一轮实验）',
    `【5】建议先读论文\n${referenceSection}`
  ].join('\n\n')
}

const scriptedPaperFlow = async (question: string) => {
  if (awaitingPaperDetail.value) {
    const detail = parsePaperDetail(question)
    const paper = papersStore.publishPaper({
      title: detail.title,
      content: detail.content,
      author: detail.author,
      tags: detail.tags,
      attachments: toPaperAttachments()
    })
    uploadedFiles.value = []
    awaitingPaperDetail.value = false

    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: `已发布新论文：《${paper.title}》`,
      phase: 'done'
    })

    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在阅读新论文摘要与关键词...`)
    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在生成高价值追问评论...`)

    papersStore.addComment(
      paper.id,
      '很有趣的工作！请问您的方法在多模态场景下是否同样有效？',
      { author: AGENT_AMANYY_NAME, authorRole: 'agent', avatar: AGENT_AMANYY_AVATAR }
    )

    messages.value.push({
      id: Date.now() + 2,
      role: 'assistant',
      content: `${AGENT_AMANYY_NAME} 已完成评论并同步给你。`,
      phase: 'done'
    })
    return true
  }

  const publishIntent = /(\u8bba\u6587|paper)/i.test(question) && /(\u53d1|\u53d1\u5e03|\u4e0a\u4f20|publish|post|upload)/i.test(question)
  if (publishIntent) {
    awaitingPaperDetail.value = true
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: '好的，请提供论文标题、摘要、作者信息和主要图标。',
      phase: 'done'
    })
    return true
  }

  const likeMatch = question.match(/(?:\u70b9\u8d5e|like)\s*(p\d+)/i)
  if (likeMatch) {
    const targetId = likeMatch[1]!
    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在定位论文 ${targetId}...`)
    papersStore.likeOnce(targetId)
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: `已完成点赞：${targetId}`,
      phase: 'done'
    })
    return true
  }

  const commentMatch = question.match(/(?:\u8bc4\u8bba|comment)\s*(p\d+)\s*(.+)/i)
  if (commentMatch) {
    const targetId = commentMatch[1]!
    const text = commentMatch[2]!
    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在阅读论文 ${targetId} 的上下文...`)
    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在润色评论语气与表达...`)
    papersStore.addComment(targetId, text.trim(), {
      author: AGENT_AMANYY_NAME,
      authorRole: 'agent',
      avatar: AGENT_AMANYY_AVATAR
    })
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: `已完成评论：${targetId}`,
      phase: 'done'
    })
    return true
  }

  const summaryIntent = /(\u591a\u6a21\u6001|multimodal)/i.test(question) && /(\u5e7b\u89c9|hallucination)/i.test(question) && /(\u8c03\u7814|\u6982\u8981|\u603b\u7ed3|research|summary)/i.test(question)
  if (summaryIntent) {
    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在汇总近期相关论文与评测基准...`)
    await pushAgentStep(`${AGENT_AMANYY_NAME} 正在生成结构化调研摘要...`)
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: buildHallucinationSummary(),
      phase: 'done'
    })
    return true
  }

  return false
}

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
  if (!inputMessage.value.trim() || isLoading.value) return

  const question = inputMessage.value.trim()

  // 添加用户消息
  const userMsg: Message = {
    id: Date.now(),
    role: 'user',
    content: question
  }
  messages.value.push(userMsg)
  inputMessage.value = ''
  isLoading.value = true

  // 思考占位 + 随机延迟，避免“秒回”
  const thinkingMsg: Message = {
    id: Date.now() + 1,
    role: 'assistant',
    content: '正在思考...',
    phase: 'thinking'
  }
  messages.value.push(thinkingMsg)
  await delay(400 + Math.random() * 800)

  const skipLLM = await scriptedPaperFlow(question)
  if (skipLLM) {
    isLoading.value = false
    const idx = messages.value.findIndex(m => m.id === thinkingMsg.id)
    if (idx > -1) messages.value.splice(idx, 1)
    saveCurrentSession()
    return
  }

  // 检查是否是推荐审稿（只在审稿主界面，即论文列表页面时生效）
  const lowerQuestion = question.toLowerCase()
  const isReviewMain = route.path === '/review' && isInReviewMain.value
  if (isReviewMain && (
    lowerQuestion.includes('为我推荐今日的审稿论文') ||
    lowerQuestion.includes('推荐审稿的论文') ||
    lowerQuestion.includes('paper recommendation')
  )) {
    // 添加提示消息
    const tipMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '好的，我正在为您推荐适合审稿的论文，请稍候...'
    }
    messages.value.push(tipMsg)

    // 触发推荐功能，ReviewView会执行推荐
    triggerRecommend.value = Date.now()

    // 立即设置isLoading为false，让用户可以继续操作
    isLoading.value = false

    // 3秒后发送完成消息
    setTimeout(() => {
      // 移除提示消息
      const tipIndex = messages.value.findIndex(m => m.id === tipMsg.id)
      if (tipIndex > -1) {
        messages.value.splice(tipIndex, 1)
      }
      // 添加完成消息
      const doneMsg: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: '已为您推荐适合审稿的论文，请查看左侧列表。如需重新推荐，可以再次发送"推荐审稿"。'
      }
      messages.value.push(doneMsg)
    }, 3000)

    return
  }

  // 检查是否是生成审稿意见（只在审稿详情界面，即进入具体论文查看页面时生效）
  const isReviewDetail = route.path === '/review' && isInReviewDetail.value
  if (isReviewDetail && (
    lowerQuestion.includes('审稿意见') ||
    lowerQuestion.includes('review') ||
    lowerQuestion.includes('评审意见') ||
    lowerQuestion.includes('生成审稿')
  )) {
    const idx = messages.value.findIndex(m => m.id === thinkingMsg.id)
    if (idx > -1) messages.value.splice(idx, 1)
    // 创建空的 AI 消息用于流式显示
    const aiMsgId = Date.now() + 1
    let streamingContent = ''
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true
    }
    messages.value.push(aiMsg)

    // 使用流式 API 生成审稿意见
    await api.generateReviewStream(
      currentReviewPaper.value!,
      (chunk: string) => {
        streamingContent += chunk
        // 找到对应的消息并更新内容
        const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
        if (msgIndex > -1) {
          messages.value[msgIndex]!.content = streamingContent
        }
      }
    )

    // 流式输出完成，标记结束并填入审稿意见框
    const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
    if (msgIndex > -1) {
      messages.value[msgIndex]!.isStreaming = false
      reviewOpinion.value = streamingContent
    }
    isLoading.value = false
    return
  }

  // 普通对话 - 先判断使用哪种模式（不显示在界面，只保存到JSON）
  try {
    // 第一步：调用模式选择器，让大模型判断应该用哪个模式
    console.log('[模式选择] 开始判断用户问题应该使用哪种模式...')
    console.log('[模式选择] 用户问题:', question)

    const selectResponse = await api.sendChatWithContext(
      0,
      `请判断用户以下问题应该使用哪种模式：${question}`,
      {},
      false,
      selectorPrompt
    )

    // 解析模式选择结果
    const selectResult = selectorProcess(selectResponse.reply || '{}')
    const selectedMode = getModeType(selectResult.mode)

    console.log('%c[模式选择] 选择的模式: ' + selectedMode, 'color: #10b981; font-weight: bold')
    console.log('[模式选择] 原因:', selectResult.reason)

    // 第二步：使用对应模式的 system prompt 调用大模型回答问题（流式）
    const modeSystemPrompt = systemPrompts[selectedMode]
    console.log('%c[模式选择] 使用的 System Prompt:', 'color: #3b82f6; font-weight: bold')

    // 保存模式选择信息到 JSON
    const modeSelectInfo = {
      mode: selectedMode,
      reason: selectResult.reason,
      systemPrompt: modeSystemPrompt
    }
    console.log('[保存] 模式选择信息:', modeSelectInfo)

    const thinkingIdx = messages.value.findIndex(m => m.id === thinkingMsg.id)
    if (thinkingIdx > -1) messages.value.splice(thinkingIdx, 1)

    // 创建空的 AI 消息用于流式显示
    const aiMsgId = Date.now() + 1
    let streamingContent = ''
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      modeSelect: modeSelectInfo,
      isStreaming: true
    }
    messages.value.push(aiMsg)

    // 使用流式 API，每收到一个 chunk 就更新消息
    await api.sendChatWithContextStream(
      currentReviewPaper.value?.id || 0,
      question,
      { reviewMarkdown: reviewOpinion.value },
      false,
      (chunk: string) => {
        streamingContent += chunk
        // 找到对应的消息并更新内容
        const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
        if (msgIndex > -1) {
          // 使用对应模式的处理函数格式化输出
          const processedContent = processResponses[selectedMode]!(streamingContent)
          messages.value[msgIndex]!.content = typeof processedContent === 'string' ? processedContent : streamingContent
        }
      },
      modeSystemPrompt
    )

    // 流式输出完成，标记结束并格式化
    const msgIndex = messages.value.findIndex(m => m.id === aiMsgId)
    if (msgIndex > -1) {
      messages.value[msgIndex]!.isStreaming = false
      // 流式完成后，再次处理内容（确保格式统一）
      const finalContent = messages.value[msgIndex]!.content
      const formattedContent = processResponses[selectedMode]!(finalContent)
      messages.value[msgIndex]!.content = formattedContent
      messages.value[msgIndex]!.content = formattedContent
    }
  } catch (error) {
    console.error('对话出错:', error)
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '抱歉，目前无法获取回复，请稍后重试。'
    }
    messages.value.push(aiMsg)
  }

  isLoading.value = false
  // 保存会话
  saveCurrentSession()
}
</script>

<template>
  <div class="chat-panel" :class="{ 'is-floating': isFloating }">
    <div class="panel-header">
      <h3>🦞 龙虾助手</h3>
      <div class="header-actions">
        <!-- 历史记录按钮 -->
        <button class="history-toggle-btn" @click="showHistory = !showHistory" title="历史记录">
          📜
        </button>
        <!-- 模型选择器 -->
        <div class="model-selector">
          <button class="model-btn" @click="showModelDropdown = !showModelDropdown">
            <span class="model-icon">🤖</span>
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
        :class="{
          'message-user': msg.role === 'user',
          'message-assistant': msg.role === 'assistant',
          'message-thinking': msg.phase === 'thinking'
        }"
      >
        <div class="message-avatar">
          <span v-if="msg.role === 'user'" class="avatar-user">U</span>
          <span v-else class="avatar-ai">🦞</span>
        </div>
        <div class="message-content">
          <div v-if="msg.phase === 'thinking'" class="message-stage">分身执行中</div>
          <div class="message-text">{{ msg.content }}</div>
          <span v-if="msg.isStreaming" class="streaming-cursor">▊</span>
        </div>
      </div>
      <!-- <div v-if="isLoading" class="message message-assistant">
        <div class="message-avatar"><span class="avatar-ai">🦞</span></div>
        <div class="message-content">
          <div class="message-text loading">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div> -->
    </div>
    <div class="panel-input">
      <!-- 已上传文件列表 -->
      <div v-if="uploadedFiles.length" class="uploaded-files">
        <span v-for="file in uploadedFiles" :key="file.id" class="file-tag">
          📎 {{ file.name }}
          <span class="remove-file" @click="removeFile(file.id)">×</span>
        </span>
      </div>
      <div class="input-row">
        <input
          type="file"
          ref="fileInputRef"
          @change="handleFileUpload"
          accept=".pdf,.docx,.txt,.md"
          multiple
          style="display: none"
        />
        <button class="upload-btn" @click="fileInputRef?.click()" title="上传文件">
          📎
        </button>
        <input
          v-model="inputMessage"
          type="text"
          placeholder="输入消息..."
          :disabled="isLoading"
          @keyup.enter="sendMessage"
        />
        <button @click="sendMessage" :disabled="isLoading || !inputMessage.trim()">
          发送
        </button>
      </div>
    </div>
    <!-- 历史记录侧边栏 -->
    <div v-if="showHistory" class="history-sidebar">
      <div class="history-header">
        <h4>历史记录</h4>
        <button class="new-chat-btn" @click="createNewChat">+ 新建对话</button>
      </div>
      <div class="history-list">
        <div
          v-for="session in chatHistory"
          :key="session.id"
          class="history-item"
          :class="{ active: session.id === currentSessionId }"
          @click="loadSession(session)"
        >
          <span class="history-title">{{ session.title }}</span>
          <button class="delete-btn" @click="deleteSession(session.id, $event)">🗑️</button>
        </div>
      </div>
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

.history-toggle-btn {
  padding: 8px 12px;
  background: #f6f9ff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.history-toggle-btn:hover {
  background: #eef2ff;
  border-color: #4f6bff;
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

.message-thinking .message-content {
  background: #f4f8ff;
  border: 1px solid #dbe8ff;
}

.message-stage {
  display: inline-flex;
  align-items: center;
  margin-bottom: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #3b5bdb;
  background: #e8f0ff;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
}

.message-text.loading {
  display: flex;
  gap: 4px;
}

/* 流式输出光标 */
.streaming-cursor {
  display: inline-block;
  margin-left: 2px;
  color: #4f6bff;
  font-weight: bold;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
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

/* 上传文件样式 */
.uploaded-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 8px;
}

.file-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e0e7ff;
  border-radius: 4px;
  font-size: 12px;
  color: #4f6bff;
}

.remove-file {
  cursor: pointer;
  color: #9ca3af;
  font-weight: bold;
}

.remove-file:hover {
  color: #ef4444;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.upload-btn, .history-btn {
  padding: 8px 10px;
  background: #f6f9ff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.upload-btn:hover, .history-btn:hover {
  background: #eef2ff;
  border-color: #4f6bff;
}

/* 历史记录侧边栏 */
.history-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  background: white;
  border-right: 1px solid #e5e7eb;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.history-header h4 {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
}

.new-chat-btn {
  padding: 6px 12px;
  background: #4f6bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.new-chat-btn:hover {
  background: #3b5bff;
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
  margin-bottom: 4px;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: #f3f4f6;
}

.history-item.active {
  background: #e0e7ff;
  border: 1px solid #4f6bff;
}

.history-title {
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.delete-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  transform: scale(1.1);
}

/* 头像样式 */
.avatar-user {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
}

.avatar-ai {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
</style>
