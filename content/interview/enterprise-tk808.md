---
slug: enterprise-tk808
no: "1708"
title: "How do LLMs handle out-of-vocabulary (OOV) words"
question: "How do LLMs handle out-of-vocabulary (OOV) words"
excerpt: "面试官想验证你是否理解LLM底层分词机制，而非停留在“用子词分词”的浅层答案。考察类型是工程取舍+概念理解。刁钻点在于：OOV在传统NLP是致命问题，但在LLM中几乎被消除，候选人需解释“为什么”以及“代价是什么”。答好"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4011
updated: "2026-09-29"
---

## How do LLMs handle out-of-vocabulary (OOV) words

#### 1️⃣ 考察意图

面试官想验证你是否理解LLM底层分词机制，而非停留在“用子词分词”的浅层答案。考察类型是**工程取舍+概念理解**。刁钻点在于：OOV在传统NLP是致命问题，但在LLM中几乎被消除，候选人需解释“为什么”以及“代价是什么”。答好了能展示你对tokenization（BPE/WordPiece/SentencePiece）、字节级编码（如GPT-2的byte-level BPE）和罕见词处理trade-off的硬核理解，并能关联到序列长度、训练效率等实际工程问题。

#### 2️⃣ 标准答

LLM通过**子词分词（Subword Tokenization）** 从根本上解决了OOV问题，核心思路是将罕见词或未知词拆分为更小的已知子词单元。主流方案有三种，各有取舍：

- **BPE（Byte Pair Encoding）**：GPT系列、LLaMA使用。从字符级开始，迭代合并最频繁的相邻字符对，直到达到预设词表大小（如32k或50k）。OOV词如“unhappiness”会被拆分为“un”、“happiness”或“un”、“happi”、“ness”，取决于词表。**坑**：BPE对罕见词可能过度拆分，导致序列长度暴增。例如“floccinaucinihilipilification”可能被拆成10+个token，推理时显存占用飙升。**解法**：在训练时对罕见词做数据增强（如随机替换为子词序列），或使用更大的词表（如100k）减少拆分次数，但词表过大会增加embedding层参数量。
- **WordPiece**：BERT、DistilBERT使用。类似BPE但合并标准是**最大化训练数据似然**，而非频率。它用贪心算法选择能提升语言模型概率的合并对。OOV处理更平滑，例如“playing”可能被拆为“play”+“##ing”，其中“##”表示子词是后缀。**工程取舍**：WordPiece对形态丰富的语言（如德语、土耳其语）效果更好，但训练计算量比BPE高约20%（需每次合并后重算似然）。
- **SentencePiece / Unigram**：T5、ALBERT、Gemma使用。不依赖空格预分词，直接处理原始文本（包括中文、日文等无空格语言）。Unigram从大词表开始，逐步删除对似然贡献最小的token，直到达到目标大小。OOV词被自动拆分为Unigram模型中最可能的子词序列。**实际落地坑**：SentencePiece在日语中可能把“東京”拆成“東”+“京”，丢失语义；**解法**：对特定领域（如医疗、法律）使用领域预训练的分词器，或添加自定义token（如“東京”作为整体）。
- **字节级BPE（Byte-level BPE）**：GPT-2、GPT-3、Claude使用。将文本编码为UTF-8字节序列（256个基础字节），再应用BPE。**优势**：可表示任意Unicode字符，OOV彻底消失——即使输入是乱码“😀🔥”，也能拆为字节级子词。**代价**：序列长度增加约2-3倍（因为一个中文字符占3个字节），导致推理延迟上升。例如“你好”在GPT-2中可能被拆为6个token，而在WordPiece中仅2个。
- **特殊token处理**：传统模型用`[UNK]`表示OOV，但现代LLM几乎不用。因为子词分词能覆盖99.9%的输入，`[UNK]`仅在分词器遇到完全未知的字节序列时出现（如损坏的UTF-8）。**实际效果**：在LLaMA-2的32k词表上，对英文维基百科的OOV率低于0.01%，对中文低于0.05%。罕见词（如“pneumonoultramicroscopicsilicovolcanoconiosis”）会被拆分为多个子词，但语义保留完整。

