---
slug: enterprise-tk812
no: "1712"
title: "How does Beam Search improve upon Greedy Search, and what is the role of the beam width parameter"
question: "How does Beam Search improve upon Greedy Search, and what is the role of the beam width parameter"
excerpt: "面试官想看你是否真正理解自回归解码的底层逻辑，而非死记硬背。考察类型是“工程取舍+系统设计”。刁钻点在于：Beam Search 看似简单，但 beam width 的 trade-off（搜索质量 vs 计算开销 vs"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4189
updated: "2026-09-29"
---

## How does Beam Search improve upon Greedy Search, and what is the role of the beam width parameter

#### 1️⃣ 考察意图

面试官想看你是否真正理解自回归解码的底层逻辑，而非死记硬背。考察类型是“工程取舍+系统设计”。刁钻点在于：Beam Search 看似简单，但 beam width 的 trade-off（搜索质量 vs 计算开销 vs 多样性退化）是实际部署中的核心问题。答好了能展示你对解码算法的深度理解、超参数调优经验，以及能结合具体任务（如翻译 vs 对话）做决策的工程能力。

#### 2️⃣ 标准答

**Greedy Search 的局限**每一步只选当前概率最高的 token，形如 `argmax` 贪心。问题是：局部最优 ≠ 全局最优。例如翻译 "I have a pen" → 第一步选 "我"（0.6），但 "我有一支笔" 的全局概率可能更高，只是第一步 "我" 的概率略低于 "我" 的备选（如 "我有" 的联合概率更高）。Greedy 直接砍掉所有分支，错过更优解。

**Beam Search 的核心改进**维护 `beam_width`（记作 `k`）个候选序列，每一步对每个候选扩展所有可能的 next token，计算联合概率（log 概率累加），然后保留 top-k 个序列。例如 `k=2`，初始候选 ["我", "我有"]，第二步分别扩展，保留总概率最高的 2 个。这本质是**宽度优先的剪枝搜索**，用有限计算换取全局近似最优。

**Beam Width 的角色与 trade-off**

- **搜索质量**：`k` 越大，搜索空间指数级增长（每步 `k * vocab_size` 次计算），找到全局最优的概率越高。但收益递减：WMT14 英德翻译中，`k=5` 比 `k=1`（即 Greedy）BLEU 提升约 1.5-2 点，`k=10` 仅再提升 0.3 点。
- **计算开销**：推理时间线性增长（`k` 倍），且内存占用也线性增加（需存储 `k` 个序列的 hidden states）。实际部署中，`k=4` 或 `5` 是常见折中。
- **多样性退化**：`k` 过大时，候选序列高度相似（都集中在高概率路径），导致生成文本重复、保守。对话生成中，`k=2` 或 `3` 反而比 `k=10` 更自然。这是**Beam Search 的经典坑**：追求最优解反而损失多样性。

**长度归一化（Length Normalization）**Beam Search 的联合概率是 log 概率累加，长序列天然概率更低（因为乘了更多 <1 的概率）。直接比较会导致偏好短序列。常用长度惩罚：`score = log_prob / (length^α)`，其中 `α` 通常取 0.6-1.0。例如 GNMT 论文中 `α=0.6` 效果最佳。**实际落地的坑**：长度惩罚系数对翻译质量敏感，需在验证集上调参，否则可能生成过长或过短的句子。

**实际落地的坑 + 解法**

- **坑**：Beam Search 在 beam 内可能产生重复 n-gram（如 "I love love love"）。
- **解法**：结合 n-gram 重复惩罚（如 no_repeat_ngram_size=3），在扩展时直接剪掉包含重复 trigram 的候选。
- **坑**：`k` 过大时，beam 内序列高度相似，浪费计算。
- **解法**：使用**分组 Beam Search**（Group Beam Search），将 beam 分成若干组，每组独立搜索，最后合并，强制多样性。

**对比实际效果**

- **机器翻译**：Beam Search（`k=4-5`）显著优于 Greedy，BLEU 提升 1-3 点。
- **对话/故事生成**：Greedy 或 Top-k Sampling（`k=40-50`）更优，Beam Search 易生成无聊的 "safe" 回复。
- **代码生成**：Beam Search 可提升语法正确性，但需结合约束解码（如 AST 约束）。

