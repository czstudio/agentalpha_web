---
slug: enterprise-tk600
no: "1500"
title: "In the context of LLM pretraining, what is scaling law"
question: "In the context of LLM pretraining, what is scaling law"
excerpt: "面试官想考察你是否真正理解 Scaling Law 的本质，而不仅仅是背诵“模型越大越好”的结论。这属于工程取舍+系统设计类问题，刁钻点在于：很多人只记得 Kaplan 的“模型和数据同比例缩放”，却忽略了 Chinch"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4255
updated: "2026-09-29"
---

## In the context of LLM pretraining, what is scaling law

#### 1️⃣ 考察意图

面试官想考察你是否真正理解 Scaling Law 的本质，而不仅仅是背诵“模型越大越好”的结论。这属于**工程取舍+系统设计**类问题，刁钻点在于：很多人只记得 Kaplan 的“模型和数据同比例缩放”，却忽略了 Chinchilla 的“计算最优”才是当前主流。答好了能展示你对预训练资源分配（算力、数据、模型大小）的全局把控力，以及从论文到落地的工程思维——比如知道为什么 GPT-4 可能不是“计算最优”的，而是为了推理效率做了妥协。

#### 2️⃣ 标准答

Scaling Law 的核心是：**在 LLM 预训练中，模型性能（通常用交叉熵损失衡量）与模型参数量、数据量、计算量之间存在可预测的幂律关系**。具体来说，损失 L 近似满足 L ≈ a * N^(-α) + b * D^(-β) + c，其中 N 是参数量，D 是 token 数，α、β 是幂律指数（通常 α≈0.076，β≈0.103，来自 Kaplan 论文）。

**关键发现分两派，必须分清：**

- **Kaplan 定律（2020，OpenAI）**：在固定计算预算 C 下，最优分配是同时增大模型和数据，且模型大小 N 和数据量 D 应等比例缩放（N ∝ C^0.73，D ∝ C^0.27）。结论是“模型越大越好，数据也要跟上”，但当时受限于实验规模（最大 1.5B 参数），低估了数据的重要性。
- **Chinchilla 定律（2022，DeepMind）**：重新实验后发现，对于给定计算预算 C，模型大小 N 和数据量 D 应**同等缩放**（N ∝ C^0.5，D ∝ C^0.5）。这意味着 Kaplan 的模型偏大、数据偏少。Chinchilla 论文训练了一个 70B 模型，用了 1.4T token，性能超过 175B 的 GPT-3（只用了 300B token），验证了“计算最优”原则。

**为什么 Chinchilla 更正确？** 因为 Kaplan 的实验受限于小模型（<1.5B），幂律指数外推到大模型时偏差大。Chinchilla 用三种方法（固定模型大小变数据量、固定计算预算变模型大小、IsoFLOP 轮廓分析）交叉验证，结论更稳健。

**实际落地的坑与解法：**

- **坑 1：盲目追求大模型，数据不足。** 很多团队在 2022 年前训练 100B+ 模型，但只用了 200-300B token，导致模型欠拟合。解法：用 Chinchilla 公式计算最优数据量。例如，训练一个 70B 模型，最优 token 数 ≈ 70B * 20（经验系数，来自 Chinchilla 论文的 20:1 比例），即 1.4T token。如果只有 500B token，不如把模型缩小到 25B。
- **坑 2：Scaling Law 不适用于所有架构。** 例如，MoE（Mixture of Experts）模型的 Scaling Law 不同，因为其有效参数量与总参数量解耦。解法：在小规模（如 1B 总参数，256 个 expert）上先拟合自己的幂律曲线，再外推。
- **坑 3：训练超参数（学习率、batch size）不随规模缩放。** 直接套用 Chinchilla 公式但用固定学习率，会导致大模型训练不稳定。解法：使用 µP（Maximal Update Parameterization）或 WSD（Warmup-Stable-Decay）学习率调度，确保不同规模下梯度更新幅度一致。

**工程取舍：** 是否要严格遵循“计算最优”？不一定。例如，GPT-4 可能故意训练了更多 token（超过 Chinchilla 最优），因为推理时大模型更高效（更少 step 达到相同精度），牺牲训练成本换取推理成本。这取决于你的业务场景：如果推理量极大（如 ChatGPT），训练时多花算力是值得的。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Scaling Law 的定义——模型性能与参数量、数据量、计算量之间的幂律关系。第二，两个关键发现——Kaplan 的‘模型和数据同比例缩放’和 Chinchilla 的‘计算最优同等缩放’，后者是当前主流。第三，实际应用——用 Chinchilla 公式指导资源分配，比如 70B 模型需要 1.4T token，同时注意 MoE 架构和超参数缩放。总结一句：Scaling Law 是预训练的‘物理定律’，但需要根据业务场景（训练 vs 推理成本）做取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 Chinchilla 更正确，那为什么现在很多模型（如 Llama 3）还是用了比 Chinchilla 推荐更多的 token？

