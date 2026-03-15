import { fileURLToPath, URL } from 'node:url'
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 支持的模式
const MODES = ['chat', 'community', 'skills', 'review']

// 获取模式对应的文件夹
function getModeDir(mode: string): string {
  return `./chat-history/${mode}`
}

// 确保模式文件夹存在
function ensureModeDirs() {
  MODES.forEach(mode => {
    const dir = getModeDir(mode)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  })
}

// 保存聊天记录到文件的 API 插件
const chatStoragePlugin = {
  name: 'chat-storage',
  configureServer(server) {
    // 初始化时创建文件夹
    ensureModeDirs()

    server.middlewares.use('/api/chat', async (req, res) => {
      // 设置 CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      // 解析 URL 获取模式和ID
      const url = req.url || '/'
      const urlParts = url.split('/').filter(Boolean)
      let mode = urlParts[0] || 'chat'
      const id = urlParts[1]

      // 处理 /list 路径
      if (id === 'list') {
        mode = urlParts[0] || 'chat'
      }

      // 验证模式
      if (!MODES.includes(mode)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid mode' }))
        return
      }

      const modeDir = getModeDir(mode)

      // 获取指定模式的所有聊天记录
      if (req.method === 'GET' && (!id || id === 'list')) {
        try {
          const files = readdirSync(modeDir).filter(f => f.endsWith('.json'))
          const chats = files.map(f => {
            const content = readFileSync(`${modeDir}/${f}`, 'utf-8')
            return JSON.parse(content)
          })
          // 按更新时间排序
          chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(chats))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
        return
      }

      // 保存聊天记录
      if (req.method === 'POST') {
        console.log('[API] POST 请求, mode:', mode, 'modeDir:', modeDir)
        let body = ''
        req.on('data', (chunk: string) => body += chunk)
        req.on('end', () => {
          try {
            const chat = JSON.parse(body)
            console.log('[API] 保存会话, id:', chat.id, 'mode:', mode)
            // 确保有 mode 字段
            chat.mode = mode
            const filename = `${modeDir}/${chat.id}.json`
            console.log('[API] 写入文件:', filename)
            writeFileSync(filename, JSON.stringify(chat, null, 2))
            console.log('[API] 保存成功')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            console.error('[API] 保存失败:', err)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        })
        return
      }

      // 删除聊天记录
      if (req.method === 'DELETE' && id) {
        try {
          const filename = `${modeDir}/${id}.json`
          if (existsSync(filename)) {
            unlinkSync(filename)
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
        return
      }
    })
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    chatStoragePlugin,
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
