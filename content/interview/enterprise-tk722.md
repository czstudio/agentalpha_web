---
slug: enterprise-tk722
no: "1622"
title: "What is a token in the language model"
question: "What is a token in the language model"
excerpt: "面试官想确认你不仅知道“token 是文本切分单元”这个定义，还能深入解释 tokenization 算法（如 BPE、SentencePiece）的工程原理，以及 token 数量如何直接影响模型的计算成本、上下文窗口"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4280
updated: "2026-09-29"
---

## What is a token in the language model

#### 1️⃣ 考察意图

面试官想确认你不仅知道“token 是文本切分单元”这个定义，还能深入解释 tokenization 算法（如 BPE、SentencePiece）的工程原理，以及 token 数量如何直接影响模型的计算成本、上下文窗口和推理延迟。刁钻点在于：很多人只背了概念，但说不清“为什么不同模型用不同分词器”以及“token 数翻倍时，注意力计算量翻 4 倍”这种实际影响。答好了能展示你对 LLM 底层机制的扎实理解，以及从训练到推理的工程直觉。

#### 2️⃣ 标准答

**定义与核心作用**Token 是语言模型处理文本的最小原子单元。模型不是直接读字符或单词，而是通过 tokenizer 将文本映射为整数 ID 序列。每个 token 对应一个嵌入向量，模型基于这些向量做自注意力计算。Token 粒度决定了词汇表大小和序列长度，直接影响模型容量和效率。

**主流分词算法**

- **BPE（Byte-Pair Encoding）**：GPT-2、GPT-3、GPT-4 使用。从字符级开始，迭代合并最高频的相邻 token 对，直到达到预设词汇表大小（如 50257）。优点是能处理未登录词（OOV），但合并规则是贪心的，可能产生语义不完整的子词。
- **WordPiece**：BERT 使用。类似 BPE，但合并标准不是频率，而是基于语言模型似然增益（最大化训练数据概率）。词汇表更小（约 30k），对英文单词边界更敏感。
- **Unigram**：XLNet、ALBERT 使用。从大词汇表开始，逐步剪枝掉使似然下降最小的 token，最终保留最优子集。训练更慢，但分词结果更平滑。
- **SentencePiece**：LLaMA、Mistral 使用。不依赖空格预处理，直接处理原始字节流（包括 Unicode）。内置 BPE 和 Unigram 两种模式，LLaMA 用的是 BPE 变体。优势是天然支持多语言，无需语言特定的预分词器。

**工程取舍：词汇表大小 vs 序列长度**词汇表越大，每个 token 携带信息越多，序列长度越短（节省注意力计算），但嵌入矩阵变大（参数量增加）。例如 GPT-2 词汇表 50257，LLaMA 词汇表 32000。选择 32k 是平衡点：对英文足够覆盖高频词，对中文用字节级 BPE 也能高效编码（中文一个字约 1-2 个 token）。如果词汇表太小（如 5k），中文句子会被切碎成大量 token，导致上下文窗口浪费。

**实际落地的坑 + 解法**

- **坑**：中文分词时，BPE 可能把“深度学习”切成“深”“度”“学”“习”，导致语义碎片化，模型难以捕捉短语含义。
- **解法**：在预训练前，用中文语料训练 SentencePiece 模型，并设置 `character_coverage=0.9995` 确保覆盖所有汉字。同时增大词汇表到 32k-64k，让常见双字词（如“学习”“模型”）成为独立 token。实测表明，词汇表从 5k 提升到 32k 后，中文文本的 token 数减少约 40%，下游分类任务准确率提升 2-3 个点。

**特殊 token 的作用**

- `[CLS]`：BERT 分类任务中，该 token 的最终隐藏状态作为序列表示。
- `[SEP]`：分隔两个句子，用于 NSP 或 QA 任务。
- `[PAD]`：填充到固定长度，注意力掩码会忽略它。
- `[UNK]`：替换词汇表外的罕见字符，但现代分词器（如 BPE）几乎不会产生 UNK。
- `[MASK]`：MLM 预训练中随机替换 15% 的 token，模型需预测原词。

**Token 数量对性能的影响**

