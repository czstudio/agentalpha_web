---
slug: enterprise-tk467
no: "1367"
title: "Prefix LM、Causal LM、Encoder-Decoder 三类架构的适用场景与优缺点"
question: "Prefix LM、Causal LM、Encoder-Decoder 三类架构的适用场景与优缺点"
excerpt: "面试官想看你是否真正理解 Transformer 架构的“信息流”设计，而非死记硬背定义。这是一道工程取舍 + 系统设计题，刁钻点在于：Causal LM 看似“单向”却统治了生成任务，Prefix LM 看似“双向”却"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5170
updated: "2026-09-29"
---

## Prefix LM、Causal LM、Encoder-Decoder 三类架构的适用场景与优缺点

#### 1️⃣ 考察意图

面试官想看你是否真正理解 Transformer 架构的“信息流”设计，而非死记硬背定义。这是一道**工程取舍 + 系统设计**题，刁钻点在于：Causal LM 看似“单向”却统治了生成任务，Prefix LM 看似“双向”却很少单独部署，Encoder-Decoder 参数量大但某些场景不可替代。答好了能展示你对模型选择、训练效率、推理延迟的权衡能力，以及是否关注过 GPT、T5、UniLM 等论文的细节。

#### 2️⃣ 标准答

**核心区别：注意力掩码（Attention Mask）决定了信息流动方向。**

- **Causal LM（自回归，如 GPT 系列）**
- **定义**：使用三角掩码（causal mask），每个 token 只能看到自己和左侧 token。
- **适用场景**：文本生成（对话、代码补全、故事续写）、零样本/少样本推理（in-context learning）。
- **优点**：
- 训练和推理结构一致，支持 KV Cache 加速，推理延迟低（O(n) 复杂度）。
- 扩展性好，GPT-3 175B、Llama 70B 均基于此，Scaling Law 已验证。
- **缺点**：
- 无法利用右侧上下文，在填空、摘要、分类等需要双向理解的任务上表现差（例如“今天天气___，记得带伞”需要看“带伞”才能填“下雨”）。
- **实际坑**：在长文本生成时，Causal LM 容易“遗忘”早期内容，需要配合 RoPE 或 ALiBi 位置编码缓解；但 RoPE 在长序列推理时需注意 NTK-aware scaling，否则 OOD 位置编码会崩。
- **Prefix LM（前缀语言模型，如 UniLM、GLM）**
- **定义**：输入分两段——前缀（prefix）用双向注意力，后缀（suffix）用单向注意力。掩码是“上三角 + 前缀全可见”。
- **适用场景**：文本填空（Cloze）、摘要生成、对话状态追踪（DST）。
- **优点**：
- 前缀部分能双向建模，适合需要理解全局的任务（如摘要：先读全文，再生成摘要）。
- 参数量与 Causal LM 相同，但双向能力更强。
- **缺点**：
- 训练复杂：需要精心设计掩码矩阵，且前缀长度是超参，调不好会浪费双向能力。
- 推理时无法复用 KV Cache（前缀长度变化），延迟比 Causal LM 高 20-30%。
- 实际落地少：Google 的 T5 和 PaLM 都放弃了 Prefix LM，转向 Encoder-Decoder 或纯 Decoder-only。
- **工程取舍**：Prefix LM 本质是“折中方案”，但实践中双向能力不如 Encoder-Decoder，单向生成不如 Causal LM，所以很少单独部署。UniLM 论文中在 SQuAD 2.0 上比 BERT 好，但生成任务被 GPT 碾压。
- **Encoder-Decoder（编码器-解码器，如 T5、BART）**
- **定义**：编码器用全双向注意力（full attention），解码器用 causal mask，通过 cross-attention 连接。
- **适用场景**：序列到序列任务（翻译、文本摘要、问答）、需要强对齐的任务（如语音识别、图像描述）。
- **优点**：
- 编码器能充分理解输入，解码器专注生成，适合输入输出长度差异大的场景。
- Cross-attention 让解码器能“聚焦”输入关键部分，翻译任务 BLEU 比 Decoder-only 高 2-3 点（T5 vs GPT-2）。
- **缺点**：
- 参数量大（编码器 + 解码器），训练和推理成本高（T5-11B 比 GPT-3 175B 小但训练慢 2x）。
- 推理延迟高：解码器每步需重新计算 cross-attention，无法像 Causal LM 那样纯自回归。
- **实际坑**：在长文本摘要（如论文摘要）中，编码器输入长度受限（T5 默认 512 token），需要分块处理，但分块后 cross-attention 会丢失全局信息。解法是用 Longformer 或 BigBird 的稀疏注意力替代全双向。

**选择依据**：

- **生成任务 + 低延迟**：Causal LM（GPT、Llama）。
- **理解 + 生成混合**：Encoder-Decoder（T5、BART）。
- **填空/摘要 + 资源受限**：Prefix LM（UniLM）可作为轻量替代，但建议优先考虑 Encoder-Decoder 的蒸馏版（DistilT5）。

