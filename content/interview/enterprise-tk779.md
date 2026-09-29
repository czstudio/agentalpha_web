---
slug: enterprise-tk779
no: "1679"
title: "Tokenization 是如何工作的？BPE、WordPiece 有啥区别"
question: "Tokenization 是如何工作的？BPE、WordPiece 有啥区别"
excerpt: "面试官想考察你对 NLP 基础组件的理解深度，而非死记硬背算法步骤。这是典型的“背概念 + 工程取舍”混合题：表面问 BPE 与 WordPiece 区别，实际看你能不能讲清“为什么 GPT 用 BPE 而 BERT 用"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4508
updated: "2026-09-29"
---

## Tokenization 是如何工作的？BPE、WordPiece 有啥区别

#### 1️⃣ 考察意图

面试官想考察你对 NLP 基础组件的理解深度，而非死记硬背算法步骤。这是典型的“背概念 + 工程取舍”混合题：表面问 BPE 与 WordPiece 区别，实际看你能不能讲清“为什么 GPT 用 BPE 而 BERT 用 WordPiece”背后的设计哲学。刁钻点在于：多数人只会说“BPE 基于频率，WordPiece 基于概率”，但答不出“概率增益具体怎么算”以及“Unigram 模型如何做全局优化”。答好了能展示你对 tokenization 的数学直觉、对词表大小与 OOV 的 trade-off 把控，以及在不同模型架构（自回归 vs 双向）下的适配能力。

#### 2️⃣ 标准答

**Tokenization 的核心目标**：将原始文本切分为离散单元（token），在词表大小与 OOV 覆盖率之间找平衡。纯词级分词词表太大（英文 50 万+），纯字符级又丢失语义（如 “unbreakable” 拆成 u-n-b-r-e-a-k-a-b-l-e 无意义）。子词分词（Subword Tokenization）是折中方案：常见词保留完整，罕见词拆成子词。

**BPE（Byte Pair Encoding）**

- **原理**：从字符级词表开始，迭代统计相邻符号对（pair）的出现频率，每次合并频率最高的 pair，直到词表达到预设大小（如 32k）。
- **数学本质**：贪心频率最大化，无概率模型。
- **实际应用**：GPT 系列（GPT-2/GPT-3/GPT-4）均用 BPE，OpenAI 选择它因为简单、训练快、适合自回归生成（从左到右解码时 token 边界确定）。
- **坑与解法**：BPE 对罕见词可能产生“碎片化”问题（如 “tokenization” 被拆成 “token” + “ization” 但 “ization” 在语料中极少出现）。解法：在预训练语料中做数据增强，或使用更大的初始词表（如 GPT-4 词表 100k+）。

**WordPiece**

- **原理**：同样从字符开始，但合并标准不是频率，而是**语言模型似然增益**。具体：计算候选 pair 合并后对训练数据 perplexity 的降低量，选择增益最大的 pair。
- **数学公式**：合并 pair (x, y) 的增益 = log P(xy) / (P(x) * P(y))，其中 P 由 unigram 语言模型估计。这本质是最大化互信息。
- **实际应用**：BERT 使用 WordPiece（词表 30k），Google 选择它因为双向模型需要更稳定的 token 边界（合并基于概率而非频率，避免 BPE 的“频率陷阱”——高频无意义 pair 被合并）。
- **坑与解法**：WordPiece 训练慢（每步需重估语言模型）。解法：用 EM 算法近似，或先跑几轮 BPE 初始化再切到 WordPiece。

**核心区别对比**

| 维度 | BPE | WordPiece |
|---|---|---|
| 合并标准 | 频率 | 概率增益（互信息） |
| 训练速度 | 快（O(V) 贪心） | 慢（需迭代重估 LM） |
| 词表稳定性 | 易合并高频噪音（如 “th” 在英文中高频但无意义） | 更语义化，合并有意义的 pair |
| 典型模型 | GPT, RoBERTa, Llama | BERT, DistilBERT, ALBERT |

**其他方法**

- **Unigram**：基于概率模型，从大词表开始逐步剪枝（删除使似然下降最小的 token），全局最优而非贪心。SentencePiece 库支持 Unigram 模式，T5 和 XLNet 使用。
- **SentencePiece**：直接处理原始文本（无需预分词），将空格视为普通字符，支持 BPE 和 Unigram 两种模式。优势：对多语言（中文、日文无空格）友好。

**工程取舍总结**：

