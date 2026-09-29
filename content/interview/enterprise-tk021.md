---
slug: enterprise-tk021
no: "921"
title: "具体讲一下这个参数是加在模型的哪里"
question: "具体讲一下这个参数是加在模型的哪里"
excerpt: "面试官想看你是否真正理解PEFT（Parameter-Efficient Fine-Tuning）方法的本质，而非只会背概念。这是典型的“工程取舍+系统设计”考察：你不仅要说出参数加在哪，还要解释为什么加在那、对训练和推"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4729
updated: "2026-09-29"
---

## 具体讲一下这个参数是加在模型的哪里

#### 1️⃣ 考察意图

面试官想看你是否真正理解PEFT（Parameter-Efficient Fine-Tuning）方法的本质，而非只会背概念。这是典型的“工程取舍+系统设计”考察：你不仅要说出参数加在哪，还要解释为什么加在那、对训练和推理有什么影响。刁钻点在于：很多人能背出LoRA加在Q、V上，但说不清为什么加在Q、V而不是其他层，或者混淆Prefix Tuning和Prompt Tuning的参数位置。答好了能展示你对Transformer内部结构的深刻理解、对不同PEFT方法设计哲学的对比分析能力，以及在实际部署中如何选择方法的工程直觉。

#### 2️⃣ 标准答

PEFT方法的核心是**在不修改原始预训练权重的前提下，插入少量可学习参数**，通过只更新这些参数来实现高效微调。不同方法的插入位置和方式有本质区别，下面以三种主流方法为例详细说明。

#### LoRA：低秩矩阵旁路

- **位置**：加在Transformer的**线性投影层**（如Attention中的Q、K、V、O投影层）的权重矩阵旁。具体来说，对于原始权重矩阵 W \in \mathbb{R}^{d \times k}，LoRA插入两个低秩矩阵 A \in \mathbb{R}^{d \times r} 和 B \in \mathbb{R}^{r \times k}（其中 r \ll \min(d, k)），前向计算变为 h = Wx + BAx。
- **为什么加在这**：Attention层的Q、V投影是信息流动的关键瓶颈，微调这些层能高效捕获任务特定模式。实验表明，只微调Q、V就能达到接近全参数微调的效果，而微调K、O收益递减。这是**效果与效率的trade-off**：加在更多层（如所有线性层）会提升性能但增加参数量，加在更少层（如只加Q）则可能欠拟合。
- **实际落地的坑**：推理时如果合并权重（W' = W + BA），会丢失原始权重的灵活性，无法快速切换任务。解法是**保持BA不合并**，在推理时动态计算 BAx，这样可以在同一个基座模型上挂载多个LoRA模块，实现多任务切换，但会增加推理延迟约10-20%。如果对延迟敏感，则提前合并权重并保存为独立模型。

#### Prefix Tuning：前缀向量插入

- **位置**：在Transformer**每一层**的key和value输入序列前，插入一组可学习的“虚拟token”向量。具体来说，对于第 l 层，原始输入序列长度为 n，Prefix Tuning插入 m 个前缀向量 P_k^l \in \mathbb{R}^{m \times d} 和 P_v^l \in \mathbb{R}^{m \times d}，分别拼接到key和value序列前，形成 K' = [P_k^l; K]，V' = [P_v^l; V]，然后正常计算Attention。
- **为什么加在这**：通过修改Attention的key/value，前缀向量能直接影响注意力分布，相当于在每层注入任务特定的“上下文”。注意，前缀向量**不改变输入序列的embedding**，而是直接作用于Attention计算。这与Prompt Tuning（只在输入层加可学习token）有本质区别：Prefix Tuning每层都有独立参数，表达能力更强，但参数量也更大（O(L \times m \times d)，L为层数）。
- **实际落地的坑**：前缀长度 m 的选择很敏感。太短（如m=5）可能无法捕获足够任务信息，太长（如m=100）会导致显存爆炸，因为每层都要存储前缀向量。经验值：对于分类任务，m=10-20；对于生成任务，m=50-100。另外，前缀向量初始化方式也很关键，用预训练词嵌入初始化比随机初始化收敛快30%以上。

#### Adapter：瓶颈层插入

