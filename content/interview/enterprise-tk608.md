---
slug: enterprise-tk608
no: "1508"
title: "Do you prefer DLMs or LLMs for latency-sensitive applications"
question: "Do you prefer DLMs or LLMs for latency-sensitive applications"
excerpt: "面试官想考察你在延迟敏感场景下的工程决策能力，而非单纯背诵模型定义。这是一道系统设计 + 工程取舍题，刁钻点在于：DLM（如BERT）和LLM（如GPT）在延迟敏感场景下并非非此即彼，你需要根据任务类型（理解 vs 生成"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3705
updated: "2026-09-29"
---

## Do you prefer DLMs or LLMs for latency-sensitive applications

#### 1️⃣ 考察意图

面试官想考察你在延迟敏感场景下的**工程决策能力**，而非单纯背诵模型定义。这是一道**系统设计 + 工程取舍**题，刁钻点在于：DLM（如BERT）和LLM（如GPT）在延迟敏感场景下并非非此即彼，你需要根据任务类型（理解 vs 生成）、延迟预算（如P99 < 100ms）、吞吐要求（QPS）给出具体选型策略。答好了能展示你对模型架构（编码器 vs 解码器）、推理优化（量化、KV-cache、投机解码）和实际部署（vLLM、TensorRT）的深度理解。

#### 2️⃣ 标准答

**核心结论**：没有绝对偏好，取决于任务类型和延迟预算。DLM（如BERT）在理解类任务（分类、抽取）上天然低延迟；LLM（如GPT）在生成类任务上更灵活，但需激进优化。

**1. 架构差异决定延迟基线**

- **DLM（编码器架构）**：如BERT-base（110M参数），双向注意力，推理时一次前向传播即可输出所有token的表示。对于分类/抽取任务，只需一次推理，延迟通常在10-50ms（GPU上）。
- **LLM（解码器架构）**：如GPT-2（1.5B参数），自回归生成，每生成一个token需一次前向传播。即使小模型，生成100个token的延迟也达200-500ms（无优化）。
- **关键取舍**：DLM的延迟与输入长度线性相关，LLM的延迟与输出长度线性相关。因此，对于短输出（如分类标签），DLM完胜；对于长输出（如摘要），LLM需优化。

**2. 延迟敏感场景的优化手段**

- **DLM优化**：
- **量化**：INT8量化可减少50%延迟，精度损失<1%（如BERT-base从15ms降至8ms）。
- **剪枝**：结构化剪枝（如移除冗余注意力头）可减少30%参数，延迟降低20%。
- **蒸馏**：DistilBERT（66M参数）延迟仅为BERT-base的60%，精度保留97%。
- **LLM优化**：
- **KV-cache**：避免重复计算，生成延迟降低50%以上（但增加显存）。
- **投机解码（Speculative Decoding）**：用小模型（如Draft模型）生成候选token，大模型验证，加速比可达2-3x。
- **连续批处理（Continuous Batching）**：vLLM实现，吞吐提升10x，P99延迟稳定。
- **量化**：GPTQ或AWQ量化，4-bit模型延迟降低4x，精度损失可控。
- **实际落地的坑**：量化LLM时，激活值异常（如outlier）会导致精度崩溃。解法：使用SmoothQuant或LLM.int8()，对异常通道做高精度处理。

**3. 选型决策框架**

- **任务类型**：
- 理解类（情感分类、NER、意图识别）：选DLM（如BERT-base），延迟<20ms，精度高。
- 生成类（对话、摘要、翻译）：选LLM（如LLaMA-7B），但需优化至P99 < 200ms。
- 混合场景（如RAG）：DLM做检索重排序（如ColBERT），LLM做生成，延迟分摊。
- **延迟预算**：
- <50ms：DLM（如DistilBERT）或小LLM（如TinyLLaMA-1.1B）配合投机解码。
- 50-200ms：LLM（如LLaMA-7B）配合量化+KV-cache。
- 200ms：大LLM（如LLaMA-13B）配合vLLM+连续批处理。
- **吞吐要求**：
- 高QPS（>1000）：DLM（如BERT）或LLM用连续批处理，但需控制batch size避免显存溢出。
- 低QPS（<100）：LLM可放宽优化，直接部署。

