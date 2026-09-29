---
slug: basics-tk530
no: "1430"
title: "架构对比:当前主流LLM(如 Llama、Qwen、ChatGLM)在架构设计上有何异同"
question: "架构对比:当前主流LLM(如 Llama、Qwen、ChatGLM)在架构设计上有何异同"
excerpt: "这道题是典型的“架构对比+工程取舍”型问题，面试官想看你是否真正理解主流LLM的设计哲学，而非死记硬背参数。刁钻点在于：Llama、Qwen、ChatGLM都基于Transformer Decoder-only，但细节差"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4400
updated: "2026-09-29"
---

## 架构对比:当前主流LLM(如 Llama、Qwen、ChatGLM)在架构设计上有何异同

#### 1️⃣ 考察意图

这道题是典型的“架构对比+工程取舍”型问题，面试官想看你是否真正理解主流LLM的设计哲学，而非死记硬背参数。刁钻点在于：Llama、Qwen、ChatGLM都基于Transformer Decoder-only，但细节差异（如注意力变体、位置编码、训练目标）直接决定了推理效率、长文本能力和微调成本。答好了能展示你对模型选型的硬实力——比如为什么Llama用GQA而ChatGLM用Prefix Decoder，以及这些选择在部署时如何影响显存和延迟。

#### 2️⃣ 标准答

**共同基础**：三者均采用Transformer Decoder-only架构，但核心差异体现在注意力机制、位置编码、激活函数和训练目标上。

**1. Llama系列（Llama 2/3）**

- **注意力**：Grouped Query Attention（GQA），将Key-Value头分组（如8组），Query头独立（32个）。相比MHA（Multi-Head Attention），GQA在推理时减少KV缓存大小约4倍，显存占用降低30%以上；相比MQA（Multi-Query Attention），GQA保留更多表达能力，避免质量下降。
- **位置编码**：Rotary Position Embedding（RoPE），通过旋转矩阵编码相对位置，支持外推至更长序列（如Llama 3的8K上下文）。RoPE无需学习位置参数，训练时更稳定。
- **激活函数**：SwiGLU（Swish-Gated Linear Unit），即`SwiGLU(x) = Swish(xW) ⊙ (xV)`，相比ReLU或GELU，SwiGLU在相同参数量下提升约2%的困惑度（perplexity），但计算量增加约1.5倍。
- **归一化**：RMSNorm（Root Mean Square Normalization），去掉LayerNorm的均值中心化，减少计算开销约15%，且不影响收敛。
- **实际坑**：Llama 2的预训练数据中英文占比高，直接微调中文任务时，需加入中文语料继续预训练（如Llama-Chinese项目），否则中文生成质量差。

**2. Qwen系列（Qwen 2/2.5）**

- **注意力**：同样使用GQA，但Qwen 2.5将KV头分组数设为8（与Llama 3一致），并引入YARN（Yet Another RoPE extensioN）机制，支持动态扩展上下文至128K。YARN通过缩放RoPE的旋转频率，避免长序列时位置编码退化。
- **位置编码**：RoPE + 特殊token（如`<|im_start|>`和`<|im_end|>`）标记多轮对话。Qwen在预训练时直接使用32K上下文窗口，而非像Llama那样通过微调扩展，因此长文本任务（如文档摘要）表现更稳定。
- **激活函数**：SwiGLU，与Llama一致。
- **归一化**：Pre-RMSNorm（前置归一化），将RMSNorm放在注意力/FFN之前，相比Post-Norm（如原始Transformer），Pre-Norm在深层网络中梯度更稳定，训练时允许更高学习率（如3e-4 vs 1e-4）。
- **实际坑**：Qwen的tokenizer基于BPE，但中文词表大小约15万（Llama仅3.2万），导致中文推理时token数减少约40%，但显存占用因embedding层增大而上升。部署时需权衡词表大小与推理速度。

**3. ChatGLM系列（GLM-130B / ChatGLM 3）**

- **注意力**：Prefix Decoder（GLM架构），结合自回归（从左到右）与填空任务（如Span Corruption）。具体地，输入分为前缀（Prefix）和生成部分，前缀内可双向注意力（类似Encoder），生成部分仅单向注意力。这允许模型在微调时同时处理NLU（如分类）和NLG（如对话）任务，但推理时需额外处理前缀长度，增加约10%的延迟。
- **位置编码**：RoPE，但ChatGLM 3引入2D RoPE，对前缀和生成部分分别编码，避免位置混淆。
- **激活函数**：GELU（Gaussian Error Linear Unit），相比SwiGLU，GELU计算更简单（无门控），但相同参数量下困惑度略高（约0.5%）。ChatGLM选择GELU可能是为了平衡训练稳定性与性能。
- **归一化**：DeepNorm（深度归一化），在Post-Norm基础上缩放残差连接，允许训练更深层（如130B参数）而不梯度爆炸。DeepNorm的缩放因子α=0.87（经验值），相比RMSNorm，DeepNorm在超大模型上更稳定。
- **实际坑**：ChatGLM的Prefix Decoder在生成时，前缀部分需缓存KV，导致显存占用比纯Decoder-only高约20%。若部署在低显存GPU（如A100 40G），需限制前缀长度（如512 token以内）。

