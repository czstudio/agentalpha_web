# AgentAlpha 内容网站信息架构 v1

## 1. 产品定位

AgentAlpha 不是文章堆，也不是单纯的课程落地页，而是一个“Agent 学习路线 + 工程专题 + 面试题库 + 项目档案 + 原创内容”的技术编辑部。

核心任务只有三个：

1. 让新用户知道从哪里开始学。
2. 让有经验的工程师能快速定位某个问题、题目或项目实践。
3. 让每一篇内容都有来源、上下文、下一步和可复用的结构。

## 2. 顶层导航

```text
首页 /
├── 学习路线 /learn
│   ├── Agent 路线 /learn/agent
│   ├── LLM 基础 /learn/llm
│   ├── RAG 与 Memory /learn/rag-memory
│   ├── Code Agent /learn/code-agent
│   └── Deep Research /learn/deep-research
├── 面试题库 /interview
│   ├── 怎么使用 /interview/guide
│   ├── LLM 基础 /interview/llm
│   ├── RAG 检索增强 /interview/rag
│   ├── 模型训练 /interview/training
│   ├── Agent 架构 /interview/agent
│   ├── 多智能体 /interview/multi-agent
│   ├── 工具调用与 MCP /interview/tools
│   ├── 评测与安全 /interview/evaluation
│   ├── 编程题 /interview/coding
│   ├── 项目深挖 /interview/projects
│   ├── 公司题库 /interview/company/[company]
│   └── 真实面经 /interview/stories
├── 专题笔记 /notes
│   ├── 专题总览 /notes
│   ├── 专题目录 /notes/[series]
│   └── 文章 /notes/[series]/[slug]
├── 项目档案 /projects
│   ├── 项目总览 /projects
│   └── 项目详情 /projects/[slug]
├── 公众号 /articles
│   ├── 原创文章 /articles
│   ├── 文章详情 /articles/[slug]
│   └── 主题归档 /articles/tag/[tag]
├── 社区与训练营 /community
└── 关于 AgentAlpha /about
```

首页只负责分流，不承载所有正文：展示一句定位、三条入口（开始学习 / 查面试题 / 看真实项目）、当前专题、最新原创和项目证据。

## 3. 四种内容层级

### L0：入口页

回答“我该从哪里开始”。必须有适合人群、前置知识、预计路径、推荐第一篇和继续学习按钮。

### L1：专题页

回答“这个方向完整要学什么”。采用小林 Coding 式专题化长文结构：导读、知识地图、章节列表、学习顺序、常见误区、延伸阅读和更新记录。

### L2：章节/文章页

回答“这个问题到底怎么理解和落地”。固定结构：

```text
结论先行
→ 为什么重要
→ 核心概念
→ 最小例子
→ 工程实现
→ 常见失败
→ 面试怎么问
→ 延伸阅读
→ 上一篇 / 下一篇
```

### L3：题目与证据

题目不是孤立问答，而是可筛选的知识单元：题目、短答、展开答案、关联文章、关联项目、难度、适用岗位、来源和更新时间。

## 4. 三条核心用户路径

### 路径 A：零基础学习

首页 → 学习路线 → 阶段页 → 章节文章 → 小练习/项目 → 面试复盘。

### 路径 B：面试冲刺

首页 → 面试题库 → 使用说明 → 按岗位/主题筛选 → 题目详情 → 关联专题文章 → 真实面经。

### 路径 C：工程查阅

搜索/标签 → 文章或项目 → 代码/架构图 → 失败案例 → 相关题目和下一步。

## 5. 面试题库组织方式

借鉴 KamaCoder 与 Programmercarl 的“先说明怎么用，再按主题分层”，同时吸收 GitHub 面试库的模块化：

- 第一屏固定“怎么用这一页”：按目标岗位、复习时间和基础选择入口。
- 一级分类按能力域，不按零散关键词堆叠。
- 每个分类有题量、推荐顺序、难度和关联专题。
- 题目支持 `topic`、`level`、`role`、`company`、`source`、`status` 标签。
- 公司题库是视图，不复制题目正文；同一题只保留一个 canonical ID。
- 真实面经单独归档，标注时间、岗位、公司和可信来源。

首批分类：LLM 基础、RAG、训练与微调、Agent 架构、多智能体、工具调用/MCP、评测与安全、Code Agent、多模态、项目深挖、编程题、软实力。

