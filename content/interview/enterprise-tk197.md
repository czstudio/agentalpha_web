---
slug: enterprise-tk197
no: "1097"
title: "How to control hallucinations at various levels"
question: "How to control hallucinations at various levels"
excerpt: "面试官想看的不是“调低温度”这种单点技巧，而是你能否分层拆解幻觉问题，从数据、模型、推理到系统，给出有工程取舍的方案。这是典型的系统设计 + 工程取舍题，刁钻点在于：候选人常只背概念（如RAG），却说不清每层方法的适用边"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3687
updated: "2026-09-29"
---

## How to control hallucinations at various levels

#### 1️⃣ 考察意图

面试官想看的不是“调低温度”这种单点技巧，而是你能否**分层拆解**幻觉问题，从数据、模型、推理到系统，给出有工程取舍的方案。这是典型的**系统设计 + 工程取舍**题，刁钻点在于：候选人常只背概念（如RAG），却说不清每层方法的**适用边界**和**成本**。答好了能展示你对LLM整条链路的掌控力，以及从“调参侠”到“架构师”的思维跃迁。

#### 2️⃣ 标准答

控制幻觉需要分层治理，每层解决不同根因，且存在 trade-off。我从四个层面展开：

**1. 数据层：源头治理**

- **训练数据清洗**：用 Decontamination 工具（如 n-gram 去重）剔除训练集中的事实错误。坑：过度清洗会损失多样性，导致模型“死记硬背”而非泛化。
- **事实性增强**：在 SFT 阶段注入结构化知识（如 Wikidata 三元组），或用 DPO 偏好数据对（事实正确 vs 错误回答）。trade-off：数据标注成本高，且可能引入新偏见。
- **RLHF 对齐**：用奖励模型惩罚事实错误，但 RLHF 对“幻觉”的奖励信号难定义——模型可能学会“回避回答”来降低惩罚，导致拒绝率飙升。解法：结合 RLAIF（AI 反馈），用 GPT-4 做事实性标注。

**2. 模型层：架构与检索**

- **RAG（检索增强生成）**：最实用的方案。用 BM25（稀疏）或 DPR（稠密）检索外部知识库，再拼接 prompt。坑：检索结果噪声大时，模型会“被带偏”产生新幻觉。解法：加 **reranker**（如 Cohere rerank v3），先粗筛再精排，top-3 结果准确率提升 15-20%。
- **知识图谱注入**：用 GraphRAG（如微软方案）将实体关系编码为图结构，减少“关系幻觉”。trade-off：图谱构建成本高，且动态知识更新慢。
- **约束解码**：在生成时用 **FactScore** 或 **SelfCheckGPT** 实时校验每个 token 的事实性，但推理延迟增加 3-5 倍，仅适合离线场景。

**3. 推理层：采样与解码**

- **温度与采样**：温度调低（如 0.1-0.3）减少随机性，但会牺牲创造性。实际落地：用 **top-k=40 + top-p=0.9** 组合，比单用温度更鲁棒。
- **多次采样投票**：对同一 prompt 采样 5-10 次，用 **majority voting** 或 **Self-Consistency** 选最一致答案。坑：计算成本线性增长，且对“事实性”问题（如“北京人口”）效果差，因为模型可能一致错。解法：结合 **verifier**（如 DeBERTa 训练的事实检测器）过滤低置信度输出。
- **Chain-of-Thought 校验**：让模型先输出推理步骤，再生成答案。但 CoT 本身可能引入“推理幻觉”，需用 **self-ask** 或 **ReAct** 循环验证。

**4. 系统层：后处理与反馈**

- **后处理校验**：调用外部 API（如 Google Search、Wolfram Alpha）验证事实。坑：API 延迟高且可能不可用。解法：用 **缓存 + 异步调用**，对高频问题预计算事实性分数。
- **用户反馈循环**：收集用户“踩”数据，用 **RLHF** 或 **DPO** 微调。但反馈稀疏且噪声大，需设计 **主动学习** 策略（如只采样低置信度样本）。
- **监控与告警**：部署 **FactScore** 或 **HaluEval** 指标，设置阈值（如 FactScore < 0.7 触发告警）。trade-off：监控本身消耗 token，需权衡覆盖率与成本。

