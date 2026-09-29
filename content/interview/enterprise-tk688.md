---
slug: enterprise-tk688
no: "1588"
title: "目前有几种流行的大模型架构"
question: "目前有几种流行的大模型架构"
excerpt: "面试官想考察你对LLM架构的底层理解，而非简单列举模型名称。这是“背概念”型问题，但刁钻点在于：需要你从注意力机制、训练目标、位置编码等工程维度，解释为什么Decoder-only成为主流，而Encoder-only和E"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4375
updated: "2026-09-29"
---

## 目前有几种流行的大模型架构

#### 1️⃣ 考察意图

面试官想考察你对LLM架构的底层理解，而非简单列举模型名称。这是“背概念”型问题，但刁钻点在于：需要你从注意力机制、训练目标、位置编码等工程维度，解释为什么Decoder-only成为主流，而Encoder-only和Encoder-Decoder逐渐边缘化。答好了能展示你对Transformer变体的系统认知，以及从GPT-1到LLaMA、Mixtral的技术演进洞察力。

#### 2️⃣ 标准答

主流大模型架构分为三类，核心差异在注意力掩码、训练目标和位置编码上。

**1. Decoder-only（自回归）**

- **代表**：GPT系列、LLaMA、Qwen、Mistral、Mixtral（MoE变体）
- **核心**：因果注意力（Causal Attention），每个token只能看到自己和左侧token。训练目标是自回归预测下一个token（Next Token Prediction）。
- **工程取舍**：推理时KV Cache是关键优化，但显存占用随序列长度线性增长。LLaMA用RoPE（旋转位置编码）替代绝对位置编码，支持外推至更长序列（如32K→128K）。
- **坑与解法**：长文本生成时，因果注意力导致早期token的注意力权重被稀释。解法是采用滑动窗口注意力（如Mistral的8K窗口）或FlashAttention-2减少显存占用。

**2. Encoder-only（双向）**

- **代表**：BERT、RoBERTa、DeBERTa
- **核心**：双向注意力（Bidirectional Attention），每个token能看到整个序列。训练目标常用掩码语言模型（MLM，如BERT的15%掩码）或对比学习（如SimCSE）。
- **工程取舍**：双向注意力无法直接用于生成，但理解任务（分类、NER、QA）上精度更高。DeBERTa用解耦注意力（Disentangled Attention）分离内容和位置，在SuperGLUE上比BERT大3个点。
- **坑与解法**：MLM预训练与下游微调不一致（预训练有[MASK]，微调没有）。解法是采用ELECTRA的判别式训练（替换token检测）或RoBERTa的动态掩码。

**3. Encoder-Decoder（序列到序列）**

- **代表**：T5、BART、GLM-130B
- **核心**：Encoder用双向注意力编码输入，Decoder用因果注意力生成输出。训练目标通常是去噪自编码（如T5的Span Corruption，掩码15%的连续片段）。
- **工程取舍**：参数翻倍（Encoder+Decoder），推理延迟高。但适合翻译、摘要等输入输出长度不对称的任务。T5用相对位置编码（Relative Position Bias），支持可变长度。
- **坑与解法**：Encoder和Decoder的隐空间对齐困难。解法是BART的降噪自编码（加噪声后还原），或GLM的自回归填空（Autoregressive Blank Infilling）。

**4. 变体与趋势**

- **混合架构**：Prefix LM（如UniLM）在Decoder-only前加前缀双向注意力，兼顾理解和生成。但实际部署中，纯Decoder-only通过Prompt Engineering可覆盖大部分场景。
- **稀疏注意力**：Longformer用局部窗口+全局token，支持4096+序列；BigBird用随机+全局+局部注意力，复杂度从O(n²)降到O(n)。但稀疏模式需手动设计，不如FlashAttention自动优化。
- **MoE（混合专家）**：Mixtral 8x7B用8个专家，每个token激活2个，推理速度接近7B但效果接近70B。但训练时负载均衡（Load Balancing）是难点，需加辅助损失（如Switch Transformer的z-loss）。
- **趋势**：Decoder-only成为主流（GPT-4、LLaMA-3），因为自回归训练简单、扩展性好（Scaling Law），且通过RLHF（如GRPO）对齐后，生成质量远超其他架构。Encoder-only在检索（如DPR）和分类任务仍有优势，但被Decoder-only的Embedding模型（如E5-mistral）挤压。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个架构层面回答：Decoder-only（自回归）、Encoder-only（双向）、Encoder-Decoder（序列到序列）。Decoder-only靠因果注意力和Next Token Prediction成为主流，因为训练简单、扩展性好，但长文本需RoPE和FlashAttention优化；Encoder-only在理解任务精度高，但无法生成；Encoder-Decoder参数翻倍，适合翻译。总结一句：当前趋势是Decoder-only主导，但MoE和稀疏注意力是重要变体。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么Decoder-only比Encoder-Decoder更流行？难道Encoder-Decoder的精度不是更高吗？

