<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/openclaw'
import { currentReviewPaper, reviewOpinion, setCurrentReviewPaper, setIsInReviewDetail, setIsInReviewMain, triggerRecommend } from '@/stores/review'

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
const showWelcome = ref(localStorage.getItem('review_welcome_shown') !== 'true')
const showLaterMessage = ref(false)

// 是否显示论文列表（欢迎页和消息都不显示时）
const showPaperList = computed(() => !showWelcome.value && !showLaterMessage.value)
const isRecommending = ref(false)
const showRecommendTip = ref(false)
const hasConfirmedQualification = ref(false)

// 审稿状态
const reviewData = ref({
  reviewMarkdown: '',
  reviewResult: '' as '' | 'accept' | 'minor' | 'major' | 'reject'
})
const isCompleted = ref(false)

// 审稿结论选项
const reviewOptions = [
  { value: 'accept', label: '接收', activeClass: 'bg-green-500 text-white' },
  { value: 'minor', label: '小修', activeClass: 'bg-blue-500 text-white' },
  { value: 'major', label: '大修', activeClass: 'bg-orange-500 text-white' },
  { value: 'reject', label: '拒稿', activeClass: 'bg-red-500 text-white' }
]
const isLoadingReview = ref(false)
const userInput = ref('')
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const showSuccessModal = ref(false)

// 宽度控制
const leftWidth = ref(1200)
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

// 监听当前论文状态，返回列表时清除全局审稿状态
watch(currentPaper, (newVal) => {
  if (!newVal) {
    setCurrentReviewPaper(null)
  }
})

// 监听推荐触发器，从ChatPanel触发推荐功能
watch(triggerRecommend, () => {
  recommendPapers()
})

