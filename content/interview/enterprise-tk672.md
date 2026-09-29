---
slug: enterprise-tk672
no: "1572"
title: "What kind of data is typically used for pretraining LLMs, and what are the considerations regarding data quality and scale"
question: "What kind of data is typically used for pretraining LLMs, and what are the considerations regarding data quality and scale"
excerpt: "面试官想考察你对预训练数据工程的深度理解，而非简单罗列“维基百科、书籍、网页”等来源。刁钻点在于：你是否清楚数据质量与规模之间的博弈——比如去重过度会损失多样性，低质量数据混入会拉低模型性能，数据配比如何影响下游任务偏向"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3609
updated: "2026-09-29"
---

## What kind of data is typically used for pretraining LLMs, and what are the considerations regarding data quality and scale

#### 1️⃣ 考察意图

面试官想考察你对预训练数据工程的深度理解，而非简单罗列“维基百科、书籍、网页”等来源。刁钻点在于：你是否清楚数据质量与规模之间的博弈——比如去重过度会损失多样性，低质量数据混入会拉低模型性能，数据配比如何影响下游任务偏向。答好了能展示你从数据清洗（MinHash去重、困惑度过滤）到配比策略（The Pile、C4）的实战经验，以及处理过TB级数据时的工程取舍。

#### 2️⃣ 标准答

预训练数据通常来自互联网文本、书籍、学术论文、代码仓库等，但核心挑战在于如何从海量噪声中提取高质量信号。以下从数据来源、质量处理、规模影响、配比策略四个层面展开。

**数据来源与典型规模**

- **互联网爬虫**：Common Crawl（每月约20TB原始数据）是主力，但噪声极高（广告、乱码、机器生成内容）。C4数据集通过启发式过滤（如去除重复行、低语言模型困惑度）将其压缩至约750GB。
- **书籍与学术**：BooksCorpus（约7GB）和arXiv论文（约100GB）提供长程依赖和结构化知识。实际中需处理PDF解析错误（如数学公式乱码），常用Grobid或ScienceBeam。
- **代码**：GitHub代码（如The Stack，约3TB）提升推理和编程能力，但需过滤许可证违规（如GPL）和低质量注释。
- **多语言数据**：mC4（Common Crawl的多语言版本）覆盖101种语言，但低资源语言（如斯瓦希里语）质量参差不齐，需用语言检测器（如fastText）和困惑度阈值筛选。

**数据质量：三大关键处理**

- **去重**：重复数据会导致模型过拟合和记忆化。使用MinHash（LSH优化）在文档级去重，参数设置（如签名数128、band数4）需权衡精度与速度。坑：过度去重会删除合法重复（如新闻模板），需保留部分高频模板。解法：对URL和内容分别去重，保留URL唯一但内容相似的样本。
- **质量过滤**：基于启发式规则（如句子长度>3词、标点比例<50%）和分类器（如fastText训练的质量模型，在C4上达到0.95 AUC）。实际落地时，低质量数据（如SEO垃圾）的困惑度通常>100，而高质量文本（如维基百科）<50。坑：过滤太严会丢失方言和口语化数据（如Reddit对话），需保留一定比例（如5%）以增强多样性。
- **隐私与安全**：移除PII（如邮箱、身份证号）用正则或NER模型（如spaCy），毒性过滤用Perspective API。注意：过度隐私清洗会破坏上下文（如“联系我：xxx”被删后句子不完整），需用占位符替换而非直接删除。

**数据规模：Scaling Law的陷阱**

- 规模越大，模型泛化能力越强，但存在边际递减。Chinchilla Scaling Law指出，在固定算力下，模型参数与数据量应等比例增长（如7B模型需约2T tokens）。坑：盲目扩大数据量会引入更多噪声，导致训练不稳定（loss震荡）。解法：在训练中动态监控验证集困惑度，若下降停滞则增加数据过滤强度。
- 长尾分布问题：互联网数据中，高频词（如“the”）占比过高，低频实体（如“量子计算”）不足。需用词频采样（如T5的c4采样策略）或重要性采样（基于TF-IDF）平衡分布。

**数据配比：决定模型能力偏向**