> 精度上，Encoder-Decoder在翻译等任务确实更高（T5比GPT-2在WMT上高2-3个BLEU），但工程上Decoder-only有三个优势：1）训练简单，只需一个语言模型目标，无需设计去噪任务；2）推理时KV Cache复用，延迟低（Encoder-Decoder需先编码再解码）；3）扩展性好，Scaling Law在Decoder-only上已验证到万亿参数。实际落地中，通过Prompt Engineering（如Chain-of-Thought）和RLHF，Decoder-only在生成任务上已超越Encoder-Decoder。

**追问 2**：你提到MoE，Mixtral 8x7B的负载均衡怎么做的？如果某个专家过载怎么办？

> Mixtral用Top-2路由，每个token选两个专家。负载均衡通过辅助损失（Load Balancing Loss）实现，公式为：L_aux = α * N * Σ_i (f_i * P_i)，其中f_i是专家i被选中的频率，P_i是路由概率，α设为0.01。如果某个专家过载（f_i > 1/N），损失会惩罚。实际部署中，还需加容量因子（Capacity Factor，如1.25），允许专家处理更多token，但超过容量则丢弃（Drop Token）。更鲁棒的做法是Switch Transformer的z-loss，直接约束路由logits的方差。

**追问 3**：BERT的MLM和GPT的Next Token Prediction，哪个训练效率更高？

> 从数据利用率看，MLM更高（每个token看到双向上下文），但训练效率低（需15%掩码，且掩码token不参与损失计算）。Next Token Prediction每个token都参与损失，但只能看到左侧。实际对比：BERT在GLUE上比GPT-1高5个点，但GPT-3通过Scaling Law（175B参数）反超。工程上，MLM需设计掩码策略（如Whole Word Masking），而Next Token Prediction更简单。当前趋势是Decoder-only的Next Token Prediction + RLHF，因为对齐后生成质量远超MLM。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只说“GPT是Decoder-only，BERT是Encoder-only，T5是Encoder-Decoder”，然后结束。 → ✅ 必须深入注意力掩码、训练目标、位置编码的差异，并给出工程取舍（如KV Cache、RoPE）。
- ❌ 认为Encoder-only过时了，完全没用。 → ✅ 指出Encoder-only在检索（DPR）、分类（BERT-base在GLUE上仍比GPT-3高）和Embedding（E5）场景有优势，但被Decoder-only的Embedding模型挤压。
- ❌ 把MoE当成独立架构，而不是Decoder-only的变体。 → ✅ 明确MoE是Decoder-only的稀疏化变体（如Mixtral 8x7B），核心是路由和负载均衡，而非新架构。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从检索器（Encoder-only如DPR）和生成器（Decoder-only如LLaMA）的架构差异切入，说明为什么Encoder-only适合检索（双向注意力理解查询），Decoder-only适合生成（自回归流畅性），并提一下混合架构（如REPLUG）的尝试。
- **如果你只做过传统NLP**：用LSTM和Transformer类比：LSTM是单向（类似Decoder-only），BiLSTM是双向（类似Encoder-only），Seq2Seq with Attention是Encoder-Decoder。强调Transformer的并行计算和位置编码（RoPE vs 绝对位置）是核心突破。
- **如果你是校招无项目**：聚焦论文复现：在GLUE上对比BERT-base和GPT-2-small，分析MLM vs Next Token Prediction的精度差异（BERT高3-5个点），并讨论为什么GPT-3通过Scaling Law反超。可提一下FlashAttention的优化原理。
- 《Attention Is All You Need》（原始Transformer论文）
- 《Scaling Laws for Neural Language Models》（Kaplan et al., 2020）
- 《Mixtral of Experts》（MoE架构详解）
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（RoPE论文）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（FlashAttention-2博客）

---