- **计算复杂度**：Transformer 自注意力是 O(n²)，n 为 token 数。序列长度从 2k 到 4k，计算量翻 4 倍。
- **上下文窗口**：GPT-4 支持 32k tokens，Claude 3 支持 200k。长上下文依赖高效注意力（如 FlashAttention）和位置编码（如 RoPE）。
- **推理延迟**：每个 token 生成需一次前向传播，token 数越多，首 token 延迟越高。实际工程中常用 KV cache 优化，但 cache 大小也随 token 数线性增长。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、算法、工程影响三个层面回答。定义上，token 是模型处理的最小文本单元，通过分词器将文本映射为整数 ID。算法层面，主流有 BPE（GPT 系列）、WordPiece（BERT）、SentencePiece（LLaMA），核心区别在于合并策略和是否依赖空格。工程影响上，token 数直接决定计算复杂度（O(n²)）和上下文窗口大小，词汇表大小需要权衡序列长度和嵌入参数量。总结一句：理解 token 就是理解 LLM 的输入层和效率瓶颈。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 LLaMA 用 SentencePiece 而不用 BPE？

> 核心原因是 SentencePiece 不依赖空格预处理，天然支持多语言（包括中文、日文等无空格语言）。BPE 需要先按空格分单词，对 CJK 字符会退化为字符级。SentencePiece 直接处理原始字节流，用 Unicode 字节做 BPE 合并，词汇表更紧凑。LLaMA 选择 SentencePiece 的 BPE 模式，词汇表 32k，比 GPT-2 的 50k 更小，但通过字节级编码覆盖了所有语言。代价是训练时需要额外处理字节回退逻辑，推理时解码稍慢。

**追问 2**：如果我想把 GPT-4 的 tokenizer 换成 SentencePiece，会有什么问题？

> 直接换会导致灾难性遗忘。因为模型在预训练时，嵌入层和输出层（lm_head）的权重与 token ID 一一对应。换 tokenizer 后，所有 token ID 映射改变，嵌入矩阵需要重新初始化，模型必须从头训练或做大量微调。实际工程中，tokenizer 是模型架构的一部分，更换成本极高。唯一可行场景是：用新 tokenizer 对旧模型做知识蒸馏，但通常收益不如直接训练新模型。

**追问 3**：如何评估一个 tokenizer 的好坏？

> 三个指标：压缩率（平均每个 token 编码的字符数）、OOV 率（UNK token 占比）、下游任务影响。压缩率越高，序列越短，计算成本越低。OOV 率应接近 0%，否则信息丢失。下游任务上，用相同模型架构，对比不同 tokenizer 在文本分类、翻译等任务上的准确率。一个实用技巧：用 `tokenizers` 库的 `train` 函数，设置 `vocab_size=32000`，在目标语料上训练后，计算平均序列长度，比默认 tokenizer 短 20% 以上才算合格。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Token 就是单词，比如 ‘hello’ 是一个 token，‘world’ 是另一个。”→ ✅ Token 可以是子词或字符，例如 BPE 可能把 ‘unbelievable’ 切成 ‘un’、‘believe’、‘able’，单词边界不是唯一标准。需要强调子词粒度的优势：处理 OOV 和形态变化。
- ❌ “所有模型都用 BPE，只是词汇表大小不同。”→ ✅ 不同模型用不同算法：BERT 用 WordPiece，XLNet 用 Unigram，LLaMA 用 SentencePiece。每种算法有不同合并策略和预处理逻辑，直接影响多语言支持能力。
- ❌ “Token 数越多，模型越准确。”→ ✅ Token 数多意味着序列长，计算成本高，但准确率不一定提升。过长序列可能引入噪声，且注意力机制在长序列上效果衰减。实际中，通过合理分词压缩序列长度，反而能提升效率。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“文档分块与 token 预算”切入，说明如何根据模型上下文窗口（如 4k tokens）设计 chunk 大小，以及 tokenizer 对检索召回率的影响（中文用 SentencePiece 比 BPE 更高效）。
- **如果你只做过传统 NLP**：用“词袋模型 vs 子词分词”类比，解释 token 是“词袋”的升级版，解决了 OOV 和稀疏性问题。强调从统计 NLP 到神经网络的演进中，tokenization 是桥梁。
- **如果你是校招无项目**：聚焦“用 HuggingFace tokenizers 训练 BPE 的 demo”，描述如何对比 vocab_size=5000 和 32000 对文本分类准确率的影响，展示实验设计和分析能力。
- BPE 原始论文：Neural Machine Translation of Rare Words with Subword Units (Sennrich et al., 2016)
- SentencePiece 论文：SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing (Kudo & Richardson, 2018)
- HuggingFace tokenizers 库文档：快速训练自定义 tokenizer 的教程
- FlashAttention 论文：FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao et al., 2022)
- RoPE 位置编码论文：RoFormer: Enhanced Transformer with Rotary Position Embedding (Su et al., 2021)

---
