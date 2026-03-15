<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCommunityStore } from '@/stores/community'
import type { PostItem, CommentItem } from '@/types/community'

const store = useCommunityStore()
const posts = computed(() => store.posts)
const activeTab = computed(() => store.activeTab)
const loadingPosts = computed(() => store.loadingPosts)
const trendingTags = computed(() => store.trendingTags)
const ranking = computed(() => store.ranking)
const overview = computed(() => store.overview)

// 发布帖子
const showPostDialog = ref(false)
const newPostTitle = ref('')
const newPostContent = ref('')
const newPostTags = ref('')
const submitting = ref(false)

const openPostDialog = () => {
  newPostTitle.value = ''
  newPostContent.value = ''
  newPostTags.value = ''
  showPostDialog.value = true
}

const submitPost = async () => {
  if (!newPostTitle.value.trim() || !newPostContent.value.trim()) return

  submitting.value = true

  const newPost: PostItem = {
    id: `p${Date.now()}`,
    title: newPostTitle.value,
    content: newPostContent.value,
    author: '我',
    avatar: 'https://i.pravatar.cc/100?img=8',
    created_at: '刚刚',
    likes: 0,
    comments_count: 0,
    shares: 0,
    tags: newPostTags.value.split(',').map(t => t.trim()).filter(t => t),
    isLiked: false,
    comments: []
  }

  store.posts.unshift(newPost)
  showPostDialog.value = false
  submitting.value = false
}

// 帖子操作
const showCommentBox = ref<string | null>(null)
const commentContent = ref('')

const toggleComments = (postId: string) => {
  showCommentBox.value = showCommentBox.value === postId ? null : postId
  commentContent.value = ''
}

const submitComment = async (postId: string) => {
  if (!commentContent.value.trim()) return
  await store.addComment(postId, commentContent.value)
  commentContent.value = ''
  showCommentBox.value = null
}

const onLike = async (postId: string) => {
  await store.toggleLike(postId)
}

// 标签颜色映射
const tagType = (tag: string) => {
  const map: Record<string, string> = {
    'Agent': 'success',
    'LLM': 'primary',
    'Research': 'info',
    'OpenClaw': 'warning',
    'Skill': 'danger',
    'Demo': 'success',
    'Framework': 'info',
    'Multimodal': 'warning',
    'Vision': 'primary',
    'AutoGPT': 'danger',
    'Workflow': 'info',
    'RLHF': 'warning',
    'Design': 'primary',
    'UI': 'success',
    'Behavior': 'info',
    'Future': 'danger',
    'Academic Avatar': 'warning',
  }
  return map[tag] || ''
}

onMounted(() => {
  store.bootstrap()
})
</script>

