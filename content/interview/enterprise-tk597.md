---
slug: enterprise-tk597
no: "1497"
title: "When should you prefer task-specific fine-tuning over prompt engineering"
question: "When should you prefer task-specific fine-tuning over prompt engineering"
excerpt: "面试官想看你是否具备工程决策的“成本-收益”思维，而非单纯背诵概念。这道题考察的是系统设计权衡：在资源（数据、算力、时间）和性能（准确率、延迟、泛化性）之间做取舍。刁钻点在于：很多人会简单回答“复杂任务用微调”，但忽略了"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4259
updated: "2026-09-29"
---

## When should you prefer task-specific fine-tuning over prompt engineering

#### 1️⃣ 考察意图

面试官想看你是否具备工程决策的“成本-收益”思维，而非单纯背诵概念。这道题考察的是**系统设计权衡**：在资源（数据、算力、时间）和性能（准确率、延迟、泛化性）之间做取舍。刁钻点在于：很多人会简单回答“复杂任务用微调”，但忽略了**数据量、领域特异性、部署约束**这三个实际落地的硬约束。答好了能展示你对 LLM 应用整条链路（从 prompt 到部署）的掌控力，以及从“能用”到“好用”的工程优化能力。

#### 2️⃣ 标准答

核心判断标准：**当 prompt engineering 无法在成本可接受范围内达到业务指标时，转向 fine-tuning**。具体从四个维度拆解：

- **任务复杂度与数据量**
- **简单任务（分类、情感分析、实体抽取）**：用 prompt engineering（zero-shot 或 few-shot）通常足够。例如，用 GPT-3.5 做二分类，准确率可达 90%+，成本是 fine-tuning 的 1/10。**为什么**：prompt 利用模型预训练知识，无需额外训练。
- **复杂任务（多步推理、代码生成、对话系统）**：当 few-shot 示例超过 10 个仍不稳定，或需要模型学习特定输出格式（如 JSON schema）时，fine-tuning 更优。**实际坑**：用 LoRA 微调 7B 模型，在 1000 条数据上训练 3 小时，推理延迟仅增加 5%，但准确率从 70% 提升到 92%。
- **数据量阈值**：少于 500 条标注数据，prompt 更优；500-5000 条，考虑 LoRA/QLoRA 微调；超过 5000 条，全参数微调可能值得。
- **领域特异性与知识注入**
- **通用领域**：prompt 足够。例如，新闻摘要用 GPT-4 的 zero-shot 即可。
- **高度专业领域（医疗、法律、金融）**：prompt 容易产生幻觉（如生成不存在的法律条文）。**解法**：用领域语料（如 PubMed 论文、法律判例）做 continued pre-training 或 fine-tuning，注入术语和逻辑。**工程取舍**：fine-tuning 会降低模型在通用任务上的表现（灾难性遗忘），需用混合训练（通用+领域数据）缓解，比例建议 3:1。
- **部署约束与迭代速度**
- **快速迭代**：prompt 无需更新模型，修改 prompt 即可上线，适合 A/B 测试。例如，电商促销文案生成，每周换模板，用 prompt 成本为 0。
- **稳定部署**：fine-tuning 需要存储多个模型版本（如不同业务线），增加运维成本。**实际坑**：用 LoRA 微调后，需合并权重到 base model，否则推理框架（如 vLLM）不支持动态加载 adapter，导致延迟飙升 30%。**解法**：用 PEFT 库的 `merge_and_unload()` 合并，或使用支持 adapter 的框架（如 TGI）。
- **性能要求与成本**
- **高准确率要求（>95%）**：fine-tuning 通常能达到，prompt 受限于模型能力上限。例如，在医疗诊断任务上，fine-tuned 模型 F1 达 0.96，prompt 仅 0.82。
- **成本权衡**：fine-tuning 成本包括训练（GPU 小时）和推理（模型更大）。**具体数字**：用 QLoRA 微调 LLaMA-2-7B，训练 1000 条数据约需 1 小时 A100，推理成本与 base model 相同；全参数微调需 10 小时，推理成本增加 20%（因模型变大）。**决策公式**：当 prompt 的 token 成本（含 few-shot 示例）超过 fine-tuning 的推理成本 + 训练摊销成本时，转向 fine-tuning。

