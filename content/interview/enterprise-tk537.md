---
slug: enterprise-tk537
no: "1437"
title: "| Q43 | What are the different decoding strategies in LLMs"
question: "| Q43 | What are the different decoding strategies in LLMs"
excerpt: "面试官想考察你是否真正理解 LLM 解码策略的底层原理与工程取舍，而非背诵概念列表。这是典型的“背概念+工程取舍”混合题，刁钻点在于：能否从概率分布与搜索空间的角度解释策略差异，并给出具体场景下的选择依据。答好了能展示你"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4303
updated: "2026-09-29"
---

## | Q43 | What are the different decoding strategies in LLMs

#### 1️⃣ 考察意图

面试官想考察你是否真正理解 LLM 解码策略的底层原理与工程取舍，而非背诵概念列表。这是典型的“背概念+工程取舍”混合题，刁钻点在于：能否从概率分布与搜索空间的角度解释策略差异，并给出具体场景下的选择依据。答好了能展示你对生成质量、多样性、延迟三者的平衡能力，以及从论文（如《The Curious Case of Neural Text Degeneration》）到落地的实战经验。

#### 2️⃣ 标准答

LLM 解码策略本质是“从概率分布中选 token”的规则，分为**确定性**和**随机性**两大类。以下按复杂度递增展开：

- **Greedy Search（贪心搜索）**
- 原理：每一步选概率最高的 token，即 `argmax`。
- 优点：速度最快，O(1) 每步，适合实时场景（如聊天机器人首 token 延迟）。
- 缺点：易陷入重复循环（如“I love love love...”），缺乏多样性。实际落地中，常配合 `repetition_penalty`（如 1.2）缓解。
- 坑：在长文本生成中，贪心会放大早期错误，导致语义漂移。
- **Beam Search（束搜索）**
- 原理：维护 `beam_width`（如 4）个候选序列，每步扩展后保留 top-k 个路径，最后选总概率最高的。
- 优点：适合翻译、摘要等需高准确度的任务，输出质量稳定。
- 缺点：计算复杂度 O(beam_width * vocab_size)，且易生成“安全但无聊”的文本（如“the the the”）。论文《The Curious Case of Neural Text Degeneration》指出 beam search 在开放域生成中表现差。
- 工程取舍：beam_width 越大，质量提升边际递减（从 4 到 8 提升 0.5 BLEU，但延迟翻倍）。实际中常用 `length_penalty`（如 1.0-2.0）平衡短句偏好。
- **Top-K Sampling**
- 原理：从概率最高的 K 个 token 中采样（如 K=50），重归一化后随机选。
- 优点：避免低概率 token 的“胡言乱语”，同时保留多样性。
- 坑：K 固定导致问题：高确定性场景（如数学题）K 过大引入噪声，低确定性场景（如创意写作）K 过小限制多样性。实际中常动态调整 K（如根据概率分布熵）。
- **Top-P (Nucleus) Sampling**
- 原理：选择累积概率达到 P（如 0.9）的最小 token 集，重归一化后采样。
- 优点：自适应截断，比 Top-K 更灵活。论文《Nucleus Sampling》证明在故事生成中 perplexity 和多样性均优。
- 工程取舍：P 值控制探索-利用平衡：P=0.9 适合创意生成，P=0.5 适合事实性任务。实际落地中，常与 Temperature 配合使用（如 P=0.9, T=0.7）。
- **Temperature Sampling**
- 原理：通过温度 T 缩放 logits：`softmax(logits / T)`。T>1 使分布更均匀（增加多样性），T<1 使分布更尖锐（减少随机性）。
- 坑：T=0 等价于 Greedy，但数值不稳定（logits 除以 0 导致 NaN）。实际中常用 T=0.7 作为默认值。
- 组合策略：生产系统中常用“Top-P + Temperature”组合，如 GPT-4 默认 T=0.7, P=0.9。
- **Contrastive Search（对比搜索）**
- 原理：同时考虑 token 概率和与已生成序列的相似度，惩罚重复。论文《A Contrastive Framework for Neural Text Generation》提出。
- 优点：在长文本生成中显著减少重复，如生成 1000 token 时 distinct-2 提升 30%。
- 工程取舍：计算复杂度高（需维护相似度矩阵），适合离线场景。

**实际落地的坑与解法**：

