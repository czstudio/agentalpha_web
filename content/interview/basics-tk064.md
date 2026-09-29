---
slug: basics-tk064
no: "964"
title: "Bert和GPT有什么区别"
question: "Bert和GPT有什么区别"
excerpt: "面试官想考察你对 Transformer 架构的底层理解，而非简单背诵。核心是：你是否清楚 Encoder-only 与 Decoder-only 的设计哲学差异，以及这种差异如何影响预训练目标、表示能力和下游任务选择。"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4380
updated: "2026-09-29"
---

## Bert和GPT有什么区别

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 架构的底层理解，而非简单背诵。核心是：**你是否清楚 Encoder-only 与 Decoder-only 的设计哲学差异，以及这种差异如何影响预训练目标、表示能力和下游任务选择。** 刁钻点在于：很多人只答“BERT 双向，GPT 单向”，但说不出为什么 GPT 不用双向注意力、为什么 BERT 不适合生成。答好了能展示你对模型设计 trade-off 的直觉，以及从论文（如《Attention Is All You Need》、GPT-1/2/3、BERT）到工程落地的贯通能力。

#### 2️⃣ 标准答

**1. 架构差异：Encoder vs Decoder**

- **BERT**：使用 Transformer Encoder，核心是**双向自注意力（Bidirectional Self-Attention）**。每个 token 在计算注意力时能看到整个序列的所有 token（包括左右两侧），通过 Masked Multi-Head Attention 实现。这赋予 BERT 强大的上下文建模能力，适合理解任务。
- **GPT**：使用 Transformer Decoder，核心是**因果自注意力（Causal Self-Attention）**。每个 token 只能看到它左侧的 token（包括自身），通过上三角 mask 强制单向。这保证了自回归生成时的因果性——预测下一个 token 时不能偷看未来信息。

**2. 预训练任务：MLM vs LM**

- **BERT**：**Masked Language Model (MLM)** + **Next Sentence Prediction (NSP)**。随机 mask 15% 的 token，让模型预测被 mask 的词。NSP 判断两句话是否连续（后来被 RoBERTa 证明非必要）。MLM 的缺点是训练与推理不一致（推理时没有 mask），但通过 [MASK] 和随机替换的 trick 缓解。
- **GPT**：**Autoregressive Language Model (LM)**。直接预测下一个 token，最大化序列的似然。训练与推理完全一致，天然适合生成。但缺点是每个 token 只能利用左侧信息，无法像 BERT 那样“看到”右侧上下文。

**3. 表示能力与适用场景**

- **BERT**：每个 token 的表示是**上下文相关的双向嵌入**。在 GLUE、SQuAD 等 NLU 基准上统治多年。适合：文本分类、命名实体识别、关系抽取、问答（抽取式）。**坑**：直接拿 BERT 做生成（如写文章）会崩溃，因为双向注意力导致生成时无法保证自回归顺序。
- **GPT**：每个 token 的表示是**单向的、从左到右的隐状态**。在零样本/少样本任务上通过 prompt 工程展现惊人能力（GPT-3 175B）。适合：对话、故事生成、代码生成、翻译（条件生成）。**坑**：GPT 做分类任务需要设计 prompt 模板，且对 prompt 措辞敏感，不如 BERT 直接取 [CLS] 向量稳定。

**4. 工程取舍与落地坑**

- **Trade-off**：BERT 的双向性带来更强的理解能力，但推理时无法并行生成（必须一次输入整个序列）。GPT 的单向性允许自回归生成（逐 token 解码），但理解任务上天然劣势。**为什么 GPT 不用双向注意力？** 如果 GPT 用双向，生成时每个 token 会看到未来词，导致训练和推理不一致，模型会“作弊”。
- **实际落地的坑**：微调 BERT 做长文本分类时，序列长度限制（通常 512）导致需要截断或滑动窗口。一个解法是使用 Longformer 或 BigBird 的稀疏注意力。GPT 做生成时，温度参数（temperature）和 top-k/top-p 采样策略直接影响输出质量，过低温度导致重复，过高导致胡言乱语。实践中常用 **top-p=0.9 + temperature=0.7** 作为默认起点。

**5. 发展脉络**

