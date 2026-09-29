---
slug: enterprise-tk130
no: "1030"
title: "| Q111 | How do LLMs handle out-of-vocabulary (OOV) words"
question: "| Q111 | How do LLMs handle out-of-vocabulary (OOV) words"
excerpt: "面试官想看你是否理解现代LLM处理OOV的核心机制——不是靠词表硬匹配，而是通过子词分词将OOV拆解为已知片段。考察类型是概念+工程取舍，刁钻点在于：候选人常停留在“用BPE解决OOV”的表面，但说不出BPE、WordP"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3470
updated: "2026-09-29"
---

## | Q111 | How do LLMs handle out-of-vocabulary (OOV) words

#### 1️⃣ 考察意图

面试官想看你是否理解现代LLM处理OOV的核心机制——不是靠词表硬匹配，而是通过子词分词将OOV拆解为已知片段。考察类型是**概念+工程取舍**，刁钻点在于：候选人常停留在“用BPE解决OOV”的表面，但说不出BPE、WordPiece、SentencePiece在OOV场景下的具体差异（如未登录字符处理、退化到[UNK]的边界条件）。答好了能展示你对分词器设计的底层理解，以及在实际部署中如何选择分词策略来降低OOV率。

#### 2️⃣ 标准答

现代LLM（如GPT-4、Llama 3、BERT）通过**子词分词（Subword Tokenization）** 将OOV词拆解为词表中已知的子词单元，从根本上避免传统词级模型遇到OOV就丢信息的问题。核心方法有三种，各有取舍：

- **BPE（Byte Pair Encoding）**
- 原理：从字符级开始，统计最频繁的相邻字符对，迭代合并直到达到预设词表大小（如GPT-2的50,257）。
- OOV处理：例如“unhappiness”可能拆为“un”、“happiness”或“un”、“happ”、“iness”，取决于训练语料中“happiness”是否被合并。
- 坑：若遇到完全未出现的字符（如罕见Unicode符号），BPE会退化为字符级，但不会产生[UNK]。
- 取舍：词表越大，OOV率越低，但模型参数量和推理延迟增加。GPT-4使用约100k词表，平衡了覆盖率和效率。
- **WordPiece**
- 原理：类似BPE，但合并依据是**互信息（Mutual Information）**，即选择能最大化训练数据似然的子词对，而非单纯频率。
- OOV处理：例如“unhappiness”可能拆为“un”、“##happiness”，其中“##”表示子词是词内片段。
- 坑：若子词仍不在词表中，WordPiece会输出[UNK]（如BERT遇到罕见emoji）。
- 实际落地的坑：在中文场景下，WordPiece需要预分词（如jieba），导致OOV传播——若预分词错误，后续子词拆分也会错。解法：改用SentencePiece直接处理原始文本。
- **SentencePiece**
- 原理：将输入视为Unicode字符序列，直接训练BPE或Unigram语言模型，无需预分词。
- OOV处理：支持**字节级回退**，例如Llama 3使用SentencePiece + 字节级BPE，遇到任何字符都能拆成UTF-8字节（如“😊”拆为3个字节token），理论上零OOV。
- 取舍：字节级回退增加序列长度（一个汉字可能从1个token变成2-3个字节token），但完全消除了[UNK]。
- 实际落地的坑：字节级tokenizer在推理时可能产生无效UTF-8序列（如截断导致乱码），需在解码时做合法性校验。

**总结**：现代LLM通过子词分词将OOV率降到接近0%，但不同方法在[UNK]退化、序列长度、预分词依赖上有明显trade-off。实际部署中，若领域词汇密集（如医疗术语），建议用SentencePiece + 领域词表微调，避免BPE的频繁合并导致语义丢失。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，现代LLM通过子词分词（如BPE、WordPiece、SentencePiece）将OOV词拆为已知子词，避免直接丢弃；第二，不同方法在[UNK]退化上有差异——WordPiece可能输出[UNK]，而SentencePiece通过字节级回退实现零OOV；第三，实际部署中需权衡词表大小和序列长度，例如医疗领域建议用SentencePiece+领域微调。总结一句：OOV问题已被子词分词基本解决，但选择分词器时需关注领域适配和[UNK]边界条件。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果遇到一个完全由未登录字符组成的词（如新造的emoji组合），BPE和SentencePiece分别怎么处理？

> BPE会退化为字符级，将每个字符作为独立token输出，不会产生[UNK]。SentencePiece如果启用字节级回退，会拆成UTF-8字节序列（如4个字节），同样无[UNK]。但WordPiece会输出[UNK]，因为它的词表不包含字符级token。实际中，若应用需要处理大量新字符（如社交媒体文本），优先选SentencePiece。

**追问 2**：子词分词会导致语义丢失吗？比如“unhappiness”拆成“un”和“happiness”与拆成“un”、“happ”、“iness”有什么区别？

> 会。第一种拆分保留了“happiness”的完整语义，第二种拆碎了“happiness”，模型需要从“happ”和“iness”中重新组合语义，增加学习负担。BPE倾向于保留高频子词（如“happiness”），而WordPiece基于互信息可能拆得更碎。工程上，若领域词汇有固定词根（如生物术语），建议用Unigram语言模型（SentencePiece的另一种模式）来学习更合理的拆分边界。

**追问 3**：在部署时，如何评估分词器对OOV的处理效果？

> 用两个指标：OOV率（词表中未出现的token比例）和序列长度膨胀率（子词token数/原始词数）。例如，在医疗文本上，BPE的OOV率可能为0.5%，但序列长度膨胀1.2倍；SentencePiece字节级模式OOV率为0%，但膨胀1.5倍。选择时需结合模型最大序列长度（如Llama 3的8k）和推理延迟要求。若序列长度是瓶颈，可考虑增大词表（如从32k到64k）来降低膨胀率。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “现代LLM用BPE解决OOV，所以没有OOV问题了。”→ ✅ “BPE确实大幅降低OOV，但WordPiece仍可能输出[UNK]，且所有子词分词在遇到罕见字符时都会增加序列长度，影响推理效率。”
- ❌ “SentencePiece比BPE好，因为它不需要预分词。”→ ✅ “SentencePiece的字节级回退消除了[UNK]，但代价是序列长度膨胀；BPE在常见语言上更高效。选择取决于应用场景——中文用SentencePiece，英文用BPE即可。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从检索阶段OOV对召回率的影响切入，说明如何通过分词器选择（如SentencePiece）降低罕见实体（如产品名）的OOV率，提升检索命中率。
- **如果你只做过传统NLP**：用词袋模型（BoW）的OOV问题做类比，对比子词分词如何通过拆解保留语义，并举例说明在情感分析任务中OOV率从15%降到0.3%。
- **如果你是校招无项目**：聚焦BPE和WordPiece的论文复现（如NeurIPS 2016的BPE论文），展示对合并策略和互信息公式的理解，并附上在WikiText-103上的OOV率对比实验。
- 《Neural Machine Translation of Rare Words with Subword Units》（BPE原始论文，NeurIPS 2016）
- 《Google’s Neural Machine Translation System: Bridging the Gap between Human and Machine Translation》（WordPiece出处）
- 《SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing》（SentencePiece论文）
- 《Byte-level BPE: GPT-2 tokenizer实现解析》（OpenAI博客）
- 《Hugging Face Tokenizers库文档：BPE vs WordPiece vs SentencePiece性能对比》

---
