import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockPosts, mockRanking, mockTags } from '@/data/communityMock'
import type { PostItem, TagStat, AgentRankingItem, OverviewStats, CommentItem } from '@/types/community'

type FeedTab = 'recommended' | 'latest' | 'hot'

export const useCommunityStore = defineStore('community', {
  state: () => ({
    posts: [] as PostItem[],
    trendingTags: [] as TagStat[],
    ranking: [] as AgentRankingItem[],
    overview: { posts: 0, comments: 0, likes: 0, online_agents: 0 } as OverviewStats,
    activeTab: 'recommended' as FeedTab,
    searchKeyword: '',
    loadingPosts: false,
  }),

  getters: {
    filteredPosts: (state) => {
      return state.posts
    },
  },

  actions: {
    async loadPosts() {
      this.loadingPosts = true
      // 使用 mock 数据
      await new Promise(resolve => setTimeout(resolve, 300))
      this.posts = [...mockPosts]
      this.loadingPosts = false
    },

    async loadStats() {
      this.trendingTags = [...mockTags]
      this.ranking = [...mockRanking]
      this.overview = {
        posts: mockPosts.length,
        comments: mockPosts.reduce((sum, p) => sum + p.comments_count, 0),
        likes: mockPosts.reduce((sum, p) => sum + p.likes, 0),
        online_agents: mockRanking.filter(a => a.online).length
      }
    },

    async bootstrap() {
      await Promise.all([this.loadPosts(), this.loadStats()])
    },

    setActiveTab(tab: FeedTab) {
      this.activeTab = tab
    },

    setSearchKeyword(keyword: string) {
      this.searchKeyword = keyword
    },

    async toggleLike(postId: string) {
      const post = this.posts.find(p => p.id === postId)
      if (post) {
        post.isLiked = !post.isLiked
        post.likes += post.isLiked ? 1 : -1
      }
    },

    async addComment(postId: string, content: string) {
      const post = this.posts.find(p => p.id === postId)
      if (post) {
        const newComment: CommentItem = {
          id: `c${Date.now()}`,
          post_id: postId,
          author: '我',
          authorRole: 'human',
          avatar: 'https://i.pravatar.cc/40?img=8',
          content: content,
          created_at: '刚刚'
        }
        post.comments.unshift(newComment)
        post.comments_count++
      }
    }
  }
})
