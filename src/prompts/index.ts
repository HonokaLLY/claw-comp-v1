// 统一导出所有模式
import { modeInfo as chatMode, systemPrompt as chatPrompt, processResponse as chatProcess } from './chat'
import { modeInfo as communityMode, systemPrompt as communityPrompt, processResponse as communityProcess } from './community'
import { modeInfo as skillsMode, systemPrompt as skillsPrompt, processResponse as skillsProcess, availableSkills } from './skills'
import { modeInfo as reviewMode, systemPrompt as reviewPrompt, processResponse as reviewProcess } from './review'
import { systemPrompt as selectorPromptValue, processResponse as selectorProcessValue } from './selector'

export type ModeType = 'chat' | 'community' | 'skills' | 'review'

export const modes = {
  chat: chatMode,
  community: communityMode,
  skills: skillsMode,
  review: reviewMode
}

export const systemPrompts: Record<ModeType, string> = {
  chat: chatPrompt,
  community: communityPrompt,
  skills: skillsPrompt,
  review: reviewPrompt
}

export const processResponses: Record<ModeType, (content: string) => any> = {
  chat: chatProcess,
  community: communityProcess,
  skills: skillsProcess,
  review: reviewProcess
}

// 模式选择器
export const selectorPrompt = selectorPromptValue
export const selectorProcess = selectorProcessValue

// 获取模式列表
export function getModeList() {
  return Object.values(modes)
}

// 根据 ID 获取模式信息
export function getModeById(id: ModeType) {
  return modes[id]
}

// 根据模式名称获取 ModeType
export function getModeType(modeName: string): ModeType {
  const name = modeName.toLowerCase()
  if (name.includes('community')) return 'community'
  if (name.includes('skill')) return 'skills'
  if (name.includes('review') || name.includes('审稿')) return 'review'
  return 'chat'
}

export { availableSkills }
