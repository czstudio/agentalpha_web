---
slug: enterprise-tk110
no: "1010"
title: "| Q12 | What is tokenization, and why is it necessary in LLMs"
question: "| Q12 | What is tokenization, and why is it necessary in LLMs"
excerpt: "这道题看似基础，但面试官真正想看的不是“背定义”，而是你对 LLM 底层数据流（text → tokens → embeddings → logits）的系统性理解。考察类型是“概念 + 工程取舍”。刁钻点在于：很多人能"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4682
updated: "2026-09-29"
---

## | Q12 | What is tokenization, and why is it necessary in LLMs

#### 1️⃣ 考察意图

这道题看似基础，但面试官真正想看的不是“背定义”，而是你对 LLM 底层数据流（text → tokens → embeddings → logits）的**系统性理解**。考察类型是“概念 + 工程取舍”。刁钻点在于：很多人能说出 BPE 步骤，但说不清为什么 LLM 必须用子词 tokenization，以及 tokenizer 选择如何直接影响模型性能（如推理速度、多语言覆盖、幻觉倾向）。答好了能展示你对 NLP 基础组件有“知其所以然”的硬实力，并能关联到实际训练和部署中的 trade-off。

#### 2️⃣ 标准答

**Tokenization 定义**Tokenization 是将原始文本切分为模型可处理的离散单元（token）的过程。在 LLM 中，这些 token 是子词（subword）级别，例如 BPE、WordPiece、Unigram 或 SentencePiece。举例：句子 “I love AI” 经 GPT-4 的 BPE tokenizer 可能被切为 `["I", " love", " AI"]`（注意空格处理），而 “tokenization” 可能被切为 `["token", "ization"]`。

**为什么 LLM 必须用 tokenization？**

1. **解决 OOV（Out-of-Vocabulary）问题**：如果按词切分，遇到生僻词（如 “antidisestablishment”）或拼写错误（如 “teh”）会直接报错或映射为 `<UNK>`。子词 tokenization 通过将罕见词拆分为常见子词（如 “anti” + “dis” + “establish” + “ment”），保证任何输入都能被覆盖。
2. **控制词表大小**：英文有几十万单词，但 BPE 用 50k 左右的 token 就能覆盖绝大多数文本。词表过大会导致 embedding 矩阵巨大（50k × d_model × 4 bytes），显存爆炸；过小则每个 token 信息量低，序列变长，计算复杂度 O(n²) 飙升。
3. **提高泛化能力**：模型学到的是子词组合规律，而非死记单词。例如看到 “unhappiness” 时，如果已见过 “happy” 和 “un-” 前缀，就能泛化理解。这对形态丰富的语言（如德语、芬兰语）尤其关键。

**常见方法对比与工程取舍**

- **BPE（Byte Pair Encoding）**：GPT 系列、Llama 系列使用。核心：统计字符对频率，迭代合并最频繁的对。
- 优点：简单高效，训练速度快。
- 缺点：贪心合并可能导致语义不合理的切分（如 “es” 被合并为独立 token，但 “es” 在英语中无意义）。
- 实战坑：Llama 2 的 tokenizer 对数字切分很差（如 “123” 被切为 “1”“2”“3”），导致数学推理能力下降。解法：在预训练数据中增加数字序列的采样，或使用数字专用的 tokenization 策略（如将数字按位切分）。
- **WordPiece**：BERT 使用。类似 BPE，但合并标准是“最大化训练数据似然”，而非频率。
- 优点：语义更合理，对多义词处理更好。
- 缺点：需要预计算概率，训练稍慢。
- **SentencePiece**：T5、Gemma 使用。直接处理原始文本（包括空格），不依赖预分词器。
- 优点：天然支持多语言（如中文、日文无空格），且词表可包含空格 token。
- 缺点：空格 token 会占用词表容量，且对英文可能引入噪声（如 “New York” 可能被切为 “New” + “▁York”）。
- **Unigram**：XLNet 使用。基于概率模型，通过 EM 算法迭代删除低概率 token。
- 优点：能生成更紧凑的词表（相同词表大小下困惑度更低）。
- 缺点：训练复杂度高，且对罕见词覆盖不如 BPE。

**实际落地的坑与解法**

