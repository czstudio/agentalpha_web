---
slug: enterprise-tk805
no: "1705"
title: "What is tokenization, and why is it necessary in LLMs"
question: "What is tokenization, and why is it necessary in LLMs"
excerpt: "面试官想确认你是否理解 LLM 输入处理的最底层机制，而非仅仅背诵“分词”概念。这是典型的背概念 + 工程取舍混合题。刁钻点在于：很多人能说 BPE 原理，但说不清为什么 LLM 必须用子词分词，而不是单词或字符；更少人"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4075
updated: "2026-09-29"
---

## What is tokenization, and why is it necessary in LLMs

#### 1️⃣ 考察意图

面试官想确认你是否理解 LLM 输入处理的最底层机制，而非仅仅背诵“分词”概念。这是典型的**背概念 + 工程取舍**混合题。刁钻点在于：很多人能说 BPE 原理，但说不清为什么 LLM 必须用子词分词，而不是单词或字符；更少人能指出 tokenization 对模型推理成本、跨语言泛化、甚至安全性的直接影响。答好了，能展示你对 LLM 整条链路（从预处理到推理）的底层理解，以及处理 OOV（未登录词）和词汇表设计的工程直觉。

#### 2️⃣ 标准答

**定义与核心矛盾**Tokenization 是将原始文本切分成模型可处理的离散单元（token）的过程。LLM 本质是离散序列生成器，输入必须是整数索引序列，所以文本必须映射到固定大小的词汇表。核心矛盾是：单词级词汇表太大（英语超 50 万），且无法处理拼写变体（如 “run” vs “running”）；字符级序列太长（“hello” 变 5 个 token），丢失语义信息。子词分词（Subword Tokenization）是平衡方案。

**主流方法对比**

- **BPE（Byte Pair Encoding）**：GPT 系列默认。从字符开始，统计最频繁的相邻 token 对并合并，直到词汇表达到预设大小（如 50k）。优点是简单高效，缺点是贪心合并可能产生非语义片段（如 “un” 和 “believe” 合并成 “unbelieve” 但 “able” 单独）。
- **WordPiece**：BERT 使用。类似 BPE，但合并依据是最大化训练数据的似然（而非频率），更注重语言模型概率。
- **SentencePiece / Unigram**：T5、LLaMA 使用。不依赖预分词（直接处理原始文本，包括空格），用 EM 算法迭代删除低概率 token，保留最优子词集合。对中文、日文等无空格语言更友好。

**为什么 LLM 必须用子词分词**

1. **处理 OOV**：任何单词都可分解为已知子词（如 “tokenization” → “token” + “ization”），模型无需特殊 token。
2. **控制序列长度**：字符级输入会使上下文窗口迅速耗尽（英文平均 1 单词 ≈ 1.3 token vs 5-7 字符），子词在语义密度和长度间取得平衡。
3. **学习形态学**：子词保留词根、前缀、后缀（如 “un-” 表示否定，“-ed” 表示过去），模型能泛化到未见过的组合。

**实际落地的坑 + 解法**

- **坑 1：词汇表大小选择**。太小（<10k）导致序列过长，推理变慢；太大（>100k）增加 embedding 层参数量，且稀有 token 训练不充分。解法：对英文模型常用 32k-50k；对多语言模型（如 mT5）用 250k 以覆盖更多字符。
- **坑 2：数字与特殊字符**。BPE 会将 “123456” 切碎成 “12” + “34” + “56”，导致模型无法理解数值大小。解法：对数字做正则化（如每个数字单独 token）或使用数字专用的 tokenizer 变体。
- **坑 3：跨语言不平衡**。BPE 在英文上效率高，但在中文上每个字可能被拆成多个 byte token（如 “好” → “\xe5” + “\xa5” + “\xbd”），浪费上下文。解法：使用 SentencePiece 的 byte-fallback 模式，或训练多语言 tokenizer 时按语言比例采样。

