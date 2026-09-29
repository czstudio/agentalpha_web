---
slug: rag-tk1290
no: "2190"
title: "检索质量不佳时，可进行哪些Query优化"
question: "检索质量不佳时，可进行哪些Query优化"
excerpt: "面试官想看你能否系统化诊断检索失败根因，而非堆砌“加个改写”这类空话。考察类型是工程取舍 + 系统设计，刁钻点在于：你能否区分“Query 本身有问题”和“索引/模型不匹配”，并给出可落地的优化链路。答好了能展示你对 R"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3775
updated: "2026-09-29"
---

## 检索质量不佳时，可进行哪些Query优化

`P1` · `rag`

🏷 标签：`rag`, `query-optimization`, `retrieval`, `hybrid-search`

#### 1️⃣ 考察意图

面试官想看你能否系统化诊断检索失败根因，而非堆砌“加个改写”这类空话。考察类型是**工程取舍 + 系统设计**，刁钻点在于：你能否区分“Query 本身有问题”和“索引/模型不匹配”，并给出可落地的优化链路。答好了能展示你对 RAG 整条链路的理解深度，知道什么时候该动 Query、什么时候该动检索侧，以及如何用评估指标（NDCG、MRR、Recall@K）完整流程验证效果。

#### 2️⃣ 标准答

检索质量差，先别急着改 Query。**第一步永远是定位根因**：是 Query 歧义（如“苹果”指水果还是公司）、术语不匹配（用户说“车险”但文档用“机动车辆保险”）、还是信息缺失（Query 太短，如“怎么修”）。定位后，按以下四个层面优化：

- **Query 改写（Rewrite）****同义扩展**：用 LLM 或同义词表（WordNet/HowNet）生成 3-5 个变体，如“车险理赔” → “汽车保险索赔”、“车辆事故赔付”。注意：扩展太多会引入噪声，实践中限制 Top-3 并做去重。
- **分解复杂查询**：对多意图 Query（如“北京和上海哪个更适合创业”）拆成“北京创业环境”和“上海创业环境”分别检索再合并。
- **添加上下文**：在对话场景中，把历史轮次压缩成摘要拼到当前 Query 前。坑：上下文过长会稀释语义，建议用 sliding window 取最近 3 轮。
- **工程取舍**：LLM 改写成本高（延迟 200-500ms），对高频场景可用轻量模型（如 T5-small）或规则模板（如“XX 的 YY” → “YY XX”）。实际落地时，我曾在电商客服场景用规则改写覆盖 60% 的短 Query，LLM 只兜底长尾。
Query 路由（Routing）
- 根据意图分发到不同索引：如“价格”类 Query 走结构化字段，“描述”类走全文检索。
- 实现方式：用分类模型（BERT 微调）或 LLM 做意图识别，输出路由标签。
- **坑**：路由错误会导致检索完全失效。解法：设置 fallback 策略，当路由置信度 < 0.7 时走混合检索兜底。
混合检索（Hybrid Search）
- 结合稀疏检索（BM25，默认 k1=1.5, b=0.75）和稠密检索（如 BGE-M3 embedding）。
- 融合方式：**RRF（Reciprocal Rank Fusion）** 或加权和（权重需调参，一般 BM25:Embedding = 0.3:0.7 起步）。
- **为什么这么做**：BM25 擅长精确匹配（术语、ID），Embedding 擅长语义匹配（同义、近义），互补后 Recall@10 通常能提升 15-25%。
- **实际落地坑**：Embedding 模型对长文本（>512 tokens）会截断，导致信息丢失。解法：用 ColBERT 的 late interaction 或分段检索后聚合。
评估优化（Evaluation）
- 用 NDCG@K（排序质量）和 MRR（首个相关结果位置）衡量。
- 收集 500-1000 条低质量 Query，人工标注相关文档，做 A/B 测试。
- **关键**：不要只看离线指标，线上要监控用户点击率（CTR）和对话完成率。我曾遇到离线 NDCG 提升 10%，但线上 CTR 下降，原因是改写引入了不相关结果——最终加了一个 reranker（Cohere Rerank 3）过滤掉低分文档才解决。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，先诊断根因，区分是 Query 歧义、术语不匹配还是信息缺失；第二，针对性地做 Query 改写（同义扩展、分解、加上下文）、路由（意图分发）和混合检索（BM25+Embedding 用 RRF 融合）；第三，用 NDCG 和 MRR 完整流程评估，注意线上指标（CTR）与离线指标可能不一致。总结一句：优化 Query 不是万能药，要结合索引和模型侧一起调，且必须用数据验证。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户 Query 是“怎么修”，没有上下文，你怎么优化？

