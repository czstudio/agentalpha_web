---
slug: basics-tk581
no: "1481"
title: "八股:开源框架了解过哪些?Qwen,Deepseek的论文是否有研读过,说一下其中的创新点主要体现在哪"
question: "八股:开源框架了解过哪些?Qwen,Deepseek的论文是否有研读过,说一下其中的创新点主要体现在哪"
excerpt: "面试官想确认你是否只是“调包侠”，还是真正深入过前沿开源LLM的论文细节。考察类型是工程取舍+论文研读，刁钻点在于：很多人能背出Qwen用了RoPE、DeepSeek用了MoE，但说不出“为什么Qwen2从MHA切到GQ"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4379
updated: "2026-09-29"
---

## 八股:开源框架了解过哪些?Qwen,Deepseek的论文是否有研读过,说一下其中的创新点主要体现在哪

#### 1️⃣ 考察意图

面试官想确认你是否只是“调包侠”，还是真正深入过前沿开源LLM的论文细节。考察类型是**工程取舍+论文研读**，刁钻点在于：很多人能背出Qwen用了RoPE、DeepSeek用了MoE，但说不出“为什么Qwen2从MHA切到GQA能省多少显存”或“DeepSeek-V2的MLA相比MHA在长上下文场景下KV cache具体少多少”。答好了，能展示你对模型架构演进（Attention变体、MoE、RL训练）的底层理解，以及这些创新对实际部署（推理速度、显存、成本）的量化影响。

#### 2️⃣ 标准答

**开源框架层面**，我主要深入用过Hugging Face Transformers（模型加载/微调）、DeepSpeed（ZeRO-3、FlashAttention集成）、vLLM（PagedAttention推理优化）、以及LangChain/LlamaIndex（RAG编排）。框架是工具，关键还是底层模型设计。

**Qwen系列论文创新点**（Qwen Technical Report, Qwen2 Technical Report）：

- **激活函数**：采用SwiGLU（Swish-Gated Linear Unit），相比ReLU或GELU，在相同参数量下能提升约2-3%的下游任务准确率（【通用知识】），但计算量略增。
- **位置编码**：使用RoPE（Rotary Position Embedding），支持外推（extrapolation），Qwen2的32K上下文窗口就是靠RoPE+NTK-aware scaling实现的，无需位置编码重训。
- **Qwen2的GQA（Grouped Query Attention）**：这是关键工程取舍。标准MHA（Multi-Head Attention）每个头都有独立的K/V，显存占用随序列长度平方增长；GQA将K/V头分组（如Qwen2-72B用8组），推理时KV cache减少约4倍（相比MHA），在长上下文场景（如32K tokens）下显存节省显著。代价是模型表达力略有下降，但实测在MMLU等基准上损失<0.5%。
- **训练数据**：覆盖多语言（中文、英文、代码等），Qwen2-72B在HumanEval代码生成上达到85%+ pass@1，靠的是高质量代码数据配比（约30%代码+70%自然语言）。

**DeepSeek系列论文创新点**（DeepSeek-V2, DeepSeek-R1, DeepSeekMoE）：

- **DeepSeekMoE（细粒度MoE）**：传统MoE（如Mixtral 8x7B）每个token激活2个专家，但专家粒度粗。DeepSeekMoE把每个专家拆成更小的子专家（如总专家数64，激活8个），实现更细粒度的知识分配。实际落地坑：训练时负载不均衡（某些专家被过度激活），他们用**辅助损失（auxiliary loss）+动态路由**来平衡，损失权重调参很敏感（默认0.01，调大则专家利用率高但模型性能下降）。
- **DeepSeek-V2的MLA（Multi-head Latent Attention）**：这是对MHA的极致优化。核心思想：将K/V投影到低维潜在空间（latent space），再解压回多头。相比MHA，KV cache从`O(n * d * h)`降到`O(n * d_c)`（d_c是潜在维度，通常d_c << d*h），在长上下文（如128K tokens）下KV cache减少约75-85%。代价是增加了一次压缩/解压计算，但推理时计算量远小于显存瓶颈，所以整体吞吐提升2-3倍（【通用知识】）。
- **DeepSeek-R1的GRPO（Group Relative Policy Optimization）**：这是RL训练推理能力的创新。传统PPO需要价值网络（critic），显存翻倍；GRPO去掉critic，用同一组采样输出的相对奖励（group relative reward）来更新策略。实际落地坑：奖励信号稀疏（比如数学题只有对/错），他们引入**过程奖励模型（PRM）** 给中间步骤打分，但PRM训练数据标注成本极高（每步人工标注），所以R1论文里用了大量合成数据+拒绝采样（rejection sampling）来缓解。

