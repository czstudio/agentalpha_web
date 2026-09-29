---
slug: rag-tk246
no: "1146"
title: "Q5: 除了基础的向量检索，你还知道哪些可以提升 RAG 检索质量的技术？**"
question: "Q5: 除了基础的向量检索，你还知道哪些可以提升 RAG 检索质量的技术？**"
excerpt: "面试官想看你是否只停留在“向量检索+LLM”的玩具级认知，还是真正落地过生产级RAG系统。考察类型是系统设计+工程取舍，刁钻点在于：你不仅要列举技术，还要说清楚每个技术解决什么问题、引入什么新问题、在什么场景下值得用。答"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4019
updated: "2026-09-29"
---

## Q5: 除了基础的向量检索，你还知道哪些可以提升 RAG 检索质量的技术？**

`P1` · `rag`

🏷 标签：`rag`, `retrieval`, `reranking`, `query-expansion`, `hybrid-search`

#### 1️⃣ 考察意图

面试官想看你是否只停留在“向量检索+LLM”的玩具级认知，还是真正落地过生产级RAG系统。考察类型是**系统设计+工程取舍**，刁钻点在于：你不仅要列举技术，还要说清楚**每个技术解决什么问题、引入什么新问题、在什么场景下值得用**。答好了能展示你对检索整条链路的深度理解，包括召回率瓶颈、延迟成本、以及如何用工程手段平衡效果与效率。

#### 2️⃣ 标准答

从四个层面系统提升RAG检索质量：**查询端优化、检索端混合、结果端精排、迭代式反馈**。

#### 查询端：改写与扩展

- **查询改写（Query Rewriting）**：用户query常短且模糊，用LLM生成多个子问题或同义表述。例如“苹果股价”改写为“Apple Inc. stock price 2024 Q3”。**坑**：改写可能引入噪声，需设置置信度阈值，只对低分query触发。
- **HyDE（Hypothetical Document Embeddings）**：先让LLM基于query生成一段“假设的理想文档”，再用该文档的embedding去检索。**为什么这么做**：直接query embedding与文档embedding的分布可能不匹配，HyDE通过生成文档桥接语义鸿沟。**取舍**：增加一次LLM调用，延迟增加200-500ms，适合对召回率要求高、对延迟不敏感的场景（如知识库问答）。
- **查询分解（Query Decomposition）**：复杂问题拆成子问题，分别检索后合并。例如“2023年特斯拉销量和毛利率”拆成“特斯拉2023年销量”和“特斯拉2023年毛利率”。**落地坑**：子问题间可能有重叠，需去重和排序，否则引入冗余。

#### 检索端：混合检索

- **向量+关键词混合（Hybrid Search）**：向量检索（如DPR、ColBERT）擅长语义匹配，但漏掉精确匹配（如产品编号“A-123”）。BM25（默认k1=1.5, b=0.75）擅长关键词精确匹配，但忽略语义。**做法**：分别检索后按加权融合（如RRF，Reciprocal Rank Fusion，权重0.6向量+0.4BM25）。**取舍**：增加一倍检索延迟和存储成本，但召回率提升10-20%（通用知识）。
- **稀疏检索（Sparse Retrieval）**：如SPLADE，学习生成稀疏向量，兼具语义和精确匹配能力。**优势**：无需维护两套索引，但训练成本高，适合有GPU资源的团队。

#### 结果端：重排序

- **交叉编码器重排序（Cross-Encoder Reranking）**：用Cohere rerank或BERT-based模型（如monoBERT）对初筛top-100结果精排。交叉编码器直接计算query-doc对的相关性分数，比双编码器（如DPR）更准，但计算量是O(n)（n为候选数）。**工程实践**：只对top-50或top-100重排序，控制延迟在100ms内。**坑**：重排序模型需与检索模型对齐，否则分数分布不一致（如检索得分0.8但重排得分0.2），需做归一化或校准。
- **基于LLM的排序（LLM-as-Judge）**：用GPT-4对候选文档打分，如“请判断文档A是否回答了问题Q，输出0-1分数”。**取舍**：效果最好但成本极高（每轮调用0.01-0.1美元），只适合高价值场景（如法律合同审查）。

#### 迭代式检索：反馈与自适应

