import { fileURLToPath, URL } from 'node:url'
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 支持的模式
const MODES = ['chat', 'community', 'skills', 'review']
const PAPERS_FILE = './data/papers.json'

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

function ensurePapersFile() {
  const dir = './data'
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  if (!existsSync(PAPERS_FILE)) {
    writeFileSync(PAPERS_FILE, JSON.stringify({ items: [] }, null, 2))
  }
}

// 保存聊天记录到文件的 API 插件
const chatStoragePlugin = {
  name: 'chat-storage',
  configureServer(server) {
    // 初始化时创建文件夹
    ensureModeDirs()
    ensurePapersFile()

    server.middlewares.use('/api/papers', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      const url = req.url || '/'
      const action = url.split('/').filter(Boolean)[0] || 'list'

      if (req.method === 'GET' && action === 'list') {
        try {
          ensurePapersFile()
          const raw = readFileSync(PAPERS_FILE, 'utf-8')
          const json = JSON.parse(raw || '{}')
          const items = Array.isArray(json?.items) ? json.items : []
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ items }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
        return
      }

      if (req.method === 'POST' && action === 'save') {
        let body = ''
        req.on('data', (chunk: string) => body += chunk)
        req.on('end', () => {
          try {
            ensurePapersFile()
            const payload = JSON.parse(body || '{}')
            const items = Array.isArray(payload) ? payload : (payload.items || [])
            writeFileSync(PAPERS_FILE, JSON.stringify({ items }, null, 2))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        })
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not Found' }))
    })

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

    // 通用历史记录 API（不带模式前缀）
    server.middlewares.use('/api/chat-history', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      const url = req.url || '/'
      const urlParts = url.split('/').filter(Boolean)
      const action = urlParts[0]
      const sessionId = urlParts[1]

      const chatDir = './chat-history/chat'
      if (!existsSync(chatDir)) {
        mkdirSync(chatDir, { recursive: true })
      }

      // 获取历史记录列表
      if (req.method === 'GET' && action === 'list') {
        try {
          const files = readdirSync(chatDir).filter(f => f.endsWith('.json'))
          const chats = files.map(f => {
            const content = readFileSync(`${chatDir}/${f}`, 'utf-8')
            return JSON.parse(content)
          })
          chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(chats))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
        return
      }

      // 保存会话
      if (req.method === 'POST' && action === 'save') {
        let body = ''
        req.on('data', (chunk: string) => body += chunk)
        req.on('end', () => {
          try {
            const chat = JSON.parse(body)
            if (!chat.id) {
              chat.id = String(Date.now())
            }
            const filename = `${chatDir}/${chat.id}.json`
            writeFileSync(filename, JSON.stringify(chat, null, 2))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, id: chat.id }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        })
        return
      }

      // 删除会话
      if (req.method === 'DELETE' && action === 'delete' && sessionId) {
        try {
          const filename = `${chatDir}/${sessionId}.json`
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
  base: './',
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
