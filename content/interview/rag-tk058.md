---
slug: rag-tk058
no: "958"
title: "| Q6 | After tokenization, how are tokens converted into embeddings in the Transformer model"
question: "| Q6 | After tokenization, how are tokens converted into embeddings in the Transformer model"
excerpt: "面试官想验证你是否真正理解 Transformer 输入层的底层机制，而非只会调库。考察类型是基础概念 + 工程细节。刁钻点在于：很多人只背了“embedding 层是查找表”，但说不清 token ID 到向量的映射过"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4622
updated: "2026-09-29"
---

## | Q6 | After tokenization, how are tokens converted into embeddings in the Transformer model

`P0` · `rag`

🏷 标签：`tokenization`, `embedding`, `transformer`, `nlp-basics`

#### 1️⃣ 考察意图

面试官想验证你是否真正理解 Transformer 输入层的底层机制，而非只会调库。考察类型是**基础概念 + 工程细节**。刁钻点在于：很多人只背了“embedding 层是查找表”，但说不清 token ID 到向量的映射过程、维度选择 trade-off、以及 embedding 层在反向传播中如何参与训练。答好了能展示你对 NLP 模型输入管线的扎实理解，包括 tokenizer 输出与模型输入的衔接、位置编码的注入方式，以及 embedding 层与后续层的梯度流动关系。

#### 2️⃣ 标准答

Transformer 模型将 token 转换为 embedding 的过程分三步：**token ID 化 → 查找表映射 → 位置编码注入**。下面拆解每个环节的工程细节。

**第一步：tokenization 输出整数 ID**

- 原始文本经过 tokenizer（如 BPE、WordPiece、SentencePiece）切分为子词单元，每个 token 对应词表中的一个整数 ID。
- 例如 BERT 的 WordPiece tokenizer 将 “playing” 切为 “play” + “##ing”，分别映射到 ID 1234 和 5678。
- 关键点：tokenizer 输出的是**离散整数序列**，不能直接输入神经网络，必须转为连续向量。

**第二步：Embedding 层——可学习的查找表**

- 模型维护一个形状为 `[vocab_size, d_model]` 的矩阵，称为 embedding 矩阵。`vocab_size` 是词表大小（如 BERT-base 为 30522），`d_model` 是隐藏维度（如 768）。
- 每个 token ID 作为索引，从矩阵中**按行取出**对应向量。这本质是 `nn.Embedding` 操作，等价于 one-hot 向量与矩阵的乘法，但实现上直接查表，计算复杂度 O(1)。
- 工程取舍：`d_model` 的选择是**计算量与表示能力的平衡**。BERT-base 用 768，GPT-3 用 12288。维度越大能编码更多语义信息，但参数量以 `vocab_size * d_model` 增长，显存开销大。实际落地时，小模型（如 DistilBERT）用 512 维，大模型（如 LLaMA-70B）用 8192 维。
- 坑与解法：**embedding 层是模型参数量的一大来源**。例如词表 50k、维度 4096 时，embedding 矩阵就有 2 亿参数。训练时梯度会通过 embedding 层反向传播，更新矩阵中对应行的向量。如果某个 token 在训练数据中出现极少，其 embedding 向量可能训练不充分，导致 OOV 表现差。解法：使用**子词 tokenization**（如 BPE）将罕见词拆为常见子词，或对 embedding 层做**权重共享**（tied embeddings），让输出层与输入层共享同一矩阵，减少参数量。

**第三步：位置编码注入**

- Transformer 没有循环结构，必须显式注入位置信息。常见做法是将位置编码与 token embedding **逐元素相加**。
- 位置编码有两种主流方案：**绝对位置编码**（如 BERT）：学习一个 `[max_seq_len, d_model]` 的位置 embedding 矩阵，与 token embedding 相加。缺点是 max_seq_len 固定，无法外推更长序列。
- **相对位置编码**（如 RoPE、ALiBi）：在 attention 计算中注入位置信息，不依赖绝对位置。RoPE 通过旋转矩阵对 query 和 key 做变换，支持长度外推。LLaMA、Mistral 等现代模型都用 RoPE。
工程取舍：学习式位置编码简单但无法泛化到更长序列；RoPE 能外推但实现复杂，需要修改 attention 计算逻辑。实际落地中，如果任务序列长度固定（如分类），学习式够用；如果涉及长文档（如 RAG 场景），必须用 RoPE 或 ALiBi。