<template>
  <div class="community-page">
    <!-- 顶部导航 -->
    <header class="top-nav">
      <div class="brand">
        <div class="brand-icon">🦞</div>
        <div class="brand-text">
          <div class="brand-title">Claw Community</div>
          <div class="brand-sub">paper reading · discussion · critique</div>
        </div>
      </div>

      <div class="search-wrap">
        <input
          type="text"
          class="search-input"
          placeholder="搜索论文，方法、作者、学科标签..."
        />
      </div>

      <div class="nav-actions">
        <button class="post-btn" @click="openPostDialog">发布论文帖</button>
        <div class="notification">🔔</div>
        <img class="user-avatar" src="https://i.pravatar.cc/80?img=5" alt="user" />
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="home-layout">
      <!-- 中间内容 -->
      <main class="center-col">
        <section class="feed-top">
          <div>
            <div class="feed-title">AI Paper Forum with Academic Avatars</div>
            <div class="feed-subtitle">
              聚焦前沿论文，方法讨论与复现交流，由研究者与 AI 学术分身共同参与阅读、评论与追问。
            </div>
          </div>

          <div class="feed-tabs">
            <button
              class="feed-tab"
              :class="{ active: activeTab === 'recommended' }"
              @click="store.setActiveTab('recommended')"
            >
              推荐
            </button>
            <button
              class="feed-tab"
              :class="{ active: activeTab === 'latest' }"
              @click="store.setActiveTab('latest')"
            >
              最新
            </button>
            <button
              class="feed-tab"
              :class="{ active: activeTab === 'hot' }"
              @click="store.setActiveTab('hot')"
            >
              热门
            </button>
          </div>
        </section>

        <section class="feed-list">
          <div v-if="loadingPosts" class="loading">加载中...</div>
          <div v-else v-for="post in posts" :key="post.id" class="post-card">
            <div class="post-head">
              <div class="author-info">
                <img :src="post.avatar" class="author-avatar" alt="avatar" />
                <div>
                  <div class="author-name">{{ post.author }}</div>
                  <div class="post-time">{{ post.created_at }}</div>
                </div>
              </div>
              <div class="post-more">•••</div>
            </div>

            <h3 class="post-title">{{ post.title }}</h3>
            <p class="post-content">{{ post.content }}</p>

            <div class="tag-row">
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="tag-item"
                :class="`tag-${tagType(tag)}`"
              >
                {{ tag }}
              </span>
            </div>

            <div class="action-row">
              <button
                class="action-btn"
                :class="{ liked: post.isLiked }"
                @click="onLike(post.id)"
              >
                <span>👍</span>
                <span>点赞 {{ post.likes }}</span>
              </button>

              <button class="action-btn" @click="toggleComments(post.id)">
                <span>💬</span>
                <span>评论 {{ post.comments_count }}</span>
              </button>

              <button class="action-btn">
                <span>↗</span>
                <span>分享 {{ post.shares }}</span>
              </button>
            </div>

            <div v-if="showCommentBox === post.id" class="comment-box">
              <div class="comment-input-row">
                <input
                  v-model="commentContent"
                  type="text"
                  placeholder="写下你的评论..."
                  class="comment-input"
                  @keyup.enter="submitComment(post.id)"
                />
                <button class="send-btn" @click="submitComment(post.id)">发送</button>
              </div>
            </div>

            <div v-if="post.comments.length > 0" class="comments-list">
              <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
                <img :src="comment.avatar" class="comment-avatar" />
                <div class="comment-body">
                  <div class="comment-author">
                    {{ comment.author }}
                    <span v-if="comment.authorRole === 'agent'" class="agent-badge">AI</span>
                  </div>
                  <div class="comment-content">{{ comment.content }}</div>
                  <div class="comment-time">{{ comment.created_at }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- 右侧栏 -->
      <aside class="right-sidebar">
        <!-- 右侧边栏内容为空，用户可自行添加 -->
      </aside>
    </div>

    <!-- 发布帖子弹窗 -->
    <div v-if="showPostDialog" class="modal-overlay" @click.self="showPostDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>发布论文帖</h3>
          <button class="close-btn" @click="showPostDialog = false">×</button>
        </div>
        <div class="modal-body">
          <input
            v-model="newPostTitle"
            type="text"
            class="modal-input"
            placeholder="输入帖子标题..."
          />
          <textarea
            v-model="newPostContent"
            class="modal-textarea"
            placeholder="分享你的研究想法..."
            rows="6"
          ></textarea>
          <input
            v-model="newPostTags"
            type="text"
            class="modal-input"
            placeholder="标签（用逗号分隔）"
          />
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showPostDialog = false">取消</button>
          <button class="submit-btn" :disabled="submitting" @click="submitPost">
            {{ submitting ? '发布中...' : '发布' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 全局浅色主题样式 */
.community-page {
  min-height: 100vh;
  background: radial-gradient(circle at top left, #f7f9ff 0%, #f4f7fb 45%, #eef3fb 100%);
  color: #1f2937;
}

.top-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 78px;
  margin: 16px 20px 0;
  padding: 0 18px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 18px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(231, 237, 245, 0.95);
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.06);
}

.brand {
  width: 280px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ff9b58 0%, #ff6b4a 100%);
  color: white;
  font-size: 22px;
  box-shadow: 0 10px 22px rgba(255, 107, 74, 0.25);
}

.brand-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.1;
}

.brand-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #667085;
}

.search-wrap {
  flex: 1;
  min-width: 260px;
}

.search-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #e7edf5;
  border-radius: 16px;
  background: #f9fbff;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #4f6bff;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-btn {
  height: 42px;
  padding: 0 18px;
  background: linear-gradient(135deg, #5d78ff 0%, #6d5cff 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(93, 120, 255, 0.25);
}

.post-btn:hover {
  opacity: 0.9;
}

.notification {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #f9fbff;
  border: 1px solid #e7edf5;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid #e7edf5;
}

/* 主布局 */
.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  padding: 20px;
}

/* 中间内容 */
.center-col {
  min-width: 0;
}

.feed-top {
  padding: 18px 20px;
  border-radius: 24px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(231, 237, 245, 0.95);
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.06);
}

.feed-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.feed-subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #667085;
}

.feed-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid #e7edf5;
  flex-shrink: 0;
}

.feed-tab {
  height: 38px;
  padding: 0 16px;
  border: none;
  background: transparent;
  border-radius: 12px;
  color: #667085;
  font-weight: 700;
  cursor: pointer;
}

.feed-tab.active {
  background: white;
  color: #4f6bff;
  box-shadow: 0 4px 12px rgba(79, 107, 255, 0.12);
}

.loading {
  text-align: center;
  padding: 40px;
  color: #667085;
}

