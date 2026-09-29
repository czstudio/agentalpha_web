---
slug: rag-tk030
no: "930"
title: "为什么 LLM 生成文本是一个逐 token 预测过程"
question: "为什么 LLM 生成文本是一个逐 token 预测过程"
excerpt: "面试官想看你是否真正理解自回归语言模型（AR-LM）的底层逻辑，而非只会背“GPT是自回归”的结论。考察类型是原理+工程取舍，刁钻点在于：为什么必须是逐 token，而不是逐词或逐句？这背后涉及因果注意力（Causal"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4220
updated: "2026-09-29"
---

## 3 为什么 LLM 生成文本是一个逐 token 预测过程

`P0` · `rag`

🏷 标签：`autoregressive`, `generation`, `causal-attention`, `llm`

#### 1️⃣ 考察意图

面试官想看你是否真正理解自回归语言模型（AR-LM）的底层逻辑，而非只会背“GPT是自回归”的结论。考察类型是**原理+工程取舍**，刁钻点在于：为什么必须是逐 token，而不是逐词或逐句？这背后涉及**因果注意力（Causal Attention）** 的数学约束、**Teacher Forcing** 的训练效率，以及**非自回归生成（NAR）** 的 trade-off。答好了能展示你对序列建模本质的掌握，以及从训练到推理的全局视野。

#### 2️⃣ 标准答

**核心原理：自回归分解与因果约束**

LLM（如 GPT 系列）本质是**自回归模型**，将联合概率 P(序列) 分解为条件概率的乘积：`P(w1, w2, ..., wn) = ∏ P(wt | w1, w2, ..., w_{t-1})`这意味着生成时，每一步只能看到**左侧已生成**的 token，无法窥视未来。这由**因果注意力（Causal Attention）** 实现：注意力矩阵被强制为上三角掩码（mask），每个位置只能 attend 到自身及之前的位置。例如，在生成第 5 个 token 时，模型只能基于前 4 个 token 的 hidden state 做预测。

**训练阶段：Teacher Forcing 与并行化**

训练时，模型使用**Teacher Forcing**：给定完整的目标序列，一次性计算所有位置的 loss，但每个位置的预测仍只依赖左侧真实 token。这带来了关键 trade-off：

- **优势**：训练可并行，GPU 利用率高（一次 forward 计算所有 token 的 loss）。
- **劣势**：训练与推理的**暴露偏差（Exposure Bias）**——训练时输入都是真实 token，推理时输入是模型自己生成的 token，分布偏移会导致误差累积。实践中，通过**Schedule Sampling**（以一定概率用模型输出替换真实输入）缓解，但会增加训练不稳定。

**推理阶段：逐 token 生成的必然性**

推理时，模型必须**逐个 token 生成**，因为每一步的输入依赖上一步的输出。例如，生成“I love AI”时：

1. 输入 `<s>` → 输出 `I`
2. 输入 `<s> I` → 输出 `love`
3. 输入 `<s> I love` → 输出 `AI`这导致推理延迟与序列长度线性相关（O(n)），无法像 BERT 那样并行。实际落地中，**KV Cache** 是关键优化：缓存前序 token 的 Key 和 Value 矩阵，避免重复计算，将每一步的复杂度从 O(n²) 降到 O(n)。但 KV Cache 会占用显存，对于 7B 模型，生成 2048 token 时约需 2GB 显存（假设 FP16，每层 hidden=4096，num_heads=32）。

**采样策略与多样性**

逐 token 预测的最后一层是 **softmax**，输出概率分布。采样策略（如 **Top-k**、**Top-p**、**Temperature**）控制多样性：

- **Temperature**：缩放 logits，温度高（>1）使分布更均匀，增加随机性；温度低（<1）使分布更尖锐，趋向确定性。
- **Top-k**：只保留概率最高的 k 个 token 重采样，避免低概率 token 被选中。
- **Top-p**：累积概率超过 p 的最小 token 集合，动态调整候选数。实际坑：**Temperature 与 Top-p 同时使用**时，需先应用 Temperature 再截断，否则顺序错误会导致分布失真。

**非自回归（NAR）的挑战**