**异同总结**：

- **共同点**：均使用RoPE位置编码、预训练+微调范式、SwiGLU或GELU激活函数。
- **差异**：Llama和Qwen采用纯Decoder-only + GQA，侧重推理效率；ChatGLM采用Prefix Decoder，侧重多任务统一。Qwen通过大词表和长上下文预训练优化中文场景；Llama通过GQA和RMSNorm平衡性能与成本；ChatGLM通过DeepNorm支持超大模型。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从注意力机制、位置编码、训练目标三个层面回答。注意力层面，Llama和Qwen用GQA减少KV缓存，ChatGLM用Prefix Decoder支持双向注意力；位置编码层面，三者都用RoPE，但Qwen通过YARN扩展至128K上下文；训练目标层面，Llama和Qwen是纯自回归，ChatGLM结合填空任务。总结一句：选型取决于场景——追求推理效率选Llama/Qwen，需要多任务统一选ChatGLM。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么Llama不用Prefix Decoder而用纯Decoder-only？

> 纯Decoder-only在推理时只需缓存单向KV，显存占用更低（约减少20%），且生成速度更快（无前缀双向注意力开销）。Prefix Decoder虽然支持NLU任务，但实际中NLU任务（如分类）可通过微调Decoder-only的最后一层实现，性能差距在1%以内。因此，Llama选择牺牲多任务灵活性，换取推理效率——这在对话场景（如ChatGPT）中更关键。

**追问 2**：Qwen的YARN机制如何实现长上下文扩展？和Llama的NTK-aware RoPE有何区别？

> YARN通过动态缩放RoPE的旋转频率：对短序列（<训练长度）使用原始频率，对长序列按比例放大频率，避免位置编码退化。NTK-aware RoPE则基于神经正切核理论，调整频率的指数衰减。区别在于：YARN在扩展至128K时，困惑度仅上升0.3%（Qwen 2论文数据），而NTK-aware在128K时上升约1.5%。YARN的代价是需额外计算缩放因子，增加约5%的推理延迟。

**追问 3**：ChatGLM的DeepNorm和RMSNorm在训练稳定性上具体差多少？

> DeepNorm通过缩放残差连接（α=0.87）和初始化权重（β=0.87），允许训练130B参数模型时梯度范数稳定在1.0左右。RMSNorm在100B以上模型时，梯度范数可能波动至10以上，导致训练崩溃。但DeepNorm的计算量比RMSNorm高约10%（需额外缩放操作），且在小模型（<10B）上优势不明显。因此，ChatGLM选择DeepNorm是为了支撑超大模型，而Llama用RMSNorm是为了轻量化。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“ChatGLM是Encoder-Decoder架构” → ✅ 正确说法是“Prefix Decoder（GLM架构），前缀部分双向注意力，生成部分单向注意力，本质仍是Decoder-only变体”。
- ❌ 说“Llama用GQA是因为它比MHA更准” → ✅ 正确说法是“GQA在推理时减少KV缓存，显存占用降低30%，且质量接近MHA；MHA虽然更准，但显存成本高，不适合大规模部署”。
- ❌ 说“Qwen的32K上下文是微调出来的” → ✅ 正确说法是“Qwen在预训练阶段直接使用32K上下文窗口，通过YARN机制动态扩展，而非像Llama那样先预训练再微调扩展”。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从长上下文角度切入，对比Qwen（32K预训练）和Llama（8K预训练+微调扩展）在检索增强时的性能差异，强调YARN对长文档检索的稳定性。
- **如果你只做过传统NLP**：用“模型选型”类比迁移，比如“Llama的GQA类似分组卷积（Group Conv），减少计算量；ChatGLM的Prefix Decoder类似BERT+GPT的混合，适合多任务”。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现过Llama 2的GQA实现，发现KV头分组数设为8时，推理速度提升2倍，质量下降<0.5%”，并提及RoPE的数学推导。

#### 7️⃣ 延伸阅读

- Llama 2: Open Foundation and Fine-Tuned Chat Models (2023)
- Qwen 2.5: A Series of Large Language Models for Diverse Tasks (2024)
- GLM-130B: An Open Bilingual Pre-trained Model (2022)
- RoFormer: Enhanced Transformer with Rotary Position Embedding (2021)
- GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (2023)

---
