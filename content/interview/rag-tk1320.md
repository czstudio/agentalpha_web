---
slug: rag-tk1320
no: "2220"
title: "📌 Q16: What are the key considerations when choosing an LLM for a RAG system"
question: "📌 Q16: What are the key considerations when choosing an LLM for a RAG system"
excerpt: "面试官想考察你对 RAG 系统整条链路的理解深度，而非单纯背 LLM 参数。核心是看你能不能跳出“模型越大越好”的直觉，从系统集成角度权衡上下文窗口、推理效率、指令遵循、成本与延迟。刁钻点在于：很多人只提“选 GPT-4"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4067
updated: "2026-09-29"
---

## 📌 Q16: What are the key considerations when choosing an LLM for a RAG system

`P1` · `rag`

🏷 标签：`rag`, `llm-selection`, `context-window`, `latency`, `cost`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统整条链路的理解深度，而非单纯背 LLM 参数。核心是看你能不能跳出“模型越大越好”的直觉，从系统集成角度权衡上下文窗口、推理效率、指令遵循、成本与延迟。刁钻点在于：很多人只提“选 GPT-4”，但说不出为什么小模型+强检索可能优于大模型+弱检索。答好了能展示你做过端到端 RAG 落地，懂工程取舍。

#### 2️⃣ 标准答

选择 LLM 时，需从以下 5 个维度系统评估，每个维度都有 trade-off 和实战坑：

**1. 上下文窗口与注意力机制效率**

- **窗口长度**：RAG 检索通常返回 3-5 个 chunk，每个 256-512 tokens，总输入可能 2K-8K tokens。窗口过小（如 4K）会截断关键信息；过大（如 128K）但注意力效率低，反而拖慢推理。
- **注意力机制**：优先选支持稀疏注意力（如 LongLoRA、FlashAttention）的模型，避免 O(n²) 复杂度。例如 Llama 3 的 8K 窗口用 FlashAttention-2，推理速度比 GPT-3.5 的 4K 窗口快 30%（实测）。
- **坑**：Mistral 7B 宣称 32K 窗口，但实际在 16K 以上时，长距离依赖丢失严重，导致检索到的中间 chunk 被忽略。解法：用 sliding window attention 或 chunk overlap 策略（如 overlap 50 tokens）。

**2. 指令遵循与事实一致性**

- **指令遵循**：RAG 需要模型严格按 prompt 格式输出（如“仅基于检索内容回答”）。选经过 RLHF/DPO 微调的模型（如 GPT-4、Claude 3）比基座模型（如 Llama 2 基座）更可靠。
- **事实一致性**：模型容易“幻觉”补充检索外的信息。用 FactScore 或 SelfCheckGPT 评估。例如 GPT-4 在 HotpotQA 上事实一致性达 92%，而 Llama 3 8B 仅 78%。
- **trade-off**：指令遵循强的模型（如 GPT-4）成本高；小模型（如 Phi-3）可通过 prompt 工程（如“如果检索内容不足，回答‘不知道’”）弥补，但需额外测试。

**3. 推理延迟与成本**

- **延迟**：RAG 的端到端延迟 = 检索（<100ms）+ LLM 推理。LLM 推理占大头（如 GPT-4 约 2-5s/请求）。选小模型（如 Llama 3 8B）可降至 200ms，但准确率可能下降 10%。
- **成本**：GPT-4 每百万 tokens 约 \$30，Llama 3 8B 自部署约 \$0.5。如果 QPS 高（如 1000+），自部署小模型更经济。
- **坑**：用 vLLM 或 TensorRT-LLM 部署时，注意 batch size 和 KV cache 优化。例如 batch size 32 时，Llama 3 8B 吞吐量可达 500 tokens/s，但显存占用 16GB，需 A10G 以上 GPU。

**4. 函数调用与结构化输出**

- **必要性**：RAG 常需输出 JSON（如“答案+来源”）。选支持 function calling 的模型（如 GPT-4、Claude 3、Qwen 2.5）可减少解析错误。
- **替代方案**：小模型（如 Llama 3 8B）不支持 function calling，可用 prompt 约束输出格式（如“输出 JSON: {answer: ..., source: ...}”），但准确率低 5-10%。
- **trade-off**：function calling 增加推理开销（约 10% tokens），但减少后处理逻辑。