非自回归模型（如 Mask-Predict、CMLM）试图并行生成所有 token，但面临**多模态问题**：序列中 token 间存在强依赖，并行预测容易产生矛盾（如“I love”和“love I”同时出现）。NAR 通常需要迭代精炼（Iterative Refinement）或知识蒸馏，质量仍低于 AR 模型，且训练复杂度高。因此，当前主流 LLM（GPT、Llama、Claude）仍坚持逐 token 自回归。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**数学原理**——自回归分解将联合概率拆成条件概率乘积，因果注意力强制每个 token 只能看左边；第二，**训练与推理的 trade-off**——训练用 Teacher Forcing 实现并行化，但推理必须串行，靠 KV Cache 优化；第三，**采样与扩展**——逐 token 预测通过 Top-k/Top-p 控制多样性，而非自回归方法因多模态问题质量不足。总结一句：逐 token 是自回归模型的数学必然，也是当前质量与效率的最佳平衡点。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么不用非自回归模型？比如 Mask-Predict 在机器翻译上效果也不错。

> 非自回归（NAR）的核心问题是**多模态**：序列中 token 间存在强依赖，并行预测时模型无法知道其他位置会生成什么，导致矛盾（如主谓不一致）。Mask-Predict 通过迭代精炼缓解，但迭代次数增加后延迟优势消失。实际对比：在 WMT’14 En-De 翻译任务上，NAR 的 BLEU 比 AR 低 2-3 个点，且训练需要知识蒸馏（用 AR 模型生成伪数据）。因此，在追求质量的场景（如对话、写作）中，AR 仍是首选；只有在延迟极度敏感的场景（如实时语音识别）才考虑 NAR。

**追问 2**：KV Cache 具体怎么实现？显存占用如何计算？

> KV Cache 在推理时缓存每层 self-attention 的 Key 和 Value 矩阵。假设模型有 L 层，每层 hidden size 为 d，num_heads 为 h，head_dim 为 d/h，生成序列长度为 n。显存占用 = L × 2 × n × d × 2（FP16 每个元素 2 字节）。例如，Llama 7B（L=32, d=4096）生成 2048 token 时，KV Cache 占用 32 × 2 × 2048 × 4096 × 2 ≈ 1GB。实际中还需加上 attention mask 和中间变量，约 2GB。优化技巧：**Multi-Query Attention（MQA）** 或 **Grouped-Query Attention（GQA）** 共享 Key/Value 头，可减少显存占用 50% 以上。

**追问 3**：训练时 Teacher Forcing 导致的暴露偏差怎么解决？

> 常用方法：**Schedule Sampling**——训练初期以高概率使用真实 token，后期逐渐增加模型生成 token 的比例。但直接替换会导致训练不稳定，因为模型生成的 token 分布与真实分布不同。更鲁棒的做法是**对抗训练**：在输入中注入小噪声（如 token 替换或 dropout），让模型适应错误输入。另一种是**强化学习**（如 RLHF 中的 PPO），直接优化生成序列的奖励，但训练成本高。实践中，对于小模型（<1B），暴露偏差影响明显；大模型（>7B）由于容量大，通常能自然缓解。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 回答“因为 LLM 是自回归模型，所以逐 token 生成” → ✅ 需要解释自回归的数学定义（条件概率分解）和因果注意力的实现机制，不能只堆名词。
- ❌ 说“逐 token 生成效率低，应该用非自回归” → ✅ 要承认 AR 的延迟问题，但指出 NAR 的质量损失和训练复杂度，给出 trade-off 分析。
- ❌ 混淆“逐 token”与“逐词” → ✅ 明确 token 是子词（如 BPE 分词），不是完整单词，例如“unbelievable”可能被拆成“un”、“believe”、“able”三个 token。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从生成质量切入，说明逐 token 预测如何影响检索增强的流畅性（如生成时依赖检索到的片段，但因果注意力只能看到左侧，导致长上下文依赖问题），并提到 KV Cache 在长文档生成中的显存优化。
- **如果你只做过传统 NLP**：用 N-gram 语言模型类比，说明自回归是 N-gram 的神经网络版本（从固定窗口到可变长度），并对比 Teacher Forcing 与 MLE 训练的区别。
- **如果你是校招无项目**：聚焦论文复现，提到 GPT-2 的因果注意力实现细节（如 PyTorch 的 `nn.TransformerDecoder` 中的 `is_causal=True`），并展示对采样策略（Top-k/Top-p）的数学理解。
- 《Attention Is All You Need》—— Transformer 架构与因果注意力的原始论文
- 《Language Models are Unsupervised Multitask Learners》—— GPT-2 的自回归生成细节
- 《Non-Autoregressive Neural Machine Translation》—— NAR 模型的挑战与解法
- 《The Annotated Transformer》—— PyTorch 实现因果注意力的代码详解
- 《LLM Inference Optimization: KV Cache and Beyond》—— 推理加速的工程实践博客

---