- **Self-RAG**：检索后让LLM判断是否需要更多信息（如输出“检索不足”token），触发二次检索。**做法**：每次检索后，LLM生成一个反思token（如“Continue”或“Stop”），控制检索轮数。**落地坑**：需微调LLM以支持反思token，否则推理不稳定。
- **FLARE（Forward-Looking Active Retrieval）**：在生成过程中，当LLM对下一个token置信度低时，主动检索相关文档。**优势**：动态补充知识，适合长文本生成（如报告撰写）。**取舍**：增加生成延迟，且检索时机难调（过早则噪声多，过晚则已生成错误）。

#### 知识图谱增强

- **实体链接+图检索**：将query中的实体链接到知识图谱（如Wikidata），沿关系路径检索相关文档。例如“苹果CEO”链接到“Tim Cook”，再检索“Tim Cook 2024年薪酬”。**优势**：结构化检索，适合多跳推理。**坑**：知识图谱构建成本高，且实体链接准确率影响下游。

**总结**：没有银弹。生产级RAG通常组合2-3种技术：查询改写+混合检索+重排序是性价比最高的基线；迭代检索和知识图谱增强适合特定场景。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从查询端、检索端、结果端、迭代反馈四个层面回答。查询端用HyDE和查询改写解决query模糊问题；检索端用向量+BM25混合检索平衡语义和精确匹配；结果端用交叉编码器重排序提升top-k准确率；迭代反馈用Self-RAG或FLARE动态补充信息。总结一句：没有万能方案，生产环境通常组合查询改写+混合检索+重排序作为基线，再根据场景选择迭代或图增强。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：混合检索中向量和BM25的权重怎么调？有没有自适应方法？

> 权重调优分三步：1）离线在验证集上网格搜索（如向量权重0.3-0.7，步长0.1），选召回率最高的组合；2）在线用A/B测试验证。自适应方法有：基于query类型动态调整（如短query偏BM25，长query偏向量），或训练一个轻量分类器（如逻辑回归）预测最佳权重。**坑**：权重对数据集敏感，换领域需重新调参。

**追问 2**：重排序模型怎么选？Cohere rerank和monoBERT哪个好？

> Cohere rerank是商业API，延迟低（约50ms/100条），但成本高（按调用量计费）。monoBERT是开源方案（如cross-encoder/ms-marco-MiniLM-L-6-v2），可本地部署，延迟约100ms/100条（GPU），但需自己微调。**取舍**：如果团队有GPU资源且数据量大（>10万条），选monoBERT；如果快速验证或数据量小，选Cohere。**落地坑**：monoBERT的输入长度限制（通常512 tokens），长文档需截断或分段。

**追问 3**：Self-RAG的反思token怎么训练？需要多少数据？

> 需要构造训练数据：对每个query-doc对，标注是否需要继续检索（如“Continue”或“Stop”）。数据量至少5000条，用GPT-4生成标签（成本约50美元）。训练时用LoRA微调LLM，在反思token位置加分类头。**坑**：反思token的生成不稳定，需设置温度=0.1并做多次采样投票。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“用更好的embedding模型” → ✅ 强调系统级优化：embedding模型只是基础，查询改写、混合检索、重排序的组合效果远大于换模型。
- ❌ 说“重排序用LLM直接排序”而不提成本 → ✅ 明确LLM排序的延迟和成本，并给出替代方案（交叉编码器）。
- ❌ 忽略工程约束，只谈理论方法 → ✅ 每个技术都给出延迟、成本、数据量约束，体现落地思维。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“我在XX项目中用HyDE+混合检索+重排序，召回率从75%提升到88%”切入，展示实验对比和工程细节。
- **如果你只做过传统NLP**：用“BM25类似TF-IDF，但加了文档长度归一化；交叉编码器类似文本匹配任务”类比迁移，强调理解检索本质。
- **如果你是校招无项目**：聚焦“我在论文复现中实现了Self-RAG的反思token机制，用LoRA微调Llama-2-7B，在HotpotQA上F1提升5%”，展示动手能力。
- “HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels” (Gao et al., 2022)
- “Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection” (Asai et al., 2023)
- “FLARE: Forward-Looking Active Retrieval Augmented Generation” (Jiang et al., 2023)
- “SPLADE: Sparse Lexical and Expansion Model for First Stage Ranking” (Formal et al., 2021)
- “ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT” (Khattab & Zaharia, 2020)

---
