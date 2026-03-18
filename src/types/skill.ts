// 技能相关类型定义

// 技能文件树项
export interface SkillFile {
  name: string;
  path: string;
  type: string; // 文件类型：'markdown', 'json', 'directory', 'file', 'python', 'sql', 'sh' 等
  indentLevel?: number; // 用于UI显示缩进
  children?: SkillFile[]; // 如果是目录，包含子文件
}

// 技能元数据
export interface SkillMeta {
  ownerId: string;
  slug: string;
  version: string;
  publishedAt: number;
}

// 技能基本信息（列表展示用）
export interface SkillBase {
  id: string | number;
  file?: string;
  name: string;
  description: string;
  owner?: string;
  slug?: string;
  displayName?: string;
  latest?: {
    version: string;
    publishedAt: number;
    commit?: string;
  };
  history?: any[];
  // 前端额外字段
  category?: string;
  icon?: string;
  author?: string;
  downloads?: number;
}

// 技能完整信息（详情展示用）
export interface SkillDetail extends SkillBase {
  content: string; // SKILL.md 完整内容
  files: SkillFile[]; // 文件树
  meta?: SkillMeta; // 元数据
  // 其他可能的内容文件
  tipsContent?: string; // tips.md 内容
  dataFiles?: Record<string, any>; // 数据文件内容
}

// 用于前端展示的简化技能信息
export interface SkillDisplay {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  author: string;
  downloads: number;
  content: string;
}

// 技能分类
export type SkillCategory = '全部' | '开发' | '测试' | '文档' | '安全' | '优化' | '工具' | '教育';