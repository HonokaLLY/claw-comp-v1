import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockSkills, skillChineseMap } from '@/data/skillsMock'
import type { SkillDetail, SkillDisplay, SkillFile } from '@/types/skill'

type SkillCategory = '全部' | '开发' | '测试' | '文档' | '安全' | '优化' | '工具' | '教育'

// 转换SkillDetail为前端展示格式
function transformSkillForDisplay(skill: SkillDetail): SkillDisplay {
  const displayName = skill.displayName || skill.name
  const chineseMapping = skillChineseMap[displayName] || skillChineseMap[displayName.replace('AI', '')] || skillChineseMap[displayName.replace('EduClaw ', '')]

  // 根据名称和描述推断分类
  const category = getDefaultCategory(chineseMapping?.name || displayName, skill.description)
  const icon = getDefaultIcon(category)

  return {
    id: Number(skill.id) || 0,
    name: chineseMapping?.name || displayName,
    description: chineseMapping?.description || skill.description,
    icon,
    category,
    author: skill.owner || '未知作者',
    downloads: skill.downloads || 0, // 使用技能数据中的下载量，默认为0
    content: skill.content || ''
  }
}

// 根据分类或名称获取默认图标
function getDefaultIcon(categoryOrName: string | undefined | null): string {
  if (!categoryOrName) return '⚡'

  const name = categoryOrName as string
  const iconMap: Record<string, string> = {
    '开发': '⚡',
    '测试': '🧪',
    '文档': '📄',
    '安全': '🔒',
    '优化': '🚀',
    '工具': '🔧',
    '教育': '🎓',
    'conatus': '🧠',
    'order': '🛒',
    'github': '🐙',
    'gog': '📧',
    'ontology': '🔗',
    'proactive-agent': '🚀',
    'summarize': '📝',
    'nano-pdf': '📄',
    'find-skills': '🔍',
    'curriculum': '📚',
    'learning': '🧠',
    'study': '📖',
    'school': '🏫',
    'tutor': '👨‍🏫',
    'quiz': '📝',
    'flashcard': '🔁',
    'medicine': '🏥',
    'coach': '👨‍🏫'
  }

  const searchString = name.toLowerCase()
  for (const [key, icon] of Object.entries(iconMap)) {
    if (searchString.includes(key.toLowerCase())) {
      return icon
    }
  }

  // 默认图标列表
  const defaultIcons = ['⚡', '🔍', '🐛', '🧪', '📄', '🔧', '🔒', '🌍', '💡', '🎯', '🚀', '🎓', '📚', '🧠', '📖', '🏫']
  const hash = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))
  return defaultIcons[hash % defaultIcons.length]!
}

// 根据名称和描述推断分类
function getDefaultCategory(name: string, description: string): SkillCategory {
  const categoryPatterns: Record<string, string[]> = {
    '开发': ['代码', '编程', '开发', 'bug', 'fix', 'review', 'refactor', 'github', 'conatus', 'proactive-agent', 'ontology'],
    '测试': ['测试', 'test', '验证', 'qa', 'quality', '覆盖率', 'unit test'],
    '文档': ['文档', 'document', 'readme', 'markdown', '注释', '注释', 'api', '生成文档'],
    '安全': ['安全', 'security', '漏洞', '攻击', '防护', '加密', '解密', '密码', '安全', '隐私'],
    '优化': ['优化', '性能', '性能优化', '提速', '加速', 'cache', '缓存', '压缩', '优化', '瓶颈'],
    '工具': ['工具', 'utility', '辅助', '辅助工具', '辅助功能', '小工具', '小功能', '快捷', '快捷方式'],
    '教育': ['教育', '学习', '学习', 'study', 'school', '教学', '课程', '教程', '学习计划', '学习', '课程', '教学', '导师', '教练', 'tutor', 'coach', '导师', 'quiz', '闪卡', 'flashcard', '闪卡', 'quizlet', 'quiz', '测试', '考试', '学习', 'learning', 'curriculum', '课程', '计划', 'ielts', '雅思', 'toefl', '托福', 'gre', 'gmat', '考试', '备考']
  }

  const searchString = (name + ' ' + description).toLowerCase()
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      if (searchString.includes(pattern.toLowerCase())) {
        return category as SkillCategory
      }
    }
  }

  return '教育' // 默认分类
}

