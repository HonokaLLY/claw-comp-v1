import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockPapers } from '@/data/papersMock'
import type { PaperItem, PaperAttachment, PaperComment } from '@/types/paper'

const PAPERS_LIST_API = '/api/papers/list'
const PAPERS_SAVE_API = '/api/papers/save'

const normalizeAvatar = (avatar?: string, role?: 'human' | 'agent') => {
  if (avatar && /^(https?:|data:)/i.test(avatar)) return avatar
  if (role === 'agent') return 'https://i.pravatar.cc/40?img=12'
  return avatar || 'https://i.pravatar.cc/40?img=8'
}

const normalizePaper = (paper: PaperItem): PaperItem => {
  const fallbackTs = paper.submittedDate ? new Date(paper.submittedDate).getTime() : Date.now()
  return {
    ...paper,
    publishedAt: paper.publishedAt ?? fallbackTs,
    isUserCreated: paper.isUserCreated ?? false,
    comments: (paper.comments ?? []).map(comment => ({
      ...comment,
      avatar: normalizeAvatar(comment.avatar, comment.authorRole)
    })),
    tags: paper.tags ?? []
  }
}

export const usePapersStore = defineStore('papers', () => {
  const papers = ref<PaperItem[]>([])
  const loading = ref(false)

  const persist = async () => {
    try {
      await fetch(PAPERS_SAVE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: papers.value })
      })
    } catch (error) {
      console.warn('[papers] 保存 JSON 失败', error)
    }
  }

  const loadFromFile = async (): Promise<PaperItem[] | null> => {
    try {
      const res = await fetch(PAPERS_LIST_API)
      if (!res.ok) return null
      const data = await res.json()
      const items = (data?.items || []) as PaperItem[]
      return items.map(normalizePaper)
    } catch (error) {
      console.warn('[papers] 读取 JSON 失败', error)
      return null
    }
  }

  const bootstrap = async () => {
    loading.value = true
    const fromFile = await loadFromFile()
    if (fromFile && fromFile.length) {
      papers.value = fromFile
    } else {
      papers.value = mockPapers.map(normalizePaper)
      await persist()
    }
    loading.value = false
  }

  const findPaper = (paperId: string) => papers.value.find(p => p.id === paperId)

  const toggleLike = (paperId: string) => {
    const paper = findPaper(paperId)
    if (!paper) return
    paper.isLiked = !paper.isLiked
    paper.likes += paper.isLiked ? 1 : -1
    if (paper.likes < 0) paper.likes = 0
    void persist()
  }

  const likeOnce = (paperId: string) => {
    const paper = findPaper(paperId)
    if (!paper || paper.isLiked) return
    paper.isLiked = true
    paper.likes += 1
    void persist()
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
    void persist()
    return newComment
  }

  const publishPaper = (payload: {
    title: string
    content: string
    author?: string
    tags?: string[]
    attachments?: PaperAttachment[]
  }): PaperItem => {
    const now = Date.now()
    const paper: PaperItem = {
      id: `p${now}`,
      title: payload.title || '未命名论文',
      content: payload.content || '这是一篇新的论文摘要。',
      author: payload.author || '你',
      avatar: 'https://i.pravatar.cc/100?img=5',
      created_at: '刚刚',
      submittedDate: new Date(now).toISOString().slice(0, 10),
      publishedAt: now,
      isUserCreated: true,
      likes: 0,
      comments_count: 0,
      shares: 0,
      tags: payload.tags && payload.tags.length ? payload.tags : ['LLM'],
      isLiked: false,
      comments: [],
      attachments: payload.attachments && payload.attachments.length ? payload.attachments : undefined
    }
    papers.value.unshift(paper)
    void persist()
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
