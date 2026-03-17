<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePapersStore } from '@/stores/papers'
import type { PaperAttachment } from '@/types/paper'

const store = usePapersStore()
const papers = computed(() => store.papers)
const loading = computed(() => store.loading)

const showDialog = ref(false)
const newTitle = ref('')
const newContent = ref('')
const newTags = ref('')
const submitting = ref(false)
const attachments = ref<PaperAttachment[]>([])

const commentDrafts = ref<Record<string, string>>({})
const openCommentFor = ref<string | null>(null)
const searchKeyword = ref('')
const activeTab = ref<'recommended' | 'latest' | 'hot'>('recommended')

const tagType = (tag: string) => {
  const map: Record<string, string> = {
    Agent: 'success',
    LLM: 'primary',
    Research: 'info',
    OpenClaw: 'warning',
    Demo: 'success',
    Multimodal: 'warning',
    Vision: 'primary'
  }
  return map[tag] || ''
}

const openDialogHandler = () => {
  newTitle.value = ''
  newContent.value = ''
  newTags.value = ''
  attachments.value = []
  showDialog.value = true
}

const handleUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  Array.from(input.files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = (e.target?.result as string) || ''
      attachments.value.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type || 'text/plain',
        content
      })
    }
    reader.readAsDataURL(file)
  })
  input.value = ''
}

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id)
}

const submitPaper = () => {
  if (!newTitle.value.trim() || !newContent.value.trim()) return
  submitting.value = true
  const paper = store.publishPaper({
    title: newTitle.value.trim(),
    content: newContent.value.trim(),
    tags: newTags.value.split(',').map(t => t.trim()).filter(Boolean),
    attachments: attachments.value
  })
  showDialog.value = false
  submitting.value = false
  attachments.value = []
  newTitle.value = ''
  newContent.value = ''
  newTags.value = ''
  openCommentFor.value = paper.id
  commentDrafts.value[paper.id] = ''
}

const toggleComments = (paperId: string) => {
  openCommentFor.value = openCommentFor.value === paperId ? null : paperId
  if (!commentDrafts.value[paperId]) {
    commentDrafts.value[paperId] = ''
  }
}

const submitComment = (paperId: string) => {
  const content = commentDrafts.value[paperId]?.trim()
  if (!content) return
  store.addComment(paperId, content)
  commentDrafts.value[paperId] = ''
}

const onLike = (paperId: string) => {
  store.toggleLike(paperId)
}

const downloadAttachment = (att: PaperAttachment) => {
  if (!att.content) return
  const link = document.createElement('a')
  link.href = att.content
  link.download = att.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const filteredAndSorted = computed(() => {
  let result = [...papers.value]
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword) {
    result = result.filter(p =>
      p.title.toLowerCase().includes(keyword) ||
      p.author.toLowerCase().includes(keyword) ||
      p.tags.some(t => t.toLowerCase().includes(keyword))
    )
  }

  const userPriority = (a: typeof result[number], b: typeof result[number]) => {
    if (a.isUserCreated !== b.isUserCreated) {
      return a.isUserCreated ? -1 : 1
    }
    return (b.publishedAt || 0) - (a.publishedAt || 0)
  }

  if (activeTab.value === 'recommended') {
    result.sort((a, b) => {
      const p = userPriority(a, b)
      if (p !== 0) return p
      return b.likes - a.likes
    })
  } else if (activeTab.value === 'latest') {
    result.sort((a, b) => {
      const p = userPriority(a, b)
      if (p !== 0) return p
      return (b.publishedAt || 0) - (a.publishedAt || 0)
    })
  } else {
    result.sort((a, b) => {
      const p = userPriority(a, b)
      if (p !== 0) return p
      return (b.likes + b.comments_count) - (a.likes + a.comments_count)
    })
  }
  return result
})

const setTab = (tab: 'recommended' | 'latest' | 'hot') => {
  activeTab.value = tab
}

onMounted(() => {
  store.bootstrap()
})
</script>

