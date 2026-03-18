// ============================================
// LLM API 配置 - 在这里修改你的 API 设置
// ============================================

import { raw } from '@/data/papersMock'

interface Paper {
  id: number
  title: string
  authors?: string
  keywords: string[]
  abstract?: string
  pdfUrl?: string
  arXivId?: string
  venue?: string
  submittedDate?: string
  deadline?: string
  isDone?: boolean
}

// 可用模型列表
export const AVAILABLE_MODELS = [
  { id: 'gpt-5-nano', name: 'GPT-5 Nano' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
]

export const LLM_CONFIG = {
  // API 地址 (注意: 需要完整的 /chat/completions 路径)
  apiUrl: 'https://api.zhizengzeng.com/v1/chat/completions',

  // API Key
  apiKey: 'sk-zk2fe51e305741f42b5b0ece671436509bd69b629f5d7010',

  // 当前模型 - 修改这里切换模型
  // 可选: gpt-5-nano, gpt-5-mini
  model: 'gpt-5-nano',

  // 是否使用流式响应
  stream: false,

  // System prompt
  systemPrompt: '你是一个有帮助的AI助手。请用用户提问的语言回答用户的问题。'
}

// 切换模型的函数
export function setModel(modelId: string) {
  LLM_CONFIG.model = modelId
  console.log(`[LLM] 模型已切换为: ${modelId}`)
}

// ============================================
// 内部函数
// ============================================

// Mock 数据 - Markdown 格式的审稿意见
const MOCK_REVIEW_MARKDOWN = `## 整体评价

这篇论文探讨了大型语言模型（LLM）在同行评审中的应用，这是一个非常有意义的研究方向。作者通过分析超过10,000篇论文评审，展示了LLM在提高评审效率方面的潜力，同时指出了算法偏见这一重要问题。整体而言，论文工作量充足，实验设计合理，但存在一些需要改进的地方。

## 优点

1. **研究问题新颖**：将AI应用于学术同行评审是一个前沿且重要的研究方向
2. **数据量充足**：使用了超过10,000篇论文评审数据，具有统计意义
3. **实验设计严谨**：对比了LLM辅助评审与传统评审的效率差异
4. **发现了重要问题**：识别出LLM引入的写作风格和主题流行度偏见
5. **提出了缓解策略**：为后续研究提供了有价值的指导

## 需要改进的地方

1. **偏见评估不够全面**：只考虑了写作风格和主题流行度两个维度，未涉及其他可能的偏见来源
2. **缺乏消融实验**：没有分析不同模型大小对偏见程度的影响
3. **用户研究不足**：没有进行用户调查来验证评审者对AI辅助评审的接受度
4. **伦理讨论浅显**：关于AI评审的伦理问题着墨不多
5. **可复现性存疑**：部分实现细节未完全公开

## 具体问题

1. 模型选择依据是什么？为何选择这些特定模型？
2. 偏见评估的具体指标是什么？
3. 如何确保评估者之间的一致性？
4. 论文提及的缓解策略在实际应用中是否有效？
5. 实验数据的来源和预处理过程能否详细说明？
6. 该系统在实际部署中的计算成本是多少？`;

// 调用 LLM API（流式）
async function callLLMStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onChunk: (content: string) => void
): Promise<string> {
  console.log(`[LLM Stream] 正在使用模型: ${LLM_CONFIG.model}`)
  try {
    const response = await fetch(LLM_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: messages,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败 (${response.status}): ${errorText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              fullContent += delta
              onChunk(delta)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    console.log('[LLM Stream] 流式响应完成!')
    return fullContent
  } catch (error) {
    console.error('========== LLM 流式API调用失败 ==========')
    console.error('API URL:', LLM_CONFIG.apiUrl)
    console.error('API Model:', LLM_CONFIG.model)
    console.error('Error:', error)
    console.error('=========================================')
    throw error
  }
}

// 调用 LLM API（非流式）
async function callLLM(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string> {
  console.log(`[LLM] 正在使用模型: ${LLM_CONFIG.model}`)
  try {
    const response = await fetch(LLM_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: messages,
        stream: LLM_CONFIG.stream
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('[LLM] API 调用成功!')
    return data.choices[0]?.message?.content || '抱歉，我无法生成回复'
  } catch (error) {
    console.error('========== LLM API 调用失败 ==========')
    console.error('API URL:', LLM_CONFIG.apiUrl)
    console.error('API Model:', LLM_CONFIG.model)
    console.error('Error:', error)
    console.error('=========================================')
    throw error
  }
}

const api = {
  /**
   * 获取推荐论文列表
   * 初始返回空数组，用户点击"推荐审稿"按钮后由 recommendPapers() 更新
   */
  async getRecommendedPapers() {
    try {
      // 初始返回空数组，触发推荐后会通过 recommendPapers 更新
      return []
    } catch (error) {
      console.error('获取推荐论文失败:', error)
      return []
    }
  },

  /**
   * 获取所有论文列表
   */
  async getAllPapers() {
    try {
      // 从 raw 数组读取数据
      return raw
    } catch (error) {
      console.error('获取所有论文失败:', error)
      return []
    }
  },

  /**
   * 获取待审稿论文列表
   */
  async getPendingPapers() {
    try {
      // 从 raw 数组读取数据，返回待审稿论文（取中间部分作为待审稿）
      return raw.slice(5, 15)
    } catch (error) {
      console.error('获取待审稿论文失败:', error)
      return []
    }
  },

  /**
   * 获取已完成的论文列表
   */
  async getCompletedPapers() {
    try {
      // 从 raw 数组读取数据，返回已完成论文（取后部分作为已完成）
      return raw.slice(15, 20)
    } catch (error) {
      console.error('获取已完成论文失败:', error)
      return []
    }
  },

  /**
   * 发送聊天消息（用于论文推荐等）
   */
  async sendChatMessage(message: string) {
    console.log('[DEBUG] sendChatMessage 尝试调用真实 LLM API')

    const messages = [
      { role: 'system' as const, content: '你是一个友好的AI助手。请简洁地回答用户问题。' },
      { role: 'user' as const, content: message }
    ]

    try {
      const reply = await callLLM(messages)
      return { reply }
    } catch (error) {
      console.error('LLM API 调用失败:', error)
      return { reply: '抱歉，我现在无法处理您的请求。' }
    }
  },

  /**
   * 发送聊天消息（流式，用于论文推荐等）
   */
  async sendChatMessageStream(message: string, onChunk: (content: string) => void) {
    console.log('[DEBUG] sendChatMessageStream 流式调用 LLM API')

    const messages = [
      { role: 'system' as const, content: '你是一个友好的AI助手。请简洁地回答用户问题。' },
      { role: 'user' as const, content: message }
    ]

    try {
      const reply = await callLLMStream(messages, onChunk)
      return { reply }
    } catch (error) {
      console.error('LLM API 流式调用失败:', error)
      return { reply: '抱歉，我现在无法处理您的请求。' }
    }
  },

  /**
   * 发送对话消息（带审稿意见上下文）
   * @param paperId 论文ID
   * @param message 用户消息
   * @param currentReview 当前审稿信息
   * @param isOnReviewPage 是否在审稿页面
   * @param onChunk 流式回调，每收到一个 chunk 就调用一次
   * @param customSystemPrompt 自定义系统提示词（可选）
   */
  async sendChatWithContextStream(
    paperId: number,
    message: string,
    currentReview: { reviewMarkdown?: string } | null,
    isOnReviewPage: boolean = false,
    onChunk: (content: string) => void,
    customSystemPrompt?: string
  ): Promise<{ reply: string; isReview?: boolean }> {
    console.log('[DEBUG] sendChatWithContextStream 流式调用 LLM API')

    // 检查用户是否请求生成审稿意见（只在审稿页面生效）
    const lowerMessage = message.toLowerCase()
    const isReviewRequest = isOnReviewPage && (
      lowerMessage.includes('审稿') ||
      lowerMessage.includes('review') ||
      lowerMessage.includes('评审') ||
      lowerMessage.includes('生成审稿')
    )

    // 构建消息历史
    let systemContent = customSystemPrompt || LLM_CONFIG.systemPrompt

    // 如果是审稿请求，修改 system prompt 让 LLM 生成审稿意见
    if (isReviewRequest) {
      // 获取论文信息
      const allPapers = await this.getAllPapers()
      const paper = allPapers.find((p: Paper) => p.id === paperId)

      systemContent = `你是一个专业的学术论文审稿人。请根据以下论文信息生成一份详细的审稿意见，包括：
1. 整体评价
2. 论文优点
3. 论文缺点
4. 具体问题和建议
请用 Markdown 格式输出审稿意见。

论文标题: ${paper?.title || '未知'}
作者: ${paper?.authors || '未知'}
摘要: ${paper?.abstract || '未知'}`
    } else if (currentReview?.reviewMarkdown) {
      // 如果有审稿上下文，添加到 system prompt
      systemContent += `\n\n当前论文的审稿意见:\n${currentReview.reviewMarkdown}`
    }

    const messages: { role: 'system' | 'user'; content: string }[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: message }
    ]

    try {
      // 调用流式 LLM API
      const reply = await callLLMStream(messages, onChunk)

      // 如果是审稿请求，标记返回结果
      if (isReviewRequest) {
        return { reply, isReview: true }
      }
      return { reply }
    } catch (error) {
      console.error('LLM API 流式调用失败，使用 Mock 数据:', error)

      // 模拟网络延迟和流式输出
      const mockReply = isReviewRequest ? MOCK_REVIEW_MARKDOWN : '好的，我可以帮你分析这篇论文。请告诉我你想了解哪些方面，或者直接点击"生成审稿意见"获取完整的审稿报告。'

      // 模拟流式输出
      for (let i = 0; i < mockReply.length; i++) {
        onChunk(mockReply[i]!)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      if (isReviewRequest) {
        return { reply: mockReply, isReview: true }
      }
      return { reply: mockReply }
    }
  },

  /**
   * 发送对话消息（带审稿意见上下文）- 非流式版本
   * @param paperId 论文ID
   * @param message 用户消息
   * @param currentReview 当前审稿信息
   * @param isOnReviewPage 是否在审稿页面
   * @param customSystemPrompt 自定义系统提示词（可选）
   */
  async sendChatWithContext(
    paperId: number,
    message: string,
    currentReview: { reviewMarkdown?: string } | null,
    isOnReviewPage: boolean = false,
    customSystemPrompt?: string
  ): Promise<{ reply: string; isReview?: boolean }> {
    console.log('[DEBUG] sendChatWithContext 尝试调用真实 LLM API')

    // 检查用户是否请求生成审稿意见（只在审稿页面生效）
    const lowerMessage = message.toLowerCase()
    const isReviewRequest = isOnReviewPage && (
      lowerMessage.includes('审稿') ||
      lowerMessage.includes('review') ||
      lowerMessage.includes('评审') ||
      lowerMessage.includes('生成审稿')
    )

    // 构建消息历史
    let systemContent = customSystemPrompt || LLM_CONFIG.systemPrompt

    // 如果是审稿请求，修改 system prompt 让 LLM 生成审稿意见
    if (isReviewRequest) {
      // 获取论文信息
      const allPapers = await this.getAllPapers()
      const paper = allPapers.find((p: Paper) => p.id === paperId)

      systemContent = `你是一个专业的学术论文审稿人。请根据以下论文信息生成一份详细的审稿意见，包括：
1. 整体评价
2. 论文优点
3. 论文缺点
4. 具体问题和建议
请用 Markdown 格式输出审稿意见。

论文标题: ${paper?.title || '未知'}
作者: ${paper?.authors || '未知'}
摘要: ${paper?.abstract || '未知'}`
    } else if (currentReview?.reviewMarkdown) {
      // 如果有审稿上下文，添加到 system prompt
      systemContent += `\n\n当前论文的审稿意见:\n${currentReview.reviewMarkdown}`
    }

    const messages: { role: 'system' | 'user'; content: string }[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: message }
    ]

    try {
      // 调用 LLM API
      const reply = await callLLM(messages)

      // 如果是审稿请求，标记返回结果
      if (isReviewRequest) {
        return { reply, isReview: true }
      }
      return { reply }
    } catch (error) {
      console.error('LLM API 调用失败，使用 Mock 数据:', error)

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 如果用户消息中包含"审稿"、"review"等关键词，返回完整审稿意见
      if (isReviewRequest) {
        return {
          reply: MOCK_REVIEW_MARKDOWN,
          isReview: true
        }
      }

      // 否则返回普通对话回复
      return {
        reply: '好的，我可以帮你分析这篇论文。请告诉我你想了解哪些方面，或者直接点击"生成审稿意见"获取完整的审稿报告。'
      }
    }
  },

  /**
   * 生成论文审稿意见
   */
  async generateReview(paper: Paper): Promise<{ reply: string; isReview: boolean }> {
    console.log('[DEBUG] generateReview 尝试调用真实 LLM API')

    // 构建生成审稿意见的提示
    const paperInfo = paper ? `
论文标题: ${paper.title || '未知'}
作者: ${paper.authors || '未知'}
摘要: ${paper.abstract || '未知'}
` : ''

    const systemPrompt = `你是一个专业的学术论文审稿人。请根据以下论文信息生成一份详细的审稿意见，包括：

1. 整体评价
2. 论文优点
3. 论文缺点
4. 具体问题和建议

请用 Markdown 格式输出审稿意见。${paperInfo}`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: '请生成这篇论文的审稿意见。' }
    ]

    try {
      // 调用 LLM API
      const reply = await callLLM(messages)
      return { reply, isReview: true }
    } catch (error) {
      console.error('LLM API 调用失败，使用 Mock 数据:', error)

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1200))

      return {
        reply: MOCK_REVIEW_MARKDOWN,
        isReview: true
      }
    }
  },

  /**
   * 生成论文审稿意见（流式）
   */
  async generateReviewStream(
    paper: Paper,
    onChunk: (content: string) => void
  ): Promise<{ reply: string; isReview: boolean }> {
    console.log('[DEBUG] generateReviewStream 流式调用 LLM API')

    // 构建生成审稿意见的提示
    const paperInfo = paper ? `
论文标题: ${paper.title || '未知'}
作者: ${paper.authors || '未知'}
摘要: ${paper.abstract || '未知'}
` : ''

    const systemPrompt = `你是一个专业的学术论文审稿人。请根据以下论文信息生成一份详细的审稿意见，包括：

1. 整体评价
2. 论文优点
3. 论文缺点
4. 具体问题和建议

请用 Markdown 格式输出审稿意见。${paperInfo}`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: '请生成这篇论文的审稿意见。' }
    ]

    try {
      // 调用流式 LLM API
      const reply = await callLLMStream(messages, onChunk)
      return { reply, isReview: true }
    } catch (error) {
      console.error('LLM API 流式调用失败，使用 Mock 数据:', error)

      // 模拟流式输出
      const mockReply = MOCK_REVIEW_MARKDOWN
      for (let i = 0; i < mockReply.length; i++) {
        onChunk(mockReply[i]!)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      return {
        reply: mockReply,
        isReview: true
      }
    }
  }
}

export default api