> 这种极端短 Query 信息量太少，改写和路由都难生效。我会先做**Query 补全**：从用户历史行为（如最近浏览的文档标题）或对话历史中提取实体，拼成“怎么修 [实体]”。如果无历史，则用规则模板生成“XX 的维修方法”，其中 XX 用高频实体填充（如“手机”、“电脑”）。同时，检索侧要降低 BM25 的 IDF 权重（调高 b 值），让短 Query 也能匹配到高频词。最后，如果效果仍差，直接返回“请提供更具体的设备名称”引导用户。

**追问 2**：混合检索中 BM25 和 Embedding 的权重怎么调？有通用经验吗？

> 没有通用值，但可以从 0.3:0.7 起步，用网格搜索（grid search）在验证集上调。经验上：如果文档是技术文档（术语多），BM25 权重可提到 0.5；如果是开放域对话（同义多），Embedding 权重可到 0.8。注意：RRF 不需要调权重，但需要调 k 值（默认 60），k 越小越偏向高排名结果。实际项目中，我用 Optuna 自动调参，目标函数是 NDCG@10，通常 50 次迭代就能收敛。

**追问 3**：LLM 改写 Query 时，怎么避免引入幻觉或偏离原意？

> 核心是**约束生成**：在 prompt 中明确“只改写，不新增信息”，并给 3-5 个示例（few-shot）。同时，改写后做**语义相似度校验**：用原 Query 和改写后的 embedding 余弦相似度，低于 0.8 则丢弃。另外，可以加一个**回译验证**：把改写结果再翻译回原 Query，看是否一致（成本高，只用于离线评估）。线上我通常只保留 Top-2 改写结果，并让 reranker 过滤掉低分项。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 一上来就说“用 LLM 改写 Query”，没有先分析根因。→ ✅ 先诊断：是 Query 本身问题（歧义/缺失）还是检索模型问题（embedding 不匹配/索引不全），再对症下药。LLM 改写不是万能药，对短 Query 效果差且成本高。
- ❌ 只提“混合检索”但不讲具体融合方法（RRF/加权和）和调参经验。→ ✅ 必须说出 RRF 的 k 值、BM25 的 k1/b 参数、Embedding 模型名称（如 BGE-M3），并给出调参起点和迭代方法。
- ❌ 说“用 NDCG 评估”但不说具体 K 值（如 NDCG@10）和人工标注流程。→ ✅ 明确 K=10，并说明标注方式：让 3 个人独立标注相关度（0/1/2），取多数或平均分，计算 inter-annotator agreement（Cohen’s Kappa > 0.6 才可用）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“实际落地坑”切入，比如“我在电商客服场景中，发现 LLM 改写导致延迟增加 300ms，于是用规则改写覆盖 60% 的短 Query，并加了一个 fallback 路由”。
- **如果你只做过传统 NLP**：用“文本分类”类比 Query 路由，用“同义词替换”类比 Query 改写，强调“从规则到模型”的演进路径，展示迁移能力。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了 ColBERT 的 late interaction 机制，发现它对长文本检索比普通 embedding 好 10%”，并提到用 RRF 融合 BM25 的 demo 实验。
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》
- 《Hybrid Search: Combining Sparse and Dense Retrieval for Better RAG》
- 《Query Rewriting for Retrieval-Augmented Generation: A Survey》
- 《Reciprocal Rank Fusion (RRF): A Simple and Effective Method for Combining Search Results》
- 《BGE-M3: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embedding Model》

---
