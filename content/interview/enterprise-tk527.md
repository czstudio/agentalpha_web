---
slug: enterprise-tk527
no: "1427"
title: "What are the different decoding strategies in LLMs"
question: "What are the different decoding strategies in LLMs"
excerpt: "面试官想看你是否真正理解 LLM 生成文本的底层机制，而非只会调 API。考察类型是系统概念 + 工程取舍。刁钻点在于：不仅要列出策略名称，还要能解释为什么不同策略产生不同效果，以及何时用哪个。答好了能展示你对生成质量、"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4183
updated: "2026-09-29"
---

## What are the different decoding strategies in LLMs

#### 1️⃣ 考察意图

面试官想看你是否真正理解 LLM 生成文本的底层机制，而非只会调 API。考察类型是**系统概念 + 工程取舍**。刁钻点在于：不仅要列出策略名称，还要能解释**为什么**不同策略产生不同效果，以及**何时**用哪个。答好了能展示你对生成质量、多样性、计算成本的平衡能力，这是做任何 LLM 应用（RAG、Agent、对话系统）的硬实力。

#### 2️⃣ 标准答

LLM 解码策略本质上是**从概率分布中选择下一个 token 的规则**。核心分两大类：确定性策略和随机采样策略。

**1. 确定性策略**

- **Greedy Search**：每一步选概率最高的 token。优点是快、简单；缺点是容易陷入局部最优，生成重复、乏味的文本（例如“I love love love...”）。**实际坑**：在长文本生成中，概率链乘积会导致高概率路径被忽略，比如翻译任务中“The cat sat on the mat”可能被贪心选成“The cat sat on the floor”因为“floor”在局部概率更高。
- **Beam Search**：维护 k 个候选序列（beam width），每一步扩展所有候选，保留总概率最高的 k 个。k=3 是常见起点。**为什么这么做**：通过并行探索多条路径，缓解贪心的局部最优问题。**工程取舍**：k 值越大，计算量线性增长（O(k * vocab_size)），但收益递减。k=5 以上在翻译任务中提升有限，反而可能引入“beam search 病”——生成更流畅但更空洞的文本（因为模型倾向于高概率的通用词）。**实际落地的坑**：在对话系统中，Beam Search 容易生成“安全但无聊”的回复，比如“I don’t know”反复出现。解法是限制 beam width 到 3，并配合长度惩罚（length penalty）避免短序列被偏好。

**2. 随机采样策略**

- **Temperature Sampling**：通过温度参数 T 调整 softmax 分布的“锐度”。T→0 退化为贪心，T=1 保持原始分布，T>1 使分布更平坦（低概率 token 更容易被选）。**为什么这么做**：控制生成文本的“冒险程度”。**实际坑**：T 过高（>2）会导致输出胡言乱语，因为模型开始选概率极低的 token。经验值：创意写作 T=0.7-0.9，代码生成 T=0.2-0.4。
- **Top-k Sampling**：只从概率最高的 k 个 token 中采样，忽略长尾。k=40 是 GPT-2 默认值。**工程取舍**：k 固定，但不同上下文下概率分布差异巨大——在确定性高的上下文（如“I am a”）中，top-40 可能包含大量无关 token；在不确定性高的上下文（如“The next word could be...”）中，top-40 可能截断了合理选项。**解法**：用 Top-p 替代或结合。
- **Top-p (Nucleus) Sampling**：动态选择累积概率达到 p（如 0.9）的最小 token 集合。**为什么更好**：自适应截断，在确定性高时选少量 token，不确定性高时选更多 token。**实际落地的坑**：p 值过小（<0.8）导致生成过于保守，过大（>0.95）引入噪声。推荐 p=0.9-0.95。
- **混合策略**：实际生产环境常用 Top-k + Top-p + Temperature 组合。例如，先 Temperature 调整分布，再 Top-k 截断，最后 Top-p 二次过滤。**为什么这么做**：三层过滤能平衡多样性和质量。**具体参数**：T=0.8, k=50, p=0.92 是 GPT-4 的默认配置之一。

**3. 高级策略**