**总结**：没有银弹。RAG 是性价比最高的第一道防线，数据层解决系统性幻觉，推理层处理随机性，系统层兜底。实际落地时，按“RAG → 数据清洗 → 推理优化 → 后处理”优先级迭代。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据、模型、推理、系统四个层面回答。数据层通过清洗和 RLHF 减少系统性幻觉；模型层用 RAG + reranker 引入外部知识；推理层调低温度并用多次采样投票；系统层用后处理 API 校验和用户反馈完整流程。总结一句：没有银弹，RAG 是性价比最高的第一道防线，但需要结合数据治理和监控才能覆盖 80% 场景。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：RAG 本身也会引入幻觉，你怎么处理检索噪声导致的“被带偏”？

> 核心是**检索质量 + 模型鲁棒性**。检索侧：用 **HyDE**（假设文档嵌入）将 query 先转成假设答案再检索，减少语义漂移；或用 **multi-query** 扩展（生成 3-5 个变体 query）。模型侧：在 prompt 中加 **“如果检索结果与知识冲突，请忽略”** 指令，并训练模型对低置信度输出说“我不知道”。实际落地：在 RAG 系统后加 **verifier**（如基于 NLI 的模型），对生成结果与检索文档做蕴含判断，不一致时触发回退。

**追问 2**：RLHF 减少幻觉时，奖励模型怎么设计才能避免模型“沉默”？

> 奖励模型需要**多维度**：事实性（FactScore）、完整性（覆盖所有 query 要点）、拒绝率（惩罚过度拒绝）。具体做法：用 **DPO** 替代 RLHF，避免奖励模型过拟合；在偏好数据中，对“正确回答”和“拒绝回答”分别标注，让模型学会权衡。坑：奖励模型本身可能产生幻觉，需用 **RLHF + RLAIF** 组合，用 GPT-4 做事实性标注作为辅助信号。

**追问 3**：你提到多次采样投票，但计算成本高，怎么优化？

> 用 **speculative decoding** 加速：先用小模型（如 7B）快速采样 10 次，再用大模型（70B）验证 top-3 候选。trade-off：小模型质量差时，验证成本反而增加。更实用方案：**自适应采样**，对低置信度 query（如模型输出概率 < 0.5）才多次采样，高置信度直接输出。实际落地：在线上系统，对 80% 的简单 query 单次推理，20% 的复杂 query 用 5 次采样 + 投票，延迟增加 < 30%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只答“调低温度”或“用 RAG” → ✅ 必须分层：数据层解决系统性幻觉，模型层解决知识缺失，推理层解决随机性，系统层兜底。
- ❌ 说“RAG 能完全消除幻觉” → ✅ 承认 RAG 的局限：检索噪声、延迟、成本，并给出 reranker 和 verifier 的补充方案。
- ❌ 忽略 trade-off，只说“用 RLHF 对齐” → ✅ 点出 RLHF 的坑：奖励信号难定义、模型可能沉默，并给出 DPO 或 RLAIF 的替代。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索噪声导致幻觉”切入，展示你如何用 reranker 和 HyDE 优化，并对比 FactScore 指标（如从 0.6 提升到 0.85）。
- **如果你只做过传统 NLP**：用“文本分类中的置信度校准”类比推理层采样，展示你理解“不确定性量化”在 LLM 中的迁移。
- **如果你是校招无项目**：聚焦论文复现，如用 HuggingFace 实现 SelfCheckGPT 或 FactScore，并分析不同温度下的幻觉率变化，展示动手能力。
- 《RAG vs Fine-tuning: Pipelines, Tradeoffs, and a Case Study on Agriculture》
- 《SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models》
- 《GraphRAG: Unlocking LLM Discovery on Narrative Private Data》
- 《FactScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation》
- 《HaluEval: A Large-Scale Hallucination Evaluation Benchmark for Large Language Models》

---
