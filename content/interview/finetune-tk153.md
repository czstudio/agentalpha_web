---
slug: finetune-tk153
no: "1053"
title: "SFT和强化学习各自有什么优缺点，分别适用于什么场景"
question: "SFT和强化学习各自有什么优缺点，分别适用于什么场景"
excerpt: "面试官想考察你对 LLM 训练范式的底层理解，而非简单背诵概念。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：很多人只背了“SFT 模仿，RL 对齐”的结论，却说不清为什么 RL 能优化非可微目标、以及 DPO 等"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3620
updated: "2026-09-29"
---

## SFT和强化学习各自有什么优缺点，分别适用于什么场景

`P1` · `llm_training`

📊 考点：sft · reinforcement-learning · ppo

#### 1️⃣ 考察意图

面试官想考察你对 LLM 训练范式的底层理解，而非简单背诵概念。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：很多人只背了“SFT 模仿，RL 对齐”的结论，却说不清为什么 RL 能优化非可微目标、以及 DPO 等新方法如何绕过 RL 的问题。答好了能展示你对训练管线（pre-train → SFT → RLHF）的全局把控，以及从数据、训练稳定性到部署成本的工程直觉。

#### 2️⃣ 标准答

**SFT（监督微调）的优缺点**

- **优点**：训练稳定，损失函数是标准的交叉熵，梯度平滑，收敛快（通常 1-3 epoch 即可）。数据易获取——只需要（prompt, 理想回答）对，不需要奖励模型或在线采样。适合快速让模型学会格式、指令跟随、知识注入等“模仿”任务。
- **缺点**：本质是最大似然估计，只能拟合数据分布，无法优化非可微目标（如人类偏好、安全性、多样性）。依赖人工标注质量，标注偏差会直接放大到模型输出。且 SFT 容易导致“模式坍塌”——模型过度模仿高频回答，缺乏探索能力。
- **实际落地的坑**：SFT 数据中若存在“好回答”和“更好回答”，模型会平均化，导致输出平庸。解法：用 rejection sampling 或 hard negative mining 筛选数据，只保留 top-k 质量样本。

**强化学习（如 PPO）的优缺点**

- **优点**：能直接优化非可微的奖励信号（如人类评分、安全性规则、多样性指标）。通过策略梯度（如 PPO 的 clip 机制）让模型在探索中生成更优策略，避免 SFT 的“死记硬背”。典型效果：在 Anthropic 的 HH-RLHF 数据集上，PPO 相比 SFT 胜率提升 15-20%。
- **缺点**：训练不稳定——PPO 需要同时维护策略网络、价值网络、参考模型和奖励模型，超参数敏感（如 KL 惩罚系数、clip 范围）。计算成本高：每次更新需要在线采样（batch 大小通常 512-1024），比 SFT 慢 3-5 倍。且奖励模型本身有偏差，容易导致 reward hacking（模型学会欺骗奖励模型而非真正对齐）。
- **实际落地的坑**：PPO 训练中 KL 散度惩罚过大，模型会退化为 SFT 行为，失去探索能力；过小则策略偏移严重，输出质量崩溃。解法：动态调整 KL 系数（如 OpenAI 的 adaptive KL controller），或使用 GRPO（Group Relative Policy Optimization）减少价值网络依赖。

**适用场景对比**

- **SFT 优先**：指令跟随（如让模型学会 JSON 输出）、格式学习（如 markdown 结构）、知识注入（如领域术语）。当你有高质量标注数据且目标明确时，SFT 是性价比最高的选择。
- **RL 必要**：需要对齐人类偏好（如对话助手避免有害输出）、生成多样性（如创意写作）、优化复合指标（如摘要的 ROUGE + 安全性联合评分）。典型场景：ChatGPT 的早期训练就是先 SFT 再 RLHF，RL 阶段让模型学会“拒绝回答”和“承认不知道”。
- **结合策略**：工业界标准管线是 SFT → RLHF。SFT 提供基础能力（模型至少能生成通顺回答），RL 在 SFT 基础上微调偏好。若跳过 SFT 直接 RL，模型会因策略空间过大而发散。

**趋势：DPO 等免 RL 方法**

