---
slug: enterprise-tk664
no: "1564"
title: "What are some common challenges encountered when fine-tuning LLMs"
question: "What are some common challenges encountered when fine-tuning LLMs"
excerpt: "面试官想看你是否真正动手微调过大模型，而非只背八股。考察类型是工程取舍 + debug。刁钻点在于：候选人常只列“过拟合、数据少”等泛泛问题，但面试官要听的是具体场景下的权衡——比如灾难性遗忘与领域性能的博弈、QLoRA"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4041
updated: "2026-09-29"
---

## What are some common challenges encountered when fine-tuning LLMs

#### 1️⃣ 考察意图

面试官想看你是否真正动手微调过大模型，而非只背八股。考察类型是**工程取舍 + debug**。刁钻点在于：候选人常只列“过拟合、数据少”等泛泛问题，但面试官要听的是**具体场景下的权衡**——比如灾难性遗忘与领域性能的博弈、QLoRA vs 全量微调的资源取舍、评估指标失效时的补救方案。答好了能展示你对训练流程的全局掌控力，以及从数据到部署的完整流程思维。

#### 2️⃣ 标准答

微调 LLM 的挑战集中在四个维度：**数据、训练、评估、部署**。下面逐一拆解，附带工程坑和解法。

- **灾难性遗忘（Catastrophic Forgetting）**
- 问题：微调让模型在领域任务上提升，但通用能力（如常识推理、多轮对话）断崖下跌。
- 解法：混合通用语料。实践中按 7:3 或 8:2 比例混合领域数据与通用数据（如从 C4、RedPajama 采样）。
- 坑：通用数据比例过高会稀释领域信号，导致领域任务提升不足。**经验值**：领域数据量 < 10k 条时，通用比例可提到 50%；领域数据 > 100k 条时，通用比例降到 20%。
- 进阶：用 LoRA 微调时，只更新低秩矩阵，冻结主干权重，天然缓解遗忘。但 LoRA 秩 r 设太小（如 r=4）会欠拟合，设太大（r=64）则显存暴涨——**trade-off**：r=16 是多数场景的甜点。
- **过拟合（Overfitting）**
- 问题：小数据集（<5k 条）上训练 3 个 epoch 后，验证 loss 开始反弹。
- 解法：早停（patience=2 epoch）、权重衰减（weight_decay=0.01）、Dropout（dropout_rate=0.1）。
- 坑：权重衰减在 AdamW 中默认只作用于可训练参数，但 LoRA 的 A/B 矩阵初始化不同（A 用 Kaiming，B 用零），衰减会破坏 B 的零初始化——**解法**：对 LoRA 参数单独设 weight_decay=0，或使用 DoRA（权重解耦 LoRA）。
- 数据增强：对指令数据做回译（back-translation）或同义词替换，但注意不要改变语义标签。
- **计算资源瓶颈**
- 问题：7B 模型全量微调需约 56GB 显存（FP16），13B 需 104GB，单卡 A100 80G 都吃力。
- 解法：QLoRA（4-bit NormalFloat + 双重量化）将 7B 微调显存压到 16GB，单卡 RTX 4090 可跑。
- 坑：QLoRA 的 4-bit 量化会引入精度损失，导致收敛变慢。**经验值**：学习率需调低 2-3 倍（从 2e-5 降到 5e-6），且训练步数增加 30%。
- 进阶：FlashAttention-2 可加速 attention 计算 2x，但需 CUDA 12.0+ 环境，部署时注意兼容性。
- **数据质量与噪声**
- 问题：爬取数据中常见格式错误（如 HTML 标签残留）、标签冲突（同一输入对应不同输出）、毒性内容。
- 解法：用 GPT-4 或开源模型（如 DeBERTa-v3）做质量打分，过滤掉得分 < 0.7 的样本。
- 坑：自动过滤会误删边缘案例（如专业术语被误判为噪声）。**解法**：保留 5% 低分样本做人工抽检，确认后调整过滤阈值。
- 标签冲突：用 SimCSE 计算输入 embedding，聚类后检查同一簇内的标签一致性。
- **评估困难**
- 问题：领域任务缺乏标准 benchmark，用 MMLU 评估通用能力但领域指标（如客服满意度）无法自动化。
- 解法：构建双轨评估——通用能力用 MMLU + HellaSwag，领域能力用人工标注的 500 条黄金测试集。
- 坑：黄金测试集过小（<200 条）导致评估方差大。**经验值**：至少 500 条，且覆盖 80% 的意图类别。
- 进阶：用 GPT-4 做自动评估（LLM-as-a-judge），但需校准——先让 GPT-4 打分 100 条，与人工打分算 Spearman 相关系数，低于 0.8 则调整 prompt 或换模型。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据、训练、评估三个层面回答。数据层面，灾难性遗忘通过混合通用语料缓解，但比例需根据领域数据量动态调整；训练层面，过拟合用早停和权重衰减，但 LoRA 场景下需注意权重衰减对零初始化的破坏；评估层面，构建双轨体系，用 MMLU 保通用、黄金测试集保领域，并用 LLM-as-a-judge 做自动化校准。总结一句：微调的核心不是调参数，而是管理数据分布与评估完整流程的 trade-off。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合通用数据缓解遗忘，具体怎么选通用数据？直接随机采样 C4 就行吗？