#### 3️⃣ 答题模板（30 秒电梯版）

> "这个问题我从三个层面回答：第一，Greedy Search 的局部最优问题，每一步只选最高概率 token，容易错过全局更优路径；第二，Beam Search 通过维护 k 个候选序列，用宽度优先剪枝来近似全局最优，beam width 越大搜索越充分但计算量线性增长，且 k 过大时多样性退化；第三，实际部署中需结合长度归一化和重复惩罚，翻译任务 k=4-5 最佳，对话任务反而推荐采样。总结一句：Beam Search 是质量与效率的折中，beam width 是核心旋钮，需根据任务调优。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Beam Search 和 Top-k Sampling 有什么区别？什么时候该用哪个？

> **应对策略**：Beam Search 是确定性搜索，追求全局最优，适合质量敏感任务（翻译、摘要）；Top-k Sampling 是随机采样，从 top-k 个 token 中按概率分布采样，增加多样性，适合开放生成（对话、故事）。工程取舍：Beam Search 输出稳定但无聊，Top-k 输出多样但可能跑偏。实际中可混合：先用 Beam Search 生成候选，再用 reranker 选最优。

**追问 2**：Beam Search 在长文本生成中有什么问题？怎么解决？

> **应对策略**：主要问题是长度归一化失效和重复循环。长序列中，log 概率累加导致分数极低，长度惩罚系数 α 需随长度动态调整（如 α=0.6 对 50 token 有效，对 500 token 可能过度惩罚）。解法：使用**对比搜索**（Contrastive Search），在每一步同时考虑概率和与历史 token 的相似度，强制多样性；或使用**约束 Beam Search**，加入长度约束（如 min_length/max_length）。

**追问 3**：你怎么在 Transformer 中实现 Beam Search？说说关键数据结构。

> **应对策略**：核心数据结构是 `(sequences, scores, hidden_states)` 的 beam 列表。每步：1) 对每个 beam 扩展 vocab 所有 token，计算新 log 概率；2) 用 `topk` 操作保留全局 top-k 个序列；3) 用 `finished` 标志位标记已生成 EOS 的 beam，并单独处理（不继续扩展）。关键优化：用**批处理**（batch_size = k）并行计算所有 beam 的 next token logits，避免循环。注意：需处理 EOS 提前终止，通常设置 `early_stopping=True` 或 `min_length` 约束。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说 "Beam Search 一定比 Greedy 好，beam width 越大越好" → ✅ 正确切入：Beam Search 在翻译等任务上优于 Greedy，但在对话中可能更差；beam width 过大导致多样性退化，需根据任务调优。
- ❌ 说 "Beam Search 的联合概率直接相乘就行，不需要归一化" → ✅ 正确切入：长序列概率天然低，必须用长度归一化（如 `score = log_prob / length^α`），否则模型偏好短序列。
- ❌ 说 "Beam Search 和 Viterbi 算法一样" → ✅ 正确切入：Viterbi 是全局最优（动态规划），但需要马尔可夫假设；Beam Search 是近似搜索，适用于非马尔可夫模型（如 Transformer）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从 "Beam Search 在检索增强生成中用于多路径推理" 切入，例如在 RAG 中生成多个候选答案，再用 reranker 选最优，beam width 控制检索-生成的 trade-off。
- **如果你只做过传统 NLP**：用 "Beam Search 在 HMM/CRF 序列标注中的 Viterbi 变体" 类比，强调从动态规划到近似搜索的演进，展示迁移能力。
- **如果你是校招无项目**：聚焦 "在 Hugging Face Transformers 中复现 Beam Search，对比 `num_beams=1,3,5` 在 WMT14 翻译上的 BLEU 和推理时间"，写一篇技术博客或 GitHub demo，展示动手能力。
- "Beam Search Strategies for Neural Machine Translation" (WMT 2017, Wu et al.)
- "The Curious Case of Neural Text Degeneration" (ICLR 2020, Holtzman et al.) — 对比 Beam Search 与采样
- "Hugging Face Transformers: Generation with Beam Search" (官方文档)
- "Contrastive Search: A Simple and Effective Decoding Strategy for Neural Text Generation" (2022, Su et al.)
- "Group Beam Search: A Diversity-Promoting Decoding Strategy" (ACL 2021, Vijayakumar et al.)

---
