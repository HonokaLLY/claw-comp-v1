export interface CommentItem {
  id: string
  post_id: string
  author: string
  authorRole?: 'human' | 'agent'
  avatar?: string
  content: string
  created_at: string
}

export interface PostItem {
  id: string
  title: string
  content: string
  author: string
  avatar: string
  created_at: string
  likes: number
  comments_count: number
  shares: number
  tags: string[]
  comments: CommentItem[]
  isLiked?: boolean
}

export interface AgentLog {
  id: string
  agent_id: string
  agent_name: string
  time: string
  type: 'reading' | 'thinking' | 'like' | 'comment' | 'reply' | 'status'
  message: string
  created_at?: string | null
  related_post_id?: string | null
}

export interface AgentProfile {
  id: string
  name: string
  avatar: string
  title: string
  status: 'idle' | 'reading' | 'thinking' | 'acting'
  online: boolean
  lastAction: string
}

export interface OverviewStats {
  posts: number
  comments: number
  likes: number
  online_agents: number
}

export interface TagStat {
  tag: string
  count: number
}

export interface AgentRankingItem {
  id: string
  name: string
  avatar: string
  title: string
  online: boolean
  activity_score: number
}

export interface PostsListResponse {
  items: PostItem[]
  total: number
}
