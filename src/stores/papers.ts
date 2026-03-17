import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockPapers } from '@/data/papersMock'
import type { PaperItem, PaperAttachment, PaperComment } from '@/types/paper'

const STORAGE_KEY = 'papers_feed_v2'

const loadFromStorage = (): PaperItem[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as PaperItem[] : null
  } catch (error) {
    console.warn('[papers] 读取本地数据失败，将使用 mock 数据', error)
    return null
  }
}

export const usePapersStore = defineStore('papers', () => {
  const papers = ref<PaperItem[]>([])
  const loading = ref(false)

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(papers.value))
    } catch (error) {
      console.warn('[papers] 持久化失败', error)
    }
  }

  const bootstrap = async () => {
    loading.value = true
    const saved = loadFromStorage()
    papers.value = saved && saved.length ? saved : [...mockPapers]
    persist()
    loading.value = false
  }

  const findPaper = (paperId: string) => papers.value.find(p => p.id === paperId)

  const toggleLike = (paperId: string) => {
    const paper = findPaper(paperId)
    if (paper) {
      paper.isLiked = !paper.isLiked
      paper.likes += paper.isLiked ? 1 : -1
      if (paper.likes < 0) paper.likes = 0
      persist()
    }
  }

  const likeOnce = (paperId: string) => {
    const paper = findPaper(paperId)
    if (paper && !paper.isLiked) {
      paper.isLiked = true
      paper.likes += 1
      persist()
    }
  }

  const addComment = (
    paperId: string,
    content: string,
    meta?: {
      author?: string
      authorRole?: 'human' | 'agent'
      avatar?: string
      created_at?: string
    }
  ): PaperComment | null => {
    const paper = findPaper(paperId)
    if (!paper) return null

    const newComment: PaperComment = {
      id: `c${Date.now()}`,
      paperId,
      author: meta?.author || '你',
      authorRole: meta?.authorRole || 'human',
      avatar: meta?.avatar || 'https://i.pravatar.cc/40?img=8',
      content,
      created_at: meta?.created_at || '刚刚'
    }
    paper.comments.unshift(newComment)
    paper.comments_count += 1
    persist()
    return newComment
  }

  const publishPaper = (payload: {
    title: string
    content: string
    author?: string
    tags?: string[]
    attachments?: PaperAttachment[]
  }): PaperItem => {
    const paper: PaperItem = {
      id: `p${Date.now()}`,
      title: payload.title || '未命名论文',
      content: payload.content || '这是一篇新的论文摘要。',
      author: payload.author || '你',
      avatar: 'https://i.pravatar.cc/100?img=5',
      created_at: '刚刚',
      likes: 0,
      comments_count: 0,
      shares: 0,
      tags: payload.tags && payload.tags.length ? payload.tags : ['LLM'],
      isLiked: false,
      comments: [],
      attachments: payload.attachments && payload.attachments.length ? payload.attachments : undefined
    }
    papers.value.unshift(paper)
    persist()
    return paper
  }

  return {
    papers,
    loading,
    bootstrap,
    toggleLike,
    likeOnce,
    addComment,
    publishPaper
  }
})
