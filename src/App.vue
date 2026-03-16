<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatPanel from './components/ChatPanel.vue'

const showRightPanel = ref(true)

const toggleChat = () => {
  showRightPanel.value = !showRightPanel.value
}

const closeRightPanel = () => {
  showRightPanel.value = false
}
</script>

<template>
  <div class="app-container">
    <Sidebar :chat-floating="showRightPanel" @toggle-chat="toggleChat" />
    <main class="main-content">
      <router-view />
    </main>
    <div v-if="showRightPanel" class="right-panel">
      <ChatPanel :is-floating="true" @close="closeRightPanel" />
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
  color: #1f2937;
}

.app-container {
  display: flex;
  height: 100%;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}

.right-panel {
  width: 360px;
  border-left: 1px solid rgba(231, 237, 245, 0.95);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
}
</style>
