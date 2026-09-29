---
slug: enterprise-tk629
no: "1529"
title: "| Q59 | Do you prefer DLMs or LLMs for latency-sensitive applications"
question: "| Q59 | Do you prefer DLMs or LLMs for latency-sensitive applications"
excerpt: "面试官想看你是否具备工程选型的硬核能力，而非只会背模型参数。这道题表面是“DLM vs LLM”，实则考察：① 你是否能精准定义 DLM（Distilled Language Model 或 Domain-specifi"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4110
updated: "2026-09-29"
---

## | Q59 | Do you prefer DLMs or LLMs for latency-sensitive applications

#### 1️⃣ 考察意图

面试官想看你是否具备**工程选型的硬核能力**，而非只会背模型参数。这道题表面是“DLM vs LLM”，实则考察：① 你是否能**精准定义 DLM**（Distilled Language Model 或 Domain-specific Language Model，而非模糊的“小模型”）；② 在延迟敏感场景下，你是否能**量化权衡**推理速度、精度和成本；③ 你是否掌握**模型压缩与级联架构**等实战技巧。刁钻点在于：面试官可能默认你选 DLM，但你要能指出**纯 DLM 的精度天花板**，并给出混合方案。答好了，展示你从“调参侠”到“系统架构师”的跃迁。

#### 2️⃣ 标准答

**核心结论**：没有绝对偏好，取决于**延迟预算（P99 < 100ms vs < 500ms）** 和**任务复杂度**。但通常，**DLM（Distilled Language Model）** 是首选，LLM 需通过压缩或级联才能胜任。

**1. 澄清概念：DLM 的两种含义**

- **Distilled Language Model**：如 DistilBERT（6层，速度提升 60%，精度保留 97%）、TinyLLaMA（1.1B 参数，量化后 2-3ms/token）。
- **Domain-specific Language Model**：如 BioBERT、LegalBERT，参数量小但领域内精度高。
- 面试官更倾向第一种，因为“延迟敏感”通常意味着**通用场景**。

**2. 延迟敏感场景的硬约束**

- **实时对话系统**：P99 延迟需 < 200ms（含网络传输），模型推理时间必须 < 50ms。
- **在线分类/抽取**：如广告 CTR 预估，单次推理 < 10ms。
- **LLM 的瓶颈**：LLaMA-7B（FP16）推理约 30ms/token（A100），生成 50 tokens 需 1.5s，远超预算。即使量化到 INT4（如 GPTQ），仍需 8-10ms/token，且精度下降 2-3%。

**3. 为什么 DLM 更优？——工程取舍**

- **速度**：DistilBERT 单次推理（序列长度 128）在 CPU 上约 5ms，GPU 上 < 1ms。LLaMA-7B 量化后仍需 3-5ms/token（生成模式）。
- **精度**：DLM 在分类/抽取任务上精度接近 LLM（差距 < 2%），但**生成任务**（如摘要、对话）DLM 能力不足。
- **成本**：DLM 显存需求 < 2GB（FP16），LLM 至少 14GB（INT4），部署成本高 5-10 倍。
- **取舍点**：若任务需要**复杂推理或长上下文**（如法律合同分析），DLM 的精度天花板会暴露，此时必须引入 LLM。

**4. 实际落地的坑 + 解法**

- **坑**：直接部署 DistilBERT 做意图识别，遇到 OOD（Out-of-Distribution）样本（如用户说“帮我查一下昨天的天气，但昨天是前天”），置信度低但模型硬分类，导致错误。
- **解法**：**级联架构**（Cascade）——先用 DLM 推理，若置信度 < 0.7，则调用 LLM（量化版）兜底。实测：90% 请求由 DLM 处理（延迟 5ms），10% 由 LLM 处理（延迟 200ms），整体 P99 延迟 < 50ms，精度提升 5%。
- **具体实现**：使用 `torch.jit.script` 优化 DLM 推理，LLM 用 `vLLM` 部署并设置 `max_tokens=50`，避免长生成。

**5. 进阶方案：蒸馏 + 量化**

