---
slug: finetune-tk049
no: "949"
title: "SFT的时候，有哪几种参数微调方法"
question: "SFT的时候，有哪几种参数微调方法"
excerpt: "面试官想考察你对SFT（监督微调）参数更新策略的体系化认知，而非简单罗列方法名。核心是区分“全参数微调”与“参数高效微调（PEFT）”的工程取舍，以及每种方法背后的数学原理（如LoRA的低秩分解、Adapter的瓶颈结构"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3934
updated: "2026-09-29"
---

## SFT的时候，有哪几种参数微调方法

`P1` · `llm_training`

📊 考点：sft · fine-tuning · lora

🏷 标签：`adapter`

#### 1️⃣ 考察意图

面试官想考察你对SFT（监督微调）参数更新策略的体系化认知，而非简单罗列方法名。核心是区分“全参数微调”与“参数高效微调（PEFT）”的工程取舍，以及每种方法背后的数学原理（如LoRA的低秩分解、Adapter的瓶颈结构）。刁钻点在于：你是否能根据任务类型（对话/分类/代码）、资源约束（显存/数据量）和性能要求，给出选择依据。答好了能展示你对LLM训练全流程的实战理解，而非纸上谈兵。

#### 2️⃣ 标准答

SFT参数微调方法分为三大类：全参数微调、参数高效微调（PEFT）和混合策略。下面逐一拆解，重点讲PEFT的工程细节。

**1. 全参数微调（Full Fine-tuning）**

- **做法**：更新模型所有参数（如LLaMA-7B的70亿参数），从头训练。
- **优点**：理论上效果上限最高，适合数据量大（>10万条）且任务与预训练分布差异大的场景（如领域迁移）。
- **缺点**：显存爆炸——以LLaMA-7B为例，全参数微调需约56GB显存（FP16），单卡A100（80GB）勉强跑，但batch size受限；训练速度慢，收敛需数天。
- **坑**：容易过拟合，尤其数据量<1万时，需配合正则化（如权重衰减、dropout）或早停。

**2. 参数高效微调（PEFT）——核心考点**PEFT只更新少量参数（通常<1%），冻结大部分预训练权重，主流方法有：

- **LoRA（Low-Rank Adaptation）****原理**：对权重矩阵W做低秩分解，W' = W + BA，其中B∈R^(d×r)、A∈R^(r×k)，秩r<<min(d,k)。训练时只更新B和A，推理时合并回W。
- **工程取舍**：r控制参数量与效果平衡。r=8时参数量约为全参数的0.1%（LLaMA-7B约7M参数），显存降至16GB（单卡RTX 3090可跑）。但r过小（<4）会导致表达能力不足，尤其对复杂推理任务。
- **实战坑**：LoRA默认只作用于attention的Q/K/V/O矩阵，忽略FFN层。若任务需要强特征变换（如代码生成），建议在FFN层也加LoRA，效果提升5-10%（【通用知识】）。
- **工具**：HuggingFace PEFT库，支持rank=8/16/32，alpha=16/32（缩放因子）。
Adapter
- **原理**：在Transformer每层插入瓶颈结构（down-projection→非线性→up-projection），参数量由瓶颈维度d_bottleneck控制（通常d_bottleneck=64）。
- **取舍**：相比LoRA，Adapter引入额外推理延迟（约10-20%），因为需要串行计算；但效果更稳定，尤其对多任务学习（每个任务独立Adapter）。
- **坑**：Adapter插入位置有讲究——放在FFN后比放在Attention后好（【通用知识】），因为FFN层更易过拟合。
Prefix Tuning & Prompt Tuning
- **做法**：在输入层或每层前添加可学习向量（prefix length=10-100）。
- **适用**：生成任务（如摘要、对话），但效果依赖模型规模——对<7B模型效果差（因prefix容量有限），对>70B模型接近全参数微调。
- **坑**：Prefix Tuning需调整prefix长度，过长（>200）会导致训练不稳定（梯度爆炸），建议用AdamW+学习率1e-4。
BitFit
- **做法**：只更新bias参数（约0.1%参数量）。
- **适用**：数据量极小（<1000条）或快速原型验证，但效果上限低，仅适合简单分类任务。

**3. 混合方法**

