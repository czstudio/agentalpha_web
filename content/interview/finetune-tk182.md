---
slug: finetune-tk182
no: "1082"
title: "增量预训练的过程当中，loss上升正常吗"
question: "增量预训练的过程当中，loss上升正常吗"
excerpt: "面试官想考察你对训练动态的底层理解，而非简单背诵“loss下降才正常”。刁钻点在于：增量预训练（Incremental Pretraining）本质是领域适应（Domain Adaptation），新数据分布偏移会导致初"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3625
updated: "2026-09-29"
---

## 增量预训练的过程当中，loss上升正常吗

`P1` · `llm_training`

🏷 标签：`incremental-pretraining, loss-analysis, training-dynamics, llm`

#### 1️⃣ 考察意图

面试官想考察你对训练动态的底层理解，而非简单背诵“loss下降才正常”。刁钻点在于：增量预训练（Incremental Pretraining）本质是领域适应（Domain Adaptation），新数据分布偏移会导致初始loss上升，这是正常现象。答好了能展示你懂训练稳定性（Training Stability）、灾难性遗忘（Catastrophic Forgetting）的权衡，以及实际调参经验（如warmup策略、学习率调度）。这是系统设计+工程取舍型问题，需要结合论文（如RoBERTa、T5的增量训练）和实战坑。

#### 2️⃣ 标准答

**核心结论**：增量预训练初期loss上升是**正常且预期**的，但需区分“良性上升”和“恶性发散”。

**1. 为什么loss会上升？**

- **数据分布偏移**：新领域数据（如医学文本）与原始预训练语料（如通用网页）的token频率、句法结构不同。模型初始参数基于旧分布，对新数据预测概率低，导致交叉熵loss升高。例如，在RoBERTa上增量训练医学文本，初始loss可能从2.5跳升到3.2。
- **学习率过大**：若学习率（如5e-5）未适配新数据，参数更新步长过大，会破坏已学特征，引发loss震荡。经验上，增量预训练学习率通常设为原始预训练的1/10到1/100（如1e-5）。
- **模型容量瓶颈**：若新领域知识复杂（如法律条文），模型参数（如BERT-base 110M）可能不足，导致loss无法收敛到旧水平。

**2. 如何判断是否正常？**

- **良性上升**：loss在初始1-2%步数内上升（如从2.5到3.0），随后在warmup后下降，最终低于旧loss。这表示模型在适应新分布。
- **恶性发散**：loss持续上升（如从2.5到5.0+），且验证集困惑度（PPL）同步恶化。这提示学习率过高或数据质量差（如噪声标签）。

**3. 工程取舍与实战坑**

- **坑1：灾难性遗忘**：只关注新数据loss下降，忽略旧任务性能。解法：混合10-20%原始预训练数据（如C4子集），用权重衰减（Weight Decay 0.01）和梯度裁剪（Gradient Clipping 1.0）稳定训练。
- **坑2：warmup步数不足**：增量训练数据量小（如10B tokens），若warmup步数（如100步）过短，模型来不及平滑过渡。经验：warmup步数设为总步数的5-10%，或使用线性warmup+余弦衰减（Cosine Decay）。
- **坑3：学习率调度不当**：固定学习率（如1e-5）可能导致loss plateau。解法：使用学习率重启（LR Restart）或循环学习率（Cyclical LR），在loss上升时自动衰减。

**4. 具体调参策略**

- **数据层面**：对领域数据做tokenizer适配（如添加医学词汇到词表），减少OOV（Out-of-Vocabulary）问题。
- **训练层面**：使用混合精度训练（FP16）+ 梯度累积（Gradient Accumulation），稳定梯度更新。监控指标：除loss外，跟踪旧任务PPL（如GLUE子集）和新任务PPL，确保两者平衡。
- **论文参考**：RoBERTa论文（Liu et al., 2019）在增量训练时使用动态masking；T5（Raffel et al., 2020）在领域适应中采用多任务学习，缓解loss上升。

**总结**：loss上升是信号，不是错误。关键是通过warmup、混合数据、学习率调度，把“上升”控制在可接受范围，并确保旧知识不丢失。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，正常性判断——增量预训练初期loss上升是预期行为，因为数据分布偏移导致模型初始预测概率低；第二，异常排查——若loss持续不降且旧任务PPL恶化，说明学习率过大或数据质量差；第三，工程解法——使用warmup（总步数5-10%）、混合10-20%旧数据、学习率设为原始1/10。总结一句：loss上升不可怕，可怕的是没有监控旧任务性能。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果loss上升后一直不下降，你怎么办？

> 先检查数据质量：统计新数据中重复样本比例（如超过5%需去重），检查是否有噪声标签（如HTML残留）。若数据干净，降低学习率（如从1e-5降到5e-6）并增加warmup步数（从100步到500步）。若仍无效，尝试冻结底层（如前6层）只训练顶层，或使用LoRA（秩r=8）做参数高效微调，避免全参数更新破坏预训练特征。

**追问 2**：增量预训练和领域微调（Domain Fine-tuning）有什么区别？

> 核心区别在于目标：增量预训练是继续MLM（Masked Language Modeling）任务，学习领域语言分布（如医学术语），loss是交叉熵；领域微调是监督任务（如分类），loss是任务损失。增量预训练需要更大数据量（如10B tokens）和更小学习率（1e-5），而微调可用小数据（1M tokens）和较大学习率（2e-5）。工程上，增量预训练更易出现loss上升，因为无监督学习对分布偏移敏感。

**追问 3**：你如何选择warmup步数？

> 经验公式：warmup步数 = 总步数 × 0.05~0.1。例如，训练10万步，warmup设为5000步。若数据量小（如1B tokens），warmup比例可提高到10-15%。更精确的方法：用学习率扫描（LR Range Test），在warmup阶段观察loss下降速度，找到最优学习率后固定。论文参考：Smith (2017) 的“Cyclical Learning Rates”方法。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “loss上升肯定不正常，应该立即停止训练。” → ✅ “loss上升在初期是正常的，需要结合旧任务PPL和warmup阶段判断；若持续上升才需干预。”
- ❌ “直接降低学习率到1e-6就能解决。” → ✅ “降低学习率是手段之一，但需配合warmup和混合旧数据；若数据分布差异大，还需调整tokenizer或增加领域数据比例。”
- ❌ “只用新数据训练，loss下降更快。” → ✅ “只训新数据会导致灾难性遗忘，旧任务PPL飙升；必须混合10-20%旧数据，用权重衰减和梯度裁剪稳定训练。”

#### 6️⃣ 简历呼应

- **如果你有增量预训练项目**：从“实际loss曲线”切入，展示你如何用warmup（如线性warmup 500步）和混合数据（如20% C4）将初始loss从3.2降到2.8，并监控旧任务PPL（如GLUE子集）不恶化。
- **如果你只做过微调（Fine-tuning）**：类比微调中的过拟合问题，说明增量预训练是“无监督过拟合”风险，需要更保守的学习率和数据混合策略。
- **如果你是校招无项目**：聚焦论文复现，如用RoBERTa在PubMed数据上做增量预训练，记录loss变化，并对比不同学习率（1e-5 vs 5e-6）的效果，展示你对训练动态的理解。

#### 7️⃣ 延伸阅读

- RoBERTa: A Robustly Optimized BERT Pretraining Approach (Liu et al., 2019)
- T5: Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (Raffel et al., 2020)
- Cyclical Learning Rates for Training Neural Networks (Smith, 2017)
- LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)
- 博客：Hugging Face “How to train a new language model from scratch using Transformers and Tokenizers”

---
