---
slug: rag-tk1204
no: "2104"
title: "| 99 | A RAG system has high context precision but low faithfulness. How would you address this"
question: "| 99 | A RAG system has high context precision but low faithfulness. How would you address this"
excerpt: "这道题考察的是系统诊断与解耦能力。面试官真正想看的是：你是否能区分“检索质量高”和“生成忠实度低”这两个看似矛盾的现象，并给出针对性修复方案。刁钻点在于：候选人常误以为“检索好=答案好”，忽略了生成阶段的独立问题。答好了"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4290
updated: "2026-09-29"
---

## | 99 | A RAG system has high context precision but low faithfulness. How would you address this

`P1` · `rag`

🏷 标签：`rag`, `faithfulness`, `context-precision`, `hallucination`, `grounding`

#### 1️⃣ 考察意图

这道题考察的是**系统诊断与解耦能力**。面试官真正想看的是：你是否能区分“检索质量高”和“生成忠实度低”这两个看似矛盾的现象，并给出针对性修复方案。刁钻点在于：候选人常误以为“检索好=答案好”，忽略了生成阶段的独立问题。答好了能展示你对 RAG 整条链路（检索→上下文→生成）的深刻理解，以及从 prompt 工程、解码策略到后处理的多层修复能力，属于**系统设计 + debug** 类型。

#### 2️⃣ 标准答

**核心诊断**：High context precision 意味着检索到的 top-k chunks 与 query 高度相关且排序合理（例如 NDCG@k > 0.9）。Low faithfulness 则指生成内容与上下文存在事实冲突（如幻觉、捏造细节）。两者解耦，问题出在生成阶段，而非检索。

**根因分析**（3 个常见场景）：

- **Generator 过度依赖参数知识**：LLM（如 GPT-4）在生成时优先使用预训练记忆，而非严格遵循上下文。例如，上下文说“2023 年营收 100 亿”，模型却输出“120 亿”，因为训练数据中常见更高数字。
- **Prompt 未强制 grounding**：指令如“基于以下内容回答”不够强硬，模型可能“自由发挥”。缺少“如果上下文无信息，回答‘未提及’”的约束。
- **上下文冲突或冗余**：即使 chunks 相关，若包含矛盾信息（如两个 chunk 分别说“价格 50 元”和“价格 60 元”），模型可能选择错误版本或融合出虚假值。

**修复方案**（按干预阶段排序）：

- **Prompt 工程（低开销）**：在 system prompt 中加入显式 grounding 指令，例如：“仅使用提供的上下文回答。如果上下文不足以支持，直接输出‘无法从给定信息中确认’。” 同时添加“逐句验证：每个 claim 必须能在上下文中找到原文支持”的 chain-of-thought 提示。
- **解码策略（中等开销）**：使用**约束解码**（constrained decoding），如通过正则表达式或 trie 树限制输出必须包含上下文中的实体。例如，对数字型答案，强制从 chunks 中抽取而非生成。另一种是**自一致性采样**（self-consistency）：生成多个候选答案，用 NLI 模型（如 TrueTeacher）筛选与上下文最一致的。
- **后处理过滤（高开销但可靠）**：部署**事实一致性检查器**（factual consistency checker）。例如，用 DeBERTa-v3 微调的 NLI 模型，将生成答案与上下文逐句比对，标记“支持/矛盾/中立”。若矛盾比例 > 30%，触发重生成或降级回答（如“系统无法确认”）。
- **上下文质量优化（预防性）**：即使 precision 高，仍需去重和矛盾检测。用**语义相似度聚类**（如 Sentence-BERT）合并冗余 chunks，再用**矛盾检测模型**（如 ALBERT 微调）标记冲突对，优先保留高置信度 chunk。

**实际落地的坑 + 解法**：

- **坑**：后处理过滤增加延迟（如 NLI 模型推理 200ms/句），影响用户体验。**解法**：采用**级联策略**——先用轻量级规则（如关键词匹配）快速过滤明显幻觉，仅对可疑答案调用 NLI 模型。例如，对“数字”类答案，直接检查是否在 chunks 中出现；对“实体”类，用 fuzzy matching 验证。
- **坑**：约束解码可能过度限制，导致输出生硬或信息丢失。**解法**：设置**松弛阈值**——若约束解码失败（如无匹配实体），回退到标准解码并标记为低置信度，由后处理决定是否展示。