- 自回归模型（GPT）选 BPE：快、简单、生成时 token 边界确定。
- 双向模型（BERT）选 WordPiece：稳定、语义化、适合 MLM 任务。
- 多语言场景选 SentencePiece + Unigram：避免预分词偏差，全局优化词表。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Tokenization 的目标是平衡词表大小与 OOV，子词分词是主流方案。第二，BPE 基于频率贪心合并，WordPiece 基于概率增益（互信息），前者快但易合并噪音，后者慢但更语义化。第三，实际选择取决于模型架构——GPT 用 BPE 因为自回归生成需要确定边界，BERT 用 WordPiece 因为双向 MLM 需要稳定 token。总结一句：没有绝对优劣，只有架构适配。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：BPE 和 WordPiece 在中文上表现如何？你会怎么选？

> 中文没有天然空格分隔，BPE 和 WordPiece 都需要预分词（如 jieba 或字符级）。BPE 在中文上容易产生“碎片化”（如 “人工智能” 被拆成 “人” + “工” + “智能” 但 “工” 单独出现频率高）。WordPiece 概率增益能避免部分噪音，但训练慢。实际推荐 SentencePiece + Unigram：直接处理原始字符，无需预分词，且 Unigram 的全局剪枝对中文更友好（T5 中文版验证过）。如果必须用 BPE，建议词表设 50k+ 并做字符级初始化。

**追问 2**：词表大小怎么选？32k vs 50k vs 100k 的 trade-off 是什么？

> 词表越大，压缩率越高（每个 token 携带更多信息），但 embedding 矩阵变大（参数量 O(V*d)），训练和推理更慢。32k 适合小模型（BERT-base），50k 是 GPT-2 的默认值，100k 用于 GPT-4 等大模型。工程经验：词表大小与模型参数量成正比，Llama 3 用 128k 词表但配合了 tied embeddings（输入输出共享权重）减少参数量。另一个坑：词表过大导致 OOV 率下降但罕见 token 训练不充分，解法是词表裁剪（移除出现次数 < 100 的 token）或使用 subword regularization（训练时随机替换 token 变体）。

**追问 3**：BPE 的“频率陷阱”具体指什么？怎么解决？

> 频率陷阱指 BPE 合并了高频但无意义的 pair，如英文中 “th” 出现频率极高（the/that/this），合并后 “th” 成为一个 token，但它在语义上无意义，反而增加了词表噪音。解法：1）在合并前过滤掉高频停用词 pair；2）使用 WordPiece 的概率增益替代频率；3）在 BPE 训练中加入正则化（如限制 pair 长度 > 2 字符）。实际中 GPT-4 通过增大词表（100k+）稀释了这类噪音的影响。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “BPE 和 WordPiece 都是基于频率的，只是 WordPiece 更复杂。”→ ✅ “WordPiece 基于概率增益（互信息），不是频率。BPE 是贪心频率，WordPiece 是最大化似然，两者数学基础不同。”
- ❌ “SentencePiece 就是 BPE 的另一种实现。”→ ✅ “SentencePiece 是一个框架，支持 BPE 和 Unigram 两种模式，核心创新是直接处理原始文本（无需预分词），对中文等无空格语言友好。”
- ❌ “词表越大越好，能覆盖所有词。”→ ✅ “词表过大会导致 embedding 矩阵爆炸，且罕见 token 训练不充分。工程上需平衡压缩率与参数量，常见 32k-100k，大模型用 tied embeddings 缓解。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“tokenization 对检索粒度的影响”切入——BPE 的碎片化可能导致 query 和 document 的 token 不匹配，影响 BM25 或 DPR 的召回率。可以提你如何用 SentencePiece 统一 tokenizer 来提升检索一致性。
- **如果你只做过传统 NLP**：用“词袋模型 vs 子词分词”类比——BPE 像 TF-IDF 的贪心特征选择，WordPiece 像互信息特征选择，Unigram 像 L1 正则化剪枝。展示你能把新知识映射到旧框架。
- **如果你是校招无项目**：聚焦“论文复现”——提你读过《Neural Machine Translation of Rare Words with Subword Units》（BPE 原始论文）和《Google’s Neural Machine Translation System》（WordPiece 出处），并自己用 HuggingFace tokenizers 库在 1GB 中文语料上对比了 BPE 和 WordPiece 的压缩率（BPE 压缩率 4.2x，WordPiece 4.5x），输出分析报告。
- 《Neural Machine Translation of Rare Words with Subword Units》（BPE 原始论文，Sennrich et al., 2016）
- 《Google’s Neural Machine Translation System: Bridging the Gap between Human and Machine Translation》（WordPiece 出处，Wu et al., 2016）
- 《SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing》（Kudo & Richardson, 2018）
- 《Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates》（Kudo, 2018）
- HuggingFace Tokenizers 库文档（快速实验 BPE/WordPiece/Unigram 的实操指南）

---