## 6. 学习路线组织方式

借鉴 Onefly 的路线感，但不做单一线性目录：

- `foundation`：Python、Transformer、LLM 基础。
- `retrieval`：RAG、Memory、评测。
- `agent`：单 Agent、工具调用、规划、反思。
- `systems`：多智能体、Graph、Harness、观测与治理。
- `research`：Deep Research、Agentic RL、高效推理。
- `shipping`：Code Agent、部署、成本、可靠性和产品化。

每个节点包含：前置节点、完成标准、推荐文章、练习项目、关联面试题。用户可以从任意节点进入，但页面要明确“推荐顺序”和“跳过的代价”。

## 7. 专题文章模板

专题目录页采用“编辑部目录 + 学习路线”双栏：左侧章节树，右侧当前卷/章节简介、预计阅读时间、难度和产出。

文章页固定提供：

- 面包屑和所属专题。
- 文章导读、目录、阅读进度。
- 关键结论摘要。
- 代码、架构图、流程图和真实截图的图注。
- “这篇解决什么问题 / 不解决什么问题”。
- 面试追问区：基础问法、工程追问、反例追问。
- 关联题目、项目、公众号原文和 Feishu 来源。
- 上一篇、下一篇、继续学习入口。

专题文章执行 `docs/article-quality-standard.md`：结论先行、真实场景开场、6–8 个递进章节、工程材料（代码/图/表）、面试迁移、行动清单与相关内容。短笔记和快讯可使用轻量模板，但必须标注文章级别，不以放大字号或堆图片替代信息密度。

## 8. 公众号内容结构

公众号文章不直接混入专题正文，先进入“原创文章”内容类型，再通过标签和 canonical 关系挂到专题：

```text
原始文章（raw）
→ Markdown 快照（normalized）
→ 人工确认标题/摘要/标签/配图来源
→ 发布文章页（published）
→ 关联专题、题目、项目
```

文章页保留原始发布时间、原文链接、作者/来源和图片版权备注；只有经过整理的内容才进入学习路线和题库索引。

## 9. 项目档案结构

每个项目不是宣传卡片，而是一份可验证档案：

```text
项目目标 → 用户/场景 → 系统架构 → 关键技术 → 代码/演示
→ 评测指标 → 已知限制 → 迭代记录 → 关联文章/题目
```

项目数据只展示有来源的指标，禁止为了视觉效果补造数字。

## 10. 数据模型与目录

建议内容目录：

```text
content/
├── learn/          # 学习路线节点与章节
├── notes/          # 已发布专题文章
├── interview/      # 题目、分类、公司视图、真实面经
├── articles/       # 公众号原创文章
├── projects/       # 项目档案
├── sources/        # Feishu/公众号原始快照与导入回执
└── taxonomy/       # tags、roles、levels、companies
```

每份内容必须有：`id`、`title`、`slug`、`type`、`status`、`source`、`updatedAt`、`tags`、`related`。题目和文章通过 ID 关联，不复制正文。

## 11. 分阶段施工顺序

### Phase 1：先把列表做对

完成 `/interview` 总目录、使用说明、12 个一级分类、题目筛选和专题/文章关联；同时完成 `/learn` 路线总览。

### Phase 2：填充已有内容

导入 Feishu《Agent 岗面试宝典 v3》作为待整理源，拆出章节、题目和图片；导入公众号文章 Markdown，建立文章索引和来源信息。

### Phase 3：补专题长文

按 RAG、Agent 架构、Code Agent、Deep Research 四条主线扩写 L1/L2 内容，每篇补图、例子、失败案例和面试追问。

### Phase 4：项目与商业化能力

加入项目档案、赞助/广告位预留、文章推荐位和可配置的推广模块；商业组件不侵入正文阅读区。

## 12. 当前项目对应关系

- 现有 `/notes` 保留为专题文章阅读层。
- 现有 `content/learn/claude-code` 迁入学习路线的一个专题，不作为全站唯一目录。
- 新增 `/interview` 作为面试题库主入口，避免把所有题目塞进 `/notes`。
- `content/imports/agent-interview-v3.feishu.md` 作为待拆分源文件，暂不直接当成已发布文章。
- 公众号内容进入 `content/articles`，经人工确认后再关联到专题和题库。
