---
slug: finetune-tk077
no: "977"
title: "What are the different categories of the PEFT method"
question: "What are the different categories of the PEFT method"
excerpt: "面试官想看的不是“你背过PEFT分类”，而是能否从工程取舍和系统设计角度，把PEFT方法按“修改模型结构”和“修改输入/梯度”两条主线拆解。刁钻点在于：很多人把LoRA和Adapter混为一谈，却说不清为什么LoRA推理"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3846
updated: "2026-09-29"
---

## What are the different categories of the PEFT method

`P1` · `llm_training`

📊 考点：peft · lora · fine-tuning

🏷 标签：`adapter, llm`

#### 1️⃣ 考察意图

面试官想看的不是“你背过PEFT分类”，而是**能否从工程取舍和系统设计角度，把PEFT方法按“修改模型结构”和“修改输入/梯度”两条主线拆解**。刁钻点在于：很多人把LoRA和Adapter混为一谈，却说不清为什么LoRA推理无额外延迟而Adapter有。答好了能展示你对大模型训练效率、推理部署、资源约束的全局把控，这是P1以上工程师的硬实力。

#### 2️⃣ 标准答

PEFT方法可按**操作对象**分为三大类：**附加参数型**、**重参数化型**、**提示/输入型**。每类有不同trade-off，选型取决于任务、资源和部署约束。

#### 附加参数型（Additive）

- **Adapter**：在Transformer每层插入小瓶颈网络（如down-proj + up-proj）。参数量约原模型2-5%，但推理时需串行计算Adapter层，**增加延迟10-20%**（实测LLaMA-7B上约2ms/层）。坑：插入位置和维度（bottleneck size）敏感，常见设为64或128，太小欠拟合，太大过拟合。
- **LoRA系列**（LoRA, AdaLoRA, DoRA）：在权重矩阵旁加低秩分解矩阵（A和B），秩r=8-64。**推理时可将A·B合并回原权重，零额外延迟**。这是LoRA比Adapter更受欢迎的核心原因。实际落地坑：秩r选择——r=16在LLaMA-7B上微调Alpaca数据，参数量约0.1%，效果已接近全量微调；r=128可能过拟合且显存翻倍。
- **IA3**：学习向量对key/value/FFN做逐元素缩放，参数量极低（约0.01%），适合快速实验，但效果不如LoRA稳定。

#### 重参数化型（Reparameterization）

- **LoRA本质也属此类**，但更常见归入附加型。严格说，重参数化指**不增加推理参数，只改变训练时梯度流**。例如：**Prefix Tuning**在每层前加虚拟token（长度l=10-100），训练时只更新这些token的embedding，参数量约0.1-1%。但推理时需拼接虚拟token，增加序列长度，**KV cache占用变大**，对长序列任务（如对话）不友好。
- **P-Tuning v2**：将可学习向量插入每层输入，类似Prefix Tuning但更灵活。坑：虚拟token长度需调参，过长（>100）导致训练不稳定，过短（<5）效果差。

#### 提示/输入型（Prompt-based）

- **P-Tuning**：在输入层前加可学习embedding（如P-Tuning v1用LSTM生成），参数量极小（<0.01%），但**只更新输入层**，对深层语义影响有限，适合分类任务，不适合生成。
- **Prefix Tuning**（同上，跨类）：既算重参数化也算提示型，边界模糊。实际选型时，**生成任务优先用LoRA，分类任务用P-Tuning更省资源**。

#### 选型决策树

- **资源极受限（显存<8GB）**：P-Tuning或IA3，参数量<0.1%，训练快但效果上限低。
- **需要低推理延迟**：LoRA（合并权重），避免Adapter。
- **任务复杂（如代码生成）**：LoRA + 高秩（r=64）或AdaLoRA（自动分配秩）。
- **多任务部署**：Adapter（每个任务一个独立Adapter层，共享基座模型），但需处理推理延迟。

#### 混合方法