- **Contrastive Search**：在每一步选择既高概率又与历史 token 有足够“对比度”的 token，避免重复。论文《A Contrastive Framework for Neural Text Generation》提出，通过惩罚与已生成 token 相似的候选。**适用场景**：长文本生成（如故事续写），能显著降低重复率。
- **Typical Sampling**：选择信息量接近“典型”水平的 token，避免选太确定或太意外的 token。论文《Typical Decoding for Natural Language Generation》提出，适合需要“自然感”的生成。

**总结**：没有万能策略。翻译/摘要用 Beam Search（k=3-5, 加长度惩罚），创意写作用 Top-p (p=0.9) + Temperature (T=0.8)，代码生成用低 Temperature (T=0.2) + Top-k (k=40)，长文本用 Contrastive Search。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，确定性策略包括 Greedy Search 和 Beam Search，适合高准确率任务如翻译；第二，随机采样策略包括 Temperature、Top-k、Top-p，适合创意生成；第三，高级策略如 Contrastive Search 解决长文本重复问题。核心取舍是多样性与质量之间的平衡，实际中常用混合策略，比如 Top-p + Temperature 组合。总结一句：选策略要看任务场景，没有银弹。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Beam Search 为什么在对话中效果不好？怎么改进？

> 因为 Beam Search 倾向于高概率路径，而对话中“有趣”或“意外”的回复往往概率不高。改进方法：1）降低 beam width 到 2-3；2）引入 diversity penalty，鼓励 beam 间差异（如论文《Diverse Beam Search》）；3）改用采样策略，比如 Top-p + Temperature，并设置 repetition penalty 1.2。

**追问 2**：Temperature 和 Top-p 同时用，哪个先执行？

> 实践中先 Temperature 再 Top-p。因为 Temperature 改变分布形状，Top-p 基于调整后的分布做动态截断。如果先 Top-p 再 Temperature，Top-p 的截断阈值会失效——Temperature 可能把截断后的 token 概率拉平，导致原本被排除的 token 重新获得高概率。顺序是：logits → Temperature → Top-k（可选） → Top-p → softmax → 采样。

**追问 3**：Contrastive Search 的原理是什么？和 Top-p 比有什么 trade-off？

> Contrastive Search 每一步选 token 时，最大化两个目标的加权和：1）与当前上下文的对数概率；2）与历史 token 的相似度惩罚（用余弦相似度）。参数 alpha 控制权重。Trade-off：Contrastive Search 计算量大（需要计算每个候选与所有历史 token 的相似度），但能显著降低重复；Top-p 计算快，但无法主动避免重复。长文本（>512 tokens）场景下 Contrastive Search 更优，短文本用 Top-p 即可。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Beam Search 总是比 Greedy 好” → ✅ 指出 Beam Search 在翻译任务中好，但在对话/创意任务中可能更差，因为会生成“安全但无聊”的文本。
- ❌ 说“Temperature 越高越好，因为多样性高” → ✅ 说明 Temperature 过高（>2）会导致胡言乱语，需要结合 Top-p 或 Top-k 控制质量。
- ❌ 说“Top-k 和 Top-p 是互斥的” → ✅ 指出它们可以组合使用，且实际中常用混合策略。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“生成质量与检索结果一致性”角度切入，说明在 RAG 中如何用低 Temperature（0.3-0.5）减少幻觉，用 Top-p 控制输出范围。
- **如果你只做过传统 NLP**：用“机器翻译中的 Beam Search vs 文本生成中的采样”做类比，展示你对不同任务策略差异的理解。
- **如果你是校招无项目**：聚焦“在 GPT-2 上实现解码策略对比实验”的 demo，强调你对比了 distinct-n 分数和人工评估，并给出了策略选择指南。
- 《The Curious Case of Neural Text Degeneration》（Holtzman et al., 2020）—— Top-p 采样论文
- 《A Contrastive Framework for Neural Text Generation》（Su et al., 2022）—— Contrastive Search
- 《Typical Decoding for Natural Language Generation》（Meister et al., 2023）—— Typical Sampling
- 《Diverse Beam Search: Decoding Diverse Solutions from Neural Sequence Models》（Vijayakumar et al., 2018）
- Hugging Face 官方文档：Generation with LLMs（含代码示例和参数详解）

---