**总结**：token 通过 embedding 查找表转为连续向量，再与位置编码相加，形成 Transformer 第一层的输入 `[batch_size, seq_len, d_model]`。这个张量随后进入多头注意力层。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，tokenization 输出整数 ID，是离散的；第二，embedding 层是一个可学习的查找表，形状为 `[vocab_size, d_model]`，通过索引取出稠密向量；第三，位置编码注入，常用 RoPE 或学习式位置 embedding，与 token embedding 逐元素相加。总结一句：token 通过查表 + 加位置编码，转为连续向量表示，供后续 Transformer 层处理。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：embedding 层的梯度是怎么回传的？如果某个 token 在 batch 中没出现，它的 embedding 向量会更新吗？

> 梯度通过链式法则回传：损失对 embedding 矩阵的梯度等于 `one-hot 向量 * 损失对输出的梯度` 的转置。具体来说，只有出现在当前 batch 中的 token ID 对应的行会收到非零梯度，未出现的 token 行梯度为 0，不会更新。这就是为什么**低频 token 的 embedding 训练不充分**。解法：使用子词 tokenization 让罕见词被拆解为高频子词，或对 embedding 层做**权重衰减**（weight decay）防止过拟合，或使用**adaptive embedding**（如 ALBERT 的 factorized embedding）减少参数量。

**追问 2**：为什么 BERT 的 embedding 层要加 LayerNorm 和 dropout？不加会怎样？

> BERT 在 embedding 后加了 LayerNorm 和 dropout（p=0.1）。LayerNorm 的作用是稳定训练：embedding 向量的范数可能随 token 频率变化（高频词向量范数更大），LayerNorm 将其归一化到均值为 0、方差为 1，防止后续层被大范数向量主导。Dropout 是正则化，防止模型对特定 token 的 embedding 过拟合。如果不加，训练初期 loss 下降更慢，且模型对训练集中的高频 token 过拟合，在 OOV 或罕见词上泛化差。实际落地中，如果数据量足够大（如 1T tokens），可以去掉 dropout 以加速收敛。

**追问 3**：embedding 层的参数量怎么算？在模型总参数量中占比多少？

> 参数量 = `vocab_size * d_model`。以 BERT-base 为例：30522 * 768 ≈ 23.5M，占总参数量 110M 的 21%。GPT-3 175B 中，embedding 层参数量 = 50257 * 12288 ≈ 617M，占比不到 0.4%。可见**模型越大，embedding 层占比越小**。优化技巧：如果词表很大（如 100k），可以用**tied embeddings**（输出层与输入层共享矩阵）或**factorized embedding**（先映射到低维再投影到 d_model），减少参数量。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“embedding 是随机初始化的，训练时不变” → ✅ 正确说法：embedding 层是**可学习的**，训练时通过反向传播更新，初始化为随机值（如正态分布或 Xavier 初始化）。
- ❌ 说“位置编码是加在 attention 计算里的” → ✅ 正确说法：位置编码通常**在 embedding 层之后、进入 attention 之前**与 token embedding 相加（或拼接），RoPE 等相对位置编码才在 attention 计算中注入。
- ❌ 说“所有 Transformer 模型都用相同的位置编码方式” → ✅ 正确说法：不同模型选择不同，BERT 用学习式绝对位置编码，GPT 系列用学习式，LLaMA 用 RoPE，ALiBi 用于某些长序列模型。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从 embedding 层的维度选择切入，说明为什么 RAG 中 query 和 document 的 embedding 维度通常对齐（如 768 维），以及如何用 embedding 相似度做检索。可以提 FAISS 索引时维度对性能的影响。
- **如果你只做过传统 NLP**：用词袋模型（BoW）或 TF-IDF 做类比，说明 embedding 层是“可学习的分布式表示”，而 BoW 是稀疏的、不可学习的。强调 embedding 层能捕捉语义相似性（如“猫”和“狗”的向量距离近）。
- **如果你是校招无项目**：聚焦 Hugging Face 的 `model.get_input_embeddings()` API，说明如何打印 embedding 矩阵的形状和部分向量，以及如何用 `model.forward()` 观察 embedding 层的输出。可以提一个 demo：用 BERT 计算“king”和“queen”的 embedding 余弦相似度。
- 《Attention Is All You Need》原始论文，Section 3.4 Embeddings and Softmax
- Hugging Face 文档：`transformers.BertModel` 的 `get_input_embeddings()` 方法
- RoPE 论文：《RoFormer: Enhanced Transformer with Rotary Position Embedding》
- 权重共享（tied embeddings）论文：《Using the Output Embedding to Improve Language Models》
- 博客：Jay Alammar 的《The Illustrated Transformer》中关于 embedding 层的图解

---
