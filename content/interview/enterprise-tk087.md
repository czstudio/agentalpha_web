---
slug: enterprise-tk087
no: "987"
title: "如何润色用户的 Query（Query Rewrite）？目的是什么"
question: "如何润色用户的 Query（Query Rewrite）？目的是什么"
excerpt: "面试官想看你是否理解 Query Rewrite 在 RAG 系统中不是“锦上添花”，而是“雪中送炭”。考察类型是工程取舍 + 系统设计。刁钻点在于：很多人只会背“用 LLM 改写”，但说不清为什么不能直接检索原始 qu"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3987
updated: "2026-09-29"
---

## 如何润色用户的 Query（Query Rewrite）？目的是什么

#### 1️⃣ 考察意图

面试官想看你是否理解 Query Rewrite 在 RAG 系统中不是“锦上添花”，而是“雪中送炭”。考察类型是**工程取舍 + 系统设计**。刁钻点在于：很多人只会背“用 LLM 改写”，但说不清为什么不能直接检索原始 query、改写到什么粒度、以及如何避免“改写过头”导致信息丢失。答好了能展示你对 RAG 整条链路（检索-生成）的耦合理解，以及从用户意图到工程落地的完整流程能力。

#### 2️⃣ 标准答

Query Rewrite 的核心目的是**弥合用户输入与检索系统之间的语义鸿沟**。用户 query 通常口语化、碎片化、有歧义，而检索系统（如 BM25 或 Dense Retrieval）期望的是关键词明确、结构完整的查询。不 rewrite，召回率直接崩。

**具体方法分三个层次，按成本和效果递增：**

- **基于规则（Rule-based）**：最轻量，适合冷启动。
- **拼写纠正**：用 SymSpell 或 Levenshtein 距离修正“deep learing” -> “deep learning”。
- **停用词过滤 + 词干提取**：去掉“的、了、吗”，提取核心名词。
- **同义词扩展**：用 WordNet 或自定义词典，把“电脑”扩展为“计算机、笔记本”。
- **坑**：规则太硬容易误伤。比如“苹果公司”被停用词过滤掉“公司”，导致检索不到。**解法**：对实体词（NER 识别出的）做白名单保护。
- **基于模板（Template-based）**：针对高频意图做结构化改写。
- 例：用户说“帮我找一下昨天那篇关于 RAG 的文章” -> 改写为“RAG 文章 2023-10-05”。
- 实现：用正则或小模型（如 BERT 意图分类）识别“找文章”、“查天气”等意图，然后填充槽位。
- **Trade-off**：模板覆盖率高但泛化差，长尾 query 会 fallback 到原始输入。
- **基于 LLM（LLM-based）**：当前工业界主流，效果最好但成本最高。
- **Prompt 工程**：用 GPT-3.5/4 或开源模型（如 Qwen-7B）改写。典型 prompt：“将用户问题改写为适合搜索引擎的查询，保留关键实体，去除冗余语气词，输出仅包含改写结果。”
- **Few-shot 示例**：给 3-5 个“口语->正式”的 pair，如“我想看那个关于 transformer 的视频” -> “transformer 视频教程”。
- **坑**：LLM 可能“过度改写”，比如把“苹果手机”改成“iPhone 15 Pro Max”，导致检索不到旧型号。**解法**：在 prompt 里加约束“仅做语法和格式调整，不改变实体”，或后接一个**实体一致性校验**（用 NER 模型对比改写前后的实体集合，差异过大则回退）。
- **工程取舍**：用 LLM 改写时，是每次请求都调用（延迟高），还是缓存改写结果（命中率低）？**实践**：对高频 query 做离线改写+缓存，对低频 query 用在线改写，并设置超时阈值（如 500ms），超时则 fallback 到规则改写。

**评估指标**：不能只看改写后的“流畅度”，要绑定下游任务。

- **检索侧**：Recall@K（改写后比原始 query 提升 5-15% 是常见值【通用知识】）。
- **生成侧**：Rouge-L / BLEU（改写后生成的答案是否更准确）。
- **用户侧**：点击率、会话成功率（A/B 测试）。