**总结**：优先用 prompt engineering 快速验证，当数据量 > 500、领域专业度高、或准确率要求 > 95% 时，用 LoRA/QLoRA 微调。永远不要一开始就全参数微调。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从任务复杂度、数据量、领域特异性、部署约束四个层面回答。简单任务用 prompt 更高效，复杂任务或专业领域用 fine-tuning。具体来说，数据量少于 500 条用 prompt，500-5000 条用 LoRA 微调，超过 5000 条考虑全参数微调。总结一句：prompt 是快速验证，fine-tuning 是稳定交付，选择取决于成本-收益平衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到了 LoRA，它和全参数微调在效果上差距多大？什么时候必须用全参数？

> LoRA 在大多数任务上能达到全参数微调效果的 90-95%，但需要调参（rank=16-64，alpha=16-32）。当任务需要模型学习全新知识（如新语言、新领域术语）时，全参数微调更优。例如，在医学领域，LoRA 可能无法完全纠正模型对罕见病的错误认知，全参数微调通过更新所有层权重，能更好地注入知识。**工程取舍**：全参数微调需要更多 GPU 内存（7B 模型约 56GB），且容易过拟合，需用学习率 2e-5 和 warmup 策略。

**追问 2**：如果数据量只有 100 条，但任务很复杂（比如法律合同审查），你怎么办？

> 用 prompt engineering + RAG 组合。先用 few-shot prompt（3-5 个示例）做初步审查，同时检索相关法律条款（用 BM25 或 dense retrieval）作为上下文。如果效果不达标，再用这 100 条数据做 LoRA 微调，但需用数据增强（如回译、同义词替换）扩充到 500 条以上。**实际坑**：100 条数据微调容易过拟合，需用早停（patience=3）和 dropout=0.1。

**追问 3**：你如何量化 prompt 和 fine-tuning 的成本？给个具体公式。

> 成本 = 训练成本 + 推理成本。训练成本 = GPU 小时 × 单价（如 A100 约 \$3/小时）。推理成本 = 每次请求的 token 数 × 单价（如 GPT-4 输入 \$0.03/1K tokens）。对于 prompt，成本 = 每次请求的 prompt token 数 × 单价 × 请求量。对于 fine-tuning，成本 = 训练成本 / 总请求量 + 每次请求的推理 token 数 × 单价。当 prompt 成本 > fine-tuning 成本时，转向 fine-tuning。**示例**：100 万次请求，每次 prompt 用 2000 tokens（含 few-shot），成本 = 2000 × \$0.03/1000 × 1M = \$60,000。LoRA 微调训练成本 \$300，推理成本 = 500 tokens × \$0.002/1000 × 1M = \$1,000，总成本 \$1,300，远低于 prompt。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “复杂任务用 fine-tuning，简单任务用 prompt。” → ✅ 需要量化“复杂”和“简单”。例如，用准确率阈值（95%）或数据量阈值（500 条）来定义，并给出具体 trade-off（成本 vs 性能）。
- ❌ “fine-tuning 一定比 prompt 效果好。” → ✅ fine-tuning 可能过拟合或灾难性遗忘，效果不一定优于 prompt。例如，在通用知识问答上，fine-tuned 模型可能不如 GPT-4 的 zero-shot。需要强调“领域特异性”和“数据质量”。
- ❌ “prompt engineering 成本低，所以总是优先。” → ✅ 当 few-shot 示例过多（>10 个）时，prompt 的 token 成本可能超过 fine-tuning 的推理成本。需要给出具体计算，如“每次请求 2000 tokens vs 500 tokens”。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“prompt + 检索”组合切入，说明当检索结果不准确时，fine-tuning 可以注入领域知识，减少对检索的依赖。例如，在医疗问答中，fine-tune 模型后，检索召回率从 70% 提升到 85%。
- **如果你只做过传统 NLP**：用“特征工程 vs 模型微调”类比。prompt 像手工特征（快速但上限低），fine-tuning 像端到端训练（效果好但成本高）。强调数据量和任务复杂度是决策关键。
- **如果你是校招无项目**：聚焦论文复现。例如，复现 LLaMA-2 的 LoRA 微调实验，对比 prompt 在情感分类上的效果，给出准确率和成本数据。展示你对 Hugging Face PEFT 库的熟悉度。
- LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)
- QLoRA: Efficient Finetuning of Quantized Language Models (Dettmers et al., 2023)
- The Power of Scale for Parameter-Efficient Prompt Tuning (Lester et al., 2021)
- PEFT: Parameter-Efficient Fine-Tuning (Hugging Face 官方文档)
- Scaling Laws for Neural Language Models (Kaplan et al., 2020) — 理解数据量与模型性能的关系

---