- **GPT 系列**：从 GPT-1（117M）到 GPT-3（175B），再到 GPT-4（多模态），核心是**规模扩展（Scaling Law）和指令微调（RLHF）**。GPT-2 证明零样本能力，GPT-3 证明少样本 in-context learning。
- **BERT 系列**：从 BERT-base（110M）到 RoBERTa、ALBERT、DeBERTa，核心是**优化预训练目标**（如 RoBERTa 去掉 NSP、动态 masking）和**改进注意力机制**（如 DeBERTa 的解耦注意力）。但 BERT 的架构上限受限于双向性，无法像 GPT 那样通过 scale 涌现推理能力。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从架构、预训练任务、适用场景三个层面回答。架构上，BERT 是 Encoder-only 双向注意力，GPT 是 Decoder-only 单向因果注意力。预训练任务上，BERT 用 MLM 做完形填空，GPT 用自回归 LM 预测下一个词。适用场景上，BERT 统治 NLU 任务（分类、标注），GPT 统治 NLG 任务（对话、生成）。总结一句：两者是 Transformer 的一体两面，设计哲学决定了它们各自的天花板。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 GPT 不用双向注意力？如果强行给 GPT 加双向注意力会怎样？

> 核心原因是**自回归生成的一致性**。GPT 的训练目标是预测下一个 token，如果使用双向注意力，训练时每个 token 能看到未来词，模型会学到“偷看答案”的捷径，导致训练 loss 很低但推理时无法生成（因为推理时未来词不存在）。强行加双向注意力会破坏因果性，模型变成类似 BERT 的编码器，失去生成能力。一个变通方案是使用 **Prefix LM**（如 UniLM），在输入前缀上用双向，在生成部分用单向，但这是混合架构，不是纯 GPT。

**追问 2**：BERT 的 MLM 训练和推理不一致，怎么缓解？

> 主要用 **Masking 策略的 trick**。BERT 论文中，对选中的 15% token：80% 替换为 [MASK]，10% 替换为随机词，10% 保持不变。这样模型不会过度依赖 [MASK] 标记，而是学会利用上下文推断。此外，**动态 masking**（RoBERTa 的做法）在每次 epoch 重新随机 mask，增加多样性。更激进的做法是 **ELECTRA** 的替换检测任务，用生成器-判别器架构彻底消除 [MASK] 标记。

**追问 3**：BERT 和 GPT 在长文本任务上谁更优？为什么？

> 取决于任务类型。**理解任务（如长文档分类）**：BERT 更优，因为双向注意力能捕捉全文依赖，但受限于 512 长度，需要截断或分段。解法是用 Longformer 的滑动窗口注意力或 BigBird 的稀疏注意力。**生成任务（如长故事生成）**：GPT 更优，因为自回归生成天然适合逐步输出，但长文本生成容易陷入重复或遗忘早期内容。解法是使用 **Transformer-XL** 的片段级循环或 **Memformer** 的记忆机制。实际工程中，长文本场景常采用 **RAG（检索增强生成）** 来绕过长度限制。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “BERT 是双向的，GPT 是单向的，所以 BERT 比 GPT 好。” → ✅ “双向和单向是设计选择，没有绝对优劣。BERT 在理解任务上强，GPT 在生成任务上强，且 GPT 通过规模扩展在零样本上展现了 BERT 不具备的涌现能力。”
- ❌ “GPT 就是 Decoder，BERT 就是 Encoder，两者完全不同。” → ✅ “两者都基于 Transformer，只是堆叠方式不同。GPT 是 Decoder-only，BERT 是 Encoder-only。但 T5 等模型使用 Encoder-Decoder 架构，融合了两者特点。”
- ❌ “BERT 的 NSP 任务很重要，是理解句子关系的核心。” → ✅ “RoBERTa 实验证明 NSP 对下游任务提升有限甚至有害，去掉 NSP 并增大 batch size 和训练数据后，RoBERTa 全面超越 BERT。NSP 不是 BERT 成功的关键。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”流程切入，说明 BERT 类模型（如 DPR、ColBERT）做检索编码，GPT 类模型做生成，两者互补。强调你在项目中如何选择 embedding 模型和生成模型的架构差异。
- **如果你只做过传统 NLP**：用“分类 vs 生成”的类比迁移。BERT 像传统分类器（输入完整文本输出标签），GPT 像序列生成模型（如 HMM 或 RNN）。强调你对 Transformer 底层注意力机制的理解，而非只停留在 API 调用。
- **如果你是校招无项目**：聚焦论文复现 demo。例如用 Hugging Face 微调 BERT-base 做情感分类，用 GPT-2 做故事生成，对比两者在相同数据上的表现。展示你对 MLM 和 LM 的代码级理解（如 attention mask 的实现）。
- 《Attention Is All You Need》（原始 Transformer 论文）
- BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding
- Language Models are Unsupervised Multitask Learners（GPT-2 论文）
- RoBERTa: A Robustly Optimized BERT Pretraining Approach
- Scaling Laws for Neural Language Models（GPT-3 的 scaling 规律）

---
