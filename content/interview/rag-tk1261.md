---
slug: rag-tk1261
no: "2161"
title: "单/多模态RAG检索怎么做"
question: "单/多模态RAG检索怎么做"
excerpt: "面试官想考察你对多模态RAG的系统设计能力，而非单纯背诵概念。刁钻点在于：单模态检索（文本/图像）是基础，但多模态的核心是“跨模态对齐”与“融合排序”的工程取舍。答好了能展示你对检索系统延迟、召回率、存储开销的平衡能力，"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3374
updated: "2026-09-29"
---

## 单/多模态RAG检索怎么做

`P1` · `rag`

🏷 标签：`rag`, `multimodal`, `retrieval`, `clustering`, `fusion`

#### 1️⃣ 考察意图

面试官想考察你对多模态RAG的系统设计能力，而非单纯背诵概念。刁钻点在于：单模态检索（文本/图像）是基础，但多模态的核心是“跨模态对齐”与“融合排序”的工程取舍。答好了能展示你对检索系统延迟、召回率、存储开销的平衡能力，以及从论文（如CLIP、ColBERT）到落地的实战经验。这是P1进阶题，区分“只会调API”和“能设计生产级系统”的候选人。

#### 2️⃣ 标准答

**单模态RAG检索**：文本用BM25（k1=1.5, b=0.75）做稀疏检索，配合向量检索（如DPR或Sentence-BERT）做稠密检索，最后用Cross-encoder rerank（如Cohere rerank-v3）提升精度。图像用CLIP ViT-L/14提取特征，存入FAISS索引（IVF+PQ量化，减少内存占用）。表格/图表用OCR+结构化解析（如Camelot）转为文本后走文本通道。

**多模态检索策略**：三种主流方案，各有取舍：

- **独立索引+融合**：各模态独立建索引（文本用Elasticsearch，图像用FAISS），检索后加权合并（如文本得分0.6 + 图像得分0.4）。优点：实现简单，模块解耦；缺点：跨模态语义鸿沟，比如“红色跑车”的文本query可能匹配不到“红色轿车”图像。
- **跨模态对齐**：用CLIP或ALIGN统一文本和图像到同一嵌入空间。推理时，将query文本编码，直接检索图像索引。优点：语义对齐好，召回率高（通用知识：CLIP在Flickr30k上Recall@1约70%）；缺点：训练成本高（需百万级图文对），且对长文本query（>77 tokens）需截断或分段。
- **多模态大模型生成query**：用LLaVA或Qwen-VL将多模态query（如图+文）转为纯文本描述，再走文本检索。优点：灵活，能处理复杂指令（如“找图中左上角的物体”）；缺点：延迟高（生成需1-2秒），且依赖模型幻觉控制。

**融合排序**：实战中常用级联检索——先用CLIP粗筛（Top-100），再用多模态rerank（如BLIP-2）精排Top-10。坑点：CLIP对细粒度区分弱（如“蓝色衬衫”vs“青色衬衫”），需加入文本属性过滤（如颜色、尺寸）作为硬约束。

**实际落地的坑+解法**：

- **坑1**：多模态存储爆炸。图像索引若存原始特征（512维float），100万张图需2GB内存。解法：用PQ（Product Quantization）压缩至8字节/向量，召回率仅降2-3%。
- **坑2**：模态缺失。用户query只有文本，但知识库全是图像。解法：用文本到图像的跨模态检索（CLIP text encoder），或预生成图像描述（如BLIP-2 caption）作为文本索引。
- **坑3**：延迟瓶颈。多模态rerank单次推理需50-100ms。解法：用异步流水线（检索+rerank并行），或降级为仅用CLIP余弦相似度（<5ms）。

**评估指标**：各模态独立召回率（如文本Recall@5、图像Recall@5），端到端答案准确率（用GPT-4打分，对比ground truth）。注意：多模态场景下，召回率可能虚高（如图像匹配但文本不匹配），需联合评估。

#### 3️⃣ 答题模板（30秒电梯版）

> “这个问题我从三个层面回答：单模态检索、多模态策略、融合排序。单模态用BM25+向量检索+rerank，图像用CLIP+FAISS。多模态有三种方案：独立索引融合、跨模态对齐（如CLIP）、多模态大模型生成query。融合排序推荐级联检索，先粗筛再精排。总结一句：多模态RAG的核心是平衡召回率、延迟和存储，CLIP对齐+级联rerank是当前最稳的工程方案。”

#### 4️⃣ 高频追问 & 应对

**追问1**：CLIP对齐后，文本和图像的embedding维度不同怎么办？

> CLIP的text encoder和image encoder输出维度相同（如512维），这是设计好的。但若用不同模型（如BERT+ResNet），需加一个映射层（如MLP）对齐到同一空间。坑点：映射层训练需配对数据，且可能引入噪声。实战中，直接复用CLIP预训练权重，避免额外训练。

**追问2**：多模态rerank怎么实现？延迟能接受吗？

> 用BLIP-2或LLaVA-1.5做rerank：将query和候选图文对拼接，输出相关性分数。延迟约50-100ms（单卡A100）。优化：只rerank Top-20候选，且用batch推理（一次处理多个候选）。若延迟敏感，降级为CLIP余弦相似度（<5ms），但召回率可能降5-10%。

**追问3**：如何处理query是图像、知识库是文本的反向场景？

> 用CLIP的image encoder编码query图像，text encoder编码知识库文本，直接计算相似度。或者，用图像caption模型（如BLIP-2）生成描述，再走文本检索。注意：caption质量影响大，需用beam search（beam=5）提升准确性。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “直接用多模态大模型（如GPT-4V）做检索，一步到位。” → ✅ “大模型推理成本高（单次\$0.01+），且不支持大规模索引。正确做法是先用CLIP等轻量模型做检索，再用大模型做rerank或生成答案。”
- ❌ “多模态检索就是文本+图像分开查，然后合并结果。” → ✅ “独立检索会丢失跨模态语义，比如‘红色跑车’可能匹配不到‘红色轿车’图像。必须用跨模态对齐（如CLIP）或融合排序（如级联rerank）来弥补。”
- ❌ “评估只看端到端准确率就行。” → ✅ “多模态场景下，各模态召回率可能不均衡（如图像召回高但文本低）。必须分模态评估，并联合分析失败案例（如模态缺失或对齐错误）。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“多模态知识库构建”切入，强调你如何用CLIP+FAISS处理百万级图文数据，并设计级联rerank降低延迟。举例：在电商商品检索中，将文本和图像索引独立，用加权融合提升召回率5%。
- **如果你只做过传统NLP**：用“文本检索的扩展”类比，说明BM25和向量检索是基础，多模态只是增加图像通道。强调你理解跨模态对齐的数学原理（如对比学习损失），并愿意快速学习CLIP等工具。
- **如果你是校招无项目**：聚焦“CLIP论文复现”，说明你实现过Flickr30k上的图文检索，并对比了独立索引与对齐方案的召回率差异。强调你对FAISS和HNSW索引的熟悉度，以及如何用PQ压缩存储。
- CLIP: Learning Transferable Visual Models From Natural Language Supervision (OpenAI, 2021)
- BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models (Salesforce, 2023)
- FAISS: A Library for Efficient Similarity Search (Facebook, 2017)
- ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction (Stanford, 2020)
- 博客：Multimodal RAG with CLIP and FAISS (Towards Data Science, 2023)

---