- **坑 1：多语言不平衡**：如果训练语料以英文为主，BPE 会优先合并英文高频字符对，导致中文、阿拉伯语等语言的 token 碎片化严重（如 “你好” 被切为 “你”“好” 两个 token，而非一个）。
- 解法：在 SentencePiece 中设置 `character_coverage=0.9995` 强制保留所有 Unicode 字符，或使用多语言语料平衡采样。
- **坑 2：推理速度瓶颈**：词表越大，embedding 查找和 softmax 计算越慢。例如 GPT-3 的 50k 词表 vs Llama 2 的 32k 词表，后者推理速度快约 20%（【通用知识】）。
- 解法：使用 **FlashAttention** 加速注意力计算，或对输出层做 **tied embeddings**（输入输出共享权重）减少参数量。
- **坑 3：幻觉与 token 边界**：某些 token 组合可能诱导模型产生幻觉。例如 “New” + “York” 可能被模型理解为 “New” 和 “York” 两个独立概念，而非城市名。
- 解法：在微调时加入 token 边界感知的损失函数（如 **token-level contrastive learning**），或使用 **byte-level tokenization**（如 ByT5）完全避免边界问题。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，定义——tokenization 是将文本切分为子词单元的过程，例如 BPE 通过迭代合并高频字符对生成词表；第二，必要性——解决 OOV 问题、控制词表大小、提高泛化能力，缺一不可；第三，工程取舍——不同方法（BPE vs WordPiece vs SentencePiece）在训练速度、多语言支持、推理效率上有显著差异，实际落地需根据场景选择。总结一句：tokenization 是 LLM 的‘数据入口’，选错了模型性能直接打折。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果让你为一个中文大模型设计 tokenizer，你会选哪种方法？为什么？

> 选 SentencePiece，因为中文没有空格分隔，BPE 和 WordPiece 都需要预分词器（如 jieba），引入额外误差。SentencePiece 直接处理原始字符，且支持 `byte_fallback` 处理生僻汉字。词表大小建议 32k-50k，太小（如 16k）会导致每个汉字独立成 token，序列过长；太大（如 128k）则 embedding 矩阵过大。实际落地时需注意：中文标点（如“，”“。”）应保留为独立 token，避免被合并到相邻汉字中。

**追问 2**：BPE 和 WordPiece 在合并策略上的本质区别是什么？

> BPE 基于字符对频率合并，是贪心算法；WordPiece 基于互信息（MI）或似然增益，选择“合并后能最大化训练数据概率”的对。举例：在英文中，“th” 出现频率高，但合并后语义增益小；而 “un” + “happy” 合并为 “unhappy” 的语义增益大，WordPiece 更可能选择后者。实际效果：WordPiece 词表更紧凑，但训练慢 2-3 倍（【通用知识】）。

**追问 3**：tokenizer 的词表大小如何影响模型性能？给出具体数字。

> 词表大小 V 直接影响三个维度：1）embedding 层参数量 = V × d_model，V 从 32k 到 128k 时，参数量增加 4 倍，显存从 2GB 涨到 8GB（假设 d_model=4096）；2）序列长度 L 与 V 负相关，V 越小 L 越长，注意力计算 O(L²) 呈平方增长；3）推理时 softmax 计算 O(V)，V 翻倍则推理时间增加约 15-20%。经验值：英文模型 32k-50k，多语言模型 50k-100k，中文模型 32k-64k。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“tokenization 就是把句子切成单词，比如 ‘I love AI’ 切成 [‘I’, ‘love’, ‘AI’]” → ✅ 正确切入：必须强调是子词级别，并举例说明罕见词如何被拆解（如 “tokenization” → “token” + “ization”），展示对 OOV 问题的理解。
- ❌ 说“BPE 和 WordPiece 差不多，都是合并高频对” → ✅ 正确切入：指出合并标准不同（频率 vs 似然），并给出具体例子（如 “th” 在 BPE 中易被合并，在 WordPiece 中可能被跳过）。
- ❌ 说“词表越大越好，因为能覆盖更多词汇” → ✅ 正确切入：必须 trade-off，指出词表过大会导致 embedding 矩阵膨胀、推理变慢，且对罕见词覆盖收益递减。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“tokenizer 对检索质量的影响”切入——例如，BPE 对数字切分差导致 embedding 不准确，可以讲如何通过自定义 tokenizer 或后处理提升检索 recall。
- **如果你只做过传统 NLP**：用“词袋模型 vs 子词 tokenization”类比——词袋模型有 OOV 问题，子词 tokenization 通过拆解解决，类似拼写校正中的编辑距离思想。
- **如果你是校招无项目**：聚焦“BPE 论文复现 demo”——在 wikitext-103 上训练 BPE tokenizer，对比 10k/30k/50k 词表对困惑度的影响，并分析原因（如 10k 词表导致序列过长，PPL 上升 5%）。
- 《Neural Machine Translation of Rare Words with Subword Units》（BPE 原始论文，Sennrich et al., 2016）
- 《SentencePiece: A simple and language independent subword tokenizer and detokenizer》（Kudo & Richardson, 2018）
- 《ByT5: Towards a token-free future with pre-trained byte-to-byte models》（Xue et al., 2022）
- 《Tokenization Matters! Degrading Large Language Models through Challenging Their Tokenization》（2023，分析 tokenizer 对 LLM 性能的影响）
- Hugging Face Tokenizers 库文档（BPE/WordPiece/Unigram 实现与对比）

---