**实际落地坑**：改写后的 query 可能太长，导致 embedding 模型截断（如 text-embedding-ada-002 最大 8192 tokens）。**解法**：改写后做一次长度截断，保留前 512 tokens 或按句子边界截断。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从目的、方法、评估三个层面回答。目的是弥合用户口语化 query 与检索系统之间的语义鸿沟。方法上，按成本递增分为规则（拼写纠正、同义词扩展）、模板（意图识别+槽位填充）、LLM（prompt 改写+实体校验），工业界主流是 LLM+规则兜底。评估要绑定下游 Recall@K 和生成质量，不能只看改写流畅度。总结一句：Query Rewrite 是 RAG 系统的‘翻译层’，做不好检索就是空中楼阁。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户 query 是“那个很火的 AI 工具”，你怎么改写？实体不明确怎么办？

> 先做实体消歧。如果上下文没有历史记录，我会用**多轮改写**：结合对话历史（如果有）或用户画像（如地域、偏好）来补全实体。比如“很火的 AI 工具”在 2024 年可能指“ChatGPT”或“Midjourney”，我会改写为“ChatGPT 2024 热门 AI 工具”，并保留原始 query 作为 fallback。如果仍不明确，用**改写+扩展**策略：生成多个候选改写（如“ChatGPT 热门 AI 工具”、“Midjourney 热门 AI 工具”），分别检索后做结果融合（Reciprocal Rank Fusion）。Trade-off 是延迟增加，但召回率提升明显。

**追问 2**：你用 LLM 改写，怎么控制成本？如果线上 QPS 很高怎么办？

> 分层策略：第一层是规则（拼写纠正、停用词），覆盖 60% 的简单 query，成本几乎为零。第二层是轻量模型（如 BERT 小模型做意图分类+槽位填充），覆盖 30% 的中等 query。第三层才是 LLM，只处理剩余 10% 的复杂 query。同时做**改写缓存**：对高频 query（如“天气”、“新闻”）离线改写并缓存，命中率可达 40-50%。如果 LLM 调用超时（如 300ms），直接 fallback 到原始 query 或规则改写。另外，可以用开源模型（如 Qwen-1.8B）替代 GPT-4，延迟从 2s 降到 200ms，效果损失在 3% 以内【通用知识】。

**追问 3**：你怎么评估改写是否“过度”？给个具体指标。

> 用**实体保留率**和**语义相似度**。实体保留率：用 NER 模型提取改写前后的实体集合，计算 Jaccard 相似度，低于 0.7 则判定为过度改写。语义相似度：用 Sentence-BERT 计算改写前后 query 的余弦相似度，低于 0.8 则回退。线上 A/B 测试时，如果改写后的 query 导致检索结果与原始 query 的 Top-10 重叠率低于 50%，也触发回退。这个阈值需要根据业务调，比如电商场景对实体敏感，阈值设高（0.9）；闲聊场景可设低（0.7）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “直接用 LLM 改写 query，效果最好。” → ✅ “LLM 改写效果好但成本高，需要分层策略：规则兜底 60% 简单 query，LLM 只处理复杂 query，并加实体校验防过度改写。”
- ❌ “改写后的 query 越正式越好。” → ✅ “改写目标是提升检索召回率，不是让 query 变优雅。保留口语中的关键实体（如‘那个’可能指代上下文），过度正式化反而丢失信息。”
- ❌ “评估只看改写后的流畅度。” → ✅ “评估必须绑定下游任务：Recall@K、生成答案的 Rouge-L、用户点击率。改写流畅度是主观指标，不能作为唯一标准。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“改写模块与检索模块的耦合”切入，讲你如何设计分层策略（规则+LLM），以及如何用实体校验避免改写过头。强调你做过 A/B 测试，Recall@10 提升了 8%。
- **如果你只做过传统 NLP**：用“文本规范化”类比，讲你如何把拼写纠正、同义词扩展迁移到 Query Rewrite。强调你对规则和模板的熟悉，以及如何用 WordNet 构建同义词库。
- **如果你是校招无项目**：聚焦论文复现，讲你读过《Query Rewriting for Retrieval-Augmented Generation》或类似工作，并自己用 GPT-3.5 在 MS MARCO 上做了 demo，对比了改写前后的 Recall@10。强调你对 trade-off（成本 vs 效果）的理解。
- 《Query Rewriting for Retrieval-Augmented Generation: A Survey》（综述，了解全貌）
- 《Improving Retrieval with Query Rewriting in RAG Systems》（博客，讲工程实践）
- 《SPLADE: Sparse Lexical and Expansion Model for Information Retrieval》（了解检索模型如何影响改写）
- 《Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks》（用于评估语义相似度）
- 《Reciprocal Rank Fusion for Combining Search Results》（用于多候选改写的结果融合）

---
