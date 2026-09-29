---
slug: enterprise-tk671
no: "1571"
title: "What are the common architectures used for LLM pretraining, and why are they preferred"
question: "What are the common architectures used for LLM pretraining, and why are they preferred"
excerpt: "面试官想考察你对LLM预训练架构的底层理解，而非简单背诵“Transformer三兄弟”。真正意图是：你是否能解释为什么decoder-only成为GPT系列首选，而encoder-decoder（T5）和encoder"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4465
updated: "2026-09-29"
---

## What are the common architectures used for LLM pretraining, and why are they preferred

#### 1️⃣ 考察意图

面试官想考察你对LLM预训练架构的底层理解，而非简单背诵“Transformer三兄弟”。真正意图是：**你是否能解释为什么decoder-only成为GPT系列首选，而encoder-decoder（T5）和encoder-only（BERT）在特定场景下被边缘化**。刁钻点在于：**能否从计算效率、注意力掩码、扩展性三个维度对比，并指出新兴架构（Mamba、RWKV）的动机和当前局限**。答好了能展示：对Transformer变体设计取舍的深刻认知、对长上下文和推理成本的工程敏感度、以及对前沿架构的批判性思考。

#### 2️⃣ 标准答

LLM预训练主流架构可归为三类，核心差异在**注意力掩码**和**参数复用**方式。

**1. Decoder-only（GPT系列、LLaMA、Qwen）**

- **结构**：因果注意力（causal attention），每个token只能看到自己和之前的token。
- **为什么被偏好**：
- **计算效率**：训练时所有token并行计算，推理时KV cache可复用，生成复杂度O(n)而非O(n²)。
- **扩展性**：堆叠层数时，无需像encoder-decoder那样维护两个独立模块，参数量更集中。GPT-3 175B参数全部在decoder中，而T5 11B的encoder和decoder各占一半，导致相同参数量下decoder-only的“有效容量”更高。
- **零样本泛化**：因果掩码天然适配自回归生成，In-context learning（ICL）和Chain-of-Thought（CoT）都依赖这种单向信息流。
- **实际落地的坑**：长上下文时，RoPE或ALiBi位置编码的插值策略需要调参。例如LLaMA-2的4k上下文扩展到32k时，直接线性插值会导致困惑度飙升，需用NTK-aware scaling或YaRN。

**2. Encoder-decoder（T5、BART）**

- **结构**：encoder用双向注意力（bidirectional attention）理解输入，decoder用因果注意力生成输出。
- **适用场景**：序列到序列任务（翻译、摘要、文本修复）。T5的“span corruption”预训练目标（随机mask连续token并预测）在NLU任务上曾优于GPT-2。
- **为什么不再主流**：
- **推理延迟高**：生成时需先跑完整encoder，再跑decoder，无法像decoder-only那样流式输出。T5-11B在相同硬件上推理速度比GPT-3 175B慢约2-3倍（因encoder计算不可缓存）。
- **扩展性瓶颈**：encoder和decoder的参数量分配是固定比例，无法像decoder-only那样灵活调整。T5的“相对位置编码”在长序列（>8k）时内存爆炸，而decoder-only的RoPE可通过截断或插值缓解。

**3. Encoder-only（BERT、RoBERTa）**

- **结构**：双向注意力，MLM（Masked Language Model）预训练。
- **现状**：几乎被淘汰。原因：
- **生成能力缺失**：无法直接做文本生成，需额外加decoder或非自回归头。
- **微调成本高**：BERT-large 340M参数，但微调时需对每个任务加分类头，而decoder-only模型可通过prompt engineering零样本解决。
- **长上下文劣势**：双向注意力在序列长度>512时，O(n²)计算量导致显存爆炸，而decoder-only的FlashAttention可支持128k上下文。

**4. 新兴架构（Mamba、RWKV）**

- **动机**：Transformer的O(n²)注意力在超长序列（>100k）时不可持续。Mamba用**状态空间模型（SSM）** 实现线性复杂度，RWKV用**线性注意力+时间衰减**模拟RNN。
- **当前局限**：
- **训练不稳定**：Mamba在>7B参数时出现梯度爆炸，需用特殊的初始化策略（如HiPPO矩阵）。
- **ICL能力弱**：RWKV-7B在Few-shot推理任务上比LLaMA-7B低约15%准确率（MMLU基准），因线性注意力丢失了注意力头间的交互。
- **硬件利用率低**：SSM的矩阵乘法无法像FlashAttention那样利用Tensor Core，导致小batch下吞吐量反而低于Transformer。