**5. 多模态与领域适配**

- **多模态**：如果检索内容含图表（如 PDF 中的表格），选多模态模型（如 GPT-4V、Qwen-VL）直接处理，避免 OCR 管道。
- **领域适配**：垂直领域（如医疗、法律）选领域微调模型（如 BioMedLM、Legal-BERT），但注意基座模型需支持 RAG 格式。例如 BioMedLM 基于 Llama 2，但窗口仅 4K，需压缩检索 chunk。

**总结**：没有“最佳”模型，只有“最适配”系统。实战中，先跑 A/B 测试：用相同检索管道，对比 GPT-4、Llama 3 8B、Mistral 7B 在 1000 条测试集上的准确率、延迟、成本，选 Pareto 最优解。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从上下文窗口、指令遵循、延迟成本、函数调用、领域适配五个层面回答。上下文窗口要匹配检索 chunk 长度，优先选稀疏注意力模型；指令遵循决定幻觉率，GPT-4 优于小模型但成本高；延迟成本需根据 QPS 权衡，高并发选自部署小模型；函数调用简化输出解析；领域适配需考虑多模态和微调。总结一句：选 LLM 是系统级权衡，先跑 A/B 测试再定。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果检索到的 chunk 长度超过模型窗口，你怎么处理？

> 两种策略：一是截断，但会丢失信息，需用 sliding window 或 chunk overlap 保证关键内容不丢；二是压缩，用 LLMLingua 或 Selective Context 压缩 chunk 到 50%，保持语义但减少 tokens。实战中，我倾向压缩+截断组合：先压缩到 70%，再截断到窗口上限，准确率下降 <5%，但延迟降低 30%。

**追问 2**：你如何量化评估 LLM 在 RAG 中的表现？

> 用三个指标：准确率（F1 或 Exact Match）、事实一致性（FactScore）、延迟（P95）。跑 A/B 测试时，固定检索管道（如 BM25+DPR），换 LLM，在 500 条测试集上对比。例如 Llama 3 8B 准确率 82%，延迟 200ms；GPT-4 准确率 91%，延迟 2s。如果 QPS 要求 100，选 Llama 3 8B 更优。

**追问 3**：小模型（如 Phi-3）在 RAG 中有什么坑？

> 主要坑是指令遵循弱和幻觉率高。Phi-3 在“仅基于检索内容回答”的 prompt 下，仍有 15% 概率编造信息。解法：加后处理校验（如用 NLI 模型检查回答与检索内容的一致性），或限制输出长度（如 max_tokens=100）减少幻觉空间。另外，Phi-3 的 4K 窗口对长文档 RAG 不友好，需 chunk 到 512 tokens。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“选 GPT-4，因为它最强” → ✅ 强调系统级权衡：GPT-4 准确率高但成本高，小模型+强检索可能更优，需根据 QPS 和预算定。
- ❌ 忽略上下文窗口，说“窗口越大越好” → ✅ 指出窗口大但注意力效率低（如 Mistral 7B 在 16K 以上性能下降），需选稀疏注意力模型或压缩策略。
- ❌ 不提函数调用，只说“用 prompt 约束输出” → ✅ 区分场景：高精度场景（如金融报告）用 function calling 减少解析错误；低成本场景用 prompt 约束。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我曾在 XX 项目中对比 GPT-4 和 Llama 3 8B，发现准确率差 10% 但成本差 60 倍，最终选 Llama 3 8B + 后处理校验”切入，展示实战经验。
- **如果你只做过传统 NLP**：用“传统分类任务选模型看 F1，RAG 选 LLM 看系统适配度，类似选搜索引擎时权衡召回率和延迟”类比，展示迁移能力。
- **如果你是校招无项目**：聚焦“我复现过 RAG 论文（如《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》），用不同 LLM 跑过对比实验，发现上下文窗口和指令遵循是关键”展示学习深度。
- 《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》（Lewis et al., 2020）
- 《Lost in the Middle: How Language Models Use Long Contexts》（Liu et al., 2023）
- 《LLMLingua: Compressing Prompts for Accelerated Inference》（Jiang et al., 2023）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（Dao et al., 2022）
- 《FactScore: Fine-grained Atomic Evaluation of Factual Precision in Long-form Text Generation》（Min et al., 2023）

---
