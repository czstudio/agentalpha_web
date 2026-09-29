---
slug: multiagent-tk160
no: "1060"
title: "软件开发 Agent 团队如何协作完成一个需求"
question: "软件开发 Agent 团队如何协作完成一个需求"
excerpt: "面试官想看你能否设计一个端到端的 Agent 协作流程，而非只描述角色。刁钻点在于：很多人只答"PM 写 PRD → Developer 写代码 → Tester 测试"，但说不出中间的信息传递格式、异常处理流程、迭代机"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3523
updated: "2026-09-29"
---

## 软件开发 Agent 团队如何协作完成一个需求

#### 1️⃣ 考察意图

面试官想看你能否设计一个端到端的 Agent 协作流程，而非只描述角色。刁钻点在于：很多人只答"PM 写 PRD → Developer 写代码 → Tester 测试"，但说不出中间的信息传递格式、异常处理流程、迭代机制。答好了能展示你对 Agent 工作流编排的理解。

#### 2️⃣ 标准答

**协作流程是"需求→设计→分解→开发→测试→部署"的 6 阶段流水线，每阶段有明确的输入/输出/质量门禁。**

**阶段 1：需求分析（PM Agent）**

- 输入：用户自然语言需求（如"做一个用户注册功能"）
- 处理：PM Agent 将需求拆解为用户故事（"作为用户，我希望能注册账号"）+ 验收标准（"邮箱格式校验、密码强度要求、重复注册检测"）
- 输出：结构化 PRD（JSON 格式，包含 user_stories、acceptance_criteria、priority）
- 质量门禁：人工确认 PRD 是否准确理解需求

**阶段 2：系统设计（Architect Agent）**

- 输入：PRD
- 处理：Architect Agent 设计 API 接口（`POST /api/register`）、数据模型（User table schema）、技术选型（bcrypt 加密、JWT 认证）
- 输出：API 文档（OpenAPI 格式）+ 架构图 + Task 分解（DAG）
- 质量门禁：人工审批技术方案

**阶段 3：任务分解（Architect → Developer）**

- 输入：API 文档 + 架构图
- 处理：将设计拆分为可执行 Task（如"实现 User model"、"实现 /register API"、"实现邮箱校验"），构建依赖 DAG
- 输出：Task 列表（每个 Task 包含描述、依赖、预计复杂度）

**阶段 4：并行开发（Developer Agents）**

- 输入：Task 列表
- 处理：多个 Developer Agent 并行处理无依赖的 Task。每个 Developer 完成后提交代码 + 单元测试
- 输出：代码 PR + 测试用例
- 异常处理：如果 Developer 遇到设计不明确的问题，反馈给 Architect Agent 补充设计

**阶段 5：测试与审查（Tester + Code Reviewer 并行）**

- 输入：代码 PR
- 处理：Tester Agent 运行测试用例 + 设计边界 case 测试；Code Reviewer Agent 检查代码质量、安全漏洞
- 输出：测试报告 + Review 意见
- 迭代：如果发现 Bug，反馈给 Developer 修复，修复后重新测试（循环直到通过）

**阶段 6：部署（DevOps Agent）**

- 输入：通过测试的代码
- 处理：生成 Docker 镜像、更新 K8s 配置、触发 CI/CD 流水线
- 输出：部署确认 + 监控面板
- 回滚：如果部署后监控异常，自动回滚到上一版本

**关键协作机制：**

- **消息总线**：所有 Agent 通过 EventBus 通信（如 `architect.task_complete` 事件触发 Developer 开始）
- **共享状态**：所有 Agent 共享一个 Project State（当前阶段、Task 状态、Bug 列表）
- **异常升级**：Agent 遇到无法处理的问题时，自动升级给人类（如"需求歧义无法自动判断"）

#### 3️⃣ 答题模板（30 秒电梯版）

> "6 阶段流水线：PM 分析需求→输出PRD；Architect 设计系统→输出API文档+Task DAG；Developer 并行开发→输出代码+测试；Tester+Reviewer 并行审查→输出测试报告；DevOps 部署→CI/CD。协作机制：EventBus 消息总线触发阶段切换、共享 Project State 同步进度、异常自动升级给人类。关键：每阶段有质量门禁（人工确认PRD/审批方案/代码通过），不是完全自动化的黑盒。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Task 依赖 DAG 怎么构建？如果有循环依赖怎么办？

> DAG 构建由 Architect Agent 在设计阶段完成：分析 Task 间的依赖关系（如"实现 /register API"依赖"实现 User model"），构建有向无环图。循环依赖检测：用拓扑排序，如果排序失败说明有环。处理循环依赖：(1) 重新分解 Task——将循环依赖的两个 Task 合并为一个；(2) 引入接口——先定义接口（如 UserModelInterface），两个 Task 可以并行开发，最后再对接。实践中循环依赖通常说明 Task 分解粒度不对，需要 Architect 重新设计。

**追问 2**：多个 Developer Agent 并行开发时，代码冲突怎么处理？

> 三层处理：(1) **预防**——Task 分解时确保不同 Developer 修改不同文件（Architect 在 Task 中指定文件路径）；(2) **检测**——每个 Developer 提交前做 Git diff，如果检测到与其他 Developer 的修改有重叠，暂停并等待对方完成；(3) **解决**——如果冲突不可避免，由 Architect Agent 做"自动 merge"（判断哪边修改更合理），或升级给人工解决。实践中大部分冲突可以通过合理的 Task 分解避免。

**追问 3**：整个流程从需求到部署大概需要多长时间？瓶颈在哪？

> 以"用户注册功能"为例：PM 5min + Architect 10min + Developer 15min + Tester 10min + DevOps 5min = 总计约 45min。瓶颈通常在 Developer 和 Tester 的迭代循环——如果 Tester 发现 3 个 Bug，需要 3 轮"修复→重测"，每轮 10min，总计增加 30min。优化方案：(1) Developer 提交前先自测（运行单元测试），减少 Tester 发现的 Bug 数；(2) Tester 在 Developer 编码时并行准备测试用例，而非等代码完成后才开始。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "Agent 团队是全自动的，不需要人工介入" → ✅ "至少 3 个人工介入点：PRD 确认、方案审批、代码通过。完全自动化的 Agent 团队风险太高——需求理解错误会导致整个流程做错。"
- ❌ "所有阶段串行执行" → ✅ "Tester 和 Code Reviewer 可以并行，多个 Developer 可以并行。并行化能将总时间缩短 30-50%。但需要合理的 Task DAG 和冲突处理机制。"
- ❌ "用 ChatDev 的瀑布模型就行" → ✅ "ChatDev 的线性流程没有回溯机制——Tester 发现 Bug 后无法回到 Developer 修复。需要设计反馈循环和迭代机制。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"协作流程设计"切入，描述你实现的 6 阶段流水线，给出端到端开发时间（如 45min 完成一个功能）和人工介入次数
- **如果你只做过 DevOps**：用"CI/CD Pipeline"类比——Agent 协作流程本质上是"需求 Pipeline"，每个阶段对应 CI/CD 的一个 stage
- **如果你是校招**：用 AutoGen 实现 3-Agent 协作（PM + Developer + Tester），完成一个简单功能，测量各阶段耗时和迭代次数
- "MetaGPT: Meta Programming for Multi-Agent Collaborative Framework" (Hong et al., 2023)
- "ChatDev: Communicating Agents for Software Development" (Qian et al., 2023)

---