**举例**句子 “I love tokenization” 经 GPT-4 tokenizer 可能变成：`[“I”, “ love”, “ token”, “ization”]`（注意空格前缀）。模型看到 “token” 和 “ization” 的组合，能推断出这是 “tokenize” 的名词形式，即使训练语料中从未出现过 “tokenization” 这个完整词。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、必要性、方法对比三个层面回答。定义上，tokenization 是将文本切分为整数索引序列的过程。必要性在于 LLM 需要固定词汇表且处理未登录词，子词分词在序列长度和语义密度间取得平衡。方法上，BPE 基于频率合并，WordPiece 基于概率，SentencePiece 不依赖预分词。总结一句：Tokenization 是 LLM 的输入基石，设计好坏直接影响推理成本、跨语言能力和模型安全性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 GPT-4 处理 “hello world” 和 “helloworld” 的 token 数不同？这有什么影响？

> 因为 GPT 的 tokenizer 基于空格预分词（BPE 前先按空格切分）。“hello world” 有空格，变成两个 token（“hello” + “ world”）；“helloworld” 无空格，可能被切成 “hell” + “ow” + “orld”，token 数更多。影响：用户输入无空格文本（如 URL、代码）会消耗更多上下文窗口，导致推理成本上升。解法：在预处理时对特定场景（如代码）使用专门的 tokenizer，或提示用户加空格。

**追问 2**：如果我要训练一个中文 LLM，词汇表大小选 10k 和 50k 有什么区别？

> 10k 词汇表下，每个中文字大概率被拆成 2-3 个 byte token（如 “中” → “\xe4” + “\xb8” + “\xad”），序列长度膨胀 3 倍，推理速度慢且上下文窗口利用率低。50k 词汇表可以覆盖大部分常用汉字（约 6k 常用字）和常见双字词，序列长度接近字符级。但 50k 的 embedding 层参数量是 10k 的 5 倍（假设 embedding dim 相同），训练更慢。取舍：对中文，推荐 30k-50k，且使用 SentencePiece 的 byte-fallback 模式处理生僻字。

**追问 3**：Tokenization 如何影响模型的安全性？举个例子。

> 如果 tokenizer 将 “I will kill you” 中的 “kill” 拆成 “ki” + “ll”，模型可能无法识别其恶意意图，导致安全过滤失效。更严重的是，对抗性攻击可以通过插入特殊字符（如 “k!ll”）绕过 tokenizer 的敏感词检测。解法：在 tokenizer 层做对抗性鲁棒性训练（如对敏感词做完整 token 保留），或在推理时对输入做标准化（如 Unicode 规范化）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说 “Tokenization 就是把句子按空格切词” → ✅ 正确切入：LLM 使用子词分词，不是简单按空格切词；BPE、WordPiece 等算法会合并常见子词，处理 OOV。
- ❌ 说 “词汇表越大越好，能覆盖所有词” → ✅ 正确切入：词汇表过大会增加 embedding 层参数量，且稀有 token 训练不充分；需要平衡序列长度、参数量和泛化能力。
- ❌ 说 “所有 LLM 都用同一种 tokenizer” → ✅ 正确切入：GPT 系列用 BPE，BERT 用 WordPiece，T5/LLaMA 用 SentencePiece；不同 tokenizer 对空格、中文、数字的处理方式不同。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从 “tokenizer 对检索效率的影响” 切入——不同 tokenizer 导致 query 和 document 的 token 数不同，影响 embedding 计算成本和检索延迟。可以举例：用 BPE 处理中文文档时，序列长度膨胀导致检索速度下降 30%，改用 SentencePiece 后提升。
- **如果你只做过传统 NLP**：用 “词袋模型 vs 子词分词” 类比迁移——传统 NLP 用词袋或 TF-IDF，无法处理 OOV；子词分词相当于在字符和单词间插入一层形态学特征，让模型学到词根和词缀。
- **如果你是校招无项目**：聚焦 “HuggingFace tokenizers 库的 demo 实验”——训练一个 BPE tokenizer 在中文新闻语料上，对比 5k/10k/30k 词汇表对序列长度和下游分类任务准确率的影响，展示对 trade-off 的理解。
- “Neural Machine Translation of Rare Words with Subword Units”（BPE 原始论文，Sennrich et al., 2016）
- “SentencePiece: A simple and language independent subword tokenizer and detokenizer”（Kudo & Richardson, 2018）
- “HuggingFace Tokenizers 库文档：训练自定义 tokenizer”
- “The Tokenization Conundrum: How Tokenizers Affect LLM Performance”（博客，分析 tokenizer 对推理成本和安全性的影响）
- “Unicode Normalization Forms: NFC vs NFD 对 tokenizer 的影响”（技术博客，处理特殊字符的坑）

---
