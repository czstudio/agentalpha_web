---
slug: finetune-tk322
no: "1222"
title: "Transformer训练的时候学习率是如何设定的？Dropout是如何设定的，位置在哪里？Dropout 在测试的需要有什么需要注意的吗？**"
question: "Transformer训练的时候学习率是如何设定的？Dropout是如何设定的，位置在哪里？Dropout 在测试的需要有什么需要注意的吗？**"
excerpt: "这道题是典型的“训练工程细节”考察，面试官想看你是否真正动手训过 Transformer，还是只停留在调包层面。核心考察三点：一是学习率调度（LR schedule）的设计逻辑，尤其是 warmup 和衰减的数学动机；二"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5028
updated: "2026-09-29"
---

## Transformer训练的时候学习率是如何设定的？Dropout是如何设定的，位置在哪里？Dropout 在测试的需要有什么需要注意的吗？**

`P1` · `llm_training`

🏷 标签：`transformer`, `learning-rate`, `dropout`, `training`, `regularization`

#### 1️⃣ 考察意图

这道题是典型的“训练工程细节”考察，面试官想看你是否真正动手训过 Transformer，还是只停留在调包层面。核心考察三点：一是学习率调度（LR schedule）的设计逻辑，尤其是 warmup 和衰减的数学动机；二是 Dropout 在 Transformer 中的具体放置位置（不是笼统说“加在层之间”），以及训练/测试不一致的处理；三是能否讲清楚 Dropout 在测试时为什么要缩放（inverted dropout vs. 原生 dropout）。刁钻点在于：很多人知道 warmup，但说不清为什么需要 warmup；知道 Dropout 在测试时要关，但说不清 PyTorch 的 `nn.Dropout` 在 eval 模式下具体做了什么。答好了能展示你对训练稳定性和正则化的深度理解，这是大厂训大模型的基础硬实力。

#### 2️⃣ 标准答

**学习率设定（以 Transformer 原论文为例）**

- **调度策略**：Vaswani et al. 使用 Adam 优化器，学习率先线性 warmup 到峰值（如 0.0005），再按步数的平方根倒数衰减。公式：`lr = d_model^{-0.5} * min(step_num^{-0.5}, step_num * warmup_steps^{-1.5})`。峰值 lr 与 `d_model` 相关，`d_model=512` 时约 0.0005。
- **为什么 warmup**：训练初期，Adam 的动量估计（一阶矩和二阶矩）尚未稳定，直接大 lr 会导致梯度爆炸或震荡。Warmup 让优化器先“热身”，积累可靠的梯度统计，再逐步增大步长。这是大模型训练的标配，比如 GPT-3 用了 375M tokens 的 warmup。
- **工程取舍**：余弦退火（cosine annealing）是另一种常见策略，如 BERT 使用余弦衰减。余弦衰减更平滑，适合收敛到平坦极小值；平方根倒数衰减更激进，适合训练步数极长的情况。实际中，如果训练数据量小（<10B tokens），余弦衰减通常更稳定；数据量大时，平方根倒数衰减能更快收敛。
- **实际坑**：峰值 lr 需要根据 batch size 调整。如果 batch size 翻倍，lr 也应线性缩放（linear scaling rule），否则模型可能不收敛。例如，原论文 batch size 约 25000 tokens，峰值 lr 0.0005；若 batch size 翻倍到 50000，峰值 lr 应设为 0.001。

**Dropout 设定与位置**

- **标准位置**（按 Transformer 层顺序）：**Embedding 层后**：对 token embedding 加 dropout（如 0.1），防止过拟合到特定 token 位置。
- **Attention 权重计算后**：对 softmax 输出的 attention 权重矩阵加 dropout（`attention_dropout`），随机 mask 掉部分注意力连接，增强泛化。
- **FFN 激活函数后**：对 ReLU/GELU 激活后的输出加 dropout（`ffn_dropout`），防止 FFN 层过拟合。
- **残差连接前**：在子层输出（Attention 或 FFN）与残差相加前，对子层输出加 dropout。这是原论文的实现：`x = x + dropout(sublayer(x))`。
- **为什么放在残差前**：残差连接本身提供梯度直通路径，dropout 加在子层输出上，只正则化子层，不影响残差流的稳定性。如果加在残差后，会破坏梯度传播，导致训练不稳定。
- **实际落地的坑**：Dropout 率需要根据模型大小和数据量调整。小模型（如 6 层，d_model=256）用 0.1 可能欠正则化，需提高到 0.2；大模型（如 GPT-3 175B）用 0.1 可能过正则化，需降到 0.05 甚至 0.01。经验法则：模型参数量每翻 10 倍，dropout 率减半。

**Dropout 在测试时的注意事项**