**总结**：decoder-only Transformer凭借**因果掩码+KV cache+RoPE**的组合，在计算效率、扩展性和通用性上达到最优平衡。新兴架构在超长上下文场景有潜力，但当前在训练稳定性和ICL能力上尚未超越Transformer。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，主流架构是decoder-only（GPT）、encoder-decoder（T5）和encoder-only（BERT），核心差异在注意力掩码。第二，decoder-only被偏好是因为因果掩码支持并行训练和KV cache推理，且参数量集中在生成模块，扩展性更好。第三，新兴架构如Mamba用SSM降低复杂度，但训练稳定性和ICL能力仍有差距。总结一句：decoder-only Transformer是当前最优解，但超长上下文场景下Mamba等架构值得关注。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么decoder-only的KV cache能加速推理，而encoder-decoder不行？

> 应对策略：KV cache本质是缓存decoder层中key和value的中间结果，避免重复计算。decoder-only的因果掩码保证生成第n个token时，前n-1个token的key/value不变，可直接复用。而encoder-decoder的encoder输出是固定的，但decoder的key/value来自encoder和已生成token的混合，无法简单缓存。例如T5-11B生成100个token时，encoder需完整跑一次，而GPT-3 175B的KV cache可复用前99步的计算，推理延迟降低约40%。

**追问 2**：Mamba的线性复杂度具体怎么实现的？为什么还没取代Transformer？

> 应对策略：Mamba用状态空间模型（SSM）将注意力替换为递归更新，复杂度从O(n²)降到O(n)。但有两个硬伤：一是训练时需用并行扫描（parallel scan）替代矩阵乘法，无法利用Tensor Core，小batch下吞吐量比FlashAttention低30%；二是ICL能力弱，因为线性注意力本质是全局平均池化，丢失了注意力头间的交互。例如Mamba-7B在GSM8K数学推理上比LLaMA-7B低12%，因无法捕捉长程依赖的局部模式。

**追问 3**：如果让你设计一个10B参数的模型，你会选哪种架构？为什么？

> 应对策略：选decoder-only。理由：1）参数量集中，10B全部用于生成，比encoder-decoder的5B+5B更高效；2）推理时KV cache可复用，部署成本低；3）生态成熟，FlashAttention、vLLM等工具直接支持。如果任务需要超长上下文（>128k），可考虑混合架构：前几层用Transformer，后几层用Mamba的SSM，类似Jamba（AI21 Labs）的做法，平衡效率和ICL能力。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Transformer是唯一主流架构，其他都不行” → ✅ 正确切入：承认Transformer主导，但指出Mamba/RWKV在超长上下文场景的潜力，并说明其当前局限（训练不稳定、ICL弱）。
- ❌ 只列举架构名称，不解释“为什么偏好” → ✅ 正确切入：必须从计算效率（并行训练、KV cache）、扩展性（参数量分配）、任务适配（ICL、CoT）三个维度对比。
- ❌ 把encoder-only（BERT）和decoder-only（GPT）混为一谈 → ✅ 正确切入：明确指出BERT的MLM预训练无法做生成，且双向注意力在长序列时显存爆炸，而GPT的因果掩码是生成任务的关键。

#### 6️⃣ 简历呼应

- **如果你有LLM预训练项目**：从“训练稳定性”切入，对比decoder-only和encoder-decoder在相同数据量下的loss收敛曲线，指出decoder-only的梯度方差更小（因因果掩码减少信息泄露）。
- **如果你只做过传统NLP（LSTM/CRF）**：用“序列建模效率”类比，LSTM的O(n)复杂度但无法并行，Transformer的O(n²)但可并行，decoder-only通过KV cache在推理时达到O(n)，是工程上的最优解。
- **如果你是校招无项目**：聚焦“论文复现”，用Hugging Face实现一个6层decoder-only模型，在Wikitext-2上训练，对比同等规模LSTM的困惑度（decoder-only低约20%）和训练速度（快3倍），并分析RoPE位置编码对长序列的影响。
- “Attention Is All You Need”（Vaswani et al., 2017）——Transformer原始论文
- “Scaling Laws for Neural Language Models”（Kaplan et al., 2020）——decoder-only扩展性分析
- “Mamba: Linear-Time Sequence Modeling with Selective State Spaces”（Gu & Dao, 2023）——SSM架构详解
- “Jamba: A Hybrid Transformer-Mamba Language Model”（AI21 Labs, 2024）——混合架构实践
- “FlashAttention: Fast and Memory-Efficient Exact Attention”（Dao et al., 2022）——decoder-only推理加速核心

---
