---
slug: rag-tk1356
no: "2256"
title: "📌 Q97: When should you use fine-tuning vs. RAG"
question: "📌 Q97: When should you use fine-tuning vs. RAG"
excerpt: "面试官想考察你是否能跳出“非此即彼”的二元思维，真正理解RAG和fine-tuning在LLM应用中的本质区别与互补性。这不是背概念题，而是系统设计取舍题。刁钻点在于：很多人会机械回答“RAG用于知识，fine-tuni"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3678
updated: "2026-09-29"
---

## 📌 Q97: When should you use fine-tuning vs. RAG

`P1` · `rag`

🏷 标签：`rag`, `fine-tuning`, `llm`, `system-design`

#### 1️⃣ 考察意图

面试官想考察你是否能跳出“非此即彼”的二元思维，真正理解RAG和fine-tuning在LLM应用中的本质区别与互补性。这不是背概念题，而是**系统设计取舍题**。刁钻点在于：很多人会机械回答“RAG用于知识，fine-tuning用于风格”，但面试官真正想看的是你能否在**知识更新频率、推理成本、数据隐私、模型行为控制**四个维度上给出量化判断，并说出**为什么不能只用一种**。答好了能展示你从“调API”到“设计生产级系统”的硬实力。

#### 2️⃣ 标准答

**核心原则**：RAG解决“模型不知道什么”，fine-tuning解决“模型该怎么做”。两者不是替代关系，而是正交的优化维度。

**一、RAG的适用场景**

- **知识密集型任务**：需要引用最新/私有/长尾知识（如2024年财报、内部产品文档）。RAG通过检索外部知识库（如用BM25+DPR混合检索，或ColBERT的后期交互）注入上下文，避免模型参数化记忆。
- **高频更新场景**：知识库每天变化（如新闻摘要、电商商品问答）。RAG只需更新索引，无需重训模型，成本远低于fine-tuning。
- **减少幻觉**：当任务要求高事实性（如医疗诊断、法律咨询），RAG让模型“查了再答”，输出可溯源。实际落地坑：检索质量是瓶颈——用HNSW索引+分块策略（如按段落分chunk，重叠20%）能提升召回，但需监控检索延迟（<200ms）。
- **数据隐私**：客户数据不能用于训练（如金融合规）。RAG在推理时动态检索，数据不进入模型参数，符合GDPR。

**二、Fine-tuning的适用场景**

- **行为对齐**：需要模型学习特定输出格式（如JSON）、语气（如客服礼貌）、或领域术语（如法律条款的精确表述）。例如，用LoRA微调Llama 3，在1000条客服对话上训练，将“请稍等”改为“我们正在为您加急处理”。
- **领域知识内化**：当知识相对稳定且数据充足（如医学影像报告生成，需模型掌握解剖学知识）。但注意：fine-tuning不能替代RAG处理长尾知识——模型参数容量有限，强行记忆会导致灾难性遗忘。
- **推理效率**：fine-tuning后模型可直接输出，省去检索步骤。对于延迟敏感场景（如实时翻译），微调后的模型比RAG+LLM流水线快30-50%。

**三、混合方案：RAG + Fine-tuning**

- **典型架构**：用fine-tuning让模型学会“如何用检索结果”。例如，微调模型在收到RAG返回的文档后，能自动提取关键信息并生成结构化回答（如“根据文档X，结论是Y”）。
- **实际案例**：客服系统——RAG检索产品手册，fine-tuning调整回复风格（礼貌、简洁）。评估指标：RAG负责准确率（>90%），fine-tuning负责用户满意度（>4.5分）。
- **坑与解法**：微调后模型可能“过度依赖”检索结果，忽略自身知识。解法：在微调数据中混入20%无检索样本，让模型学会“不知道就说不知道”。

**四、决策矩阵（量化判断）**

