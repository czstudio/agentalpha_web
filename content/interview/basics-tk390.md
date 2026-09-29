---
slug: basics-tk390
no: "1290"
title: "改写后：LLaMA 3模型的参数规模是多少？包括8B、70B、405B版本"
question: "改写后：LLaMA 3模型的参数规模是多少？包括8B、70B、405B版本"
excerpt: "这道题看似是“背数字”的基础题，但面试官真正考察的是：你是否理解参数规模背后的工程取舍与业务适配逻辑。它属于“概念+工程取舍”混合型问题。刁钻点在于：候选人往往只报出8B/70B/405B三个数字，却无法解释为什么Met"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4516
updated: "2026-09-29"
---

## 改写后：LLaMA 3模型的参数规模是多少？包括8B、70B、405B版本

`P0` · `llm_foundation` · 🏢 Meta

#### 1️⃣ 考察意图

这道题看似是“背数字”的基础题，但面试官真正考察的是：**你是否理解参数规模背后的工程取舍与业务适配逻辑**。它属于“概念+工程取舍”混合型问题。刁钻点在于：候选人往往只报出8B/70B/405B三个数字，却无法解释为什么Meta选择这些规模、它们分别对应什么部署场景、以及405B的MoE架构争议。答好了能展示你对大模型从训练到推理的整条链路认知，包括显存计算、量化策略、以及模型架构演进趋势（如Dense vs MoE的trade-off）。

#### 2️⃣ 标准答

LLaMA 3系列确实包含8B、70B、405B三个核心版本，但回答不能止步于报数。需要从**架构差异、训练数据、部署成本、与LLaMA 2的升级点**四个维度展开。

**1. 参数规模与架构细节**

- **8B**：Dense Transformer，32层，hidden size 4096，32个注意力头。对标LLaMA 2的7B，但训练数据从2T tokens提升到15T tokens，且上下文长度从4K扩展到8K（通过RoPE位置编码的frequency scaling实现）。
- **70B**：Dense Transformer，80层，hidden size 8192，64个注意力头。与LLaMA 2 70B架构基本一致，但训练数据量级和tokenizer（从BPE升级到SentencePiece）有差异。
- **405B**：**Dense Transformer**（注意：不是MoE！）。这是Meta刻意选择的技术路线——他们放弃了MoE的稀疏激活优势，坚持用Dense架构换取训练稳定性和推理可预测性。具体配置：126层，hidden size 16384，128个注意力头，使用Grouped-Query Attention（GQA）减少KV cache占用。

**2. 训练数据与上下文长度**

- 三个版本均使用**15T tokens**训练，数据截止到2023年底，包含多语言（英语为主，约5%其他语言）和代码（约10%）。
- 上下文长度：8B和70B支持**8K tokens**（通过RoPE的base frequency从10000调整到500000实现长上下文外推），405B支持**128K tokens**（采用YaRN扩展方法，需要额外的position interpolation微调）。

**3. 部署资源与工程取舍**

- **8B**：FP16推理需16GB显存（8B×2 bytes），单张A100 80GB可部署5个实例。4-bit量化后显存降至4GB，可在消费级显卡（RTX 4090 24GB）运行。**实际落地的坑**：8B模型在长上下文（>4K）时，RoPE外推会导致困惑度急剧上升，需要配合NTK-aware scaling或动态NTK插值。
- **70B**：FP16需140GB显存，至少需要2张A100 80GB（通过张量并行）。4-bit量化后显存降至35GB，单张A100可部署。**工程取舍**：张量并行时，通信开销（NVLink带宽约600GB/s）会吃掉约15%的推理吞吐，因此70B更推荐使用4-bit量化+单卡部署，而非多卡FP16。
- **405B**：FP16需810GB显存，至少需要10张A100 80GB（通过流水线并行+张量并行）。即使4-bit量化，也需要约200GB显存（3张A100）。**实际落地的坑**：405B的推理延迟极高（单token生成约200ms on 8×A100），且KV cache占用巨大（128K上下文时约1.2TB），必须使用PagedAttention（如vLLM）和KV cache量化（FP8或INT4）才能实际部署。

**4. 与LLaMA 2的对比升级**

- 参数规模：LLaMA 2是7B/13B/70B，LLaMA 3砍掉了13B，新增405B，形成“轻量-中量-重量”三级体系。
- 训练数据：从2T tokens暴增到15T tokens，数据质量提升（使用更严格的去重和过滤pipeline）。
- 上下文长度：从4K扩展到8K（8B/70B）和128K（405B），但注意405B的128K是**训练时支持的**，而非外推。
- Tokenizer：从BPE（vocab size 32K）升级到SentencePiece（vocab size 128K），对多语言和代码的编码效率提升约20%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，LLaMA 3系列包含8B、70B、405B三个版本，其中405B是Dense架构而非MoE，这是Meta的关键技术选择。第二，参数规模直接决定了部署成本——8B可量化到4GB在消费级显卡运行，70B推荐4-bit量化单卡部署，405B必须使用PagedAttention和KV cache量化才能落地。第三，与LLaMA 2相比，训练数据从2T提升到15T tokens，上下文长度扩展到128K，Tokenizer也升级到SentencePiece。总结一句：参数规模不是越大越好，而是要根据业务场景在效果、延迟、成本之间做取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么LLaMA 3 405B不用MoE架构？MoE不是更高效吗？

