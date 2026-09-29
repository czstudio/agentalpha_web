---
slug: enterprise-tk807
no: "1707"
title: "What is the difference between casual language modeling and masked language modeling"
question: "What is the difference between casual language modeling and masked language modeling"
excerpt: "面试官想看你是否真正理解两种预训练范式的本质差异，而非仅背出“GPT是自回归，BERT是自编码”。考察类型是概念辨析+工程取舍。刁钻点在于：你是否能说清为什么CLM用单向注意力、MLM用双向，以及这如何影响下游任务选择。"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4022
updated: "2026-09-29"
---

## What is the difference between casual language modeling and masked language modeling

#### 1️⃣ 考察意图

面试官想看你是否真正理解两种预训练范式的**本质差异**，而非仅背出“GPT是自回归，BERT是自编码”。考察类型是**概念辨析+工程取舍**。刁钻点在于：你是否能说清为什么CLM用单向注意力、MLM用双向，以及这如何影响下游任务选择。答好了能展示你对Transformer架构、训练效率、生成vs理解任务的深刻认知，以及在实际场景中选型的能力。

#### 2️⃣ 标准答

**核心差异：预测方向与注意力机制**

- **因果语言建模（CLM）**：自回归（autoregressive）范式。模型预测下一个token时，只能看到当前及之前的token，使用**因果掩码（causal mask）** 将未来token屏蔽。典型模型：GPT系列（GPT-2、GPT-3、GPT-4）、LLaMA、Mistral。
- **掩码语言建模（MLM）**：去噪自编码（denoising autoencoder）范式。随机将输入中15%的token替换为`[MASK]`，模型需基于**双向上下文**预测被遮住的token。典型模型：BERT、RoBERTa、ALBERT。

**训练目标与损失函数**

- **CLM**：最大化整个序列的似然 `P(x) = ∏ P(x_t | x_<t)`。损失函数是每个位置交叉熵的平均，但只计算非padding token。训练时每个token都参与预测，数据利用率高。
- **MLM**：最大化被mask token的预测概率 `P(x_masked | x_context)`。损失函数只计算被mask的token（通常占15%），其余token不贡献梯度。这导致训练效率较低——每步只更新15%的参数，需要更多步数收敛。

**注意力机制与信息流**

- **CLM**：单向。每个token只能attend到左侧token，无法看到右侧。这限制了模型在理解任务上的表现，因为“完形填空”需要双向信息。
- **MLM**：双向。每个token可以attend到序列中所有其他token（包括自身）。这使模型能捕捉完整上下文，在分类、NER等理解任务上表现优异。

**工程取舍与落地坑**

- **CLM的坑**：生成时需逐token推理，无法并行，推理速度慢。但可用**KV cache**优化——缓存已生成token的Key和Value矩阵，避免重复计算。实际部署时，KV cache占用显存随序列长度线性增长，长文本（如32K tokens）需用**FlashAttention**或**PagedAttention**（vLLM）管理。
- **MLM的坑**：预训练和微调不一致——预训练时用`[MASK]`，微调时没有。这导致**预训练-微调差距**。解法：**动态mask**（每次epoch重新mask）、**整词mask**（Whole Word Masking，如BERT-wwm）、**ERNIE**的短语mask。另外，MLM无法直接用于生成，需额外加解码器（如BART）或使用**Seq2Seq MLM**（T5）。

**应用场景选型**

- **CLM**：文本生成（对话、故事续写、代码生成）、零样本/少样本推理（in-context learning）。因为自回归性质天然适合生成。
- **MLM**：自然语言理解（情感分类、NER、关系抽取）、句子对任务（NLI、QA）。因为双向上下文能更好建模语义。
- **混合方案**：XLNet的**排列语言建模**（Permutation LM）——通过排列token顺序实现双向上下文，但保持自回归生成。T5的**Span Corruption**——mask连续片段并预测，结合了MLM和Seq2Seq。

