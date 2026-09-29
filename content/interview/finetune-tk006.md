---
slug: finetune-tk006
no: "906"
title: "什么是「Scaling Laws「？它如何指导预训练"
question: "什么是「Scaling Laws「？它如何指导预训练"
excerpt: "面试官想看你能否解释 Scaling Laws 的数学形式和工程指导意义。这是 LLM 预训练的"理论基石"，几乎所有训练决策（模型多大、数据多少、算力多少）都基于 Scaling Laws。刁钻点在于：很多人只答"模型"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3997
updated: "2026-09-29"
---

## 什么是「Scaling Laws「？它如何指导预训练

#### 1️⃣ 考察意图

面试官想看你能否解释 Scaling Laws 的数学形式和工程指导意义。这是 LLM 预训练的"理论基石"，几乎所有训练决策（模型多大、数据多少、算力多少）都基于 Scaling Laws。刁钻点在于：很多人只答"模型越大效果越好"，但说不出幂律关系、Chinchilla 最优、以及计算预算分配。答好了能展示你的理论功底和工程决策能力。

#### 2️⃣ 标准答

**Scaling Laws 描述了模型性能（loss）与模型参数量 N、数据量 D、计算量 C 之间的幂律关系，是预训练的"导航图"。**

**1. Kaplan Scaling Laws（OpenAI, 2020）**

- **核心发现**：模型 loss 与 N、D、C 呈幂律关系：`L(N) = (N_c/N)^α`，`L(D) = (D_c/D)^β`，`L(C) = (C_c/C)^γ`
- **关键参数**：α≈0.076（参数），β≈0.095（数据），γ≈0.05（计算）
- **结论**：模型越大越好——在固定计算预算下，应该优先增加模型参数，而非数据量。推荐分配：参数占预算的 60%，数据占 40%
- **影响**：GPT-3（175B 参数）就是基于这个理论训练的——大模型 + 相对少的数据

**2. Chinchilla Scaling Laws（DeepMind, 2022）**

- **核心修正**：Kaplan 的实验设计有缺陷（模型和数据范围太窄），Chinchilla 重新实验后发现：最优分配不是"大模型少数据"，而是"模型和数据同步增长"
- 最优比例：每个参数应该训练约 20 个 token（即 D:N = 20:1）
- 计算预算分配：参数占 50%，数据占 50%
公式：L(N, D) = E + A/N^α + B/D^β，其中 E 是不可约 loss（数据本身的熵），A/N^α 是模型容量不足导致的 loss，B/D^β 是数据不足导致的 loss最优参数：α≈0.34，β≈0.28验证：Chinchilla（70B 参数 + 1.4T tokens）在几乎所有任务上超过 GPT-3（175B 参数 + 300B tokens），证明了"数据量不够的大模型是浪费"

**3. Chinchilla 最优的实际应用**

| 模型 | 参数量 | 训练 tokens | D:N 比 | 是否 Chinchilla 最优 |
|---|---|---|---|---|
| GPT-3 | 175B | 300B | 1.7:1 | ❌ 严重欠训练 |
| Chinchilla | 70B | 1.4T | 20:1 | ✅ |
| LLaMA-1 | 7B | 1T | 143:1 | ❌ 过训练（但推理高效） |
| LLaMA-2 | 7B | 2T | 286:1 | ❌ 过训练（但推理高效） |
| LLaMA-3 | 8B | 15T | 1875:1 | ❌ 严重过训练 |

**4. 为什么 LLaMA 系列选择"过训练"？**

Chinchilla 最优是"训练阶段最优"（每 FLOP 的 loss 下降最大），但 LLaMA 选择过训练是"推理阶段最优"：

- 训练成本是一次性的，推理成本是持续的——一个 7B 模型被调用 10 亿次，推理成本远超训练成本
- 过训练的 7B 模型推理速度快（参数少）、效果接近 70B（因为训练充分）
- trade-off：训练多花 10x 成本，但推理节省 10x 成本（7B vs 70B 的推理成本差 10 倍）

**5. Scaling Laws 的指导意义**

- **预算分配**：给定计算预算 C，用 Chinchilla 公式计算最优 N 和 D：`N* ∝ C^0.5, D* ∝ C^0.5`
- **停止时机**：当验证集 loss 达到 Scaling Laws 预测值时停止训练——继续训练不会显著降低 loss
- **模型选型**：根据推理预算选模型大小，然后反推需要的训练数据量

#### 3️⃣ 答题模板（30 秒电梯版）