- 坑：在对话系统中，Greedy 导致回复单调，Beam Search 产生“安全但无聊”的回复。解法：用 Top-P (P=0.9) + Temperature (T=0.8) 组合，并加入 `repetition_penalty=1.2`。
- 坑：在代码生成中，Sampling 可能产生语法错误。解法：用 Beam Search (width=4) + `length_penalty=1.5`，并后接语法校验。

**总结**：选择策略取决于任务：翻译/摘要用 Beam Search，创意写作用 Top-P + Temperature，实时聊天用 Greedy + 惩罚项。生产系统中常动态切换（如首 token 用 Greedy 降低延迟，后续用 Sampling 增加多样性）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，确定性策略包括 Greedy Search 和 Beam Search，适合翻译等需高准确度的任务；第二，随机性策略包括 Top-K、Top-P 和 Temperature Sampling，适合创意生成；第三，实际落地中常用组合策略，如 Top-P + Temperature，并加入 repetition_penalty 避免重复。总结一句：选择取决于任务对质量、多样性、延迟的权衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Beam Search 在开放域生成中为什么表现差？如何改进？

> 核心原因是 beam search 倾向于选择高概率路径，导致输出“安全但无聊”，如重复短语或泛化内容。论文《The Curious Case of Neural Text Degeneration》用 perplexity 和 human evaluation 证明。改进方法：1）加入 diversity penalty（如 Google 的 Diverse Beam Search），鼓励不同 beam 间的差异；2）使用 Contrastive Search 替代；3）在 beam search 后接 reranker（如基于 BERT 的 Ngram 重复检测）。

**追问 2**：Temperature 和 Top-P 如何协同工作？给出具体参数建议。

> 两者独立但互补：Temperature 先缩放 logits 改变分布形状，Top-P 再截断尾部。协同时，建议 T 在 0.7-1.2 之间，P 在 0.8-0.95 之间。例如，创意写作用 T=1.0, P=0.9；事实性问答用 T=0.5, P=0.8。注意：T 过高（>1.5）会导致分布过于均匀，即使 Top-P 也无法避免低质量 token。

**追问 3**：在低延迟场景（如实时翻译）中，如何选择解码策略？

> 优先 Greedy Search，因为 O(1) 每步。若需质量提升，用 Beam Search 但限制 beam_width=2（延迟增加 2 倍，BLEU 提升 1-2 点）。另一种方案：用 Speculative Decoding（如 Google 的 Medusa），用小模型生成候选，大模型验证，可降低延迟 2-3 倍。实际中，结合 `repetition_penalty` 和 `length_penalty` 即可满足大多数场景。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只列举策略名称，不解释原理和适用场景（如“有 Greedy、Beam、Top-K、Top-P”）。 → ✅ 必须说明每个策略的数学原理（如 argmax vs 采样）和工程取舍（如 beam_width 的边际收益）。
- ❌ 认为 Temperature 越大越好（如“T=2.0 增加多样性”）。 → ✅ 指出 T 过大会导致分布均匀化，生成无意义 token，实际中 T 通常在 0.5-1.2 之间。
- ❌ 混淆 Top-K 和 Top-P（如“Top-P 是固定 K 个 token”）。 → ✅ 明确 Top-K 固定数量，Top-P 固定累积概率，后者更自适应。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“解码策略对生成质量的影响”切入，举例在摘要任务中 Beam Search 比 Sampling 的 ROUGE-L 高 3 点，但多样性低，需用 Top-P 平衡。
- **如果你只做过传统 NLP**：用“机器翻译中的 Beam Search 与 LLM 的差异”类比，强调 LLM 需处理开放域，所以 Sampling 更常用，并提及论文《Nucleus Sampling》。
- **如果你是校招无项目**：聚焦“对比实验”思路，描述如何用 Hugging Face 的 `transformers` 库实现 Greedy vs Top-P 对比，用 distinct-n 指标评估多样性。
- 《The Curious Case of Neural Text Degeneration》（Holtzman et al., 2020）
- 《Nucleus Sampling: A Simple and Effective Method for Diverse Text Generation》（Holtzman et al., 2020）
- 《A Contrastive Framework for Neural Text Generation》（Su et al., 2022）
- Hugging Face Blog: “How to Generate Text with Transformers”
- 《Diverse Beam Search: Decoding Diverse Solutions from Neural Sequence Models》（Vijayakumar et al., 2018）

---