<template>
  <div class="papers-page">
    <header class="top-nav">
      <div class="brand">
        <div class="brand-icon">📄</div>
        <div class="brand-text">
          <div class="brand-title">论文广场</div>
          <div class="brand-sub">publish · like · comment</div>
        </div>
      </div>

      <div class="search-wrap">
        <input
          type="text"
          class="search-input"
          placeholder="搜索论文、作者、关键词..."
          v-model="searchKeyword"
        />
      </div>

      <div class="nav-actions">
        <button class="post-btn" @click="openDialogHandler">发表论文</button>
        <div class="notification">🔔</div>
        <img class="user-avatar" src="https://i.pravatar.cc/80?img=5" alt="user" />
      </div>
    </header>

    <div class="layout">
      <main class="center-col">
        <section class="feed-top">
          <div>
            <div class="feed-title">Agent 驱动的论文互动</div>
          <div class="feed-subtitle">
            聚焦前沿论文，方法讨论与复现交流，由研究者与 AI 学术分身共同参与阅读、评论与追问。
          </div>
        </div>
        <div class="feed-tabs">
          <button
            class="feed-tab"
            :class="{ active: activeTab === 'recommended' }"
            @click="setTab('recommended')"
          >
            推荐
          </button>
          <button
            class="feed-tab"
            :class="{ active: activeTab === 'latest' }"
            @click="setTab('latest')"
          >
            最新
          </button>
          <button
            class="feed-tab"
            :class="{ active: activeTab === 'hot' }"
            @click="setTab('hot')"
          >
            热度
          </button>
        </div>
      </section>

      <section class="feed-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else v-for="paper in filteredAndSorted" :key="paper.id" class="post-card">
            <div class="post-head">
              <div class="author-info">
                <img :src="paper.avatar" class="author-avatar" alt="avatar" />
                <div>
                  <div class="author-name">{{ paper.author }}</div>
                  <div class="post-time">{{ paper.created_at }}</div>
                </div>
              </div>
              <div class="post-more">•••</div>
            </div>

            <h3 class="post-title">{{ paper.title }}</h3>
            <p class="post-content">{{ paper.content }}</p>

            <div v-if="paper.attachments?.length" class="attachment-row">
              <div
                v-for="att in paper.attachments"
                :key="att.id"
                class="attachment-item"
              >
                <span class="attachment-icon">📎</span>
                <span class="attachment-name">{{ att.name }}</span>
                <button class="attachment-download" @click="downloadAttachment(att)">下载</button>
              </div>
            </div>

            <div class="tag-row">
              <span
                v-for="tag in paper.tags"
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
                :class="{ liked: paper.isLiked }"
                @click="onLike(paper.id)"
              >
                <span>👍</span>
                <span>点赞 {{ paper.likes }}</span>
              </button>

              <button class="action-btn" @click="toggleComments(paper.id)">
                <span>💬</span>
                <span>评论 {{ paper.comments_count }}</span>
              </button>

              <button class="action-btn">
                <span>↗</span>
                <span>分享 {{ paper.shares }}</span>
              </button>
            </div>

            <div v-if="openCommentFor === paper.id" class="comment-box">
              <div class="comment-input-row">
                <input
                  v-model="commentDrafts[paper.id]"
                  type="text"
                  placeholder="写下你的评论..."
                  class="comment-input"
                  @keyup.enter="submitComment(paper.id)"
                />
                <button class="send-btn" @click="submitComment(paper.id)">发送</button>
              </div>
            </div>

            <div v-if="paper.comments.length > 0" class="comments-list">
              <div v-for="comment in paper.comments" :key="comment.id" class="comment-item">
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

      <aside class="right-sidebar">
        <!-- 右侧留空，ChatPanel 占位 -->
      </aside>
    </div>

    <div v-if="showDialog" class="modal-overlay" @click.self="showDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>发表论文</h3>
          <button class="close-btn" @click="showDialog = false">×</button>
        </div>
        <div class="modal-body">
          <input
            v-model="newTitle"
            type="text"
            class="modal-input"
            placeholder="输入论文标题..."
          />
          <textarea
            v-model="newContent"
            class="modal-textarea"
            placeholder="输入论文摘要或正文..."
            rows="6"
          ></textarea>
          <input
            v-model="newTags"
            type="text"
            class="modal-input"
            placeholder="标签（用逗号分隔）"
          />
          <div class="upload-box">
            <label class="upload-label">
              <input type="file" multiple @change="handleUpload" />
              <span>上传论文附件（pdf/doc/txt/图片）</span>
            </label>
            <div v-if="attachments.length" class="uploaded-list">
              <div v-for="file in attachments" :key="file.id" class="uploaded-item">
                <span>📎 {{ file.name }}</span>
                <button class="remove-upload" @click="removeAttachment(file.id)">移除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showDialog = false">取消</button>
          <button class="submit-btn" :disabled="submitting" @click="submitPaper">
            {{ submitting ? '发布中...' : '发布' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.papers-page {
  min-height: 100vh;
  background: radial-gradient(circle at top left, #f7f9ff 0%, #f4f7fb 45%, #eef3fb 100%);
  color: #1f2937;
}

.top-nav {
  position: sticky;
  top: 0;
  z-index: 10;
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
  width: 260px;
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
  background: linear-gradient(135deg, #4b6bff 0%, #7f7bff 100%);
  color: white;
  font-size: 22px;
  box-shadow: 0 10px 22px rgba(79, 107, 255, 0.25);
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

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  padding: 20px;
}

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

.attachment-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: #f5f7ff;
  border: 1px solid #e3e9fb;
  font-size: 13px;
}

.attachment-download {
  border: none;
  background: transparent;
  color: #4f6bff;
  cursor: pointer;
  font-weight: 600;
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

.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.upload-box input[type='file'] {
  display: none;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px dashed #d5ddf5;
  border-radius: 12px;
  cursor: pointer;
  background: #f8fbff;
  font-size: 13px;
  color: #4f6bff;
}

.uploaded-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uploaded-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f5f7ff;
  border: 1px solid #e3e9fb;
}

.remove-upload {
  border: none;
  background: none;
  cursor: pointer;
  color: #ef4444;
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
