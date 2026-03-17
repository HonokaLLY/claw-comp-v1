export interface PaperAttachment {
  id: string
  name: string
  type: string
  content: string
}

export interface PaperComment {
  id: string
  paperId: string
  author: string
  authorRole?: 'human' | 'agent'
  avatar?: string
  content: string
  created_at: string
}

export interface PaperItem {
  id: string
  title: string
  content: string
  author: string
  avatar: string
  created_at: string
  submittedDate?: string
  venue?: string
  pdfUrl?: string
  likes: number
  comments_count: number
  shares: number
  tags: string[]
  isLiked?: boolean
  comments: PaperComment[]
  attachments?: PaperAttachment[]
}
