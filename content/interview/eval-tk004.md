---
slug: eval-tk004
no: "904"
title: "SWE-bench 是如何评估 Agent 的编程能力的？为什么这么难"
question: "SWE-bench 是如何评估 Agent 的编程能力的？为什么这么难"
excerpt: "考察对代码 Agent 评估的深度理解。刁钻点：SWE-bench 不是"写代码"评估，而是"修 Bug"评估——需要理解代码库、定位问题、生成 patch、通过测试。"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 5
words: 2606
updated: "2026-09-29"
---

## SWE-bench 是如何评估 Agent 的编程能力的？为什么这么难

#### 1️⃣ 考察意图

考察对代码 Agent 评估的深度理解。刁钻点：SWE-bench 不是"写代码"评估，而是"修 Bug"评估——需要理解代码库、定位问题、生成 patch、通过测试。

#### 2️⃣ 标准答

**SWE-bench 评估流程：**

1. **输入**：GitHub Issue 描述（Bug报告/功能请求）+ 代码库快照
2. **Agent 任务**：理解 Issue → 搜索相关代码 → 定位 Bug → 生成 patch（代码修改）
3. **验证**：将 patch 应用到代码库 → 运行单元测试 → 测试通过则算解决
4. **指标**：Resolved Rate（测试通过的 Issue 比例）

**为什么难（GPT-4 直接做只有 1.7%）：**

1. **代码库规模**：平均每个项目 50K+ 行代码，Issue 相关的代码可能分散在多个文件中。Agent 需要在巨大的搜索空间中定位问题
2. **上下文限制**：即使 128K 上下文，也无法放入整个代码库。Agent 需要选择性地浏览代码
3. **理解深度**：不仅要理解"代码做了什么"，还要理解"为什么这样写"和"修改后会不会影响其他功能"
4. **测试通过标准**：必须通过项目的所有单元测试（不只是 Issue 相关的测试），一个修改可能破坏其他功能
5. **Patch 格式**：需要生成正确的 diff 格式，语法错误直接判失败

**提升方案及效果：**

| 方法 | Resolved Rate | 说明 |
|---|---|---|
| GPT-4 直接做 | 1.7% | 无框架，直接让LLM生成patch |
| GPT-4 + RAG | 4.5% | 检索相关代码文件 |
| GPT-4 + SWE-agent | 12.5% | 专门的代码浏览+编辑+测试交互框架 |
| GPT-4 + SWE-agent + 迭代 | 18.0% | 失败后根据测试报错修改 |
| Claude 3.5 Sonnet + SWE-agent | 23.0% | 更强的代码理解能力 |

**SWE-agent 的核心设计：**

- 给 Agent 提供专用工具：`search_code(query)`、`open_file(path)`、`edit_file(start, end, new)`、`run_tests()`
- Agent 可以多轮交互：搜索→打开→编辑→测试→如果失败再修改
- 限制上下文：每次只显示当前打开的文件，而非整个代码库

#### 3️⃣ 答题模板

> "SWE-bench 评估 Agent 修 GitHub Issue 的能力：给 Issue 描述+代码库 → Agent 生成 patch → 运行单元测试验证。GPT-4 直接做只有 1.7%。难在：代码库50K+行、上下文限制、需要深度理解、必须通过所有测试。提升：SWE-agent 框架提供搜索/编辑/测试工具，GPT-4+SWE-agent 达到 12.5%，加迭代修复到 18%，Claude 3.5 到 23%。"

#### 4️⃣ 高频追问

**追问 1**：SWE-bench 的测试通过标准是什么？只通过 Issue 相关的测试不行吗？

> SWE-bench 要求通过 Issue 的"FAIL_TO_PASS"测试（修复前失败、修复后应该通过的测试）和"PASS_TO_PASS"测试（修复前后都应该通过的测试）。后者防止 Agent 为了修 Bug 而破坏其他功能。例：修了一个排序 Bug，但修改影响了其他模块的测试。这是"不引入回归"的工程要求。

**追问 2**：SWE-agent 框架的具体工具设计是什么？

> 核心工具：(1) `find_file(pattern)` — 按文件名模式搜索；(2) `search_dir(query, path)` — 在目录中搜索文本；(3) `open_file(path, line)` — 打开文件并显示指定行附近的内容；(4) `edit_file(start_line, end_line, new_content)` — 替换指定行；(5) `run_tests(test_files)` — 运行指定测试文件。关键设计：每次只显示当前打开文件的 100 行，Agent 需要主动搜索和浏览。这模拟了人类开发者的工作流程。

**追问 3**：SWE-bench 有什么局限？

> (1) 项目覆盖有限——主要覆盖 Python 项目（12个），不含 Java/Go/JS；(2) Issue 类型偏 Bug 修复——不含新功能开发、重构、性能优化等任务；(3) 单文件修改为主——大部分 Issue 只需修改 1-2 个文件，真实工程中可能需要跨多文件重构；(4) 测试覆盖率依赖——如果项目的测试覆盖率低，可能通过测试但实际没修好。SWE-bench v2 正在扩展到更多语言和任务类型。

#### 5️⃣ 避坑

- ❌ "SWE-bench 分数高就是好程序员" → ✅ "SWE-bench 只测 Bug 修复能力，不含新功能开发、架构设计、代码审查。它是 Agent 评估的必要条件但非充分条件。"

#### 6️⃣ 简历呼应

- **有代码 Agent 项目**：从"SWE-bench 评估"切入，描述你的 Agent 框架设计和 Resolved Rate
- **校招无项目**：用 SWE-agent 框架在 SWE-bench 上测试不同 LLM，写对比博客
- "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" (Jimenez et al., 2023) / "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering" (Yang et al., 2024)

---
