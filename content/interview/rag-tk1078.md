---
slug: rag-tk1078
no: "1978"
title: "When evaluating RAG generator output, what are the risks of relying solely on response relevancy"
question: "When evaluating RAG generator output, what are the risks of relying solely on response relevancy"
excerpt: "面试官想考察你是否具备系统级评估思维，而非停留在单一指标上。这道题是典型的“工程取舍 + debug”类型，刁钻点在于：很多人以为 RAG 评估就是看回答是否相关，但实际落地中，Relevancy 高 ≠ 好回答。答好了"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4888
updated: "2026-09-29"
---

## When evaluating RAG generator output, what are the risks of relying solely on response relevancy

#### 1️⃣ 考察意图

面试官想考察你是否具备**系统级评估思维**，而非停留在单一指标上。这道题是典型的“工程取舍 + debug”类型，刁钻点在于：很多人以为 RAG 评估就是看回答是否相关，但实际落地中，**Relevancy 高 ≠ 好回答**。答好了能展示你对 RAG 整条链路（检索→生成→评估）的深刻理解，以及设计多维度评估体系的能力，这是 P1 级别工程师的核心硬实力。

#### 2️⃣ 标准答

**风险一：Relevancy 无法检测事实准确性（Faithfulness）**

Relevancy 只衡量生成内容与查询的语义相似度，不关心内容是否基于检索上下文。例如，用户问“2024 年诺贝尔物理学奖得主是谁？”，模型回答“2024 年诺贝尔物理学奖授予了 John Hopfield 和 Geoffrey Hinton”，这句话与查询高度相关（Relevancy 可能打 0.95），但事实错误——实际得主是 John Hopfield 和 David Thouless（2024 年奖是 2025 年公布，这里故意混淆）。**Relevancy 完全无法捕捉这种幻觉**。

- **工程取舍**：Relevancy 计算简单（如用 cosine similarity 或 NLI 模型），但牺牲了事实校验。必须引入 **Faithfulness 指标**（如用 NLI 模型判断生成内容是否被检索上下文支持），或者用 **SelfCheckGPT** 做无参考评估。
- **落地坑**：很多团队用 GPT-4 打分 Relevancy，但 GPT-4 本身也会产生幻觉，导致评估结果不可靠。解法：用 **DeBERTa-v3 微调的 NLI 模型**（如 TrueTeacher）做 Faithfulness 评估，准确率比 GPT-4 高 5-8%。

**风险二：Relevancy 掩盖检索上下文错误**

如果检索到的上下文本身是错的，Relevancy 高的回答会直接误导用户。例如，用户问“如何配置 Kafka 的 SSL？”，检索器返回了一篇过时的博客（SSL 配置已废弃），模型基于此生成了详细步骤。回答与查询高度相关，但步骤全错。**Relevancy 无法区分“正确上下文下的相关”和“错误上下文下的相关”**。

- **工程取舍**：Relevancy 只评估生成端，不评估检索端。必须引入 **Context Relevancy**（检索上下文与查询的相关性）和 **Context Faithfulness**（生成内容是否严格基于上下文）。实践中，用 **RAGAS** 框架的 `context_relevancy` 和 `faithfulness` 指标联合评估。
- **落地坑**：Context Relevancy 计算时，如果上下文包含噪声（如多个不相关段落），指标会偏低。解法：用 **LLM-as-a-judge** 做分段打分，只保留 top-3 段落计算，避免长上下文稀释。

**风险三：Relevancy 无法评估回答完整性（Completeness）**

回答可能只覆盖了查询的部分需求，但 Relevancy 仍可能很高。例如，用户问“对比 Transformer 和 LSTM 在时间序列预测上的优缺点”，模型只回答了 Transformer 的优点，忽略了 LSTM。Relevancy 因为提到了“Transformer”和“时间序列”而打高分，但回答不完整。

- **工程取舍**：Relevancy 是“点对点”匹配，不关心“面”。必须引入 **Answer Completeness**（回答是否覆盖查询所有信息需求）。可以用 **QAEval** 方法：从查询中提取关键信息点（如用 LLM 拆解成子问题），然后逐一检查回答是否覆盖。
- **落地坑**：Completeness 评估依赖查询拆解质量，如果拆解不准确，指标会失真。解法：用 **Few-shot 提示**让 LLM 拆解查询，并人工校验 100 条样本的拆解质量，保证准确率 > 90%。

**风险四：Relevancy 计算存在指标偏差**

Relevancy 的常见计算方式（如 cosine similarity 或 NLI 模型）会偏向某些模式。例如，模型重复查询中的关键词（如用户问“如何优化 SQL 查询？”，回答重复“SQL 查询优化”10 次），Relevancy 会很高，但回答毫无信息量。或者，模型使用与训练数据相似的句式（如“根据您的查询，我们建议……”），Relevancy 也会虚高。