- **蒸馏**：用 LLM（如 GPT-4）生成伪标签，训练一个 6 层 Transformer（如 TinyBERT），在 GLUE 上精度达 96% 的教师模型。
- **量化**：对蒸馏后的模型做 INT8 量化（如 `torch.quantization`），推理速度再快 2-3 倍，精度损失 < 0.5%。
- **结论**：对于延迟敏感场景，**蒸馏 + 量化的 DLM 是黄金组合**，LLM 仅作为兜底或离线教师。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**概念澄清**——DLM 指蒸馏模型（如 DistilBERT），LLM 指大语言模型（如 LLaMA），两者在延迟敏感场景的取舍不同。第二，**工程权衡**——对于分类/抽取任务，DLM 推理快（<5ms）且精度接近 LLM，是首选；对于生成任务，需用级联架构（DLM 兜底 + LLM 兜底）。第三，**实战方案**——推荐蒸馏 + 量化 + 级联，90% 请求由 DLM 处理，整体 P99 延迟 < 50ms。总结一句：**DLM 优先，LLM 兜底，量化加速**。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 DLM 精度接近 LLM，具体差多少？有数据吗？

> 以 GLUE 基准为例：DistilBERT 在 RTE 任务上精度 71.5%，BERT-base 为 72.1%，差距 < 1%。但在 SQuAD 2.0 上，DistilBERT F1 为 86.9%，BERT-base 为 88.5%，差距约 1.6%。对于生成任务（如 CNN/DailyMail 摘要），TinyLLaMA（1.1B）的 ROUGE-L 为 28.3%，LLaMA-7B 为 31.2%，差距约 3%。**关键**：如果任务对精度要求极高（如医疗诊断），DLM 可能不够，此时需级联 LLM 或使用更大的蒸馏模型（如 DistilGPT2）。

**追问 2**：级联架构中，置信度阈值怎么定？会不会导致延迟波动？

> 阈值通过**离线验证集**调优：绘制精度-延迟曲线，选择拐点。例如，在意图识别任务中，阈值 0.7 时，90% 请求由 DLM 处理，整体精度 95%；阈值 0.9 时，70% 由 DLM 处理，精度 97% 但延迟增加。**延迟波动**：LLM 调用是异步的，使用队列缓冲，避免阻塞。实测中，P99 延迟从 30ms 升到 50ms，仍在预算内。**取舍**：阈值越低，延迟越稳定但精度下降；阈值越高，精度提升但延迟抖动大。

**追问 3**：如果延迟预算只有 10ms，你怎么选？

> 只能选 DLM，且需极致优化：① 模型用 DistilBERT 或 TinyBERT（6 层），量化到 INT8；② 推理框架用 ONNX Runtime 或 TensorRT，开启动态形状；③ 输入序列截断到 64 tokens；④ 如果任务简单（如二分类），甚至可以用 Logistic Regression + TF-IDF（延迟 < 1ms）。**注意**：10ms 预算下，LLM 完全不可行，即使量化后单 token 生成也要 3-5ms。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “DLM 就是小模型，LLM 是大模型，延迟敏感肯定选 DLM。” → ✅ 正确切入：DLM 特指蒸馏模型，不是所有小模型；且要说明 DLM 的精度天花板，以及级联架构的 trade-off。
- ❌ “直接用 LLM 量化到 INT4 就能满足延迟要求。” → ✅ 正确切入：量化后 LLM 仍需要 3-5ms/token，生成 50 tokens 需 150-250ms，远超实时场景；且精度下降 2-3%，不如 DLM + 级联方案。
- ❌ “蒸馏模型精度损失很大，不如直接用 LLM。” → ✅ 正确切入：蒸馏模型在分类/抽取任务上精度损失 < 2%，且速度提升 5-10 倍；对于生成任务，才需引入 LLM。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”延迟优化切入，对比 DLM（如 DistilBERT 做检索）和 LLM（如 LLaMA 做生成）的延迟，强调级联架构（先 DLM 检索，再 LLM 生成）如何平衡精度和速度。
- **如果你只做过传统 NLP**：用“模型压缩”类比迁移，如将 BERT 蒸馏到 TinyBERT 的经验，说明在延迟敏感场景下，蒸馏 + 量化是核心手段，并提及 ONNX Runtime 优化。
- **如果你是校招无项目**：聚焦论文复现，如 DistilBERT 论文（Sanh et al., 2019）中的速度-精度权衡，或 TinyLLaMA 的量化实验，展示你对模型选型的理论理解。
- DistilBERT: a distilled version of BERT (Sanh et al., 2019)
- TinyLLaMA: An Open-Source Small Language Model (Zhang et al., 2024)
- GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers (Frantar et al., 2023)
- vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention (Kwon et al., 2023)
- Cascade RAG: A Hybrid Approach to Efficient and Accurate Retrieval-Augmented Generation (2024)

---