- **位置**：加在Transformer的**每个Transformer块内部**，具体在**FFN层之后、残差连接之前**。典型结构是：输入 x → Attention → 残差连接 → LayerNorm → FFN → 残差连接 → LayerNorm → **Adapter** → 输出。Adapter本身是一个“瓶颈”结构：先降维（d \rightarrow r），再升维（r \rightarrow d），中间加非线性激活函数（如ReLU）。
- **为什么加在这**：FFN层是Transformer中参数量最大的部分（约占2/3），在FFN后插入Adapter可以捕获FFN输出的任务特定变换，同时通过瓶颈结构限制参数量（通常 r = 64-256，参数量仅为原始FFN的1-5%）。注意，Adapter**不修改原始FFN权重**，而是作为额外模块串行插入，这导致推理时会有额外计算开销（约增加10-15%的延迟）。
- **实际落地的坑**：Adapter的插入位置有变体。早期Adapter（Houlsby et al., 2019）插在FFN后和Attention后各一个，但后续研究（Pfeiffer et al., 2020）发现只插在FFN后效果更好且参数量减半。另一个坑是**训练和推理不一致**：训练时Adapter是激活的，但推理时如果忘记加载Adapter权重，模型会退化为原始基座模型，输出完全错误。解法是**在模型加载时显式检查Adapter权重是否存在**，并设置一个开关变量控制是否启用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，LoRA的参数加在Attention层的Q、V投影权重旁，通过低秩矩阵旁路实现高效微调；第二，Prefix Tuning的参数加在每层Transformer的key/value输入前，通过修改注意力分布注入任务上下文；第三，Adapter的参数加在FFN层之后、残差连接之前，通过瓶颈结构捕获任务特定变换。总结一句：不同PEFT方法的参数位置直接决定了它们的表达能力、参数量和推理效率，选择时需根据任务需求和部署约束权衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么LoRA通常只加在Q、V上，而不是所有线性层？

> 这是效果与效率的trade-off。实验表明，Attention层的Q、V投影是信息流动的关键瓶颈，微调它们能高效捕获任务特定模式，而K、O投影的微调收益递减。如果加在所有线性层（包括FFN的升维降维层），参数量会从约0.1%增加到约2%，但性能提升有限（通常<1%）。实际工程中，如果任务需要更强的表达能力（如复杂推理），可以扩展到Q、K、V、O全部加LoRA，但需要监控显存和训练速度。一个经验规则：先只加Q、V，如果验证集性能不达标，再逐步扩展到K、O。

**追问 2**：Prefix Tuning和Prompt Tuning的参数位置有什么区别？为什么Prefix Tuning效果更好？

> 核心区别在于参数插入的深度。Prompt Tuning只在输入层（embedding层）插入可学习的“虚拟token”，这些token通过所有层共享，相当于在输入层面注入任务提示。而Prefix Tuning在每一层的key/value前都插入独立的前缀向量，相当于在每一层都修改注意力分布。因此，Prefix Tuning的表达能力更强，因为深层的前缀可以捕获更抽象的任务特征。但代价是参数量更大：对于12层Transformer，Prefix Tuning的参数量是Prompt Tuning的12倍（如果前缀长度相同）。实际选择：如果任务简单（如情感分类），Prompt Tuning足够；如果任务复杂（如摘要生成），Prefix Tuning更优。

**追问 3**：Adapter在推理时如何合并权重？能不能像LoRA一样合并？

> 不能。LoRA的权重可以合并到原始权重中（W' = W + BA），因为它是并行旁路结构。而Adapter是串行插入的，它的输出会经过后续的残差连接和LayerNorm，无法简单合并到FFN权重中。因此，Adapter在推理时必须保持独立计算，这导致额外的延迟开销（约10-15%）。一个优化技巧是：如果对延迟极度敏感，可以在训练后对Adapter进行知识蒸馏，将Adapter的能力蒸馏到原始模型权重中，从而移除Adapter模块。但这会增加训练成本，且可能损失部分性能。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“LoRA的参数加在模型的Attention层” → ✅ 必须精确到“加在Attention层的Q、V投影权重矩阵旁，通过低秩矩阵旁路实现”，并解释为什么是Q、V而不是其他层。
- ❌ 说“Prefix Tuning就是在输入前面加一些可学习的token” → ✅ 必须区分Prefix Tuning和Prompt Tuning：Prefix Tuning在每一层的key/value前加，而Prompt Tuning只在输入层加。混淆两者会被认为对论文理解不深。
- ❌ 说“Adapter加在FFN层之后”但不说具体位置 → ✅ 必须补充“在残差连接之前”，并解释为什么加在这（捕获FFN输出的任务特定变换）以及为什么不能合并权重（串行结构）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“多任务部署”角度切入，说明在同一个基座模型上挂载多个LoRA模块实现不同任务的切换，并对比Prefix Tuning和Adapter在延迟上的差异。
- **如果你只做过传统NLP**：用“特征工程”类比迁移，把PEFT方法比作在原始特征空间外添加额外特征（LoRA是并行特征，Prefix Tuning是序列特征，Adapter是串行特征），强调不同插入位置对应不同的特征交互方式。
- **如果你是校招无项目**：聚焦论文复现，说明在BERT上分别实现LoRA、Adapter、Prefix Tuning，并对比它们在参数量、训练速度、推理延迟上的差异，强调对Transformer内部结构的理解。
- LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)
- Prefix-Tuning: Optimizing Continuous Prompts for Generation (Li & Liang, 2021)
- Adapter: Parameter-Efficient Transfer Learning for NLP (Houlsby et al., 2019)
- The Power of Scale for Parameter-Efficient Prompt Tuning (Lester et al., 2021) - Prompt Tuning vs Prefix Tuning对比
- PEFT: State-of-the-art Parameter-Efficient Fine-Tuning (Mangrulkar et al., 2022) - Hugging Face PEFT库文档，包含所有方法的实现细节和trade-off分析

---
