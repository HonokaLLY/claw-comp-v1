<script setup lang="ts">
import { ref } from 'vue'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
}

const messages = ref<Message[]>([
  { id: 1, role: 'assistant', content: '你好！我是AI助手，有什么可以帮助你的吗？', time: '10:00' }
])

const inputMessage = ref('')

const sendMessage = () => {
  if (!inputMessage.value.trim()) return

  const userMsg: Message = {
    id: Date.now(),
    role: 'user',
    content: inputMessage.value,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  messages.value.push(userMsg)

  // 模拟AI回复
  setTimeout(() => {
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '这是一个模拟回复，实际使用时可以接入真实的AI API。',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    messages.value.push(aiMsg)
  }, 500)

  inputMessage.value = ''
}
</script>

<template>
  <div class="chat-view">
    <div class="chat-header">
      <h2>AI 对话</h2>
    </div>
    <div class="chat-messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message"
        :class="{ 'message-user': msg.role === 'user', 'message-assistant': msg.role === 'assistant' }"
      >
        <div class="message-avatar">
          <span v-if="msg.role === 'user'">U</span>
          <span v-else>AI</span>
        </div>
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
          <div class="message-time">{{ msg.time }}</div>
        </div>
      </div>
    </div>
    <div class="chat-input">
      <input
        v-model="inputMessage"
        type="text"
        placeholder="输入消息..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.chat-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(231, 237, 245, 0.95);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
}

.chat-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 70%;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
}

.message-assistant .message-avatar {
  background: linear-gradient(135deg, #10a37f 0%, #1abc9c 100%);
  color: #fff;
}

.message-content {
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.06);
}

.message-user .message-content {
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
}

.message-text {
  color: #374151;
  line-height: 1.5;
}

.message-user .message-text {
  color: #fff;
}

.message-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.message-user .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.chat-input {
  padding: 20px;
  border-top: 1px solid rgba(231, 237, 245, 0.95);
  background: #ffffff;
  display: flex;
  gap: 12px;
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  color: #1f2937;
  font-size: 14px;
  transition: all 0.2s;
}

.chat-input input:focus {
  outline: none;
  border-color: #4f6bff;
  box-shadow: 0 0 0 3px rgba(79, 107, 255, 0.1);
  background: #ffffff;
}

.chat-input button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #5d78ff 0%, #4ba4ff 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.chat-input button:hover {
  box-shadow: 0 4px 12px rgba(79, 107, 255, 0.3);
}
</style>