- **核心原则**：测试时必须关闭 dropout，但需要缩放权重以保持期望输出一致。这涉及两种实现：**原生 dropout**：训练时以概率 p 丢弃神经元，测试时不丢弃，但需将权重乘以 `1/(1-p)` 来补偿。PyTorch 的 `nn.Dropout` 默认使用 **inverted dropout**：训练时直接缩放保留的神经元（除以 `keep_prob`），测试时直接关闭，无需额外缩放。这是业界标准做法。
- **为什么 inverted dropout 更好**：测试时无需手动处理，框架自动完成。如果误用原生 dropout，测试时不缩放，输出期望会偏移，导致验证指标虚高或虚低。
实际坑：在 PyTorch 中，model.eval() 会自动关闭 nn.Dropout 和 nn.BatchNorm。但如果你手写了 dropout 逻辑（如 F.dropout(x, p=0.1, training=True)），测试时必须手动设 training=False，否则模型行为会错乱。另一个坑：多 GPU 训练时，如果某个子模块的 dropout 率被硬编码（如 self.dropout = nn.Dropout(0.1)），不同 GPU 上的 dropout mask 独立生成，这没问题；但如果用 torch.nn.functional.dropout 且忘记设 training，会导致所有 GPU 共享同一个 mask，破坏随机性。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从学习率调度、Dropout 位置、测试时处理三个层面回答。学习率方面，Transformer 原论文用 warmup + 平方根倒数衰减，warmup 是为了稳定 Adam 的动量估计；Dropout 加在 embedding 后、attention 权重后、FFN 激活后和残差连接前，残差前加是为了不破坏梯度直通；测试时用 inverted dropout，PyTorch 的 eval 模式自动处理，但手写 dropout 时要小心 training 参数。总结一句：这些细节决定了模型能否稳定收敛和泛化，大厂训大模型时都会根据数据量和 batch size 微调。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果训练时 loss 震荡严重，你会怎么调学习率和 dropout？

> 先检查 warmup 是否足够：如果 warmup steps 太少（如 <1000），Adam 动量未稳定，增加 warmup 到 4000-8000 steps。然后看峰值 lr：如果 loss 在 warmup 后立即震荡，降低峰值 lr 到原来的 0.5-0.8 倍。Dropout 方面，如果 dropout 率过高（如 >0.2），会引入噪声导致 loss 震荡，尝试降到 0.1 或 0.05。最后检查 batch size：如果 batch size 太小（如 <32），梯度方差大，增大 batch size 并同步缩放 lr。

**追问 2**：为什么 Transformer 原论文用平方根倒数衰减，而 BERT 用余弦衰减？哪个更好？

> 平方根倒数衰减适合训练步数极长（如 100k+ steps）的场景，因为衰减速度先快后慢，能在后期精细调参；余弦衰减更平滑，适合中等步数（如 40k steps），且能自然收敛到 0。BERT 用余弦衰减是因为预训练步数固定（约 1M steps），余弦衰减能保证在训练结束时 lr 归零，避免过拟合。实际中，如果训练步数不确定，平方根倒数衰减更鲁棒；如果步数固定，余弦衰减更可控。没有绝对好坏，取决于训练预算。

**追问 3**：Dropout 在 Transformer 的 attention 层和 FFN 层，哪个更重要？能只加一个吗？

> Attention 层的 dropout 更重要，因为它直接影响注意力矩阵的稀疏性和泛化能力。如果只加一个，优先加 attention dropout。FFN 层的 dropout 作用次之，因为 FFN 本身有大量参数，dropout 能防止过拟合，但可以通过权重衰减（weight decay）替代。实际中，如果模型较小（如 <100M 参数），只加 attention dropout 就够了；大模型（如 >1B 参数）建议两者都加，但 dropout 率要低（如 0.05）。一个 trade-off：attention dropout 会降低注意力计算的效率，训练时增加约 10% 的时间；FFN dropout 影响较小。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Dropout 加在每一层之后，包括残差连接之后” → ✅ 正确说法：Dropout 加在子层输出后、残差连接前，残差连接本身不加 dropout，否则破坏梯度直通。
- ❌ 说“测试时 dropout 要乘以 keep_prob 来缩放” → ✅ 正确说法：PyTorch 默认用 inverted dropout，训练时自动缩放，测试时直接关闭，无需手动处理。只有原生 dropout 才需要测试时缩放。
- ❌ 说“学习率 warmup 是为了防止梯度消失” → ✅ 正确说法：Warmup 是为了稳定 Adam 的动量估计，防止初期梯度爆炸或震荡，与梯度消失无关。

#### 6️⃣ 简历呼应

- **如果你有 LLM 预训练项目**：从实际调参经验切入，比如“我在训练 1.3B 模型时，发现 warmup steps 从 2000 增加到 8000 后，loss 收敛速度提升了 15%”，并提到 batch size 与 lr 的线性缩放。
- **如果你只做过传统 NLP（如 LSTM/CNN）**：用类比迁移，比如“传统模型 dropout 加在 embedding 和全连接层，Transformer 多了一个 attention dropout，本质都是防止过拟合，但位置更精细”，并强调残差连接的特殊性。
- **如果你是校招无项目**：聚焦原论文复现 demo，比如“我复现了 Transformer 原论文的 warmup 调度，用 PyTorch 的 `get_linear_schedule_with_warmup` 实现，并对比了 cosine 和 sqrt 衰减的收敛曲线”，展示动手能力。

#### 7️⃣ 延伸阅读

- 《Attention Is All You Need》原论文（Vaswani et al., 2017）——学习率调度和 dropout 位置的原始定义
- 《BERT: Pre-training of Deep Bidirectional Transformers》——余弦退火学习率调度的实践
- 《Scaling Laws for Neural Language Models》——学习率与模型大小的关系
- PyTorch 官方文档：`torch.optim.lr_scheduler` 和 `nn.Dropout` 的实现细节
- 《Deep Learning》Goodfellow et al. 第 7 章——Dropout 的理论分析和 inverted dropout 的推导

---