- **部分层微调**：只更新最后几层（如最后2层Transformer），冻结其余。适合数据量中等（1-5万条），效果介于全参数和PEFT之间，但显存节省有限（仍需加载全参数梯度）。
- **DoRA（Weight-Decomposed Low-Rank Adaptation）**：2024年新方法，将权重分解为幅度和方向，只微调方向部分，比LoRA更稳定（【通用知识】）。

**选择依据**：

- 资源受限（单卡<24GB）→ LoRA（r=8-16）或Adapter（d_bottleneck=64）
- 数据量大（>10万）且任务复杂→ 全参数微调+梯度检查点（显存降30%）
- 多任务部署→ Adapter（每个任务独立）
- 快速实验→ BitFit或Prompt Tuning

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从全参数微调、参数高效微调和混合策略三个层面回答。全参数微调效果好但显存高，适合大数据量场景；PEFT中LoRA最常用，通过秩r控制参数量，但需注意作用层选择；混合方法如部分层微调适合中等数据量。总结一句：选择依据是资源、数据量和任务复杂度，LoRA是默认首选。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：LoRA的秩r怎么选？为什么r=8是默认值？

> 应对策略：r控制低秩分解的秩，影响参数量和表达能力。r=8是经验值，因为对LLaMA-7B，r=8时参数量约7M，显存16GB，效果接近全参数微调（差距<2%）。r=16时参数量翻倍但效果提升有限（<1%），r=4时可能欠拟合（尤其对推理任务）。实际调优：先用r=8跑基线，若验证集loss不降则升到16，若显存不足则降为4。注意：r与alpha（缩放因子）需联动，通常alpha=2r。

**追问 2**：LoRA和Adapter哪个更适合多任务学习？

> 应对策略：Adapter更适合。因为每个任务可独立训练一个Adapter模块（参数量约0.5M/任务），推理时动态加载，不干扰主模型。LoRA虽然也能多任务（每个任务一套B/A矩阵），但合并到权重后无法分离，需存储多个checkpoint。工程上，Adapter的瓶颈维度d_bottleneck=64时，多任务部署显存开销比LoRA低30%（【通用知识】）。但注意：Adapter引入额外推理延迟（约15%），若对延迟敏感（如实时对话），选LoRA。

**追问 3**：全参数微调时，如何避免灾难性遗忘？

> 应对策略：三种策略。1）EWC（Elastic Weight Consolidation）：在损失函数中加入Fisher信息矩阵正则项，惩罚对重要权重的修改，但计算开销大（需全参数Fisher）。2）Replay：混合10-20%预训练数据，防止模型遗忘通用知识，实践中效果最好（【通用知识】）。3）LoRA+全参数混合：先用LoRA微调，再解冻部分层全参数微调，平衡遗忘与适应。注意：灾难性遗忘在数据量<1万时最严重，建议至少用5%预训练数据做replay。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提LoRA，不提Adapter、Prefix Tuning等 → ✅ 必须展示体系化认知，至少列出3种方法并对比适用场景（如LoRA适合资源受限，Adapter适合多任务）。
- ❌ 说“LoRA不改变推理速度” → ✅ 纠正：LoRA推理时可合并到原权重，无额外延迟；但Adapter和Prefix Tuning有额外计算开销。
- ❌ 认为全参数微调一定比PEFT好 → ✅ 指出：数据量<1万时，全参数微调易过拟合，PEFT效果反而更好（【通用知识】）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“LoRA在LLaMA-7B上微调检索增强对话模型”切入，强调秩r=8时显存从56GB降至16GB，且BLEU提升3%。可补充：对比了Adapter（延迟高）和全参数（过拟合），最终选LoRA。
- **如果你只做过传统NLP**：用“BERT微调”类比——全参数微调类似BERT fine-tuning，PEFT类似Adapter-BERT。强调LoRA的低秩分解与SVD的数学联系，展示迁移能力。
- **如果你是校招无项目**：聚焦“LoRA论文复现”——在TinyLLaMA-1.1B上实现LoRA，对比r=4/8/16的收敛曲线，报告显存占用和ROUGE指标。可提：用HuggingFace PEFT库，代码开源在GitHub。

#### 7️⃣ 延伸阅读

- LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)
- Adapter: Parameter-Efficient Transfer Learning for NLP (Houlsby et al., 2019)
- Prefix-Tuning: Optimizing Continuous Prompts for Generation (Li & Liang, 2021)
- DoRA: Weight-Decomposed Low-Rank Adaptation (Liu et al., 2024)
- HuggingFace PEFT库文档：官方教程与最佳实践

---