> "Scaling Laws 描述 loss 与参数N、数据D、计算C 的幂律关系。Kaplan(2020)说'大模型优先'，导致 GPT-3 用 175B 参数但只训 300B tokens。Chinchilla(2022)纠正：最优是 N 和 D 同步增长，D:N≈20:1。Chinchilla 70B+1.4T 超过 GPT-3 175B+300B。但 LLaMA 选择'过训练'（7B+2T，D:N=286:1）——训练多花成本但推理更便宜。核心指导：给定预算用 Chinchilla 公式算最优 N 和 D，但如果推理成本主导则选择小模型+过训练。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Kaplan 和 Chinchilla 的结论为什么差这么多？谁的实验更可信？

> 差异原因：(1) 实验范围不同——Kaplan 的模型范围是 1K-1B 参数，Chinchilla 是 70M-10B，后者更接近实际规模；(2) 学习率调度不同——Kaplan 用固定学习率，Chinchilla 用 cosine schedule 并训练到收敛，更接近实际训练；(3) 数据量不同——Kaplan 的实验数据量太少（最大 10B tokens），导致模型"没吃够"数据就停了，误以为"大模型优先"。Chinchilla 更可信——它被多个独立实验验证（LLaMA、Falcon、Qwen 的训练数据都参考了 Chinchilla 比例）。

**追问 2**：LLaMA-3 用 15T tokens 训练 8B 模型（D:N=1875:1），这不是严重过训练吗？为什么不按 Chinchilla 来？

> LLaMA-3 确实严重过训练——Chinchilla 最优是 D:N=20:1，LLaMA-3 是 1875:1，差 94 倍。但这是有意的策略：(1) 推理经济性——8B 模型可以在单卡（如 RTX 4090）上推理，70B 需要 4×A100。如果模型被调用 10 亿次，8B 的推理成本节省远超训练多花的成本；(2) 数据充足——Meta 有 15T 高质量数据，不用白不用；(3) 过训练提升鲁棒性——过训练的模型对分布偏移更鲁棒，在下游微调时更稳定。trade-off：训练成本增加约 50 倍（15T vs Chinchilla 最优的 160B），但推理成本降低 10 倍。对于服务数十亿用户的模型，这个 trade-off 是值得的。

**追问 3**：Scaling Laws 在多模态（如 VLM）中还成立吗？

> 部分成立但需要修正：(1) 文本部分仍然遵循 Scaling Laws——VLM 中的语言模型部分和纯 LLM 一样；(2) 视觉部分（视觉编码器）的 Scaling Laws 不同——视觉编码器的参数量和数据量最优比可能不是 20:1，因为图像的信息密度高于文本；(3) 多模态融合层的数据量需要同时考虑文本和图像的 token 数，最优点可能不同。目前还没有像 Chinchilla 那样权威的多模态 Scaling Laws，大部分 VLM 的训练配比靠实验调参。Meta 的 LLaVA 系列在尝试建立多模态 Scaling Laws。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "模型越大效果越好" → ✅ "Chinchilla 证明模型和数据需要同步增长。大模型+少数据（如 GPT-3 175B+300B）不如中等模型+足量数据（如 Chinchilla 70B+1.4T）。"
- ❌ "按 Chinchilla 来就行" → ✅ "Chinchilla 是训练阶段最优，不是推理阶段最优。如果推理成本主导（如模型被调用数十亿次），应该选择小模型+过训练（如 LLaMA 7B+2T）。"
- ❌ "Scaling Laws 是精确的物理定律" → ✅ "Scaling Laws 是经验拟合的幂律关系，有适用范围。超出现测范围（如 100B+ 参数、100T+ tokens）时可能不成立。另外它只预测 loss，不直接预测下游任务性能。"

#### 6️⃣ 简历呼应

- **如果你有预训练项目**：从"Scaling Laws 应用"切入，描述你如何用 Chinchilla 公式计算最优 N 和 D，以及实际训练结果是否吻合预测
- **如果你只做过模型选型**：从"模型大小 vs 推理成本"切入，说明你如何根据 Scaling Laws 和推理预算选择模型大小
- **如果你是校招**：复现 Chinchilla 的小规模实验（用 100M-1B 模型），验证 D:N=20:1 是否最优，写博客
- "Scaling Laws for Neural Language Models" (Kaplan et al., 2020)
- "Training Compute-Optimal Large Language Models" (Hoffmann et al., 2022) — Chinchilla
- "LLaMA: Open and Efficient Foundation Language Models" (Touvron et al., 2023)

---
