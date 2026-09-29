---
slug: basics-tk035
no: "935"
title: "What is the computational complexity of self-attention in the Transformer model"
question: "What is the computational complexity of self-attention in the Transformer model"
excerpt: "面试官想考察你对Transformer核心机制的量化解构能力，而非简单背诵“O(n²)”。刁钻点在于：能否区分时间复杂度和空间复杂度、能否推导出具体公式、是否了解实际工程中的瓶颈（如显存占用）。答好了能展示：扎实的数学基"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3222
updated: "2026-09-29"
---

## What is the computational complexity of self-attention in the Transformer model

#### 1️⃣ 考察意图

面试官想考察你对Transformer核心机制的量化解构能力，而非简单背诵“O(n²)”。刁钻点在于：能否区分时间复杂度和空间复杂度、能否推导出具体公式、是否了解实际工程中的瓶颈（如显存占用）。答好了能展示：扎实的数学基础、对长序列场景的问题认知、以及熟悉主流优化方案（如FlashAttention、稀疏注意力）。这是P0级基础题，但答得深可拉开差距。

#### 2️⃣ 标准答

**标准自注意力复杂度**：O(n²·d)，其中n为序列长度，d为隐藏维度（通常等于head_dim * num_heads）。推导分三步：

- **Q·K^T计算**：Q和K形状均为(n, d)，矩阵乘法复杂度O(n²·d)。实际中d通常为64-128（每个head），但总d_model=512-4096。
- **Softmax**：对n×n矩阵每行做softmax，复杂度O(n²)。
- **加权求和**：softmax结果(n,n)乘V(n,d)，复杂度O(n²·d)。总复杂度O(n²·d + n² + n²·d) ≈ O(n²·d)。**空间复杂度**同样O(n²)，因为需存储n×n注意力矩阵，这是显存瓶颈。

**为什么是O(n²)而非O(n log n)**：因为每个token需与所有其他token计算相似度，无近似或稀疏化。对比RNN的O(n·d²)（序列长度线性），CNN的O(k·n·d²)（k为卷积核大小），自注意力在长序列上劣势明显。

**实际落地的坑**：当n=2048、d=512时，单层注意力矩阵大小为2048²×4字节（FP32）=16MB，12层模型显存占用约192MB，加上KV cache（推理时需存储所有历史token的K、V），n=4096时KV cache达512MB以上。这导致长上下文（如128K）推理时显存爆炸。

**工程取舍**：标准实现中，d通常取64（每个head），因为实验表明更高d收益递减（参考《Attention is All You Need》）。但d过小会降低模型容量，需平衡。优化方向：

- **FlashAttention**：通过分块（tiling）和重计算（recomputation），将O(n²)显存降为O(n)，实际加速2-4倍。核心是避免显式存储n×n矩阵，而是分块计算并即时softmax。
- **稀疏注意力**：如Longformer的滑动窗口+全局token，复杂度降为O(n·k)（k为窗口大小）。但牺牲全局交互，需任务适配。
- **线性注意力**：如Performer用核方法近似softmax，复杂度O(n·d²)。但d较大时未必更快，且精度损失在长序列上累积。

**具体数字**：n=1024、d=512时，单层计算量约2×1024²×512≈1.07×10⁹ FLOPs（含QK^T和加权求和）。实际中FlashAttention在A100上可达约100 TFLOPS，单层耗时约10ms。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从复杂度推导、实际瓶颈、优化方案三个层面回答。标准自注意力复杂度是O(n²·d)，推导分QK^T、softmax、加权求和三步。实际中n=2048时显存瓶颈明显，优化方向包括FlashAttention降显存、稀疏注意力降计算、线性注意力改复杂度。总结一句：自注意力以平方复杂度换取全局交互，长序列场景必须用工程优化。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：FlashAttention具体怎么降低显存复杂度？能说说分块细节吗？

> FlashAttention通过分块（tiling）将n×n注意力矩阵拆成多个小块，每个块在SRAM中计算并即时应用softmax，无需写回HBM。关键技巧是“在线softmax”算法：分块计算局部最大值和指数和，再合并全局归一化。这样显存复杂度从O(n²)降为O(n)，因为只需存储最终输出和KV cache。实际中块大小通常为64-128，需根据SRAM大小调整。

**追问 2**：如果n=128K，你会怎么设计注意力机制？直接上FlashAttention够吗？

> 不够。FlashAttention虽降显存，但计算复杂度仍是O(n²)，128K时计算量约10¹² FLOPs，单层耗时数秒。需结合稀疏注意力：例如用滑动窗口（窗口大小4096）加全局token（每1024个token设一个），复杂度降为O(n·k)。或者用Mamba等状态空间模型替代注意力，但需牺牲部分长程依赖。实际中DeepSeek-V2用了MLA（Multi-head Latent Attention）压缩KV cache，配合FlashAttention，在128K下推理可行。

**追问 3**：为什么d通常取64？取128会怎样？

> 实验表明，d=64时每个head已能捕获足够模式，增大d收益递减（参考《Attention is All You Need》消融实验）。取128会：1）计算量翻倍（O(n²·d)），2）模型参数量增加（W_Q、W_K、W_V矩阵变大），3）但精度提升有限（约0.1-0.2 BLEU）。工程上常用d=64或96，平衡性能与效率。极端情况如PaLM用d=128，但需更大算力。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只说“复杂度是O(n²)”，不区分n和d → ✅ 必须明确O(n²·d)，并解释d是每个head的维度，总d_model需除以head数。
- ❌ 认为FlashAttention降低计算复杂度 → ✅ FlashAttention只降显存复杂度（从O(n²)到O(n)），计算复杂度仍是O(n²·d)，只是通过硬件优化加速。
- ❌ 混淆训练和推理复杂度：训练需存所有中间梯度，推理只需KV cache → ✅ 训练复杂度更高（需反向传播），推理时KV cache是主要瓶颈。

#### 6️⃣ 简历呼应

- **如果你有LLM训练/推理项目**：从实际显存占用切入，例如“我在训练7B模型时，n=4096导致单层注意力显存超限，改用FlashAttention后显存降了60%”。
- **如果你只做过传统NLP（如BERT微调）**：用BERT的max_length=512为例，说明O(n²)在短序列下可接受，但长序列（如文档分类）需稀疏注意力。
- **如果你是校招无项目**：聚焦论文复现，例如“我复现了《Attention is All You Need》中的自注意力，并测量了n=128/256/512时的计算时间，验证了O(n²)增长趋势”。
- 《Attention is All You Need》原始论文（Vaswani et al., 2017）
- FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness（Dao et al., 2022）
- Longformer: The Long-Document Transformer（Beltagy et al., 2020）
- Rethinking Attention with Performers（Choromanski et al., 2021）
- 博客：Efficient Transformers: A Survey（Tay et al., 2020）

---
