---
slug: enterprise-tk183
no: "1083"
title: "What are different techniques to be used to improved retrieval"
question: "What are different techniques to be used to improved retrieval"
excerpt: "面试官想考察你对检索系统整条链路优化的系统性理解，而非零散罗列技巧。这是一道系统设计+工程取舍题，刁钻点在于：候选人常只提“用更好的embedding”或“加个reranker”，但缺乏对索引、查询、模型、融合四个层面的"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4032
updated: "2026-09-29"
---

## What are different techniques to be used to improved retrieval

#### 1️⃣ 考察意图

面试官想考察你对检索系统整条链路优化的系统性理解，而非零散罗列技巧。这是一道**系统设计+工程取舍**题，刁钻点在于：候选人常只提“用更好的embedding”或“加个reranker”，但缺乏对**索引、查询、模型、融合**四个层面的分层思考，以及各环节的**成本-收益权衡**。答好了能展示你从数据预处理到在线推理的端到端工程视野，以及面对海量数据时做技术选型的判断力。

#### 2️⃣ 标准答

检索优化可从四个层面切入：**索引层、查询层、模型层、融合层**。每个层面都有具体技术和工程取舍。

**索引层优化**

- **稀疏索引**：倒排索引的BM25调参是关键。默认k1=1.5,b=0.75，但长文档场景需调高b（如0.85）抑制长度偏差；短文本场景（如FAQ）可调低b（0.5）让词频更敏感。**坑**：索引分片不均导致查询热点，解法是用一致性哈希+虚拟节点，或按文档ID范围预分区。
- **稠密索引**：向量索引选HNSW还是IVF？HNSW（efConstruction=200, M=16）召回率高但内存大（约向量维度×4字节×1.5倍索引开销）；IVF（nlist=4096）内存小但需nprobe调优（通常设为10-50）。**取舍**：HNSW适合<1000万向量且对延迟敏感的场景；IVF+PQ（乘积量化）可压缩至1/4内存，适合十亿级但接受1-2ms额外延迟。
- **混合索引**：同时建BM25倒排和向量索引，用RRF（Reciprocal Rank Fusion）合并结果。RRF的k值（通常60）控制稀疏/稠密权重——k越小，排名靠前的文档权重越大。**实战坑**：两路检索延迟不同步，需设超时阈值（如向量检索50ms，BM25 20ms），超时则降级为单路结果。

**查询层优化**

- **查询改写**：基于同义词词典（如WordNet）或LLM生成同义变体（“iPhone维修”→“苹果手机修理”）。**取舍**：LLM改写效果好但增加1-2次推理调用，对高QPS场景不友好；可用轻量T5-small微调（参数量60M），延迟<10ms。
- **查询扩展**：伪相关反馈（PRF）——取首轮检索Top-5文档，提取高频词加入查询。**坑**：扩展词可能引入噪声（如“苹果”扩展出“水果”），需用互信息（PMI）过滤，只保留与原始查询PMI>0.3的词。
- **查询消歧**：对多义词（如“Java”指编程语言或岛屿）用上下文embedding做聚类，选择最相关语义。实战中常用BGE-M3模型（支持多语言+稠密/稀疏混合）直接输出查询向量，避免显式消歧。

**模型层优化**

- **嵌入模型**：从Sentence-BERT升级到BGE-large（1024维）或E5-mistral（4096维），在MTEB上MRR提升5-8%。**取舍**：高维向量增加存储和检索延迟（HNSW图构建时间O(NlogN)），可用Matryoshka表示学习（如Nomic-embed）支持动态降维（从1024→256维），精度损失<2%。
- **微调检索器**：用ColBERT的后期交互（late interaction）替代双编码器，通过MaxSim操作捕捉词级匹配。**实战**：在MS MARCO上，ColBERTv2（基于BERT-base）比DPR（双编码器）MRR@10高3-4个点，但推理延迟增加2倍（需存储token级向量）。解法：用ColBERT的压缩版本（如PLAID），通过质心剪枝将延迟压到30ms以内。
- **重排序**：第一轮粗排（BM25/向量检索）取Top-100，用交叉编码器（如Cross-Encoder/ms-marco-MiniLM-L-6-v2）精排。**坑**：交叉编码器对100个文档推理需100次前向，延迟约500ms；可用**级联重排**：先用轻量模型（如TinyBERT）筛Top-20，再用大模型（如DeBERTa-v3）精排，总延迟降至150ms。