- **工程取舍**：Relevancy 无法区分“语义相关”和“机械重复”。必须引入 **Diversity** 指标（如回答中不同 n-gram 的比例）或 **Informativeness** 指标（如回答是否包含新信息）。实践中，用 **BLEU/ROUGE** 的变体（如 BERTScore）结合 **Entropy** 做联合评估。
- **落地坑**：Diversity 指标可能惩罚简洁回答（如“是”或“否”）。解法：对短回答（< 20 tokens）豁免 Diversity 评估，只对长回答计算。

**总结**：Relevancy 是 RAG 评估的“必要但不充分”指标。必须构建多维度评估体系：**Faithfulness + Context Relevancy + Completeness + Relevancy**，并针对业务场景调整权重（如医疗场景 Faithfulness 权重 0.5，客服场景 Completeness 权重 0.3）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从四个风险层面回答：第一，Relevancy 无法检测事实准确性，必须引入 Faithfulness 指标；第二，它掩盖检索上下文错误，需要 Context Relevancy 联合评估；第三，它无法评估回答完整性，需要 Completeness 指标；第四，Relevancy 计算存在关键词重复等偏差，需要 Diversity 或 Informativeness 辅助。总结一句：Relevancy 是 RAG 评估的‘必要但不充分’指标，必须构建多维度评估体系。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到了 Faithfulness 指标，具体怎么实现？用 NLI 模型还是 LLM-as-a-judge？

> 两者各有优劣。NLI 模型（如 DeBERTa-v3 微调的 TrueTeacher）速度快（单条 < 100ms），准确率在 85-90%，但需要标注数据微调。LLM-as-a-judge（如 GPT-4）准确率更高（92-95%），但成本高（单条约 \$0.01）且延迟大（1-2 秒）。工程取舍：对高吞吐场景（如客服系统）用 NLI 模型，对高精度场景（如医疗诊断）用 LLM-as-a-judge。落地坑：NLI 模型对否定句（如“模型没有过拟合”）容易误判，需要用数据增强（如添加否定前缀）微调。

**追问 2**：如果业务场景是开放域问答（如百科），Relevancy 的权重应该怎么调？

> 开放域问答中，用户期望高完整性（覆盖所有子问题）和高事实性（无幻觉）。建议权重：Faithfulness 0.4，Completeness 0.3，Context Relevancy 0.2，Relevancy 0.1。因为开放域问答的检索上下文通常多样，Context Relevancy 重要性降低，但 Faithfulness 必须高。落地坑：Completeness 评估时，如果查询是“介绍 Transformer”，拆解子问题可能过多（如 20 个），导致指标偏低。解法：只拆解 top-5 关键子问题，用 LLM 判断“是否核心”。

**追问 3**：你提到了 Diversity 指标，具体怎么计算？和 BLEU 有什么区别？

> Diversity 通常用 **Distinct-n**（回答中不同 n-gram 的比例）或 **Self-BLEU**（回答与自身 n-gram 的重复度）。与 BLEU 的区别：BLEU 是参考评估（需要标准答案），Diversity 是无参考评估。工程取舍：Distinct-1 容易受停用词影响（如“的”“是”），建议用 Distinct-2 或 Distinct-3。落地坑：Diversity 高不一定好（如回答“苹果苹果苹果”的 Distinct-1 很高）。解法：结合 **Informativeness**（如回答中实体数量），用 LLM 提取实体后计算。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 错误答法：“Relevancy 不够，所以要用 ROUGE/BLEU 补充。” → ✅ 正确切入：ROUGE/BLEU 是参考评估，需要标准答案，不适合 RAG 这种无标准答案的场景。应该用 Faithfulness、Completeness 等无参考指标。
- ❌ 错误答法：“Relevancy 没用，直接放弃。” → ✅ 正确切入：Relevancy 是基础指标，能快速过滤明显不相关的回答（如答非所问）。正确做法是保留 Relevancy 作为第一道筛子，再结合其他指标做精细评估。
- ❌ 错误答法：“用 GPT-4 打分所有指标就行。” → ✅ 正确切入：GPT-4 打分成本高、延迟大，且存在幻觉。应该用专用模型（如 NLI 模型做 Faithfulness）做高频评估，GPT-4 只做抽样校验。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中用 RAGAS 框架评估了 1000 条样本，发现 Relevancy 高但 Faithfulness 低的案例占 30%，于是引入了 TrueTeacher 模型做事实校验，最终错误率降低 50%”切入。
- **如果你只做过传统 NLP**：用“传统 NLG 评估用 BLEU/ROUGE，但 RAG 无标准答案，所以需要无参考指标。我类比了机器翻译的 COMET 评估，理解了 Faithfulness 和 Relevancy 的 trade-off”切入。
- **如果你是校招无项目**：聚焦“我复现了 RAGAS 论文中的评估方法，用 DeBERTa-v3 微调了一个 Faithfulness 模型，在 HotpotQA 上准确率 87%，并对比了 GPT-4 打分的成本差异”切入。
- RAGAS: Automated Evaluation of Retrieval Augmented Generation（论文）
- TrueTeacher: Learning Factual Consistency Evaluation with Large Language Models（论文）
- SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models（论文）
- DeBERTa-v3: Improving DeBERTa using ELECTRA-Style Pre-Training（论文）
- RAGAS 官方文档（工具）
