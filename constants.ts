
import { FileNode, ChatMessage } from './types';

// --- SYSTEM CONFIGURATION ---
// 填入你的 Supabase URL 和 Anon Key，实现自动连接
export const SUPABASE_CONFIG = {
  url: "https://iqgxbspghkactkupnsfn.supabase.co", 
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3hic3BnaGthY3RrdXBuc2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDA1OTYsImV4cCI6MjA3OTYxNjU5Nn0._MDp_OTINX3ffvBGY6z5SFwAH7J0CSAukNpRM5sjnxQ"
};

export const ADMIN_EMAILS = ['admin@speckit.com', 'developer@speckit.com', 'bond.wen@anker-in.com'];
export const GOOGLE_API_KEY_URL = "https://aistudio.google.com/app/apikey";

export const DEFAULT_CONSTITUTION = `# 智能硬件软件产品部 - 开发宪章 (Constitution)

## 1. 核心原则 (Core Principles)
- **Specification-Driven**: 所有代码开发必须始于明确、已评审的规格文档。
- **User-First**: 在技术决策中优先考虑最终用户体验。
- **Consistency**: 保持跨端(Web, App, PC)的业务逻辑与命名一致性。
`;

export const INITIAL_SYSTEM_FILES: FileNode[] = [
  {
    id: 'sys-root',
    name: 'System Config',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'sys-specify',
        name: '.specify',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'sys-charters',
            name: 'memory/charters',
            type: 'folder',
            isOpen: true, // Default open to show structure
            children: [
              // 1. Root Level Files (Department Core & Summary)
              { id: 'ch-core', name: '00_constitution-core.md', type: 'file', content: '# 核心宪章 (Department Core)\n\n1. 规格驱动开发: 禁止口头需求开发\n2. 用户体验优先: 性能指标需小于 100ms\n3. 持续集成: 每日构建必须通过' },
              { id: 'ch-summary', name: '99_constitution-summary.md', type: 'file', content: '# 宪章索引 (Summary)\n\n各部门开发规范总览...' },
              
              // 2. Product Folder (Global Product Rules)
              {
                id: 'ch-folder-product',
                name: 'Product',
                type: 'folder',
                isOpen: true,
                children: [
                    { id: 'ch-product', name: 'constitution-product.md', type: 'file', content: '# 产品宪章 (Department Product)\n\n- **用户价值**: 明确定义每个功能的用户价值。\n- **极度细化**: 功能清单必须拆解到原子级 (Atomic Units)。例如，"编辑功能"太笼统，应拆分为"选区"、"移动"、"旋转"、"参数调整"等。\n- **表格化**: 功能列表必须以表格形式呈现，明确优先级与涉及端。' },
                ]
              },

              // 3. Domain Folders (Tech Stacks)
              {
                id: 'ch-folder-web',
                name: 'Web',
                type: 'folder',
                isOpen: false,
                children: [
                    { id: 'ch-web', name: 'constitution-web.md', type: 'file', content: '# Web端宪章 (Domain Main)\n\n- 使用 TypeScript\n- 遵循 BEM 命名规范' },
                    { id: 'ch-web-payment', name: 'sub-payment-rules.md', type: 'file', content: '# Web支付业务规范 (Domain Sub)\n\n- 金额计算必须在后端进行\n- 前端仅负责展示格式化\n- 支付状态轮询间隔不小于3秒' },
                ]
              },
              {
                id: 'ch-folder-backend',
                name: 'Backend',
                type: 'folder',
                children: [
                    { id: 'ch-backend', name: 'constitution-backend.md', type: 'file', content: '# 后端宪章 (Domain Main)\n\n- 接口遵循 RESTful 标准\n- 强制单元测试覆盖率 > 80%' },
                ]
              },
              {
                id: 'ch-folder-app',
                name: 'App',
                type: 'folder',
                children: [
                    { id: 'ch-app', name: 'constitution-app.md', type: 'file', content: '# APP端宪章 (Domain Main)\n\n- Flutter 优先\n- 离线优先设计' },
                ]
              },
              {
                id: 'ch-folder-pc',
                name: 'PC',
                type: 'folder',
                children: [
                    { id: 'ch-pc', name: 'constitution-pc.md', type: 'file', content: '# PC端宪章 (Domain Main)\n\n- 跨平台兼容性\n- 内存管理规范' },
                ]
              },
              {
                id: 'ch-folder-firmware',
                name: 'Firmware',
                type: 'folder',
                children: [
                    { id: 'ch-firmware', name: 'constitution-firmware.md', type: 'file', content: '# 固件宪章 (Domain Main)\n\n- 实时性保障\n- OTA 升级安全规范' },
                ]
              },
              {
                id: 'ch-folder-ui',
                name: 'UI',
                type: 'folder',
                children: [
                    { id: 'ch-ui', name: 'constitution-ui.md', type: 'file', content: '# UI设计宪章 (Domain Main)\n\n- 统一设计语言\n- 交互一致性' },
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'sys-claude',
        name: '.claude',
        type: 'folder',
        isOpen: true,
        children: [
            {
                id: 'sys-commands',
                name: 'commands',
                type: 'folder',
                isOpen: true,
                children: [
                    { id: 'cmd-analyze', name: 'speckit.analyze.md', type: 'file', content: '# System Prompt: Analyze\n\nAnalyze consistency across documents.' },
                    { id: 'cmd-autotest', name: 'speckit.autotest.md', type: 'file', content: '# System Prompt: AutoTest\n\nGenerate automated test cases.' },
                    { id: 'cmd-checklist', name: 'speckit.checklist.md', type: 'file', content: '# System Prompt: Checklist\n\nVerify constitution compliance.' },
                    { id: 'cmd-clarify', name: 'speckit.clarify.md', type: 'file', content: '# System Prompt: Clarify\n\nAsk clarifying questions to the user.' },
                    { id: 'cmd-constitution', name: 'speckit.constitution.md', type: 'file', content: '# System Prompt: Constitution\n\nManage and update charters.' },
                    { id: 'cmd-implement', name: 'speckit.implement.md', type: 'file', content: '# System Prompt: Implement\n\nExecute code generation based on tasks.' },
                    { id: 'cmd-plan', name: 'speckit.plan.md', type: 'file', content: '# System Prompt: Plan\n\nCreate initial project plan.' },
                    { id: 'cmd-specify', name: 'speckit.specify.md', type: 'file', content: '# System Prompt: Specify\n\nGenerate core specification document.' },
                    { id: 'cmd-status', name: 'speckit.status.md', type: 'file', content: '# System Prompt: Status\n\nReport project progress.' },
                    { id: 'cmd-tasks', name: 'speckit.tasks.md', type: 'file', content: '# System Prompt: Tasks\n\nBreak down specs into tasks.' },
                    { id: 'cmd-issues', name: 'speckit.taskstoissues.md', type: 'file', content: '# System Prompt: TasksToIssues\n\nConvert tasks to Git issues.' },
                    { id: 'cmd-tech', name: 'speckit.techdetail.md', type: 'file', content: '# System Prompt: TechDetail\n\nGenerate technical design documents.' },
                ]
            }
        ]
      },
      {
        id: 'sys-scripts',
        name: 'scripts',
        type: 'folder',
        isOpen: true,
        children: [
            {
                id: 'sys-bash',
                name: 'bash',
                type: 'folder',
                isOpen: true,
                children: [
                    { id: 'sh-check', name: 'check-prerequisites.sh', type: 'file', content: '#!/bin/bash\n\n# Check system requirements' },
                    { id: 'sh-common', name: 'common.sh', type: 'file', content: '#!/bin/bash\n\n# Common utility functions' },
                    { id: 'sh-create', name: 'create-new-feature.sh', type: 'file', content: '#!/bin/bash\n\n# Scaffolding script' },
                    { id: 'sh-load', name: 'load-constitution.sh', type: 'file', content: '#!/bin/bash\n\n# Load charters into context' },
                    { id: 'sh-setup', name: 'setup-plan.sh', type: 'file', content: '#!/bin/bash\n\n# Setup project plan' },
                    { id: 'sh-update', name: 'update-agent-context.sh', type: 'file', content: '#!/bin/bash\n\n# Refresh AI context' },
                ]
            }
        ]
      },
      {
        id: 'sys-standards',
        name: 'standards',
        type: 'folder',
        isOpen: true,
        children: [
          { id: 'std-spec', name: 'requirement-writing-standards.md', type: 'file', content: '# 需求撰写标准 (Requirement Writing Standard)\n\n1. **明确性 (Clarity)**\n   - 避免使用"优化"、"提升"、"增强"等模糊词汇，必须使用可量化的指标或具体行为描述。\n   - ❌ "优化图片加载速度"\n   - ✅ "图片加载时间在 4G 网络下需小于 200ms"\n\n2. **原子性 (Atomicity)**\n   - 每个功能点必须是独立的、可测试的最小单元。\n   - 不要在一条描述中包含多个逻辑分支。\n\n3. **用户视角 (User-Centric)**\n   - 描述必须体现用户价值 (User Value)，即"作为[角色]，我想要[功能]，以便于[价值]"。\n\n4. **完备性 (Completeness)**\n   - 功能描述必须包含：触发条件、前置条件、交互逻辑和异常流程。' },
          { id: 'std-kb', name: 'knowledge-base-writing-standards.md', type: 'file', content: '# 知识库编写标准\n\n1. 结构化索引\n2. 标签分类规范...' },
          { id: 'std-md', name: 'markdown-format-standards.md', type: 'file', content: '# Markdown 格式标准\n\n1. 标题层级\n2. 代码块标记...' },
          { id: 'std-test', name: 'testing-acceptance-standards.md', type: 'file', content: '# 埋点设计标准\n\n1. 事件命名规范\n2. 参数定义...' },
          { id: 'std-test-table', name: 'test-acceptance-table-standards.md', type: 'file', content: '# 测试验收表标准\n\n## 1. 验收项格式\n- 必须包含：前置条件、操作步骤、预期结果\n- 优先级划分：P0 (Blocker), P1 (Critical), P2 (Major)' },
        ]
      },
      {
        id: 'sys-templates',
        name: 'templates',
        type: 'folder',
        isOpen: true,
        children: [
          // Requirements Template
          { id: 'tpl-spec', name: 'spec.md', type: 'file', content: `# 需求规格说明书

## 1. 概述 (Overview)
**需求摘要**: {{REQUIREMENT}}

## 2. 功能清单 (Function List)
| 模块名称 | 功能名称 | 功能描述 | 涉及端 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| 轮廓提取 | 功能入口 | 当用户进行拍照后在右侧面板出现"轮廓识别"按钮 | WEB | P0 |
| 轮廓提取 | 自动提取轮廓 | 拍照后自动分析图像，识别所有物体轮廓 | WEB, PC | P0 |
| 轮廓编辑 | 预览对比 | 提供原始识别结果和选择预览选择两个视图 | WEB | P0 |
| 轮廓编辑 | 智能选区 | 在原始视图内，鼠标hover状态可以高亮轮廓，点击加入列表 | WEB | P0 |

## 3. 功能详细设计 (Detailed Design)

### 3.1 [模块名称] - [功能名称]
- **触发条件 (Trigger)**: 用户点击...
- **前置条件 (Pre-condition)**: 
- **交互逻辑 (Logic Flow)**:
  1. 第一步...
  2. 第二步...
- **异常处理 (Exception)**: 
  - 若网络超时...

### 3.2 ...

---
> **Pending Generation (待补全)**:
> - 4. 数据埋点设计 (Data Tracking)
> - 5. 测试验收标准 (Acceptance Criteria)
> - 6. 词条与知识库 (Glossary & KB)
` },
          
          // Tech Detail Templates
          {
            id: 'tpl-tech',
            name: 'techdetail',
            type: 'folder',
            isOpen: true,
            children: [
              { id: 'tpl-tech-app', name: 'app-template.md', type: 'file', content: '# App技术方案模板\n\n## 架构设计 (Flutter)\n...' },
              { id: 'tpl-tech-be', name: 'backend-template.md', type: 'file', content: '# 后端技术方案模板\n\n## 接口设计 (NestJS)\n- API: POST /v1/resource\n\n## 数据库设计\n- Table: ...' },
              { id: 'tpl-tech-fw', name: 'firmware-template.md', type: 'file', content: '# 固件技术方案模板\n...' },
              { id: 'tpl-tech-int', name: 'integration-template.md', type: 'file', content: '# 跨端集成方案模板\n...' },
              { id: 'tpl-tech-ov', name: 'overview-template.md', type: 'file', content: '# 技术总览模板\n...' },
              { id: 'tpl-tech-pc', name: 'pc-template.md', type: 'file', content: '# PC技术方案模板\n...' },
              { id: 'tpl-tech-web', name: 'web-template.md', type: 'file', content: '# Web技术方案模板\n\n## 组件设计 (Vue3)\n...' },
            ]
          },
          
          // AutoTest Templates
          {
            id: 'tpl-auto',
            name: 'autotest',
            type: 'folder',
            isOpen: false,
            children: [
               { id: 'tpl-test-app', name: 'app-template.md', type: 'file', content: '# App自动化测试模板' },
               { id: 'tpl-test-be', name: 'backend-template.md', type: 'file', content: '# 后端自动化测试模板' },
               { id: 'tpl-test-fw', name: 'firmware-template.md', type: 'file', content: '# 固件自动化测试模板' },
               { id: 'tpl-test-int', name: 'integration-template.md', type: 'file', content: '# 集成测试模板' },
               { id: 'tpl-test-ov', name: 'overview-template.md', type: 'file', content: '# 测试总览模板' },
               { id: 'tpl-test-pc', name: 'pc-template.md', type: 'file', content: '# PC自动化测试模板' },
               { id: 'tpl-test-web', name: 'web-template.md', type: 'file', content: '# Web自动化测试模板' },
            ]
          }
        ]
      }
    ]
  }
];

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'specs',
    type: 'folder',
    isOpen: true,
    children: []
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    type: 'bot',
    content: '👋 你好！我是 SpecKit 智能助手。系统知识库已加载（包含最新的开发宪章、技术模板和标准指令）。',
    timestamp: Date.now()
  },
  {
    id: 'welcome-tips',
    type: 'bot',
    content: `### 💡 编写高质量需求的技巧
建议在描述需求时采用 **"角色 + 场景 + 价值"** 的结构，并尽可能指明 **平台**：

- **❌ 模糊的描述**：
  "做一个扫码功能。"

- **✅ 推荐的描述**：
  "为**仓库管理员 (角色)** 开发一个 **App端 (平台)** 的扫码入库功能，支持**连续扫描二维码 (场景)** 并自动校验库存数量，以防止录入错误 **(价值)**。"

---
您可以直接发送文字，或上传需求截图/草图，我们将开始第一轮需求澄清。`,
    timestamp: Date.now() + 100
  }
];
