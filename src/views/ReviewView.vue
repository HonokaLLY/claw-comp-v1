<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/openclaw'
import { currentReviewPaper, reviewOpinion, setCurrentReviewPaper } from '@/stores/review'

interface Paper {
  id: number
  title: string
  keywords: string[]
  abstract: string
  pdfUrl?: string
  arXivId?: string
  venue?: string
  submittedDate?: string
  deadline?: string
  isDone?: boolean
}

// 主状态
const activeMenu = ref('review')
const rightTab = ref<'pending' | 'completed'>('pending')
const selectedIds = ref<number[]>([])
const myPapers = ref<Paper[]>([])
const currentPaper = ref<Paper | null>(null)
const recommendedPapers = ref<Paper[]>([])
const expandedPapers = ref<number[]>([])

// 审稿状态
const reviewData = ref({
  reviewMarkdown: ''
})
const isLoadingReview = ref(false)
const userInput = ref('')
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const showSuccessModal = ref(false)

// 宽度控制
const leftWidth = ref(450)
const middleWidth = ref(450)
const mainWidth = ref(700)
const resizing = ref<'left' | 'middle' | 'main' | null>(null)

// 切换选择
const toggleSelect = (paperId: number) => {
  const index = selectedIds.value.indexOf(paperId)
  if (index === -1) {
    selectedIds.value.push(paperId)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

// 计算属性
const pendingPapers = computed(() => myPapers.value.filter(p => !p.isDone))
const completedPapers = computed(() => myPapers.value.filter(p => p.isDone))
const filteredMyPapers = computed(() => {
  return myPapers.value.filter(p => rightTab.value === 'pending' ? !p.isDone : p.isDone)
})

// 监听全局审稿意见变化，同步到本地
watch(reviewOpinion, (newVal) => {
  if (newVal) {
    reviewData.value.reviewMarkdown = newVal
  }
})

// 加载数据
onMounted(async () => {
  try {
    const data = await api.getRecommendedPapers()
    recommendedPapers.value = data
  } catch (error) {
    console.error('加载推荐论文失败:', error)
  }
})

// 展开/收起论文摘要
const toggleExpand = (paperId: number) => {
  const index = expandedPapers.value.indexOf(paperId)
  if (index === -1) {
    expandedPapers.value.push(paperId)
  } else {
    expandedPapers.value.splice(index, 1)
  }
}

// 确认审稿
const confirmReview = () => {
  selectedIds.value.forEach(id => {
    const paper = recommendedPapers.value.find(p => p.id === id)
    if (paper && !myPapers.value.some(mp => mp.id === id)) {
      myPapers.value.push({ ...paper, isDone: false })
    }
  })
  selectedIds.value = []
}

// 进入审稿模式
const enterReviewMode = (paper: Paper) => {
  currentPaper.value = paper
  messages.value = []
  reviewData.value.reviewMarkdown = ''
  // 设置全局状态，供右侧聊天面板使用
  setCurrentReviewPaper({
    id: paper.id,
    title: paper.title,
    keywords: paper.keywords,
    pdfUrl: paper.pdfUrl,
    arXivId: paper.arXivId
  })
  // 注意：默认不加载审稿意见，需要用户发送"生成审稿意见"后才生成
}

// 返回主界面
const goBack = () => {
  currentPaper.value = null
  setCurrentReviewPaper(null)
}

// 宽度调整
const startResize = (panel: 'left' | 'middle' | 'main', event: MouseEvent) => {
  resizing.value = panel
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

const handleResize = (event: MouseEvent) => {
  if (!resizing.value) return

  if (resizing.value === 'left') {
    const newWidth = event.clientX
    leftWidth.value = Math.max(300, Math.min(800, newWidth))
  } else if (resizing.value === 'middle') {
    const newWidth = event.clientX - leftWidth.value
    middleWidth.value = Math.max(300, Math.min(800, newWidth))
  } else if (resizing.value === 'main') {
    const newWidth = event.clientX
    mainWidth.value = Math.max(400, Math.min(900, newWidth))
  }
}

const stopResize = () => {
  resizing.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// 加载审稿意见
const loadReview = async () => {
  if (!currentPaper.value) return
  isLoadingReview.value = true
  try {
    const result = await api.generateReview(currentPaper.value)
    if (result && result.reply) {
      reviewData.value.reviewMarkdown = result.reply
    }
  } catch (error) {
    console.error('加载审稿意见失败:', error)
  }
  isLoadingReview.value = false
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value || !currentPaper.value) return

  const question = userInput.value.trim()
  messages.value.push({ role: 'user', content: question })
  userInput.value = ''
  isLoading.value = true

  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }

  try {
    const response = await api.sendChatWithContext(
      currentPaper.value.id,
      question,
      reviewData.value
    )

    messages.value.push({
      role: 'assistant',
      content: response.reply || '抱歉，无法获取回复'
    })

    if (response.isReview && response.reply) {
      reviewData.value.reviewMarkdown = response.reply
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '抱歉，目前无法获取回复，请稍后重试。'
    })
  }

  isLoading.value = false
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 提交审稿
const handleSubmitReview = () => {
  showSuccessModal.value = true
}

const confirmSuccess = () => {
  if (currentPaper.value) {
    const paper = myPapers.value.find(p => p.id === currentPaper.value!.id)
    if (paper) {
      paper.isDone = true
    }
  }
  showSuccessModal.value = false
  goBack()
}

const nextTick = () => new Promise(resolve => setTimeout(resolve, 10))
</script>

<template>
  <div class="review-view">
    <!-- 审稿详情界面 -->
    <div v-if="currentPaper" class="review-detail-view">
      <!-- 左侧：论文PDF -->
      <aside class="panel-left" :style="{ width: leftWidth + 'px' }">
        <div class="panel-header">
          <button class="back-btn" @click="goBack">
            <span class="back-icon">←</span>
            返回列表
          </button>
          <h3 class="panel-title">论文原文</h3>
        </div>
        <div class="panel-content">
          <iframe v-if="currentPaper.pdfUrl" :src="currentPaper.pdfUrl" class="pdf-frame" title="论文PDF"></iframe>
          <div v-else class="no-pdf">
            <p>暂无PDF</p>
            <a v-if="currentPaper.arXivId" :href="`https://arxiv.org/abs/${currentPaper.arXivId}`" target="_blank" class="arxiv-link">
              在arXiv查看
            </a>
          </div>
        </div>
        <!-- 拖动条 -->
        <div class="resize-handle" @mousedown="startResize('left', $event)"></div>
      </aside>

      <!-- 右侧：审稿结果 -->
      <aside class="panel-right">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">AI审稿分析</h3>
            <p class="panel-subtitle">OpenCLAW</p>
          </div>
          <button class="refresh-btn" @click="loadReview" :disabled="isLoadingReview || !reviewData.reviewMarkdown">
            {{ isLoadingReview ? '生成中...' : '生成审稿' }}
          </button>
        </div>

        <div class="panel-content">
          <!-- 论文基本信息 -->
          <div class="paper-info">
            <h4 class="paper-title">{{ currentPaper.title }}</h4>
            <div class="paper-tags">
              <span v-for="tag in currentPaper.keywords" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <p v-if="currentPaper.venue" class="paper-venue">{{ currentPaper.venue }}</p>
          </div>

          <!-- 审稿意见 -->
          <div class="review-section">
            <div class="review-label">审稿意见 (Markdown)</div>
            <textarea
              v-model="reviewData.reviewMarkdown"
              rows="20"
              class="review-textarea"
              placeholder="在右侧边栏发送'生成审稿意见'获取完整审稿..."
            ></textarea>
          </div>
        </div>

        <div class="panel-footer">
          <button class="export-btn">导出审稿意见</button>
          <button class="submit-btn" @click="handleSubmitReview">提交审稿</button>
        </div>
      </aside>

      <!-- 提交成功弹窗 -->
      <div v-if="showSuccessModal" class="modal-overlay" @click.self="showSuccessModal = false">
        <div class="modal">
          <div class="modal-icon">✓</div>
          <h3>提交成功</h3>
          <p>感谢您的审稿工作</p>
          <button @click="confirmSuccess">确定</button>
        </div>
      </div>
    </div>

    <!-- 主界面 -->
    <div v-else class="review-main-view">
      <!-- 中间：推荐论文列表 -->
      <main class="main-content" :style="{ width: mainWidth + 'px' }">
        <header class="main-header">
          <h2>推荐审稿论文</h2>
          <span class="header-subtitle">根据您的研究领域智能推送</span>
        </header>

        <div class="papers-list">
          <div
            v-for="paper in recommendedPapers"
            :key="paper.id"
            class="paper-card"
            :class="{ selected: selectedIds.includes(paper.id) }"
          >
            <div class="paper-main">
              <div class="paper-title-row" @click="toggleSelect(paper.id)">
                <h3 class="paper-title">{{ paper.title }}</h3>
                <span
                  class="expand-btn"
                  :class="{ expanded: expandedPapers.includes(paper.id) }"
                  @click.stop="toggleExpand(paper.id)"
                >▼</span>
              </div>
              <div class="paper-tags">
                <span v-for="tag in paper.keywords" :key="tag" class="tag">{{ tag }}</span>
              </div>
              <p :class="['paper-abstract', { expanded: expandedPapers.includes(paper.id) }]">
                {{ paper.abstract }}
              </p>
              <div v-if="paper.deadline" class="paper-deadline">
                <span class="deadline-icon">⏰</span>
                截止日期: {{ paper.deadline }}
              </div>
            </div>
            <div class="paper-checkbox" @click.stop="toggleSelect(paper.id)">
              <input type="checkbox" :value="paper.id" v-model="selectedIds" />
            </div>
          </div>
        </div>

        <footer class="main-footer">
          <button
            @click="confirmReview"
            :disabled="selectedIds.length === 0"
            class="confirm-btn"
          >
            确认审稿 (已选 {{ selectedIds.length }})
          </button>
        </footer>
      </main>

      <!-- 右侧：我的审稿 -->
      <aside class="main-right">
        <div class="right-tabs">
          <button
            :class="['tab-btn', { active: rightTab === 'pending' }]"
            @click="rightTab = 'pending'"
          >
            待完成 ({{ pendingPapers.length }})
          </button>
          <button
            :class="['tab-btn', { active: rightTab === 'completed' }]"
            @click="rightTab = 'completed'"
          >
            已完成
          </button>
        </div>

        <div class="my-papers">
          <div
            v-for="paper in filteredMyPapers"
            :key="paper.id"
            class="my-paper-card"
            @click="enterReviewMode(paper)"
          >
            <h4 class="my-paper-title">{{ paper.title }}</h4>
            <div class="paper-tags">
              <span v-for="tag in paper.keywords.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="my-paper-deadline">截止: {{ paper.deadline || '待定' }}</div>
          </div>
          <div v-if="filteredMyPapers.length === 0" class="empty-state">
            暂无相关稿件
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.review-view {
  height: 100%;
  display: flex;
  background: #f5f7fa;
  color: #1f2937;
}

/* 主界面样式 */
.review-main-view {
  display: flex;
  width: 100%;
  height: 100%;
}

.main-content {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(231, 237, 245, 0.95);
  position: relative;
  flex: 1;
  max-width: 65%;
}

.main-header {
  padding: 24px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.main-header h2 {
  margin: 0;
  font-size: 20px;
}

.header-subtitle {
  color: #667085;
  font-size: 14px;
}

.papers-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paper-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.paper-card:hover {
  border-color: #4f6bff;
}

.paper-card.selected {
  border-color: #4f6bff;
  background: #4f6bff15;
}

.paper-main {
  padding-right: 40px;
}

.paper-card .paper-title {
  margin: 0;
  font-size: 16px;
  color: #4f6bff;
}

.paper-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
}

.expand-btn {
  color: #9ca3af;
  font-size: 12px;
  transition: transform 0.2s;
  cursor: pointer;
}

.expand-btn.expanded {
  transform: rotate(180deg);
}

.paper-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag {
  padding: 4px 8px;
  background: #4f6bff20;
  color: #4f6bff;
  border-radius: 4px;
  font-size: 12px;
}

.paper-abstract {
  color: #667085;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.paper-abstract.expanded {
  display: block;
  -webkit-line-clamp: unset;
}

.paper-deadline {
  margin-top: 12px;
  color: #ff9800;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.paper-checkbox {
  position: absolute;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
}

.paper-checkbox input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.main-footer {
  padding: 16px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  justify-content: center;
}

.confirm-btn {
  padding: 14px 32px;
  background: #4f6bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.confirm-btn:hover:not(:disabled) {
  background: #3a8eef;
}

.confirm-btn:disabled {
  background: #444;
  cursor: not-allowed;
}

.main-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 280px;
}

.right-tabs {
  display: flex;
  padding: 16px;
  gap: 8px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: #ffffff;
  border: none;
  border-radius: 8px;
  color: #667085;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #4f6bff;
  color: #fff;
}

.my-papers {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-paper-card {
  padding: 12px;
  background: #ffffff;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.my-paper-card:hover {
  border-color: #4f6bff;
}

.my-paper-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #1f2937;
}

.my-paper-card .paper-tags {
  margin-bottom: 8px;
}

.my-paper-card .tag {
  font-size: 10px;
  padding: 2px 6px;
}

.my-paper-deadline {
  font-size: 11px;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

/* 审稿详情界面 */
.review-detail-view {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.panel-left,
.panel-middle,
.panel-right {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-left {
  background: #ffffff;
  border-right: 1px solid rgba(231, 237, 245, 0.95);
}

.panel-middle {
  background: #f5f7fa;
  border-right: 1px solid rgba(231, 237, 245, 0.95);
}

.panel-right {
  flex: 1;
  background: #ffffff;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.panel-title {
  margin: 0;
  font-size: 14px;
  color: #667085;
}

.panel-subtitle {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #667085;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 12px;
  padding: 0;
}

.back-btn:hover {
  color: #4f6bff;
}

.back-icon {
  font-size: 16px;
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.no-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.arxiv-link {
  color: #4f6bff;
  margin-top: 12px;
  font-size: 14px;
}

/* 聊天区域 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 90%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #666;
  color: #fff;
}

.message.assistant .message-avatar {
  background: #4f6bff;
  color: #fff;
}

.message-content {
  background: #ffffff;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.message.user .message-content {
  background: #f9fafb;
}

.message-content.loading {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #666;
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

.chat-input {
  padding: 12px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  font-size: 14px;
}

.chat-input input:focus {
  outline: none;
  border-color: #4f6bff;
}

.review-btn,
.send-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.review-btn {
  background: #4f6bff;
  color: #fff;
}

.review-btn:hover:not(:disabled) {
  background: #3a8eef;
}

.send-btn {
  background: #10a37f;
  color: #fff;
}

.send-btn:hover:not(:disabled) {
  background: #0d8a6d;
}

.send-btn:disabled,
.review-btn:disabled {
  background: #444;
  cursor: not-allowed;
}

/* 审稿右侧 */
.paper-info {
  padding: 16px;
  background: #4f6bff10;
  border-radius: 8px;
  margin: 16px;
}

.paper-info .paper-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #1f2937;
}

.paper-info .paper-tags {
  margin-bottom: 8px;
}

.paper-venue {
  color: #667085;
  font-size: 12px;
  margin: 0;
}

.review-section {
  padding: 16px;
}

.review-label {
  color: #374151;
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 500;
}

.review-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #f5f7fa;
  color: #ccc;
  font-size: 14px;
  font-family: monospace;
  resize: none;
  line-height: 1.6;
}

.review-textarea:focus {
  outline: none;
  border-color: #4f6bff;
}

.panel-footer {
  padding: 16px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  gap: 12px;
}

.export-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.export-btn {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.export-btn:hover {
  background: #f9fafb;
}

.submit-btn {
  background: #10a37f;
  border: none;
  color: #fff;
}

.submit-btn:hover {
  background: #0d8a6d;
}

.refresh-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #444;
  border-radius: 6px;
  color: #667085;
  cursor: pointer;
  font-size: 12px;
}

.refresh-btn:hover:not(:disabled) {
  background: #f6f9ff;
  color: #4f6bff;
}

/* 拖动条 */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  background: #4f6bff;
}

.panel-left .resize-handle {
  right: 0;
}

.panel-middle .resize-handle {
  right: 0;
}

.main-content .resize-handle {
  right: 0;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  max-width: 360px;
}

.modal-icon {
  width: 64px;
  height: 64px;
  background: #10a37f20;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
  color: #10a37f;
}

.modal h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
}

.modal p {
  margin: 0 0 24px 0;
  color: #667085;
}

.modal button {
  width: 100%;
  padding: 12px;
  background: #4f6bff;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
}

.modal button:hover {
  background: #3a8eef;
}
</style>