**总结**：Qwen的GQA和DeepSeek的MLA都聚焦推理效率，但MLA更激进（压缩到潜在空间）；DeepSeekMoE的细粒度专家和GRPO的RL训练则代表模型架构和训练策略的前沿。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从开源框架、Qwen创新、DeepSeek创新三个层面回答。框架层面，我主要用Hugging Face、DeepSpeed、vLLM做部署和微调。Qwen的核心创新是SwiGLU激活、RoPE位置编码，以及Qwen2的GQA——把KV头分组，推理时KV cache减少约4倍。DeepSeek更激进：V2的MLA把K/V投影到低维空间，长上下文下KV cache减少75-85%；R1的GRPO去掉价值网络，用组内相对奖励做RL训练，降低显存开销。总结一句：这些创新都围绕‘如何在不显著牺牲效果的前提下，把推理效率和显存压到极致’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说DeepSeek-V2的MLA比MHA省75-85% KV cache，具体怎么算的？潜在维度d_c一般设多少？

> 假设MHA有h=32个头，每个头维度d=128，则KV cache维度是`n * d * h = n * 4096`。MLA把K/V投影到潜在空间，论文里d_c通常取512或1024（比如DeepSeek-V2的d_c=512），则KV cache维度是`n * 512`。所以节省比例 = `1 - 512/4096 = 87.5%`。但注意：Q和输出投影仍用多头，所以计算量没省，只是显存省了。实际部署时，如果序列长度超过32K，MLA的显存优势会碾压MHA。

**追问 2**：DeepSeek-R1的GRPO和PPO比，除了省显存，还有什么缺点？

> 缺点有两个。第一，GRPO去掉critic后，策略梯度方差更大，训练不稳定，需要更大的batch size（比如每组采样16个输出）来平滑。第二，奖励信号必须来自同一组内的相对比较，如果奖励函数设计不好（比如所有输出得分都接近），梯度会消失。所以R1论文里用了大量过程奖励（PRM）来提供细粒度信号，但PRM训练成本高。实际落地时，如果任务简单（如分类），PPO更稳；如果任务复杂（如数学推理），GRPO更省显存。

**追问 3**：Qwen2的GQA和DeepSeek的MLA，你更推荐哪个用于部署？为什么？

> 看场景。如果序列长度<8K且显存充足，GQA更简单（无需压缩/解压计算），部署成本低。如果序列长度>32K（如长文档问答、代码仓库理解），MLA的KV cache节省优势明显，但需要额外实现压缩/解压层，推理框架（如vLLM）不一定原生支持。实际落地时，我倾向先用GQA做基线，如果显存瓶颈明显再切MLA。注意：MLA的潜在维度d_c是超参，需要调优（太小则信息损失大，太大则省显存效果差）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只说“Qwen用了RoPE，DeepSeek用了MoE”，不展开具体参数或量化收益。 → ✅ 必须给出具体数字（如“GQA减少4倍KV cache”“MLA省75-85%显存”），并解释为什么这么做（如“长上下文场景下显存是瓶颈，计算量反而次要”）。
- ❌ 把DeepSeek-R1的GRPO和PPO混为一谈，说“GRPO就是PPO的变体”。 → ✅ 明确区分：PPO需要critic网络（显存翻倍），GRPO去掉critic，用组内相对奖励更新策略，本质是“无价值函数的策略梯度”。
- ❌ 只背论文结论，不提实际落地坑（如“DeepSeekMoE负载不均衡”）。 → ✅ 必须给出工程取舍：比如“辅助损失权重调参敏感，调大则专家利用率高但性能下降”。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“长上下文场景下推理效率”切入，比如“我在RAG系统里用Qwen2-72B做生成，发现32K上下文时显存爆了，后来通过GQA把KV cache减少4倍，才跑通”。展示你对论文创新点的实际验证。
- **如果你只做过传统NLP（如BERT微调）**：用“Attention变体”类比迁移，比如“BERT的MHA在长文本上显存爆炸，Qwen2的GQA和DeepSeek的MLA就是解决这个问题的，我理解它们本质是‘用分组或压缩来换显存’”。展示你从传统到LLM的迁移能力。
- **如果你是校招无项目**：聚焦“论文复现demo”，比如“我复现了DeepSeek-V2的MLA机制，在GPT-2上对比MHA，发现序列长度512时显存省60%，但生成质量下降1%”。展示动手能力和量化分析。

#### 7️⃣ 延伸阅读

- Qwen2 Technical Report: "Qwen2 Technical Report" (arXiv 2024)
- DeepSeek-V2: "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model" (arXiv 2024)
- DeepSeek-R1: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning" (arXiv 2025)
- GQA论文: "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints" (arXiv 2023)
- MLA机制详解博客: "Multi-head Latent Attention: A Deep Dive into DeepSeek-V2's KV Cache Optimization" (社区分析文章)

---