**融合层优化**

- **混合检索**：稀疏+稠密结果用RRF或线性加权（权重通过网格搜索确定，如BM25:0.4, Dense:0.6）。**取舍**：RRF无需训练但忽略分数分布；线性加权需验证集调参，但可引入分数归一化（如Min-Max或Z-score）。
- **多路召回**：对长尾查询（如“2024年诺贝尔物理学奖得主”）增加知识图谱检索（如Wikidata实体链接），用图遍历扩展相关实体。**实战**：在电商场景，结合文本检索+图像embedding（CLIP）多模态召回，点击率提升12%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从索引、查询、模型、融合四个层面回答。索引层，用HNSW+BM25混合索引，通过RRF融合；查询层，用LLM改写+伪相关反馈扩展；模型层，用BGE-large做嵌入，ColBERT做后期交互，交叉编码器做重排序；融合层，多路召回加权合并。总结一句：检索优化不是单点突破，而是整条链路工程取舍——在延迟、内存、召回率之间找到业务最优解。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说用HNSW，那当数据量到10亿时，HNSW的内存和延迟瓶颈怎么解决？

> 应对策略：10亿向量（768维，float32）裸存约3TB，HNSW索引膨胀1.5倍到4.5TB，单机不可行。解法：1）用IVF-PQ，nlist=65536，PQ压缩到32字节/向量，总内存降至32GB；2）分布式分片，每台机器负责1亿向量，用一致性哈希路由；3）用DiskANN（微软论文）将索引部分存SSD，内存只存图结构，延迟增加但内存降10倍。**取舍**：IVF-PQ召回率比HNSW低2-3%，但可接受；DiskANN在1亿规模下延迟<10ms。

**追问 2**：重排序时，交叉编码器太慢，你怎么优化？

> 应对策略：1）**级联重排**：先用MiniLM（6层）筛Top-50，再用DeBERTa-v3（12层）精排Top-10，总延迟从500ms降到120ms；2）**批处理**：将Top-100文档打包成batch（batch_size=32），利用GPU并行推理，单次推理时间从5ms降到0.3ms/文档；3）**知识蒸馏**：用大模型（如GPT-4）生成软标签，训练小模型（如TinyBERT）做重排，精度损失<1%但延迟降10倍。**坑**：蒸馏时需注意标签噪声，用温度缩放（T=2）软化概率。

**追问 3**：混合检索中，稀疏和稠密结果分数不匹配，怎么融合？

> 应对策略：1）**分数归一化**：对BM25分数做Min-Max归一化（映射到[0,1]），对向量相似度做Z-score归一化（减去均值除标准差），消除量纲差异；2）**学习型融合**：用逻辑回归或LambdaRank学习每路权重，输入特征包括分数、排名、查询长度等；3）**RRF变体**：用加权RRF，对每路结果乘以权重（如BM25:0.3, Dense:0.7），权重通过网格搜索确定。**取舍**：归一化简单但忽略分布形状；学习型融合效果好但需标注数据（如点击日志）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“用更好的embedding模型”或“加个reranker”，没有分层结构 → ✅ 按索引/查询/模型/融合四层展开，每层给具体技术名和工程取舍。
- ❌ 说“HNSW比IVF好”，没有场景限定 → ✅ 明确HNSW适合<1000万向量，IVF-PQ适合十亿级，并给出内存和延迟对比。
- ❌ 忽略重排序的延迟问题，只说“用cross-encoder” → ✅ 主动提级联重排、批处理、知识蒸馏等优化方案，展示工程落地意识。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“混合检索+重排序”切入，结合项目中的查询改写（如LLM生成同义词）和RRF融合，展示你对端到端延迟的优化（如用级联重排将首屏时间从800ms降到200ms）。
- **如果你只做过传统NLP**：用“BM25调参+伪相关反馈”类比迁移，强调你对稀疏检索的深入理解（如k1/b参数对长文档的影响），并展示你如何用WordNet做查询扩展。
- **如果你是校招无项目**：聚焦ColBERT论文复现，在MS MARCO上实现后期交互，对比DPR的MRR@10差异，并给出压缩方案（如PLAID），展示你对前沿技术的动手能力。
- ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction
- DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node
- BGE-M3: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embedding
- Matryoshka Representation Learning for Flexible Dimensionality Reduction
- RRF: Reciprocal Rank Fusion outperforms individual rankers in information retrieval

---
