---
slug: basics-tk060
no: "960"
title: "Attention有哪几种？位置编码有哪几种"
question: "Attention有哪几种？位置编码有哪几种"
excerpt: "面试官想考察你对 Transformer 两大核心组件——Attention 和位置编码——的系统掌握深度，而非简单罗列。这属于工程取舍 + 系统设计类问题。刁钻点在于：① 能否区分“变体”与“优化实现”（如 Flash"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4024
updated: "2026-09-29"
---

## Attention有哪几种？位置编码有哪几种

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 两大核心组件——Attention 和位置编码——的**系统掌握深度**，而非简单罗列。这属于**工程取舍 + 系统设计**类问题。刁钻点在于：① 能否区分“变体”与“优化实现”（如 FlashAttention 不是新注意力机制，而是计算优化）；② 能否讲清每种变体的**设计动机**和**适用场景**（如 GQA 为何在推理时省显存）；③ 能否对比位置编码的**外推性**（extrapolation）差异。答好了能展示你对 LLM 架构演进的理解，以及从训练到推理的工程视野。

#### 2️⃣ 标准答

**Attention 的种类**，按设计动机分三类：

- **基础变体**：Scaled Dot-Product Attention（原始 Transformer，缩放因子 √d_k 防 softmax 梯度消失）、Multi-Head Attention（MHA，多头并行捕捉不同子空间信息，但参数量大）、Cross-Attention（Q 来自 decoder，K/V 来自 encoder，用于 seq2seq 如 T5）、Self-Attention（Q/K/V 同源，用于编码器）、Causal Attention（掩码自注意力，mask 未来 token，用于 GPT 等自回归模型）。
- **效率变体**：Multi-Query Attention（MQA，所有头共享 K/V，推理时 KV cache 显存降为 1/h，但质量略降）、Grouped Query Attention（GQA，折中方案，将头分为 G 组，每组共享 K/V，LLaMA 2/3 使用 GQA=8，平衡质量与显存）。**工程取舍**：MQA 推理快但质量损失明显，GQA 在 8 组时几乎无损，是当前主流选择。
- **计算优化**：FlashAttention（通过 tiling 和 recomputation 避免显存存储完整注意力矩阵，训练速度提升 2-4 倍，是工程实现而非新机制）。**实际落地的坑**：FlashAttention 在长序列（>8K）下对 GPU 架构敏感，A100 上效果最好，V100 可能因 shared memory 不足回退到标准实现，需显式设置 `flash_attn_func` 的 `causal=True` 避免 mask 错误。

**位置编码的种类**，按编码方式分四类：

- **绝对位置编码**：Sinusoidal（固定频率，可外推到任意长度但无参数，GPT 早期使用）、可学习位置编码（如 BERT 的 512 维表，参数随训练更新，但无法外推超过训练长度）。**实际落地的坑**：可学习编码在推理时若输入超过训练长度（如 2K→4K），位置 ID 超出表范围，需用插值或截断，导致性能骤降。
- **相对位置编码**：T5 bias（在 attention logits 上加可学习偏置，T5 使用，支持有限外推）、ALiBi（直接给 attention logits 加线性衰减偏置，无需参数，可外推到 2 倍训练长度，但长距离衰减过快）、RoPE（旋转位置编码，通过旋转矩阵编码相对位置，具有远程衰减和可外推性，LLaMA、Mistral 使用）。
- **旋转位置编码（RoPE）**：核心思想是将位置信息编码为 Q/K 向量的旋转角度，内积后自动包含相对位置。**优势**：① 可外推性强（训练 4K 可推理 32K，配合 NTK-aware 插值甚至 128K）；② 远程衰减（距离越远内积越小，符合直觉）；③ 与 attention 计算解耦，不影响 softmax 归一化。**工程取舍**：RoPE 计算需复数乘法，比 Sinusoidal 慢约 10%，但外推收益远大于开销。
- **复数位置编码（CoPE）**：最新方向，用复数域编码位置，支持连续位置（如音频、时间序列），但计算复杂度高，尚未大规模商用。