> 不行。随机采样 C4 会引入大量低质量文本（如乱码、广告），反而污染领域能力。正确做法：先用质量过滤器（如 fastText 分类器）筛掉低分文档，再按领域相关性排序——比如微调法律模型时，优先选 C4 中“法律”类别的文档。如果领域数据量 < 10k，还可以用 DPO 训练后的模型做数据蒸馏，生成与领域分布对齐的通用样本。

**追问 2**：QLoRA 的 4-bit 量化导致收敛变慢，你具体怎么调参？

> 三步走：1）学习率从 2e-5 降到 5e-6，并配合 cosine 衰减；2）增加 warmup 步数到总步数的 10%（原来 5%）；3）batch size 翻倍（从 8 到 16），用梯度累积补偿。如果 4-bit 仍不稳定，退一步用 8-bit QLoRA（NF8），显存只多 4GB 但收敛速度恢复 90%。另外，检查是否用了 bf16——QLoRA 在 bf16 下比 fp16 更稳定，因为动态范围更大。

**追问 3**：你提到 LLM-as-a-judge 校准，具体怎么操作？如果 Spearman 低于 0.8 怎么办？

> 校准流程：1）让 GPT-4 对 100 条黄金样本打分（1-5 分）；2）让 3 个标注员独立打分，取中位数；3）计算 GPT-4 打分与人工打分的 Spearman 相关系数。如果低于 0.8，先检查 prompt 是否明确（如加“请忽略格式错误，只评估内容正确性”），再换评估模型（如 Claude 3.5 Sonnet 在长文本评估上更准）。如果还不行，改用 pairwise 比较（让 GPT-4 选 A/B 哪个更好），比绝对打分更鲁棒。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“微调主要挑战是过拟合，用 dropout 和早停就行” → ✅ 正确切入：过拟合只是冰山一角，灾难性遗忘和数据质量才是更隐蔽的坑，且解法有 trade-off（如 dropout 会降低模型容量）。
- ❌ 说“用 LoRA 微调，显存需求低，所以不需要考虑计算资源” → ✅ 正确切入：LoRA 虽省显存，但秩选择、权重衰减处理、量化精度损失都需要针对性调参，否则效果不如全量微调。
- ❌ 说“评估用 MMLU 就够了，领域任务可以自动生成测试集” → ✅ 正确切入：MMLU 只测通用能力，领域任务需人工标注黄金测试集，且自动生成测试集容易引入 label leakage（如用 GPT-4 生成测试集时，模型已见过类似数据）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“数据质量”切入，讲你在构建 RAG 知识库时如何清洗噪声文档（如用 spaCy 做实体对齐），类比到微调数据清洗。再提你用 LoRA 微调过 embedding 模型，对比过 r=8 vs r=16 的效果差异。
- **如果你只做过传统 NLP**：用“过拟合”类比——传统 BERT 微调时 dropout 和早停的用法，迁移到 LLM 微调时需注意权重衰减对 LoRA 的影响。再提你用过 Hugging Face Trainer 的 `EarlyStoppingCallback`，可扩展到 LLM 场景。
- **如果你是校招无项目**：聚焦“评估困难”论文复现——读过《Judging LLM-as-a-Judge》和《MMLU: A Benchmark》，可以讲如何用 GPT-4 复现自动评估 pipeline，并分析 Spearman 相关系数的局限性。再提你跑过 QLoRA 的 Colab demo，记录过 4-bit 量化下的 loss 曲线。
- 《QLoRA: Efficient Finetuning of Quantized Language Models》（Dettmers et al., 2023）
- 《LoRA: Low-Rank Adaptation of Large Language Models》（Hu et al., 2021）
- 《Judging LLM-as-a-Judge: A Case Study on Chatbot Arena》（Zheng et al., 2023）
- 《Scaling Data-Constrained Language Models》（Muennighoff et al., 2023）
- 《DoRA: Weight-Decomposed Low-Rank Adaptation》（Liu et al., 2024）

---