> 这是Meta的刻意选择。MoE虽然能通过稀疏激活降低计算量（比如Mixtral 8×7B只有12.9B活跃参数），但存在三个工程问题：第一，训练不稳定，专家负载不均衡会导致部分专家退化，需要额外的auxiliary loss和expert routing策略；第二，推理时KV cache占用不降反升（因为所有专家共享注意力层），对长上下文场景不友好；第三，部署复杂度高，需要定制化的并行策略（如Expert Parallelism）。Meta选择Dense架构，是为了保证训练的可复现性和推理的可预测性，尤其适合他们需要大规模部署的搜索和推荐场景。

**追问 2**：8B模型在手机上部署，显存够吗？需要什么优化？

> 8B模型FP16需要16GB显存，手机显然不够。必须使用4-bit或更低比特量化。具体方案：先用GPTQ或AWQ做权重量化到4-bit（显存降至4GB），再用SmoothQuant对激活值做8-bit量化（减少outlier影响）。但即使这样，手机端部署仍面临两个挑战：第一，推理速度——8B模型在手机CPU上约1 token/s，需要配合Apple Neural Engine或高通Hexagon DSP的硬件加速；第二，内存带宽——量化后的模型仍需从DRAM加载到NPU，带宽瓶颈会导致延迟。实际落地时，通常会使用**投机解码**（Speculative Decoding）用小模型（如LLaMA 3 1B）做草稿，大模型做验证，将延迟降低2-3倍。

**追问 3**：LLaMA 3 405B的128K上下文是怎么实现的？和GPT-4的128K有什么区别？

> 405B的128K是通过**YaRN**（Yet another RoPE extensioN）方法实现的。YaRN在RoPE的基础上，对高频和低频维度采用不同的缩放因子，避免长距离位置编码的混淆。而GPT-4的128K是通过**位置插值**（Position Interpolation）实现的，两者核心区别是：YaRN保留了高频分量的分辨率，对长上下文更友好，但需要额外的微调（约1000步）；位置插值更简单，但会损失高频信息。实际效果上，YaRN在128K长度的困惑度比位置插值低约5%。另外注意：405B的128K是**训练时支持的**，而GPT-4的128K是通过微调扩展的，两者在长距离依赖的捕捉能力上仍有差距。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只报数字：“LLaMA 3有8B、70B、405B三个版本。” → ✅ 补充架构细节：“405B是Dense架构，不是MoE，这是Meta的关键技术选择。”
- ❌ 混淆量化精度：“8B模型4-bit量化后显存占用8GB。” → ✅ 正确计算：“8B×0.5 bytes（4-bit）= 4GB，加上KV cache和中间激活，实际约5-6GB。”
- ❌ 忽略上下文长度差异：“三个版本都支持128K上下文。” → ✅ 区分说明：“只有405B支持128K，8B和70B是8K，但可以通过RoPE外推扩展到32K。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从部署角度切入，强调8B模型在RAG场景中的性价比——4-bit量化后可在单卡部署，配合128K上下文（实际只用4K-8K）做检索增强，对比70B的延迟和成本优势。
- **如果你只做过传统NLP**：用“模型规模与资源消耗”的类比迁移——8B相当于轻量级BERT（可实时推理），70B相当于GPT-2 Medium（需GPU集群），405B相当于GPT-3（需分布式训练）。强调参数规模不是唯一指标，训练数据质量和架构设计同样重要。
- **如果你是校招无项目**：聚焦LLaMA 3 405B的Dense vs MoE论文复现demo。可以写一个简单的分析报告，对比Dense和MoE在相同参数量下的训练稳定性和推理延迟，展示你对模型架构的理解深度。

#### 7️⃣ 延伸阅读

- 《The Llama 3 Herd of Models》——Meta官方技术报告，详细说明架构选择、训练数据和评估结果
- 《YaRN: Efficient Context Window Extension of Large Language Models》——405B 128K上下文的核心方法论文
- 《PagedAttention: Efficient Memory Management for Large Language Model Serving》——vLLM的KV cache管理论文，405B部署必读
- 《GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers》——8B/70B量化部署的经典方案
- 《SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models》——解决量化后激活值outlier问题的实用技术

---