DPO（Direct Preference Optimization）通过将偏好概率直接建模为策略损失，绕过了奖励模型和在线采样。优点：训练稳定（类似 SFT 的交叉熵），计算成本低（只需一次前向）。缺点：对偏好数据质量敏感，且无法处理多轮奖励信号（如对话中的长期一致性）。适用场景：中小团队快速对齐，或作为 RL 的 warm-start。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从训练稳定性、优化目标和计算成本三个层面回答。SFT 稳定、数据易获取，适合指令跟随和格式学习；RL 能优化非可微目标，适合对齐人类偏好，但训练不稳定且成本高。实际中通常先 SFT 再 RL，DPO 等新方法在特定场景下可替代 RL。总结一句：SFT 解决‘能说’，RL 解决‘说好’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 PPO 比 SFT 更容易过拟合？你怎么防止？

> PPO 过拟合通常源于奖励模型偏差和策略探索不足。解法：① 使用 KL 散度惩罚（通常 β=0.01-0.1）约束策略偏移；② 在线采样时加入 dropout（rate=0.1）增加随机性；③ 定期用验证集评估奖励模型，若奖励持续上升但人类评估下降，说明 reward hacking，需回退 checkpoint 并调整奖励模型训练数据。

**追问 2**：DPO 和 PPO 在数学上等价吗？为什么 DPO 更稳定？

> 不等价。DPO 假设偏好概率服从 Bradley-Terry 模型，将 RL 的奖励函数隐式参数化为策略比的对数，从而直接优化偏好损失。稳定性来自两点：① 无需在线采样，避免了 PPO 的策略-价值网络联合训练的不稳定性；② 损失函数是凸的（在策略空间上），梯度更平滑。但 DPO 无法处理多步奖励（如对话中的长期一致性），PPO 仍不可替代。

**追问 3**：如果数据量有限（比如只有 1000 条偏好对），你会选 SFT 还是 RL？

> 选 SFT + rejection sampling。1000 条数据对 RL 来说太少，PPO 的在线采样会快速过拟合，且奖励模型训练不稳定。做法：先用 SFT 在 1000 条上微调，然后对每个 prompt 采样 10 个回答，用人工或规则筛选 top-1，再对筛选后的数据做第二轮 SFT。这本质是“伪 RL”的探索-利用，但更稳定。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “SFT 就是模仿，RL 就是对齐，RL 一定比 SFT 好。” → ✅ “RL 在偏好对齐上优于 SFT，但训练成本高、不稳定，且对奖励模型敏感。SFT 在指令跟随和知识注入上性价比更高，两者是互补关系。”
- ❌ “PPO 训练时 KL 惩罚越大越好，防止模型跑偏。” → ✅ “KL 惩罚过大会抑制探索，模型退化为 SFT；过小则策略偏移。实际中常用 adaptive KL（如目标 KL=0.01-0.05）动态调整。”
- ❌ “DPO 完全替代了 PPO。” → ✅ “DPO 在单步偏好对齐上更稳定，但无法处理多步奖励（如对话历史依赖），且对数据质量敏感。工业界常将 DPO 作为 PPO 的 warm-start，而非替代。”

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“PPO 训练中 KL 系数调参经验”切入，展示你踩过 reward hacking 的坑并用了 adaptive KL 解决，同时对比 DPO 的稳定性。
- **如果你只做过传统 NLP**：用“SFT 类似 seq2seq 的 teacher forcing，RL 类似 beam search 的探索”类比，强调你对损失函数和优化目标的底层理解。
- **如果你是校招无项目**：聚焦“DPO 论文复现”，说明你理解 Bradley-Terry 模型和策略梯度关系，并给出在 Alpaca 数据集上的对比实验（SFT vs DPO 胜率）。

#### 7️⃣ 延伸阅读

- 《Training language models to follow instructions with human feedback》（InstructGPT 论文）
- 《Direct Preference Optimization: Your Language Model is Secretly a Reward Model》（DPO 论文）
- 《PPO 在 LLM 中的实践：OpenAI 的 adaptive KL controller 实现》
- 《GRPO: Group Relative Policy Optimization for LLM Alignment》
- 《Reward Hacking 案例分析：Anthropic 的 HH-RLHF 数据集》

---