**实际选择**：LLaMA 3 使用 RoPE + GQA，GPT-4 使用可学习绝对编码 + MQA，T5 使用 T5 bias + 相对编码。选择依据：若需长上下文外推，RoPE 最优；若训练长度固定且追求简单，可学习编码够用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从 Attention 变体和位置编码两个层面回答。Attention 层面，按设计动机分三类：基础变体如 MHA、Causal Attention，效率变体如 GQA（折中质量与显存），计算优化如 FlashAttention（工程实现）。位置编码层面，分绝对（Sinusoidal、可学习）、相对（T5 bias、ALiBi）、旋转（RoPE，当前主流，可外推性强）、复数（CoPE，前沿）。总结一句：当前 LLM 主流方案是 RoPE + GQA，兼顾外推性和推理效率。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：RoPE 为什么能外推到训练长度之外？原理是什么？

> 核心在于 RoPE 的旋转矩阵是**连续函数**，而非离散表。训练时学到的是旋转角度的频率参数（如 θ_i = 10000^{-2i/d}），推理时只需按新位置计算旋转角度即可。外推时性能下降是因为高频分量（小 θ）对位置敏感，NTK-aware 插值通过缩放频率缓解。具体做法：将 θ 乘以缩放因子 α（如 α=0.5），使旋转角度更平滑，配合动态 NTK 可在 4K 训练下推理 32K。

**追问 2**：GQA 和 MQA 在训练和推理时显存差异具体是多少？

> 假设模型有 32 个头，隐藏层维度 4096，序列长度 4096。MHA 的 KV cache 大小为 2×32×4096×4096×2 bytes ≈ 2GB（FP16）。MQA 降为 2×1×4096×4096×2 ≈ 128MB，节省 16 倍。GQA（8 组）为 2×8×4096×4096×2 ≈ 1GB，节省 2 倍。训练时 GQA 反向传播需对共享 K/V 做梯度累积，实现稍复杂，但显存节省同样显著。实际落地中，GQA=8 是性价比最优选择。

**追问 3**：FlashAttention 的 tiling 具体怎么减少显存？

> 标准 attention 需存储 N×N 的注意力矩阵（N 为序列长度），显存 O(N²)。FlashAttention 将 Q/K/V 分块（block size 如 128），在 SRAM 中计算局部 attention 并累加，避免写回 HBM。同时通过 recomputation 在反向传播时重新计算前向结果，省去存储。以 N=4096 为例，显存从 64MB（FP16）降到约 2MB（仅存储 softmax 归一化因子），训练速度提升 2-3 倍。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 把 FlashAttention 当作一种新的注意力机制（如“FlashAttention 是第 6 种 attention”） → ✅ 明确 FlashAttention 是**计算优化实现**，不改变 attention 数学形式，只是通过 tiling 和 recomputation 减少显存。
- ❌ 说“RoPE 是绝对位置编码” → ✅ RoPE 编码的是**相对位置**，通过旋转矩阵使内积只依赖位置差，属于相对位置编码家族。
- ❌ 认为“可学习位置编码可以外推” → ✅ 可学习编码是离散表，推理时超出训练长度（如 512→1024）无对应参数，必须用插值或截断，外推能力极差。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练/推理项目**：从“实际部署中显存瓶颈”切入，对比 MHA→GQA 的显存节省（如 7B 模型从 2GB→1GB），并提到 RoPE 外推时用 NTK-aware 插值解决长序列问题。
- **如果你只做过传统 NLP（如 BERT 微调）**：用“BERT 的可学习编码 vs LLaMA 的 RoPE”对比，强调外推性差异，并说明 GQA 在推理时如何减少 KV cache，类比为“类似分组卷积的参数量节省”。
- **如果你是校招无项目**：聚焦论文复现，如“我复现了 RoPE 的旋转矩阵实现，在 4K 训练下成功外推到 8K，验证了远程衰减特性”，并提到 FlashAttention 的 tiling 原理。
- 《Attention Is All You Need》（原始 Transformer，Sinusoidal + MHA）
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（RoPE 论文）
- 《GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints》（GQA 论文）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（FlashAttention 论文）
- 《Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation》（ALiBi 论文）

---
