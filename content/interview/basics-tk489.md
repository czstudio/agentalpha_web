---
slug: basics-tk489
no: "1389"
title: "BERT用字粒度和词粒度的优缺点有哪些"
question: "BERT用字粒度和词粒度的优缺点有哪些"
excerpt: "面试官想看你是否真正理解 tokenization 对模型性能的底层影响，而非只背 BERT 用 WordPiece。考察类型是“工程取舍 + 系统设计”，刁钻点在于：字粒度看似简单但序列长、计算贵；词粒度语义好但 OO"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3552
updated: "2026-09-29"
---

## BERT用字粒度和词粒度的优缺点有哪些

#### 1️⃣ 考察意图

面试官想看你是否真正理解 tokenization 对模型性能的底层影响，而非只背 BERT 用 WordPiece。考察类型是“工程取舍 + 系统设计”，刁钻点在于：字粒度看似简单但序列长、计算贵；词粒度语义好但 OOV 和分词错误致命。答好了能展示你对序列长度、词表大小、OOV 率、计算复杂度四者 trade-off 的直觉，以及从 BERT 到现代 LLM（如 GPT-4 用 BPE）的演进理解。

#### 2️⃣ 标准答

**字粒度（Character-level）**

- **优点**：词表极小（中文约 6000 常用字），OOV 几乎为零，对拼写错误、新词（如“emoji”）鲁棒；无需分词器，避免分词错误传播。
- **缺点**：语义稀疏——单字“吃”无上下文时无法区分“吃饭”和“吃亏”；序列长度是词粒度的 2-3 倍，导致 Transformer 自注意力计算量 O(n²) 暴增。实际落地坑：在长文本分类（如 512 token 限制）中，字粒度可能截断关键信息，需配合滑动窗口或分层编码。
- **工程取舍**：字粒度适合拼写错误多、词汇开放的任务（如社交媒体文本），但计算成本高，不适用于长序列场景。

**词粒度（Word-level）**

- **优点**：语义单元完整，序列短（中文平均 1.5 字/词），自注意力计算量小；适合语义密集型任务（如情感分析、NER）。
- **缺点**：词表巨大（中文常见词 50 万+），导致 embedding 矩阵参数量爆炸；OOV 严重——专业术语“Transformer”或网络新词“躺平”可能不在词表中；分词错误会传播（如“南京市长江大桥”被切为“南京/市长/江大桥”）。
- **实际坑**：用 jieba 分词做 BERT 输入时，OOV 词被映射为 [UNK]，模型直接丢失信息。解法：对 OOV 词回退到字粒度，或使用混合粒度（如词 + 字双通道）。

**BERT 的 WordPiece（子词粒度）**

- **原理**：基于 BPE 变体，从字符开始，迭代合并高频共现子词（如“un”+“able”→“unable”）。中文按字切分后合并常见双字词（如“北京”作为一个 token）。
- **优点**：平衡了字和词——词表适中（30k-50k），OOV 率低（罕见词拆为子词，如“Transformer”→“Trans”+“##former”），序列长度介于两者之间。
- **工程取舍**：合并策略依赖语料统计，对罕见领域（如医学）可能产生无意义子词（如“##x”）。解法：领域微调时扩展词表，或使用 SentencePiece 的 unigram 模式。

**现代趋势**

- GPT-4、Llama 3 等 LLM 普遍用 BPE（字节级），词表 100k+，支持多语言且无 OOV。
- 中文场景下，字粒度在轻量模型（如 ALBERT）中仍有优势，但主流已转向子词。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从字粒度、词粒度、子词粒度三个层面回答。字粒度词表小、OOV 少，但序列长、计算贵；词粒度语义好、序列短，但词表大、分词错误致命；BERT 的 WordPiece 子词粒度通过合并高频子词，在词表大小、OOV 率和序列长度间取得平衡。总结一句：选择取决于任务——高噪声短文本用字粒度，语义密集长文本用词粒度，通用场景用子词粒度。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：WordPiece 和 BPE 有什么区别？为什么 BERT 选 WordPiece 而不是 BPE？