**最新趋势**：Decoder-only 架构（Causal LM）因扩展性、推理效率、in-context learning 能力成为主流，GPT-4、Claude、Llama 均采用。Encoder-Decoder 在翻译、代码生成等强对齐任务中仍有优势，但 Google 的 PaLM 和 Gemini 已转向 Decoder-only + 特殊掩码（如 PaLM 的“non-causal” prefix）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从架构设计、适用场景、工程取舍三个层面回答。架构上，Causal LM 用三角掩码只做自回归生成，Prefix LM 用前缀双向+后缀单向做填空，Encoder-Decoder 用编码器全双向+解码器自回归做序列转换。场景上，生成选 Causal LM，翻译/摘要选 Encoder-Decoder，填空选 Prefix LM。取舍上，Causal LM 推理快但双向弱，Encoder-Decoder 效果好但参数量大，Prefix LM 折中但落地少。总结一句：当前趋势是 Decoder-only 为主，但 Encoder-Decoder 在强对齐任务中不可替代。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 GPT 系列（Causal LM）在翻译任务上比 T5（Encoder-Decoder）差？你如何改进？

> 核心原因是 Causal LM 没有 cross-attention，无法显式对齐输入和输出。翻译需要“源语言词 → 目标语言词”的映射，Causal LM 只能靠隐式注意力，容易丢失细节。改进方法：1）在输入中加入语言标识（如“Translate English to French: ”），利用 in-context learning 缓解；2）使用 Prefix LM 变体，将源语言作为前缀（双向），目标语言作为后缀（单向）；3）如果资源允许，用 Encoder-Decoder 蒸馏一个 Decoder-only 模型（如 DistilBART → GPT-2 微调），但 BLEU 仍会掉 1-2 点。

**追问 2**：Prefix LM 的“前缀长度”如何选择？有没有经验值？

> 前缀长度取决于任务。对于摘要，前缀是输入文本，长度通常为 512-1024 token；对于填空，前缀是上下文，长度可短至 32 token。经验值：UniLM 论文中在 SQuAD 2.0 上使用 384 token 前缀，在 CNN/DailyMail 摘要上使用 512 token。工程上，建议用动态前缀：训练时随机截取 50%-100% 输入作为前缀，推理时用完整输入。注意：前缀太长会导致训练时双向注意力计算量增大（O(n^2)），需配合 FlashAttention 优化。

**追问 3**：Encoder-Decoder 的 cross-attention 为什么比 Decoder-only 的 self-attention 更耗显存？

> Cross-attention 的 Q 来自解码器（长度 m），K/V 来自编码器（长度 n），计算复杂度 O(mn)，且 K/V 无法像 self-attention 那样复用 KV Cache（因为编码器输出固定）。而 Decoder-only 的 self-attention 是 O(m^2)，且 KV Cache 可缓存历史 token。例如，翻译 100 token 的句子，Encoder-Decoder 的 cross-attention 计算量是 100100=10k，而 Decoder-only 的 self-attention 是 100^2/2=5k（三角掩码减半）。显存上，cross-attention 需要存储编码器所有 K/V（1002head_dim），而 Decoder-only 只需缓存当前步的 K/V。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Causal LM 只能生成，不能做理解任务” → ✅ 正确说法：Causal LM 通过 in-context learning 可以做分类、问答等理解任务（如 GPT-3 在 BoolQ 上达到 76%），但需要大量示例，且效果不如双向模型。理解任务首选 Encoder-only（BERT）或 Encoder-Decoder。
- ❌ 说“Prefix LM 比 Encoder-Decoder 好，因为参数量少” → ✅ 正确说法：Prefix LM 参数量少但双向能力弱于 Encoder-Decoder（编码器全双向 vs 前缀部分双向），且训练复杂。实际落地中，Encoder-Decoder 的蒸馏版（如 DistilT5）参数量与 Prefix LM 相当，但效果更好。
- ❌ 说“Encoder-Decoder 已经过时，Decoder-only 是唯一选择” → ✅ 正确说法：Decoder-only 在生成任务上占优，但翻译、语音识别等强对齐任务中，Encoder-Decoder 的 cross-attention 仍不可替代（如 Google 的 T5 在 WMT 翻译上比 GPT-3 高 3 BLEU）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”架构切入，说明 Causal LM 适合生成阶段（如 Llama 做生成），Encoder-Decoder 适合重写阶段（如 T5 做 query 改写），Prefix LM 可做检索结果的双向理解（如 UniLM 做段落排序）。
- **如果你只做过传统 NLP**：用“序列标注 vs 序列生成”类比：Causal LM 像从左到右写文章，Encoder-Decoder 像先读全文再写摘要，Prefix LM 像先看开头再填空。强调你理解注意力掩码如何影响任务适配。
- **如果你是校招无项目**：聚焦论文复现：读过 GPT-2、T5、UniLM 论文，能画出注意力掩码图，并对比它们在 GLUE 和 CNN/DailyMail 上的指标（如 T5 在摘要上 ROUGE-L 比 GPT-2 高 2-3 点）。建议在 Colab 上用 Hugging Face 跑一个对比 demo。
- 《Attention Is All You Need》—— Transformer 原始论文，理解 Encoder-Decoder 基础
- 《Language Models are Unsupervised Multitask Learners》（GPT-2）—— Causal LM 的扩展性证明
- 《Unified Language Model Pre-training for Natural Language Understanding and Generation》（UniLM）—— Prefix LM 的掩码设计
- 《Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer》（T5）—— Encoder-Decoder 的工程实践
- 《Scaling Laws for Neural Language Models》—— Decoder-only 架构的 Scaling Law 分析

---