- 典型配比：The Pile（22个来源，如PubMed占8%、GitHub占15%）和GLaM（64%网页、24%书籍、12%代码）。配比影响下游任务：代码比例高（>20%）提升HumanEval得分，但可能降低自然语言流畅度。坑：固定配比无法适应训练动态，需动态调整（如训练中期增加代码数据）。解法：用多任务学习中的梯度冲突检测（如PCGrad）调整配比。
- 实际落地：在训练前用小型模型（如GPT-2 125M）测试不同配比在HellaSwag和MMLU上的表现，选择最优组合。例如，增加10%书籍数据可使MMLU提升2%，但HellaSwag下降1%。

**总结**：数据质量与规模同等重要，去重、过滤、配比需协同优化。一个常见坑是只关注规模而忽略质量，导致模型“记住”噪声而非“理解”知识。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据来源、质量处理、规模影响、配比策略四个层面回答。数据来源主要是Common Crawl、书籍和代码，但需用MinHash去重和困惑度过滤提升质量。规模上遵循Chinchilla Scaling Law，但需警惕长尾分布和过拟合。配比决定模型偏向，比如代码比例高提升编程能力。总结一句：数据工程是预训练的核心，质量与规模需平衡，否则模型会‘记住’噪声而非‘理解’知识。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你如何评估数据清洗的效果？有没有具体的指标？

> 用两个指标：一是清洗前后模型在标准基准（如HellaSwag、MMLU）上的准确率变化，二是训练损失收敛速度。例如，对100GB Common Crawl数据做MinHash去重后，训练GPT-2 125M的HellaSwag准确率从45%提升到52%，loss收敛快20%。注意：需控制其他变量（如学习率、batch size）不变，否则无法归因。

**追问 2**：如果数据量有限（比如只有10GB），你如何最大化利用？

> 采用数据增强和课程学习。数据增强：用回译（back-translation）生成变体，或对代码数据做语法树变换（如重命名变量）。课程学习：先训练高质量数据（如维基百科），再混入低质量数据（如Reddit），避免模型早期被噪声干扰。坑：增强数据可能引入伪模式，需用验证集监控过拟合。

**追问 3**：多语言数据中，低资源语言质量差，你怎么处理？

> 用语言检测器（如fastText）过滤非目标语言，再用困惑度阈值（如<150）筛选。对低资源语言，采用回译或跨语言迁移（如用XLM-R的embedding初始化）。实际落地：在mC4中，斯瓦希里语数据仅占0.1%，需用SMOTE过采样或从维基百科补充。注意：低资源语言数据量少，模型容易过拟合，需用正则化（如dropout 0.1）和早停。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只列举数据来源（“Common Crawl、维基百科、书籍”）而不谈处理细节 → ✅ 必须深入去重（MinHash参数）、过滤（困惑度阈值）、配比（动态调整）等工程实践。
- ❌ 认为数据规模越大越好，忽略质量 → ✅ 强调Chinchilla Scaling Law的边际递减，并给出具体案例（如C4过滤后模型性能提升）。
- ❌ 忽视数据配比的影响，认为所有来源等权混合 → ✅ 指出配比决定模型偏向（如代码比例高提升编程能力），并给出动态调整策略（如梯度冲突检测）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从数据清洗角度切入，对比RAG中检索文档的过滤（如用BM25去重）与预训练数据处理的异同，强调对噪声的容忍度差异。
- **如果你只做过传统NLP**：用文本分类中的特征工程类比，比如TF-IDF过滤低频词对应预训练中的词频采样，强调迁移思路。
- **如果你是校招无项目**：聚焦论文复现，比如用C4数据集复现GPT-2训练，并对比清洗前后在HellaSwag上的表现，展示对数据工程的实操理解。
- “Deduplicating Training Data Makes Language Models Better” (Khashabi et al., 2021)
- “C4: Colossal Clean Crawled Corpus” (Raffel et al., 2020)
- “The Pile: An 800GB Dataset of Diverse Text for Language Modeling” (Gao et al., 2020)
- “Scaling Data-Constrained Language Models” (Muennighoff et al., 2023)
- “MinHash for Large-Scale Near-Duplicate Detection” (Broder, 1997)

---