export const useSkillsStore = defineStore('skills', () => {
  // 原始技能数据
  const skillsData = ref<SkillDetail[]>(mockSkills)

  // 前端展示格式的技能列表
  const skillsDisplay = computed(() =>
    skillsData.value.map(transformSkillForDisplay)
  )

  // 加载状态
  const loading = ref(false)

  // 当前选中的分类
  const selectedCategory = ref<SkillCategory>('全部')

  // 搜索关键词
  const searchKeyword = ref('')

  // 分类列表
  const categories = ref<SkillCategory[]>(['全部', '开发', '测试', '文档', '安全', '优化', '工具', '教育'])

  // 过滤后的技能列表
  const filteredSkills = computed(() => {
    let result = skillsDisplay.value

    // 按分类过滤
    if (selectedCategory.value !== '全部') {
      result = result.filter(skill => skill.category === selectedCategory.value)
    }

    // 按关键词搜索
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase().trim()
      result = result.filter(skill =>
        skill.name.toLowerCase().includes(keyword) ||
        skill.description.toLowerCase().includes(keyword) ||
        skill.author.toLowerCase().includes(keyword)
      )
    }

    return result
  })

  // 根据ID获取技能详情
  const getSkillById = (id: string | number) => {
    const skill = skillsData.value.find(s => String(s.id) === String(id))
    if (!skill) return null

    return {
      ...skill,
      displayInfo: transformSkillForDisplay(skill)
    }
  }

  // 获取技能的文件列表
  const getSkillFiles = (id: string | number) => {
    const skill = skillsData.value.find(s => String(s.id) === String(id))
    if (!skill) return []

    // 如果skill中有files字段，直接返回
    if (skill.files && skill.files.length > 0) {
      return skill.files
    }

    // 否则返回默认文件列表
    return [
      { name: 'SKILL.md', path: 'SKILL.md', type: 'markdown' as const },
      { name: 'README.md', path: 'README.md', type: 'markdown' as const }
    ]
  }

  // 获取技能的文件内容
  const getSkillFileContent = (id: string | number, filePath: string) => {
    const skill = skillsData.value.find(s => String(s.id) === String(id))
    if (!skill) return null

    // 根据文件路径返回内容
    if (filePath === 'SKILL.md' || filePath.endsWith('/SKILL.md')) {
      return skill.content
    }

    if (filePath === 'tips.md' || filePath.endsWith('/tips.md')) {
      return (skill as any).tipsContent || ''
    }

    // 从dataFiles中查找内容
    if (skill.dataFiles && skill.dataFiles[filePath]) {
      return skill.dataFiles[filePath]
    }

    // 根据文件名动态生成内容
    const fileName = filePath.split('/').pop() || ''

    // 处理常见的元数据文件
    if (fileName === '_meta.json' || filePath.endsWith('/_meta.json')) {
      return generateMetaJson(skill)
    }

    if (fileName === 'README.md' || filePath.endsWith('/README.md')) {
      return generateReadmeMd(skill)
    }

    if (fileName === 'README-CN.md' || filePath.endsWith('/README-CN.md')) {
      return generateReadmeCnMd(skill)
    }

    if (fileName === 'CHANGELOG.md' || filePath.endsWith('/CHANGELOG.md')) {
      return generateChangelogMd(skill)
    }

    // 处理其他JSON文件
    if (filePath.endsWith('.json')) {
      return generateDefaultJson(skill, fileName)
    }

    // 处理其他Markdown文件
    if (filePath.endsWith('.md')) {
      return generateDefaultMarkdown(skill, fileName)
    }

    // 处理SQL文件
    if (filePath.endsWith('.sql')) {
      return generateSqlSchema(skill, fileName)
    }

    // 处理Python文件
    if (filePath.endsWith('.py')) {
      return generatePythonFile(skill, fileName)
    }

    // 处理Shell脚本文件
    if (filePath.endsWith('.sh') || filePath.endsWith('.bash')) {
      return generateShellScript(skill, fileName)
    }

    // 处理YAML/YML文件
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return generateYamlFile(skill, fileName)
    }

    // 处理文本文件
    if (filePath.endsWith('.txt') || filePath.endsWith('.text')) {
      return generateTextFile(skill, fileName)
    }

    // 其他类型文件返回空内容
    return `# ${fileName}\n\n这是 ${skill.displayName || skill.name} 的 ${fileName} 文件。\n\n此文件内容为动态生成。`
  }

  // 辅助函数：生成_meta.json内容
  function generateMetaJson(skill: SkillDetail): string {
    const metaData = {
      id: skill.id,
      name: skill.name,
      displayName: skill.displayName || skill.name,
      description: skill.description,
      owner: skill.owner || 'unknown',
      slug: skill.slug || skill.name,
      version: skill.latest?.version || '1.0.0',
      publishedAt: skill.latest?.publishedAt || Date.now(),
      category: (skill as any).category || 'education',
      icon: (skill as any).icon || '⚡',
      downloads: skill.downloads || 0,
      files: skill.files?.map(f => ({
        name: f.name,
        type: f.type,
        path: f.path
      })) || [],
      meta: skill.meta || {
        ownerId: skill.owner || 'unknown',
        slug: skill.slug || skill.name,
        version: skill.latest?.version || '1.0.0',
        publishedAt: skill.latest?.publishedAt || Date.now()
      }
    }
    return JSON.stringify(metaData, null, 2)
  }

  // 辅助函数：生成README.md内容
  function generateReadmeMd(skill: SkillDetail): string {
    const displayName = skill.displayName || skill.name
    const description = skill.description
    const owner = skill.owner || 'Unknown Author'
    const version = skill.latest?.version || '1.0.0'
    const publishedDate = skill.latest?.publishedAt
      ? new Date(skill.latest.publishedAt).toISOString().split('T')[0]
      : 'Unknown'

    return `# ${displayName}

${description}

## Overview

This skill is designed to help with various tasks related to ${displayName.toLowerCase()}.

## Installation

\`\`\`bash
# Install the skill
clawhub install ${skill.owner || 'unknown'}/${skill.slug || skill.name}
\`\`\`

## Usage

Once installed, you can use this skill by:

1. Activating it through the skill manager
2. Running specific commands it provides
3. Integrating it into your workflow

## Features

- Feature 1: Description of feature
- Feature 2: Description of feature
- Feature 3: Description of feature

## Requirements

- OpenClaw environment
- Required dependencies (if any)

## License

This skill is provided under the standard OpenClaw skill license.

## Author

${owner}

## Version

${version} (Published: ${publishedDate})
`
  }

  // 辅助函数：生成README-CN.md内容
  function generateReadmeCnMd(skill: SkillDetail): string {
    const displayName = skill.displayName || skill.name
    const description = skill.description
    const owner = skill.owner || '未知作者'
    const version = skill.latest?.version || '1.0.0'
    const publishedDate = skill.latest?.publishedAt
      ? new Date(skill.latest.publishedAt).toISOString().split('T')[0]
      : '未知'

    return `# ${displayName}

${description}

## 概述

此技能旨在帮助处理与${displayName.toLowerCase()}相关的各种任务。

## 安装

\`\`\`bash
# 安装此技能
clawhub install ${skill.owner || 'unknown'}/${skill.slug || skill.name}
\`\`\`

## 使用方法

安装后，您可以通过以下方式使用此技能：

1. 通过技能管理器激活
2. 运行其提供的特定命令
3. 将其集成到您的工作流中

## 功能特性

- 功能1：功能描述
- 功能2：功能描述
- 功能3：功能描述

## 系统要求

- OpenClaw环境
- 必需的依赖项（如果有）

## 许可证

此技能遵循标准OpenClaw技能许可证。

## 作者

${owner}

## 版本

${version} (发布日期: ${publishedDate})
`
  }

  // 辅助函数：生成CHANGELOG.md内容
  function generateChangelogMd(skill: SkillDetail): string {
    const displayName = skill.displayName || skill.name
    const version = skill.latest?.version || '1.0.0'
    const publishedDate = skill.latest?.publishedAt
      ? new Date(skill.latest.publishedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    return `# ${displayName} - Changelog

All notable changes to this skill will be documented in this file.

## [${version}] - ${publishedDate}

### Added
- Initial release of ${displayName}
- Basic functionality
- Documentation

### Changed
- N/A

### Fixed
- N/A

## Previous Versions

No previous versions available. This is the initial release.
`
  }

  // 辅助函数：生成默认JSON内容
  function generateDefaultJson(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name

    const jsonData = {
      skill: {
        id: skill.id,
        name: skill.name,
        displayName: displayName,
        description: skill.description,
        version: skill.latest?.version || '1.0.0',
        fileName: fileName
      },
      metadata: {
        generated: true,
        timestamp: new Date().toISOString(),
        source: 'dynamic-generation'
      }
    }

    return JSON.stringify(jsonData, null, 2)
  }

  // 辅助函数：生成默认Markdown内容
  function generateDefaultMarkdown(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name

    return `# ${fileName}

This file is part of the **${displayName}** skill.

## File Information

- **Skill**: ${displayName}
- **Description**: ${skill.description}
- **File**: ${fileName}
- **Generated**: ${new Date().toISOString()}

## Content

This is a dynamically generated file for the ${displayName} skill.

For more information about this skill, please refer to the main documentation.

## Notes

- This content is automatically generated
- Actual file may vary based on skill implementation
- Check the skill repository for the latest version
`
  }

  // 辅助函数：生成SQL模式文件
  function generateSqlSchema(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name
    const skillName = skill.name
    const category = (skill as any).category || 'education'

    // 根据技能类别生成不同的SQL模式
    let sqlSchema = `-- SQL Schema for ${displayName}
-- Generated: ${new Date().toISOString()}
-- Skill: ${skillName}
-- Category: ${category}

`

    // 教育类技能
    if (category === 'education' || skillName.includes('education') || skillName.includes('study') ||
        skillName.includes('tutor') || skillName.includes('ielts') || skillName.includes('learning')) {
      sqlSchema += `-- Create tables for educational application
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_hours INTEGER,
    difficulty_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    enrollment_date DATE NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    completed BOOLEAN DEFAULT FALSE,
    UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    assessment_date DATE NOT NULL,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) DEFAULT 100.0,
    assessment_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id),
    session_date DATE NOT NULL,
    duration_minutes INTEGER,
    topics_studied TEXT,
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_assessments_student ON assessments(student_id);
CREATE INDEX idx_study_sessions_student ON study_sessions(student_id);
`
    } else if (category === '开发' || skillName.includes('code') || skillName.includes('programming') ||
               skillName.includes('git') || skillName.includes('development')) {
      // 开发类技能
      sqlSchema += `-- Create tables for development tracking
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500),
    technology_stack TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 3,
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS code_snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    filename VARCHAR(200),
    language VARCHAR(50),
    content TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    dependency_name VARCHAR(200) NOT NULL,
    version VARCHAR(50),
    type VARCHAR(20) DEFAULT 'library'
);
`
    } else {
      // 通用SQL模式
      sqlSchema += `-- Create basic tables for ${displayName}
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT
);

-- Insert default settings
INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES
('app_name', '${displayName}', 'Application name'),
('version', '${skill.latest?.version || '1.0.0'}', 'Application version');
`
    }

    sqlSchema += `\n-- End of SQL schema for ${displayName}`
    return sqlSchema
  }

  // 辅助函数：生成Python文件内容
  function generatePythonFile(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name
    const skillName = skill.name

    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
${fileName} - Generated for ${displayName} skill

Description: ${skill.description}

Generated: ${new Date().toISOString()}
"""

import os
import sys
import json
from typing import Any, Dict, List, Optional

def main():
    """Main function for ${displayName} skill."""
    print(f"Running {fileName} for {displayName}")
    print(f"Skill description: {skill.description}")

    # Add your implementation here
    print("Skill implementation goes here...")

    return 0

if __name__ == "__main__":
    sys.exit(main())
`
  }

  // 辅助函数：生成Shell脚本内容
  function generateShellScript(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name

    return `#!/bin/bash
# ${fileName} - Shell script for ${displayName} skill
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# Description: ${skill.description}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="${displayName}"
SKILL_DESC="${skill.description}"

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

log_info() {
    echo -e "\${BLUE}[INFO]\${NC} \$1"
}

log_success() {
    echo -e "\${GREEN}[SUCCESS]\${NC} \$1"
}

log_warning() {
    echo -e "\${YELLOW}[WARNING]\${NC} \$1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

show_help() {
    echo "Usage: ./${fileName} [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help message"
    echo "  -v, --version   Show version information"
    echo "  --install       Install ${displayName} dependencies"
    echo "  --test         Run tests for ${displayName}"
    echo ""
    echo "This script is part of the ${displayName} skill."
}

show_version() {
    echo "${displayName} - ${fileName}"
    echo "Version: ${skill.latest?.version || '1.0.0'}"
    echo "Description: ${skill.description}"
}

install_dependencies() {
    log_info "Installing dependencies for ${displayName}..."
    # Add installation commands here
    log_success "Dependencies installed successfully"
}

run_tests() {
    log_info "Running tests for ${displayName}..."
    # Add test commands here
    log_success "Tests completed successfully"
}

main() {
    case "\${1:-}" in
        -h|--help)
            show_help
            ;;
        -v|--version)
            show_version
            ;;
        --install)
            install_dependencies
            ;;
        --test)
            run_tests
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

main "\$@"
`
  }

  // 辅助函数：生成YAML文件内容
  function generateYamlFile(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name
    const skillName = skill.name

    return `# ${fileName} - YAML configuration for ${displayName} skill
# Generated: ${new Date().toISOString()}
# Description: ${skill.description}

skill:
  name: ${skillName}
  display_name: ${displayName}
  description: ${skill.description}
  version: ${skill.latest?.version || '1.0.0'}
  author: ${skill.owner || 'unknown'}
  category: ${(skill as any).category || 'education'}

configuration:
  settings:
    debug: false
    log_level: "info"
    max_retries: 3
    timeout_seconds: 30

  database:
    driver: "sqlite"
    filename: "${skillName}.db"
    create_tables: true

  api:
    enabled: true
    host: "localhost"
    port: 8080
    cors_origins:
      - "http://localhost:3000"

  features:
    enabled_features:
      - "authentication"
      - "logging"
      - "caching"
    disabled_features: []

dependencies:
  required:
    - name: "python"
      version: ">=3.8"
    - name: "node"
      version: ">=16"

  optional:
    - name: "redis"
      version: ">=6.0"
      description: "For caching"

  skill_dependencies:
    - name: "web-search"
      version: ">=1.0.0"
    - name: "file-management"
      version: ">=2.0.0"

metadata:
  generated: true
  timestamp: ${new Date().toISOString()}
  source: "dynamic-generation"
`
  }

  // 辅助函数：生成文本文件内容
  function generateTextFile(skill: SkillDetail, fileName: string): string {
    const displayName = skill.displayName || skill.name

    return `================================================================================
${fileName} - Text file for ${displayName} skill
================================================================================

Generated: ${new Date().toISOString()}
Skill: ${displayName}
Description: ${skill.description}
Author: ${skill.owner || 'Unknown'}
Version: ${skill.latest?.version || '1.0.0'}
Category: ${(skill as any).category || 'education'}

================================================================================
FILE INFORMATION
================================================================================

This is a dynamically generated text file for the ${displayName} skill.

The ${displayName} skill provides functionality related to:
${skill.description}

================================================================================
USAGE NOTES
================================================================================

1. This file is automatically generated and should not be edited manually.
2. Actual file content may vary in production environment.
3. Refer to the main documentation for complete usage instructions.
4. Check the skill repository for updates and bug fixes.

================================================================================
CONTACT & SUPPORT
================================================================================

For issues or questions related to this skill, please refer to:
- The skill documentation
- The OpenClaw community forums
- The skill repository (if available)

================================================================================
END OF FILE
================================================================================
`
  }

  // 初始化加载
  const bootstrap = async () => {
    loading.value = true
    // 这里可以添加异步加载逻辑，如果需要的话
    loading.value = false
  }

  // 设置当前分类
  const setCategory = (category: SkillCategory) => {
    selectedCategory.value = category
  }

  // 设置搜索关键词
  const setSearchKeyword = (keyword: string) => {
    searchKeyword.value = keyword
  }

  // 添加新技能
  const addSkill = (skillData: {
    name: string
    description: string
    icon: string
    category: string
    content: string
    author?: string
  }) => {
    const newId = Math.max(...skillsData.value.map(s => Number(s.id)), 0) + 1
    const newSkill: SkillDetail = {
      id: String(newId),
      file: 'SKILL.md',
      name: skillData.name.toLowerCase().replace(/\s+/g, '-'),
      description: skillData.description,
      owner: skillData.author || '我',
      slug: skillData.name.toLowerCase().replace(/\s+/g, '-'),
      displayName: skillData.name,
      latest: {
        version: '1.0.0',
        publishedAt: Date.now(),
        commit: ''
      },
      history: [],
      content: skillData.content,
      files: [
        { name: 'SKILL.md', path: 'SKILL.md', type: 'markdown' as const }
      ],
      category: skillData.category,
      icon: skillData.icon,
      downloads: 0
    }
    skillsData.value.unshift(newSkill)
  }

  // 增加技能下载量
  const incrementDownloads = (id: string | number) => {
    const skill = skillsData.value.find(s => String(s.id) === String(id))
    if (skill) {
      skill.downloads = (skill.downloads || 0) + 1
    }
  }

  return {
    // 状态
    skills: filteredSkills,
    categories,
    selectedCategory,
    searchKeyword,
    loading,

    // 原始数据
    skillsData,

    // 方法
    bootstrap,
    setCategory,
    setSearchKeyword,
    getSkillById,
    getSkillFiles,
    getSkillFileContent,
    addSkill,
    incrementDownloads
  }
})