| 维度 | RAG | Fine-tuning |
|---|---|---|
| 知识更新频率 | 高（每天） | 低（季度） |
| 数据隐私要求 | 高（不训练） | 低（可训练） |
| 推理成本 | 高（检索+生成） | 低（仅生成） |
| 行为控制精度 | 低（靠prompt） | 高（参数级） |

**总结**：RAG是“外挂知识库”，fine-tuning是“内化行为规则”。生产系统中，80%场景用RAG解决知识问题，20%用fine-tuning优化行为，两者结合能覆盖95%的LLM应用需求。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，RAG适合知识密集型、高频更新、需要事实溯源的任务，比如客服问答；第二，fine-tuning适合行为对齐、领域内化、延迟敏感的场景，比如生成固定格式报告；第三，两者可以混合使用——RAG提供知识，fine-tuning教会模型如何利用这些知识。总结一句：RAG解决‘知道什么’，fine-tuning解决‘怎么回答’，具体选择取决于知识更新频率和推理成本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果数据量很少（比如只有100条），你选RAG还是fine-tuning？

> 选RAG。100条数据不足以让fine-tuning学到稳定模式，容易过拟合。用RAG把这100条文档作为知识库，配合prompt工程（如few-shot示例）就能达到不错效果。如果非要微调，用LoRA+数据增强（如回译生成变体），但效果仍不如RAG。实际经验：fine-tuning至少需要500-1000条高质量数据才能看到明显收益。

**追问 2**：RAG检索质量差怎么办？你会怎么优化？

> 从三个层面优化：1）检索策略：用混合检索（BM25+稠密向量），BM25处理精确匹配，稠密向量处理语义相似，权重按业务调（如电商用BM25权重0.7）。2）分块策略：按语义边界分块（如段落），重叠20%避免信息断裂，块大小控制在256-512 tokens。3）后处理：用reranker（如Cohere rerank）对top-20结果重排序，提升top-5准确率。注意：reranker会增加延迟，需在准确率和速度间权衡。

**追问 3**：fine-tuning后模型在RAG场景下表现变差，怎么解决？

> 这是典型的灾难性遗忘。解法：1）在微调数据中混入20-30%的RAG相关样本（如带检索结果的问答对），让模型保持对检索结果的敏感度。2）使用多任务微调，同时优化“直接回答”和“基于检索回答”两个目标。3）如果问题严重，回退到RAG-only方案，用prompt工程替代微调。实际案例：某金融客服微调后，模型开始忽略检索结果，加入10%的“检索+回答”样本后，准确率从72%回升到88%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “RAG和fine-tuning是互斥的，只能选一个” → ✅ “两者是正交的，RAG解决知识获取，fine-tuning解决行为对齐，可以组合使用。”
- ❌ “fine-tuning可以替代RAG，只要数据够多” → ✅ “模型参数容量有限，强行记忆长尾知识会导致灾难性遗忘，RAG更适合动态知识。”
- ❌ “RAG不需要fine-tuning，prompt就够了” → ✅ “对于复杂行为（如结构化输出、特定语气），fine-tuning比prompt更稳定，且推理成本更低。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索质量优化”切入，讲你如何用BM25+DPR混合检索提升召回，以及为什么在某个场景下选择RAG而非fine-tuning。
- **如果你只做过传统NLP**：用“知识图谱 vs 模型微调”类比——RAG像知识图谱的实时查询，fine-tuning像预训练模型的领域适配，强调两者互补。
- **如果你是校招无项目**：聚焦论文复现，比如对比“RAG+LLaMA”和“Fine-tuned LLaMA”在HotpotQA上的表现，分析知识更新频率和推理成本的trade-off。
- “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks” (Lewis et al., 2020)
- “LoRA: Low-Rank Adaptation of Large Language Models” (Hu et al., 2021)
- “ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction” (Khattab & Zaharia, 2020)
- “When Not to Trust Your LLM: A Guide to RAG vs Fine-tuning” (Anthropic Blog, 2024)
- “HNSW: Hierarchical Navigable Small World Graphs for Approximate Nearest Neighbor Search” (Malkov & Yashunin, 2016)