**总结**：LLM通过子词分词将OOV问题转化为“序列长度 vs 语义保留”的trade-off。字节级BPE提供最大覆盖但牺牲效率，WordPiece/BPE在常见语言中更高效。面试官期待你指出：OOV不是LLM的问题，**罕见词拆分导致的序列长度膨胀**才是实际工程瓶颈。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，子词分词机制，包括BPE、WordPiece、SentencePiece，它们通过将OOV词拆分为已知子词单元来消除OOV；第二，字节级BPE（如GPT-2）用256个字节覆盖所有字符，彻底解决OOV但增加序列长度；第三，实际工程取舍——罕见词拆分导致token数暴增，影响推理速度和显存。总结一句：LLM通过子词分词几乎消除了OOV，但代价是序列长度膨胀，需在词表大小和拆分粒度间做权衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果输入是“こんにちは”（日语），BPE和SentencePiece处理有何不同？

> BPE依赖空格预分词，日语无空格，所以BPE会先按字符拆分（如“こ”、“ん”等），再合并高频对，可能导致“こん”被拆开。SentencePiece直接处理原始文本，能学到“こんにちは”作为整体token（如果语料中出现足够多次）。**应对**：指出SentencePiece对CJK语言更友好，但词表中日语token占比需调优；BPE需额外空格预处理（如用MeCab分词），否则效果差。

**追问 2**：如何评估一个分词器对OOV的处理质量？

> 用三个指标：1）**OOV率**：在测试集上计算无法被拆分的token比例（理想<0.1%）；2）**平均子词数**：对罕见词（如词频<10）统计拆分后的token数，过高说明分词器粒度太细；3）**语义保留度**：用下游任务（如NER、分类）评估，比较原始文本和分词后重建文本的F1分数。**工程取舍**：OOV率低但子词数高时，需权衡推理速度；可做A/B测试，选择在延迟和准确率间平衡的分词器。

**追问 3**：为什么LLaMA-3改用更大的词表（128k）？有什么代价？

> 更大词表减少罕见词拆分次数，降低序列长度约15-20%，提升推理吞吐。但代价：1）embedding层参数量从32k4096≈134M增至128k4096≈524M，增加约3倍；2）训练时softmax计算量变大（因为输出层维度增加）；3）对长尾语言（如小语种）可能过拟合。**应对**：指出这是“词表大小 vs 模型容量”的经典trade-off，LLaMA-3通过增加模型深度（从32层到40层）来补偿embedding层的参数膨胀。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“LLM用[UNK] token处理OOV，遇到未知词就替换为[UNK]” → ✅ 正确切入：现代LLM几乎不用[UNK]，因为子词分词能覆盖绝大多数输入；[UNK]仅在字节级BPE遇到损坏UTF-8时出现，且概率极低（<0.01%）。
- ❌ 说“BPE和WordPiece完全一样，只是名字不同” → ✅ 正确切入：BPE基于频率合并，WordPiece基于似然最大化；WordPiece对形态丰富的语言更优，但训练计算量高20%。
- ❌ 说“字节级BPE完美无缺，没有缺点” → ✅ 正确切入：字节级BPE序列长度增加2-3倍，推理延迟上升；需用FlashAttention等优化技术补偿。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索阶段的分词器选择”切入——对比BPE和WordPiece对罕见实体（如药物名“Tocilizumab”）的拆分效果，指出BPE可能拆成“Toc”、“il”、“izu”、“mab”导致检索召回下降，而WordPiece保留“Tocilizumab”作为整体token，提升检索精度。
- **如果你只做过传统NLP**：用“词袋模型 vs 子词分词”类比——传统模型用词级向量，OOV词直接丢弃；LLM通过子词分词保留语义，类似用词根+词缀组合（如“un-”+“happiness”），解释为什么LLM在低资源语言上表现更好。
- **如果你是校招无项目**：聚焦“BPE论文复现”——在GitHub上实现一个mini BPE分词器（参考《Neural Machine Translation of Rare Words with Subword Units》），对比不同词表大小（10k/32k/50k）对OOV率和序列长度的影响，输出分析报告。
- 《Neural Machine Translation of Rare Words with Subword Units》（BPE原始论文）
- 《SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing》
- 《Efficient Estimation of Word Representations in Vector Space》（Word2Vec的OOV处理对比）
- 《LLaMA: Open and Efficient Foundation Language Models》（词表设计细节）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（缓解序列长度膨胀的优化技术）

---