**实际落地建议**：若任务需生成，选CLM；若只需理解，选MLM（或蒸馏版如DistilBERT）。若两者都要（如对话系统），考虑**Encoder-Decoder架构**（T5、BART）或**Prefix LM**（UniLM）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**预测方向**——CLM是自回归，从左到右预测下一个token，用因果掩码；MLM是去噪自编码，随机mask token后基于双向上下文预测。第二，**注意力机制**——CLM单向，MLM双向，这决定了CLM适合生成、MLM适合理解。第三，**工程取舍**——CLM推理慢但可优化KV cache，MLM有预训练-微调不一致问题需动态mask。总结一句：选型取决于任务——生成用CLM，理解用MLM，两者都要用Encoder-Decoder。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么BERT用15%的mask比例？换成30%会怎样？

> 15%是经验值，来自BERT论文消融实验。比例太低（如5%）模型学不到足够信号；比例太高（如30%）破坏句子结构，模型难以恢复。实际工程中，若数据噪声大（如用户评论），可适当提高至20%以增强鲁棒性；若数据干净（如维基百科），15%足够。注意：mask比例影响训练效率——每步只更新mask token，比例越高单步计算量越大，但收敛步数可能减少。

**追问 2**：CLM和MLM哪个训练更快？

> 从单步计算量看，CLM更快——每个token都贡献梯度，无需额外mask操作。但CLM需处理长序列依赖，梯度传播路径长，可能需更大batch size。从收敛步数看，MLM因只更新15%参数，通常需更多步数（约1.5-2倍）。实际中，GPT-3（CLM）用175B参数训练约3.14E23 FLOPs，BERT-Large（MLM）用340M参数训练约1.2E22 FLOPs——但模型规模不同，直接对比不公平。工程上，若资源有限，优先选MLM（模型小、易微调）；若追求生成质量，选CLM。

**追问 3**：如何用CLM做分类任务？

> 典型做法：在CLM模型后加线性分类头，取最后一个token的hidden state（如GPT-2）或平均池化。但CLM单向注意力会丢失后文信息，效果通常不如MLM。改进方案：**Prefix LM**（如UniLM）——前段用双向注意力，后段用单向；或**Prompt Tuning**——将分类任务转为文本生成（如“情感：正面/负面”），利用CLM的in-context learning能力。实际中，若必须用CLM做分类，推荐用GPT-3+few-shot prompt，而非微调。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“CLM和MLM只是训练目标不同，其他都一样” → ✅ 强调注意力机制差异是根本——CLM的因果掩码导致信息流单向，MLM的双向注意力让模型能看完整上下文，这直接影响下游任务表现。
- ❌ 说“MLM比CLM好，因为双向注意力更强” → ✅ 指出两者没有绝对优劣，取决于任务。CLM在生成任务上天然优势，MLM在理解任务上更强。混合方案（如XLNet）试图结合两者，但计算复杂度更高。
- ❌ 说“CLM推理时可以用teacher forcing加速” → ✅ teacher forcing是训练技巧（用真实token而非预测token），推理时不能用，因为真实token不可知。推理加速靠KV cache、FlashAttention、投机解码（speculative decoding）等。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从检索增强生成角度切入——RAG中生成器通常用CLM（如LLaMA），但检索器可用MLM（如BERT）做query编码。对比两种范式在RAG pipeline中的角色：CLM负责生成，MLM负责理解query和文档。
- **如果你只做过传统NLP**：用序列标注任务类比——CLM像从左到右的CRF（只依赖前文），MLM像双向LSTM+CRF（依赖全文）。强调传统方法中双向信息的重要性，以及预训练范式如何继承这一设计。
- **如果你是校招无项目**：聚焦论文复现——用PyTorch实现一个简化版CLM（如mini-GPT）和MLM（如mini-BERT），对比训练损失曲线和下游任务（如IMDb分类）准确率。展示你对Transformer源码（如Hugging Face Transformers）的理解。
- 《BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding》
- 《Language Models are Unsupervised Multitask Learners》（GPT-2论文）
- 《XLNet: Generalized Autoregressive Pretraining for Language Understanding》
- 《Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer》（T5论文）
- Hugging Face Blog: “How to train a language model from scratch” (CLM vs MLM实践)

---