- **LoRA + Adapter**：在attention和FFN上同时加LoRA和Adapter，参数量翻倍但效果提升有限（约1-2%），**不推荐**，除非任务极度复杂。
- **LoRA + Prefix Tuning**：常见于多模态任务（如LLaVA），LoRA调视觉模块，Prefix Tuning调文本对齐。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从附加参数、重参数化、提示输入三个层面回答。附加参数型如Adapter和LoRA，核心区别是推理延迟——LoRA可合并权重零开销，Adapter有10-20%延迟增加。重参数化型如Prefix Tuning，不增加推理参数但增加序列长度，KV cache变大。提示型如P-Tuning，参数量极低但只适合分类。总结一句：选型看任务类型和部署约束，生成任务优先LoRA，分类任务用P-Tuning，多任务用Adapter。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：LoRA的秩r怎么选？为什么r=64在有些任务上反而比r=8差？

> 秩r控制低秩矩阵的表达能力。r=8适合简单任务（如情感分类），r=64适合复杂任务（如代码生成）。但r过大（>128）会导致过拟合，因为低秩假设被破坏，矩阵A·B的秩接近满秩，失去正则化效果。实际做法：先用r=8跑基线，如果欠拟合（验证集loss不降），逐步翻倍到r=32或64。AdaLoRA可自动分配每层秩，但训练慢20%。

**追问 2**：Adapter和LoRA在推理时哪个更省显存？为什么？

> LoRA更省显存。推理时LoRA合并权重，模型结构和原模型完全一致，显存占用不变。Adapter需要额外存储Adapter层参数（约2-5%），且计算时需保留中间激活，显存增加约10-15%。但Adapter的优势是**多任务切换快**——只需加载不同Adapter权重，不用重新合并矩阵。

**追问 3**：Prefix Tuning的虚拟token长度怎么调？为什么长序列任务不推荐？

> 虚拟token长度l通常设为10-50。l过小（<5）效果差，因为可学习参数太少；l过大（>100）导致训练不稳定，梯度消失。长序列任务不推荐，因为虚拟token会**增加KV cache大小**（l=50时，序列长度从1024变1074，KV cache增加5%），且推理时需重新计算前缀的KV，延迟增加。替代方案：用LoRA微调attention的Q和V矩阵，不改变序列长度。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“LoRA和Adapter都是附加参数，效果差不多” → ✅ 必须区分推理延迟：LoRA可合并权重零开销，Adapter有10-20%延迟增加；效果上LoRA在生成任务中通常优于Adapter。
- ❌ 说“P-Tuning和Prefix Tuning一样，都是加虚拟token” → ✅ P-Tuning只加在输入层，Prefix Tuning加在每层输入；P-Tuning参数量更小但效果上限低，Prefix Tuning适合深层语义调整。
- ❌ 说“所有PEFT方法都适合大模型微调” → ✅ 必须指出限制：Adapter增加推理延迟，Prefix Tuning增加KV cache，P-Tuning只适合分类；只有LoRA在生成任务中兼顾效果和效率。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“PEFT在检索增强中的角色”切入——用LoRA微调LLaMA-7B作为生成器，对比Adapter（延迟增加）和Prefix Tuning（KV cache膨胀）对RAG端到端延迟的影响，强调LoRA在部署中的优势。
- **如果你只做过传统NLP**：用“全量微调 vs PEFT”类比迁移——全量微调像重新训练整个模型，PEFT像只调整关键参数；重点讲LoRA的低秩分解如何类比SVD降维，展示数学直觉。
- **如果你是校招无项目**：聚焦“PEFT论文复现demo”——在Hugging Face上用LoRA微调LLaMA-7B做文本生成，对比r=8和r=64的loss曲线，输出参数量和训练时间对比表，展示动手能力。

#### 7️⃣ 延伸阅读

- LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)
- Adapter: Parameter-Efficient Transfer Learning for NLP (Houlsby et al., 2019)
- Prefix-Tuning: Optimizing Continuous Prompts for Generation (Li & Liang, 2021)
- P-Tuning v2: Prompt Tuning Can Be Comparable to Fine-tuning Universally (Liu et al., 2022)
- AdaLoRA: Adaptive Budget Allocation for Parameter-Efficient Fine-Tuning (Zhang et al., 2023)

---