// 加载数据
onMounted(async () => {
  try {
    // 加载各分类论文
    const [recommendedData, pendingData, completedData] = await Promise.all([
      api.getRecommendedPapers(),
      api.getPendingPapers(),
      api.getCompletedPapers()
    ])
    recommendedPapers.value = recommendedData

    // 同时从 all 中加载作为备选/全部论文
    const allPapers = await api.getAllPapers()
    // 可以将 all 存储起来用于其他用途
  } catch (error) {
    console.error('加载论文列表失败:', error)
  }

  // 如果有当前论文，自动加载审稿意见
  if (currentPaper.value) {
    loadReview()
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

// 推荐论文功能
const recommendPapers = async () => {
  isRecommending.value = true
  showRecommendTip.value = true

  try {
    // 获取所有论文
    const allPapers: Paper[] = await api.getAllPapers()

    // 构建提示信息
    const paperList = allPapers.map((p: Paper) => `- ${p.title} (ID: ${p.id}, 关键词: ${p.keywords.join(', ')})`).join('\n')

    // 判断是首次推荐还是重新推荐
    const isRercommend = recommendedPapers.value.length > 0
    const prompt = isRercommend
      ? `你是一个论文推荐助手。请根据用户的研究兴趣从以下论文列表中重新推荐3-5篇最适合审稿的论文。
请从列表中选择与用户研究领域最相关的论文，只需要返回论文的ID号，用逗号分隔，不需要其他内容。

论文列表：
${paperList}

请只返回论文ID，用逗号分隔，例如：1,3,5`
      : `你是一个论文推荐助手。请根据用户的研究兴趣从以下论文列表中推荐最适合审稿的论文。
请从列表中选择3-5篇最相关的论文，只需要返回论文的ID号，用逗号分隔，不需要其他内容。

论文列表：
${paperList}

请只返回论文ID，用逗号分隔，例如：1,3,5`

    // 调用LLM API
    const result = await api.sendChatMessage(prompt)
    const reply = result.reply

    // 解析LLM返回的论文ID
    const idMatch = reply.match(/\d+/g)
    if (idMatch) {
      const recommendedIds = idMatch.map(id => parseInt(id)).filter(id => id > 0 && id <= allPapers.length)
      const recommended = allPapers.filter((p: Paper) => recommendedIds.includes(p.id))
      recommendedPapers.value = recommended
    }

    showRecommendTip.value = false
  } catch (error) {
    console.error('推荐论文失败:', error)
    showRecommendTip.value = false
  } finally {
    isRecommending.value = false
  }
}

// 判断是否显示推荐按钮（recommended为空时显示"推荐审稿"）
const showRecommendButton = computed(() => recommendedPapers.value.length === 0)

// 进入审稿模式
const enterReviewMode = (paper: Paper, completed: boolean = false) => {
  currentPaper.value = paper
  messages.value = []
  reviewData.value.reviewMarkdown = ''
  reviewData.value.reviewResult = ''
  isCompleted.value = completed
  // 设置全局状态，供右侧聊天面板使用
  setCurrentReviewPaper({
    id: paper.id,
    title: paper.title,
    keywords: paper.keywords,
    pdfUrl: paper.pdfUrl,
    arXivId: paper.arXivId
  })
  // 标记进入审稿详情界面
  setIsInReviewDetail(true)
  // 标记离开审稿主界面
  setIsInReviewMain(false)
}

// 返回主界面
const goBack = () => {
  currentPaper.value = null
  setCurrentReviewPaper(null)
  // 标记离开审稿详情界面
  setIsInReviewDetail(false)
  // 标记进入审稿主界面
  setIsInReviewMain(true)
}

// 宽度调整
let startX = 0
let startWidth = 0

const startResize = (panel: 'left' | 'middle' | 'main', event: MouseEvent) => {
  resizing.value = panel
  startX = event.clientX
  startWidth = leftWidth.value
  document.addEventListener('mousemove', handleResize, { passive: false })
  document.addEventListener('mouseup', stopResize, { passive: false })
  event.preventDefault()
}

const handleResize = (event: MouseEvent) => {
  if (!resizing.value) return

  if (resizing.value === 'left') {
    const delta = event.clientX - startX
    const newWidth = startWidth + delta
    leftWidth.value = Math.max(300, Math.min(1200, newWidth))
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
  startX = 0
  startWidth = 0
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

  // 检查是否是审稿请求（关键词检测）
  const lowerQuestion = question.toLowerCase()
  const isReviewRequest = lowerQuestion.includes('审稿') ||
    lowerQuestion.includes('review') ||
    lowerQuestion.includes('评审') ||
    lowerQuestion.includes('生成审稿')

  // 如果是审稿请求，直接生成审稿意见
  if (isReviewRequest) {
    messages.value.push({ role: 'user', content: question })
    userInput.value = ''
    isLoading.value = true

    // 添加系统消息提示正在生成
    messages.value.push({
      role: 'assistant',
      content: '好的，我正在为您生成这篇论文的审稿意见，请稍候...'
    })

    try {
      const result = await api.generateReview(currentPaper.value)
      if (result && result.reply) {
        // 将生成的审稿意见填入审稿框
        reviewData.value.reviewMarkdown = result.reply
        // 更新聊天消息
        messages.value = messages.value.slice(0, -1) // 移除提示消息
        messages.value.push({
          role: 'assistant',
          content: '已为您生成审稿意见，已自动填入左侧审稿意见框。\n\n' + result.reply
        })
      }
    } catch (error) {
      messages.value = messages.value.slice(0, -1)
      messages.value.push({
        role: 'assistant',
        content: '抱歉，生成审稿意见时出现错误，请稍后重试。'
      })
    }

    isLoading.value = false
    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
    return
  }

  // 普通对话流程
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

    // 直接将回复填入审稿意见框
    if (response && response.reply) {
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

// 欢迎界面处理
const tryReview = () => {
  // 记住用户的选择，不再显示欢迎弹窗
  localStorage.setItem('review_welcome_shown', 'true')
  showWelcome.value = false
}

const laterReview = () => {
  // 关闭欢迎弹窗，显示期待加入的消息
  showWelcome.value = false
  showLaterMessage.value = true
  // 3秒后自动关闭
  setTimeout(() => {
    showLaterMessage.value = false
  }, 3000)
}
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
          <iframe v-if="currentPaper.pdfUrl" :src="currentPaper.pdfUrl" class="pdf-frame" :class="{ 'no-pointer': resizing }" title="论文PDF"></iframe>
          <div v-else class="no-pdf">
            <p>暂无PDF</p>
            <a v-if="currentPaper.arXivId" :href="`https://arxiv.org/abs/${currentPaper.arXivId}`" target="_blank" class="arxiv-link">
              在arXiv查看
            </a>
          </div>
        </div>
      </aside>

      <!-- 中间：拖动条 -->
      <div class="resize-handle" @mousedown="startResize('left', $event)"></div>

      <!-- 右侧：审稿结果 -->
      <aside class="panel-right">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">AI审稿分析</h3>
            <p class="panel-subtitle">OpenCLAW</p>
          </div>
        </div>

        <div class="panel-content">
          <!-- 论文基本信息 -->
          <div class="paper-info">
            <h4 class="paper-title">{{ currentPaper.title }}</h4>
            <div class="paper-tags">
              <span v-for="tag in currentPaper.keywords" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>

          <!-- 审稿意见 -->
          <div class="review-section">
            <div class="review-label">审稿意见 (Markdown)</div>
            <textarea
              v-model="reviewData.reviewMarkdown"
              :readonly="isCompleted"
              rows="20"
              class="review-textarea"
              :class="{ 'completed': isCompleted }"
              placeholder="点击下方按钮生成审稿意见，或在右侧栏对话中请求生成..."
            ></textarea>
          </div>

          <!-- 审稿结论选项 -->
          <div class="review-options">
            <div class="review-options-label">审稿结论</div>
            <div class="review-options-buttons">
              <button
                v-for="option in reviewOptions"
                :key="option.value"
                @click="!isCompleted && (reviewData.reviewResult = option.value)"
                :disabled="isCompleted"
                :class="['review-option-btn', option.value, { active: reviewData.reviewResult === option.value, disabled: isCompleted }]"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <button class="generate-btn" @click="loadReview" :disabled="isLoadingReview || isCompleted">
            {{ isLoadingReview ? '生成中...' : '生成审稿意见' }}
          </button>
          <button class="export-btn" :disabled="isCompleted">导出审稿意见</button>
          <button class="submit-btn" @click="handleSubmitReview" :disabled="isCompleted">提交审稿</button>
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
      <!-- 期待加入的消息 -->
      <div v-if="showLaterMessage" class="later-message">
        <div class="later-message-card">
          <div class="later-message-icon">👋</div>
          <p class="later-message-text">好的，期待您的加入</p>
        </div>
      </div>

      <!-- 欢迎界面和论文列表 -->
      <template v-if="showWelcome">
      <div class="welcome-container">
        <div class="welcome-card">
          <div class="welcome-icon">
            <svg class="w-16 h-16 mx-auto text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="welcome-title">欢迎使用论文审稿系统</h2>
          <p class="welcome-text">您已具有审稿资格，是否要尝试审稿，我可以为您推荐相关论文</p>
          <div class="welcome-actions">
            <button @click="tryReview"
                    class="try-review-btn">
              尝试审稿
            </button>
            <button @click="laterReview"
                    class="later-btn">
              下次再来
            </button>
          </div>
        </div>
      </div>
      </template>

      <!-- 论文列表界面 -->
      <template v-if="showPaperList">
      <!-- 中间：推荐论文列表 -->
      <main class="main-content" :style="{ width: mainWidth + 'px' }">
        <header class="main-header">
          <h2>推荐审稿论文</h2>
          <span class="header-subtitle">根据您的研究领域智能推送</span>
        </header>

        <!-- 没有推荐时显示中间推荐区域 -->
        <div v-if="recommendedPapers.length === 0" class="recommend-center">
          <div class="recommend-content">
            <div class="recommend-icon">📚</div>
            <h3>还没有为您推荐论文</h3>
            <p class="recommend-hint">和大模型聊天，推荐会更精准哦</p>
            <button
              @click="recommendPapers"
              :disabled="isRecommending"
              class="confirm-btn recommend-btn"
            >
              {{ isRecommending ? '推荐中...' : '推荐审稿' }}
            </button>
            <p v-if="isRecommending" class="recommend-tip">
              一大波论文正在赶来...
            </p>
          </div>
        </div>

        <!-- 有推荐论文时显示列表 -->
        <template v-else>
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
              @click="recommendPapers"
              :disabled="isRecommending"
              class="rerommend-btn"
            >
              {{ isRecommending ? '重新推荐中...' : '重新推荐' }}
            </button>
            <button
              @click="confirmReview"
              :disabled="selectedIds.length === 0"
              class="confirm-btn"
            >
              确认审稿 (已选 {{ selectedIds.length }})
            </button>
          </footer>
        </template>
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
            @click="enterReviewMode(paper, rightTab === 'completed')"
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
      </template>
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

/* 欢迎界面样式 */
.welcome-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.welcome-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 48px;
  max-width: 480px;
  text-align: center;
}

.welcome-icon {
  margin-bottom: 24px;
}

.welcome-icon svg {
  color: #10a37f;
}

.welcome-title {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.welcome-text {
  color: #6b7280;
  font-size: 16px;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.welcome-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.later-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.98);
  z-index: 100;
  width: 100%;
  height: 100%;
}

.later-message-card {
  text-align: center;
  padding: 32px 48px;
}

.later-message-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.later-message-text {
  font-size: 18px;
  color: #4b5563;
}

.try-review-btn {
  padding: 14px 32px;
  background: #10a37f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.try-review-btn:hover {
  background: #0d8a6d;
}

.later-btn {
  padding: 14px 32px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.later-btn:hover {
  background: #e5e7eb;
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

.recommend-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recommend-content {
  text-align: center;
  padding: 40px;
}

.recommend-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.recommend-content h3 {
  font-size: 20px;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.recommend-hint {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 24px 0;
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
  width: 100%;
}

.confirm-btn:hover:not(:disabled) {
  background: #3a8eef;
}

.confirm-btn:disabled {
  background: #444;
  cursor: not-allowed;
}

.recommend-btn {
  background: #7c3aed;
}

.recommend-btn:hover:not(:disabled) {
  background: #6d28d9;
}

.recommend-tip {
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  margin-top: 8px;
}

.rerommend-btn {
  padding: 10px 20px;
  background: #6b7280;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.rerommend-btn:hover:not(:disabled) {
  background: #4b5563;
}

.rerommend-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.main-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
}

.main-footer .confirm-btn {
  flex: 1;
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
  display: flex;
  flex-direction: column;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.pdf-frame.no-pointer {
  pointer-events: none;
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
  flex-shrink: 0;
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
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.review-label {
  color: #374151;
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.review-textarea {
  flex: 1;
  width: 100%;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #f5f7fa;
  color: #000;
  font-size: 14px;
  font-family: monospace;
  resize: none;
  line-height: 1.6;
  min-height: 200px;
}

.review-textarea:focus {
  outline: none;
  border-color: #4f6bff;
}

/* 审稿结论选项 */
.review-options {
  flex-shrink: 0;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin: 0 16px 16px 16px;
}

.review-options-label {
  color: #374151;
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 500;
}

.review-options-buttons {
  display: flex;
  gap: 8px;
}

.review-option-btn {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #6b7280;
}

.review-option-btn:hover:not(.disabled) {
  background: #f3f4f6;
}

.review-option-btn.active.accept {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.review-option-btn.active.minor {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.review-option-btn.active.major {
  background: #f97316;
  border-color: #f97316;
  color: #ffffff;
}

.review-option-btn.active.reject {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

.review-option-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.panel-footer {
  padding: 16px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  display: flex;
  gap: 12px;
}

.generate-btn,
.export-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.generate-btn {
  background: #4f46e5;
  border: none;
  color: #ffffff;
}

.generate-btn:hover:not(:disabled) {
  background: #4338ca;
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  width: 6px;
  background: #e5e7eb;
  cursor: col-resize;
  transition: background 0.2s;
  flex-shrink: 0;
  user-select: none;
}

.resize-handle:hover {
  background: #4f6bff;
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