> 核心区别在合并策略：BPE 基于频率合并最常出现的字符对，WordPiece 基于互信息（PMI）合并能最大化训练数据似然的子词对。WordPiece 更注重语义相关性，比如“un”+“able”合并是因为它们共现概率高，而 BPE 可能先合并“th”+“e”这种高频但无意义对。BERT 选 WordPiece 是因为它更适配 MLM 任务——子词边界更语义化，减少噪声。实际落地：GPT 系列用 BPE 是因为它更简单、词表可扩展，适合生成任务。

**追问 2**：中文场景下，BERT 的 WordPiece 词表只有 30k，但常见汉字就 6k，怎么覆盖？

> 中文 WordPiece 以字为初始单元，然后合并高频双字词（如“中国”“北京”）。30k 词表中约 20k 是双字/三字词，剩余 10k 是单字和罕见子词。坑：领域专有词（如“深度学习”中的“深度”）可能被拆成“深”+“度”，丢失语义。解法：领域微调时用 SentencePiece 重新训练词表，或添加自定义 token（如“[DEEP_LEARNING]”）。

**追问 3**：如果让你设计一个中文 NER 模型，你会选哪种粒度？为什么？

> 选子词粒度（WordPiece）作为主 tokenizer，但额外加字粒度特征。原因：NER 需要精确边界（如“南京市” vs “南京/市长”），子词粒度可能模糊边界。解法：双通道输入——主序列用 WordPiece token，辅助序列用字级 char-CNN 编码，最后融合。工程取舍：增加 10% 参数量但 F1 提升 2-3 个点。实际落地：在 MSRA NER 数据集上，这种混合方法比纯字粒度快 30%，比纯词粒度 OOV 率低 50%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “字粒度最好，因为 OOV 少，BERT 应该用字粒度。” → ✅ 字粒度序列长导致计算量 O(n²) 暴增，BERT 的 512 token 限制下会截断信息；WordPiece 通过子词合并减少序列长度，是更优取舍。
- ❌ “词粒度最差，永远不要用。” → ✅ 词粒度在短文本分类（如 10 词以内）中序列短、语义强，准确率比字粒度高 5-10%；只是需要配合 OOV 回退策略。
- ❌ “BERT 用 WordPiece 是因为它比 BPE 好。” → ✅ 两者各有优劣：WordPiece 语义相关性强但训练慢，BPE 简单通用但可能产生无意义子词；BERT 选 WordPiece 是因为 MLM 任务需要语义子词。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从检索效率切入——字粒度导致文档 chunk 序列长，影响向量检索速度；WordPiece 能压缩 30% token 数，提升检索召回率。可举例：在百万级文档库中，字粒度索引需 2TB 内存，WordPiece 只需 1.2TB。
- **如果你只做过传统 NLP**：用分词器类比——字粒度像 char-level n-gram，词粒度像 CRF 分词，WordPiece 像统计合并。可迁移经验：在情感分析任务中，字粒度模型对“好/不好”这类否定词更敏感，词粒度则依赖分词质量。
- **如果你是校招无项目**：聚焦论文复现——BERT 原始论文（Devlin et al., 2019）中 WordPiece 词表 30k，对比 ALBERT 的字级 embedding 共享。可展示：用 Hugging Face 跑 THUCNews 分类，对比字/词/子词粒度下的准确率和训练时间，输出分析报告。

#### 7️⃣ 延伸阅读

- BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding (Devlin et al., 2019) —— WordPiece 原始实现
- Neural Machine Translation of Rare Words with Subword Units (Sennrich et al., 2016) —— BPE 论文
- SentencePiece: A simple and language independent subword tokenizer and detokenizer (Kudo & Richardson, 2018) —— 现代子词工具
- Chinese BERT 实践：字粒度 vs 词粒度 vs 子词粒度对比实验（知乎/CSDN 博客）
- Llama 3 Tokenizer 设计：字节级 BPE 如何支持多语言（Meta 技术博客）

---
