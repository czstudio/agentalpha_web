---
slug: rag-tk010
no: "910"
title: "什么是 Token"
question: "什么是 Token"
excerpt: "面试官想确认你是否真正理解Token作为LLM输入基石的本质，而非仅停留在“Token是词”的模糊认知。这是基础概念题，但刁钻点在于：它考察你对分词算法（BPE/WordPiece/Unigram）的工程取舍、Token"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3302
updated: "2026-09-29"
---

## 1 什么是 Token

`P0` · `rag`

🏷 标签：`token`, `tokenization`, `bpe`, `llm-basics`

#### 1️⃣ 考察意图

面试官想确认你是否真正理解Token作为LLM输入基石的本质，而非仅停留在“Token是词”的模糊认知。这是基础概念题，但刁钻点在于：它考察你对分词算法（BPE/WordPiece/Unigram）的工程取舍、Token对模型上下文窗口和计算成本的直接影响，以及实际落地中分词不一致导致的坑。答好了能展示你对LLM底层机制的扎实理解，而非只会调API。

#### 2️⃣ 标准答

**Token定义与核心角色**

Token是LLM处理文本的最小原子单元，可以是词、子词或字符。模型不直接读字符串，而是将文本通过分词器（Tokenizer）转换为整数ID序列，每个ID对应嵌入层（Embedding Layer）中的一个向量。例如，句子“I love AI”可能被分词为[“I”, “ love”, “ AI”]，映射为[12, 456, 789]。

**主流分词算法与取舍**

- **BPE（Byte Pair Encoding）**：从字符开始，迭代合并最高频相邻字符对。GPT系列使用。优点：词汇表大小可控（典型50k），能处理罕见词（拆成子词）。缺点：合并规则贪婪，可能产生非语义子词（如“unhappiness”拆成“un”、“happiness”或“un”、“happi”、“ness”，取决于语料）。
- **WordPiece**：类似BPE，但合并基于概率（最大化训练数据似然）。BERT使用。优点：子词更语义化。缺点：训练更复杂。
- **Unigram**：从大词汇表开始，逐步剪枝移除最小化损失的分词。SentencePiece使用。优点：支持多语言，可输出多个分词候选。缺点：解码需额外处理。
- **工程取舍**：BPE简单高效，但WordPiece在语义保留上略优。实际中，GPT系列选BPE因训练速度优先，BERT选WordPiece因下游任务精度敏感。

**Token对模型的影响**

- **上下文长度**：Token数直接决定模型能处理的序列长度。例如，GPT-4的128k上下文窗口意味着最多128k个Token。中文因单字信息密度高，相同文本Token数比英文少约1.5倍（中文约1.5字符/Token，英文约3.5字符/Token），这影响长文档处理策略。
- **计算成本**：Transformer自注意力复杂度为O(n²)，Token数翻倍，计算量翻4倍。因此，分词粒度越细（如字符级），Token数越多，推理越慢。实际中，BPE子词级在精度和效率间平衡。
- **罕见词处理**：BPE通过拆分子词处理OOV（Out-of-Vocabulary）词。例如，生僻词“antidisestablishment”可能拆成“anti”、“dis”、“establish”、“ment”。但拆得太碎会丢失语义，影响模型理解。

**实际落地的坑与解法**

- **坑1：分词不一致**：不同分词器对同一文本输出不同Token序列，导致模型输入偏移。例如，微调时用不同分词器，模型可能无法正确对齐。解法：统一分词器，或使用SentencePiece这类可逆分词器。
- **坑2：特殊Token处理**：如`<|endoftext|>`、`<pad>`等，若未正确处理，模型可能生成无效输出。解法：在分词器中显式定义并管理特殊Token ID。
- **坑3：多语言分词**：中文无空格，BPE可能将“我爱AI”拆成“我”、“爱”、“AI”，但若语料不足，可能拆成“我爱”、“AI”。解法：预训练时加入多语言语料，或使用Unigram分词器。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Token是LLM处理文本的最小单位，通过分词器将文本转为整数ID序列，每个ID对应嵌入向量。第二，主流算法如BPE、WordPiece各有取舍，BPE简单高效但可能产生非语义子词，WordPiece更语义化但训练复杂。第三，Token直接影响上下文长度和计算成本，中文Token数比英文少约1.5倍，实际落地需注意分词一致性和特殊Token处理。总结一句：Token是LLM的输入基石，理解其原理和取舍是优化模型性能的关键。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：BPE和WordPiece的具体区别是什么？为什么GPT用BPE而BERT用WordPiece？

> BPE基于频率合并相邻字符对，WordPiece基于概率（最大化似然）合并。GPT选BPE因训练速度快，适合大规模预训练；BERT选WordPiece因下游任务对语义敏感，WordPiece子词更语义化，提升精度。工程取舍：BPE在速度上胜出，WordPiece在精度上略优。

**追问 2**：如果模型上下文窗口是4096个Token，中文和英文文本能处理的最大长度差多少？

> 中文约1.5字符/Token，英文约3.5字符/Token。因此，4096个Token对应中文约6144字符，英文约14336字符。中文能处理更长文本，但信息密度高，模型可能更易丢失细节。实际中，需根据任务调整分块策略，如中文文档可切更长的块。

**追问 3**：如何设计分词器以支持多语言，避免中文分词错误？

> 使用Unigram分词器（如SentencePiece），它从大词汇表剪枝，支持多语言且可逆。训练时加入多语言语料，如中文、英文、日文混合。另外，可设置词汇表大小（如32k-50k）平衡覆盖率和效率。实际中，Llama 2使用BPE但加入多语言语料，效果良好。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Token就是单词，分词就是把句子拆成单词” → ✅ 正确切入：Token可以是子词或字符，分词算法如BPE从字符开始合并，处理OOV词。
- ❌ 说“Token数越多，模型性能越好” → ✅ 正确切入：Token数增加会提升计算成本（O(n²)），需在上下文长度和效率间平衡，如使用FlashAttention优化。
- ❌ 说“所有分词器都一样，只是实现不同” → ✅ 正确切入：BPE、WordPiece、Unigram算法不同，影响子词语义和训练速度，需根据任务选择。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从Token对检索分块的影响切入，如中文文档分块时需考虑Token数，避免切碎语义。可举例：使用BPE分词器统一处理查询和文档，提升检索精度。
- **如果你只做过传统NLP**：用词袋模型类比Token，强调分词粒度从词到子词的演进，以及如何解决OOV问题。可举例：传统TF-IDF用词，LLM用子词，提升泛化能力。
- **如果你是校招无项目**：聚焦BPE算法原理，可提及实现过简单BPE分词器，并分析不同词汇表大小对模型困惑度的影响。可举例：在WikiText-2上实验，发现32k词汇表在精度和效率间最佳。
- 《Neural Machine Translation of Rare Words with Subword Units》（BPE论文）
- 《SentencePiece: A simple and language independent subword tokenizer and detokenizer》
- 《Attention Is All You Need》（Transformer基础，理解Token与自注意力关系）
- Hugging Face Tokenizers库文档（实践BPE/WordPiece实现）
- 《LLM Tokenization: A Deep Dive》（博客，分析不同分词器对模型影响）

---
