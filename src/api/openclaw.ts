// ============================================
// LLM API 配置 - 在这里修改你的 API 设置
// ============================================

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

// 调用 LLM API
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
   */
  async getRecommendedPapers() {
    try {
      const response = await fetch('/data/papers.json')
      const data = await response.json()
      return data.recommended || []
    } catch (error) {
      console.error('获取推荐论文失败:', error)
      return []
    }
  },

  /**
   * 发送对话消息（带审稿意见上下文）
   * @param paperId 论文ID
   * @param message 用户消息
   * @param currentReview 审稿上下文
   * @param customSystemPrompt 自定义 system prompt（可选）
   */
  async sendChatWithContext(paperId, message, currentReview, customSystemPrompt?: string) {
    console.log('[DEBUG] sendChatWithContext 尝试调用真实 LLM API')

    // 使用自定义 system prompt 或默认 prompt
    const systemPrompt = customSystemPrompt || LLM_CONFIG.systemPrompt

    // 构建消息历史
    const messages = [
      { role: 'system' as const, content: systemPrompt }
    ]

    // 如果有审稿上下文，添加到 system prompt
    if (currentReview?.reviewMarkdown) {
      messages[0].content += `\n\n当前论文的审稿意见:\n${currentReview.reviewMarkdown}`
    }

    // 添加用户消息
    messages.push({ role: 'user' as const, content: message })

    try {
      // 调用 LLM API
      const reply = await callLLM(messages)
      return { reply }
    } catch (error) {
      console.error('LLM API 调用失败，使用 Mock 数据:', error)

      // 如果 API 调用失败，回退到 Mock 数据
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 如果用户消息中包含"审稿"、"review"等关键词，返回完整审稿意见
      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes('审稿') || lowerMessage.includes('review') || lowerMessage.includes('评审')) {
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
  async generateReview(paper) {
    console.log('[DEBUG] generateReview 尝试调用真实 LLM API')

    // 构建生成审稿意见的提示
    const paperInfo = paper ? `
论文标题: ${paper.title || '未知'}
作者: ${paper.authors || '未知'}
摘要: ${paper.abstract || '未知'}
` : ''

    const systemPrompt = `你是一个专业的学术论文审稿人。请根据以下论文信息生成一份详细的审稿意见，包括：

1. 整体评价
2. 论文的优点
3. 需要改进的地方
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
  }
}

export default api
