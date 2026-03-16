<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { currentReviewPaper, reviewOpinion, isGeneratingReview, generateReviewOpinion, isInReviewDetail, isInReviewMain, triggerRecommend } from '@/stores/review'
import api, { AVAILABLE_MODELS, setModel, LLM_CONFIG } from '@/api/openclaw'

const route = useRoute()

// 只有在详情页面才显示聊天面板
const showInReviewDetail = computed(() => {
  return route.path === '/review'
})

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
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

  // 检查是否是推荐审稿（只在审稿主界面，即论文列表页面时生效）
  const lowerQuestion = question.toLowerCase()
  const isReviewMain = route.path === '/review' && isInReviewMain.value
  if (isReviewMain && (
    lowerQuestion.includes('推荐审稿') ||
    lowerQuestion.includes('推荐论文') ||
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
    // 生成审稿意见
    const result = await generateReviewOpinion()
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: result || '生成审稿意见失败，请稍后重试。'
    }
    messages.value.push(aiMsg)
    // 填入审稿意见框
    if (result) {
      reviewOpinion.value = result
    }
    isLoading.value = false
    return
  }

  // 普通对话
  try {
    const response = await api.sendChatWithContext(
      currentReviewPaper.value?.id || 0,
      question,
      { reviewMarkdown: reviewOpinion.value }
    )
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: response.reply || '抱歉，无法获取回复'
    }
    messages.value.push(aiMsg)
    // 注意：普通对话不填入审稿意见栏，只有生成审稿意见时才填入
  } catch (error) {
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '抱歉，目前无法获取回复，请稍后重试。'
    }
    messages.value.push(aiMsg)
  }

  isLoading.value = false
}
</script>

<template>
  <div class="chat-panel" :class="{ 'is-floating': isFloating }">
    <div class="panel-header">
      <h3>AI 对话</h3>
      <div class="header-actions">
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
        :class="{ 'message-user': msg.role === 'user', 'message-assistant': msg.role === 'assistant' }"
      >
        <div class="message-avatar">
          <span v-if="msg.role === 'user'">U</span>
          <span v-else>AI</span>
        </div>
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
        </div>
      </div>
      <div v-if="isLoading" class="message message-assistant">
        <div class="message-avatar">AI</div>
        <div class="message-content">
          <div class="message-text loading">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
    <div class="panel-input">
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
</style>
