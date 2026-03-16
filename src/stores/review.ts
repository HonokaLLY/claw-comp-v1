import { ref } from 'vue'

// 全局审稿状态
export const currentReviewPaper = ref<{
  id: number
  title: string
  keywords: string[]
  pdfUrl?: string
  arXivId?: string
} | null>(null)

export const reviewOpinion = ref('')

export const isGeneratingReview = ref(false)

// 是否在审稿详情界面（查看具体论文内容时）
export const isInReviewDetail = ref(false)

// 设置是否在审稿详情界面
export const setIsInReviewDetail = (value: boolean) => {
  isInReviewDetail.value = value
}

// 是否在审稿主界面（论文列表页面）
export const isInReviewMain = ref(true)

// 设置是否在审稿主界面
export const setIsInReviewMain = (value: boolean) => {
  isInReviewMain.value = value
}

// 触发推荐论文（用于从ChatPanel通知ReviewView执行推荐）
export const triggerRecommend = ref(0)

// 更新当前审稿论文
export const setCurrentReviewPaper = (paper: typeof currentReviewPaper.value) => {
  currentReviewPaper.value = paper
}

// 更新审稿意见
export const setReviewOpinion = (opinion: string) => {
  reviewOpinion.value = opinion
}

// 生成审稿意见
export const generateReviewOpinion = async () => {
  if (!currentReviewPaper.value) return null

  isGeneratingReview.value = true
  try {
    const result = await api.generateReview(currentReviewPaper.value)
    if (result && result.reply) {
      reviewOpinion.value = result.reply
      return result.reply
    }
  } catch (error) {
    console.error('生成审稿意见失败:', error)
  } finally {
    isGeneratingReview.value = false
  }
  return null
}

// 导入api（避免循环依赖）
import api from '@/api/openclaw'