**评估指标**：用**Faithfulness Score**（如 TrueTeacher 或 Q² 指标）量化改进。在 QA 数据集上，对比修复前后的 F1 和 hallucination rate。注意 trade-off：修复后 faithfulness 提升 15-20%，但响应延迟增加 10-30%（取决于后处理复杂度）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从诊断、根因、修复三个层面回答。诊断层面：高 context precision 和低 faithfulness 是解耦的，问题出在生成阶段而非检索。根因包括 LLM 过度依赖参数知识、prompt 未强制 grounding、以及上下文冲突。修复层面：从 prompt 工程（加 grounding 指令）、解码策略（约束解码或自一致性）、到后处理过滤（NLI 检查器）逐层干预。总结一句：先强化 prompt 约束，再引入轻量级后处理，最后用级联策略平衡延迟和效果。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 prompt 工程和后处理都做了，faithfulness 还是低，怎么办？

> 检查上下文质量：即使 precision 高，chunks 可能包含**隐式矛盾**（如两个 chunk 分别说“产品 A 支持 5G”和“产品 A 仅支持 4G”）。用矛盾检测模型（如基于 RoBERTa 的 NLI）标记冲突对，优先保留高置信度 chunk。另一个方向是**动态 chunk 选择**：用 LLM 对每个 chunk 打分（如“是否与 query 一致”），只保留 top-1 或 top-2 最一致 chunk，减少噪声。如果仍无效，考虑**多轮验证**：让 LLM 先输出 claim 列表，再逐条与上下文比对，标记不一致后重生成。

**追问 2**：如何在不增加延迟的前提下提升 faithfulness？

> 采用**轻量级规则**：对常见幻觉模式（如数字、日期、人名）用正则或 fuzzy matching 快速验证。例如，如果上下文有“2023 年”，生成答案中“2024 年”直接标记为幻觉。另一个方案是**缓存 NLI 结果**：对高频 query-chunk 对，预计算 faithfulness 分数，避免实时推理。还可以用**模型蒸馏**：将大 NLI 模型（如 DeBERTa-v3）蒸馏成小模型（如 DistilBERT），推理时间从 200ms 降到 50ms，精度损失 < 5%。

**追问 3**：如果上下文包含正确和错误信息，模型如何选择？

> 这是**冲突解决**问题。方案一：**置信度加权**——对每个 chunk 用检索模型（如 BM25）的分数作为权重，生成时优先参考高分 chunk。方案二：**投票机制**——生成多个候选答案，用 NLI 模型投票选出与最多 chunk 一致的答案。方案三：**显式冲突标记**——在 prompt 中要求模型输出“冲突点”，例如“上下文中有矛盾：chunk A 说 X，chunk B 说 Y，我选择 X 因为 chunk A 更相关”。这需要模型具备推理能力，适合 GPT-4 级别模型。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 认为“高 context precision 意味着检索没问题，所以问题在生成，直接改 prompt 就行” → ✅ 正确切入：即使检索相关，chunks 可能包含矛盾或冗余，需要先做上下文质量优化（去重、矛盾检测），再改 prompt 和后处理。
- ❌ 只提“用 NLI 模型检查 faithfulness”，不提 trade-off（延迟、成本） → ✅ 正确切入：给出级联策略，先轻量级规则，再 NLI 模型，并量化延迟影响（如规则 10ms，NLI 200ms）。
- ❌ 说“用更强大的 LLM（如 GPT-5）就能解决” → ✅ 正确切入：更强大模型可能更依赖参数知识，反而加剧幻觉。应聚焦 grounding 机制，而非模型规模。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“实际部署中遇到的 faithfulness 问题”切入，描述你如何用 prompt 工程 + NLI 后处理修复，并给出具体指标（如 hallucination rate 从 25% 降到 8%）。强调你做了 A/B 测试，平衡了延迟和效果。
- **如果你只做过传统 NLP**：用“文本生成中的事实一致性”类比，例如在摘要任务中，用 NLI 模型检测摘要是否忠实于原文。迁移到 RAG 时，强调你理解 grounding 的核心是“生成内容必须可回溯到上下文”。
- **如果你是校招无项目**：聚焦“论文复现 demo”，例如复现《RAGAS》或《TrueTeacher》中的 faithfulness 评估方法，并在公开数据集（如 Natural Questions）上验证修复效果。展示你对 NLI 模型和约束解码的代码实现能力。
- 《RAGAS: Automated Evaluation of Retrieval Augmented Generation》
- 《TrueTeacher: Learning Factual Consistency Evaluation with Large Language Models》
- 《Constrained Decoding for Faithful Text Generation》
- 《DeBERTa: Decoding-enhanced BERT with Disentangled Attention》（用于 NLI 模型）
- 《Self-Consistency Improves Chain of Thought Reasoning in Language Models》

---