**4. 混合架构（最佳实践）**

- **级联策略**：先用DLM快速过滤（如意图分类），再用LLM处理复杂请求（如生成回复）。例如，客服系统中，BERT识别“退款”意图（<10ms），GPT生成退款话术（<150ms）。
- **路由策略**：根据输入复杂度动态选择模型。简单查询走DLM，复杂查询走LLM。实现：用一个小分类器（如FastText）做路由，延迟<1ms。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，架构差异决定延迟基线，DLM（编码器）适合理解任务，LLM（解码器）适合生成任务；第二，优化手段不同，DLM靠量化/蒸馏，LLM靠KV-cache/投机解码/连续批处理；第三，实际选型需根据任务类型和延迟预算，推荐混合架构（如DLM做路由，LLM做生成）。总结一句：没有绝对偏好，只有工程取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到投机解码，具体怎么实现？加速比能到多少？

> 投机解码用一个小模型（如Draft模型，参数为LLM的1/10）生成候选token序列，大模型并行验证。加速比取决于小模型的接受率（通常0.7-0.9）和候选长度（通常5-10个token）。例如，LLaMA-7B配合TinyLLaMA-1.1B，加速比约2-3x。但注意：小模型需与LLM分布接近，否则接受率低，加速失效。实际部署中，可用同一LLM的浅层作为Draft模型，减少训练成本。

**追问 2**：如果延迟预算只有10ms，你怎么选？

> 10ms预算极严苛，只能选DLM。推荐DistilBERT（66M参数）或MobileBERT（25M参数），配合INT8量化，延迟可控制在5-8ms。若必须用LLM，考虑TinyLLaMA-1.1B（1.1B参数）配合4-bit量化+投机解码，但延迟可能仍超20ms。实际案例：在手机端做情感分类，用MobileBERT+量化，P99延迟<8ms，精度95%。

**追问 3**：你提到混合架构，如何保证路由的准确性？

> 路由准确性是关键。推荐用一个小分类器（如FastText或BERT-tiny）做路由，训练数据来自历史请求的延迟和精度反馈。例如，若DLM对某类请求的置信度>0.9，直接返回；否则路由到LLM。实际落地中，路由误判会导致延迟或精度下降，需设置fallback机制（如LLM超时后降级到DLM）。另外，可动态调整路由阈值，根据实时延迟监控（如P99 > 200ms时降低阈值）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “我选LLM，因为通用性强，延迟可以通过优化解决。” → ✅ “不能一刀切。LLM优化后延迟仍高于DLM，需根据任务类型选择。例如，分类任务用BERT，生成任务用GPT，混合场景用级联架构。”
- ❌ “DLM已经过时了，LLM才是未来。” → ✅ “DLM在延迟敏感场景仍有优势，如BERT在情感分类任务上延迟<20ms，精度不输GPT-4。选型应基于工程约束，而非技术潮流。”
- ❌ “量化对LLM延迟提升很大，直接上4-bit。” → ✅ “量化需谨慎，4-bit LLM可能因激活值异常导致精度下降。推荐先用GPTQ或AWQ，并在验证集上评估精度损失。若精度不达标，改用8-bit或混合精度。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从检索重排序（DLM）和生成（LLM）的延迟分摊切入，强调ColBERT做rerank（延迟<10ms）和vLLM做生成（P99<200ms）的实践。
- **如果你只做过传统NLP**：用BERT和GPT的架构差异类比传统机器学习中的线性模型和树模型，强调延迟与复杂度的trade-off，并补充量化/蒸馏的优化经验。
- **如果你是校招无项目**：聚焦论文复现，如BERT-base的延迟测量（用PyTorch Profiler）和GPT-2的投机解码实现（参考Hugging Face示例），展示对优化手段的理解。
- “BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding”（论文）
- “Efficient Transformers: A Survey”（综述，涵盖DLM和LLM优化）
- “vLLM: Easy, Fast, and Cheap LLM Serving”（博客，介绍连续批处理）
- “Fast Inference from Transformers via Speculative Decoding”（论文，投机解码详解）
- “SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models”（论文，解决量化异常值）

---