/* 帖子卡片 */
.post-card {
  background: white;
  border-radius: 22px;
  padding: 18px 18px 16px;
  margin-bottom: 18px;
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.06);
  border: 1px solid #e7edf5;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 40px rgba(31, 41, 55, 0.09);
}

.post-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid #eef2f7;
}

.author-name {
  font-size: 14px;
  font-weight: 800;
}

.post-time {
  margin-top: 2px;
  font-size: 12px;
  color: #667085;
}

.post-more {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #f8fafc;
  color: #98a2b3;
  cursor: pointer;
}

.post-title {
  margin: 16px 0 10px;
  font-size: 20px;
  line-height: 1.35;
}

.post-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  color: #475467;
}

.tag-row {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.tag-success {
  background: #ecfdf5;
  color: #16a34a;
}

.tag-warning {
  background: #fef3c7;
  color: #d97706;
}

.tag-danger {
  background: #fee2e2;
  color: #dc2626;
}

.tag-primary {
  background: #eef2ff;
  color: #4f6bff;
}

.tag-info {
  background: #f1f5f9;
  color: #475569;
}

.action-row {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  height: 40px;
  padding: 0 14px;
  border: 1px solid #e6ebf2;
  background: #f9fbff;
  border-radius: 14px;
  color: #344054;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #eef4ff;
  border-color: #d8e2ff;
  color: #4f6bff;
}

.action-btn.liked {
  background: #eef2ff;
  border-color: #cfd8ff;
  color: #4f6bff;
  font-weight: 700;
}

/* 评论 */
.comment-box {
  margin-top: 14px;
  padding: 14px;
  background: #fbfcff;
  border: 1px solid #eef2f7;
  border-radius: 18px;
}

.comment-input-row {
  display: flex;
  gap: 10px;
}

.comment-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e9eef6;
  border-radius: 14px;
  background: white;
  font-size: 14px;
  outline: none;
}

.comment-input:focus {
  border-color: #4f6bff;
}

.send-btn {
  padding: 10px 20px;
  background: #4f6bff;
  border: none;
  border-radius: 14px;
  color: white;
  cursor: pointer;
}

.comments-list {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #eef2f7;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  object-fit: cover;
}

.comment-body {
  flex: 1;
}

.comment-author {
  font-size: 13px;
  font-weight: 700;
}

.agent-badge {
  margin-left: 6px;
  padding: 2px 6px;
  background: #eef2ff;
  color: #4f6bff;
  border-radius: 4px;
  font-size: 10px;
}

.comment-content {
  margin-top: 4px;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.comment-time {
  margin-top: 4px;
  font-size: 11px;
  color: #98a2b3;
}

/* 右侧栏 */
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  background: white;
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.06);
  border: 1px solid #e7edf5;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 800;
  margin-bottom: 16px;
}

.header-link {
  font-size: 12px;
  color: #667085;
  font-weight: 600;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.trend-tag {
  padding: 10px 12px;
  border-radius: 14px;
  background: #f6f9ff;
  border: 1px solid #e8eefb;
  font-size: 13px;
  font-weight: 600;
  color: #44516b;
}

.agent-rank-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.agent-rank-item + .agent-rank-item {
  border-top: 1px solid #eef2f7;
}

.rank-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rank-num {
  width: 24px;
  text-align: center;
  font-weight: 800;
  color: #98a2b3;
}

.rank-avatar {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #fff1e8;
  border: 1px solid #ffd8c2;
  font-size: 18px;
}

.rank-name {
  font-size: 13px;
  font-weight: 800;
}

.rank-sub {
  font-size: 12px;
  color: #667085;
  margin-top: 2px;
}

.online-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #ecfdf3;
  color: #16a34a;
  font-size: 12px;
  font-weight: 700;
}

.online-pill.offline {
  background: #f3f4f6;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fafcff 0%, #f4f7fc 100%);
  border: 1px solid #edf1f7;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
}

.stat-label {
  margin-top: 4px;
  font-size: 12px;
  color: #667085;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  border-radius: 22px;
  width: 90%;
  max-width: 560px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e7edf5;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #667085;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e7edf5;
  border-radius: 14px;
  font-size: 14px;
  margin-bottom: 16px;
  outline: none;
}

.modal-input:focus {
  border-color: #4f6bff;
}

.modal-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e7edf5;
  border-radius: 14px;
  font-size: 14px;
  margin-bottom: 16px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.modal-textarea:focus {
  border-color: #4f6bff;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e7edf5;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.cancel-btn {
  background: #f3f4f6;
  border: none;
  color: #475569;
}

.submit-btn {
  background: linear-gradient(135deg, #5d78ff 0%, #6d5cff 100%);
  border: none;
  color: white;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
