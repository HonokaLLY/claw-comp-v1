<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

defineProps<{
  chatFloating?: boolean
}>()

const emit = defineEmits<{
  'toggle-chat': []
}>()

const menuItems = [
  { path: '/papers', name: '论文广场', icon: '📄' },
  { path: '/community', name: '社区', icon: '👥' },
  { path: '/skills', name: 'Skills', icon: '⚡' },
  { path: '/review', name: '审稿', icon: '📝' }
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <div class="sidebar-logo">
        <span>Claw</span>
      </div>
      <button
        class="chat-toggle-btn"
        :class="{ active: chatFloating }"
        @click="emit('toggle-chat')"
        title="切换 AI 对话"
      >
        <span class="toggle-icon">🦞</span>
        <span class="chatbot-label">chatbot</span>
      </button>
    </div>
    <nav class="sidebar-nav">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.name }}</span>
      </router-link>
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">我</div>
        <span class="user-name">用户</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(231, 237, 245, 0.95);
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.06);
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
}

.sidebar-logo {
  padding: 0;
  border-bottom: none;
}

.sidebar-logo span {
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.chat-toggle-btn {
  width: 80px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  font-size: 20px;
}

.chat-toggle-btn:hover {
  background: #f6f9ff;
  border-color: #4f6bff;
}

.chat-toggle-btn.active {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  border-color: #4f6bff;
}

.chatbot-label {
  font-size: 12px;
  color: #667085;
  font-weight: 500;
}

.chat-toggle-btn.active .chatbot-label {
  color: #fff;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  text-decoration: none;
  color: #667085;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: #f6f9ff;
  color: #4f6bff;
}

.nav-item.active {
  background: linear-gradient(135deg, #eef2ff 0%, #eef8ff 100%);
  color: #4f6bff;
  font-weight: 600;
  border: 1px solid #dfe6ff;
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
  flex: 1;
}

.toggle-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #f6f9ff;
  border-color: #4f6bff;
}

.toggle-btn.active {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  border-color: #4f6bff;
}

.toggle-icon {
  font-size: 14px;
  color: #667085;
}

.toggle-btn.active .toggle-icon {
  color: #fff;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.user-name {
  color: #344054;
  font-size: 14px;
  font-weight: 500;
}
</style>