> 因为 Chinchilla 的“计算最优”是针对**训练成本**最小化，但实际部署中**推理成本**更重要。Llama 3 70B 用了 15T token（远超 Chinchilla 的 1.4T），目的是让模型在更少推理 step 下达到更高精度，从而降低推理延迟。这是一个 trade-off：训练成本增加 10 倍，但推理成本可能降低 5 倍，如果推理量很大（如 Meta 的社交产品），整体更划算。另外，Chinchilla 的实验基于固定架构（纯 Dense Transformer），而 Llama 3 用了 GQA（Grouped Query Attention）等改进，可能改变了最优比例。

**追问 2**：Scaling Law 对 MoE 模型还适用吗？怎么调整？

> 适用，但需要重新拟合。MoE 的 Scaling Law 通常用**总参数量**（包括 expert 参数）和**激活参数量**（每个 token 实际使用的参数）两个维度。例如，DeepSeek-V2 的论文发现，MoE 的损失 L 与激活参数量 N_active 和总数据量 D 满足类似幂律关系，但指数不同（α 更大，因为 MoE 更高效）。实际做法：在小规模（如 1B 总参数，8 expert）上训练 5-10 个不同配置，拟合 L ≈ a * N_active^(-α) + b * D^(-β) + c，再用这个公式外推。注意 expert 数量增加时，负载均衡损失（load balancing loss）会引入额外约束，需要调整辅助 loss 系数。

**追问 3**：如果计算预算固定，你怎么决定是训练一个更大的模型还是用更多数据？给具体数字。

> 用 Chinchilla 公式：假设计算预算 C = 1e23 FLOPs（约 1000 张 A100 跑 30 天），最优模型大小 N_opt ≈ (C / 6)^0.5 ≈ 4e11（400B 参数），最优数据量 D_opt ≈ (C / 6)^0.5 ≈ 4e11 token。但这是理论值，实际受限于数据质量。如果高质量数据只有 200B token，我会把模型缩小到 200B，保持 1:1 比例。如果数据无限（如合成数据），可以适当增大模型到 500B，但要注意过拟合风险。一个实用经验：先在小规模（如 1B 模型）上做 ablation，找到自己数据集的幂律指数，再外推。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背 Kaplan 定律，说“模型和数据等比例缩放”，不提 Chinchilla。 → ✅ 必须区分两派，并指出 Chinchilla 是当前主流，因为其实验更严谨（更大模型范围、三种验证方法）。
- ❌ 认为 Scaling Law 是绝对的，任何模型都适用。 → ✅ 指出局限性：MoE、多模态、长上下文模型（如 RoPE 位置编码）可能改变幂律指数，需要重新拟合。
- ❌ 把 Scaling Law 等同于“模型越大越好”，忽略数据量和计算预算的约束。 → ✅ 强调“计算最优”概念，并给出具体比例（如 20:1 的 token-参数比）。

#### 6️⃣ 简历呼应

- **如果你有预训练项目经验**：从“实际训练中如何验证 Scaling Law”切入，比如你在训练 1B 模型时，用 IsoFLOP 曲线找到了最优 token-参数比，并对比了 Kaplan 和 Chinchilla 的差异。强调你如何用这个结论调整了数据配比。
- **如果你只做过微调或推理优化**：用类比迁移——Scaling Law 在微调中类似“数据量和模型大小的关系”，比如 LoRA 的 rank 和训练数据量之间也有最优比例。提一下你如何用类似思路优化了微调成本。
- **如果你是校招无项目**：聚焦论文复现——你复现了 Chinchilla 论文的 IsoFLOP 分析，在小规模（如 125M 模型）上验证了幂律指数，并写了一个开源工具（如 scaling-law-analyzer）。强调你对实验设计的理解（如何控制变量、避免过拟合）。
- Scaling Laws for Neural Language Models (Kaplan et al., 2020) —— 奠基性论文，理解幂律关系。
- Training Compute-Optimal Large Language Models (Hoffmann et al., 2022) —— Chinchilla 定律，当前标准。
- Scaling Data-Constrained Language Models (Muennighoff et al., 2023) —— 数据受限下的 Scaling Law 变体。
- The LLaMA 3 Herd of Models (Meta, 2024) —— 实际工程中如何突破 Chinchilla 最优，用更多数据训练。
- µP: Maximal Update Parameterization (Yang et al., 2022) —— 解决超参数随模型规模缩放的工程方案。

---
