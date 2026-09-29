---
slug: enterprise-tk159
no: "1059"
title: "What are different ways you can define stopping criteria in large language model"
question: "What are different ways you can define stopping criteria in large language model"
excerpt: "面试官想考察你对 LLM 解码过程的底层理解，而非简单背诵参数名。这题是典型的工程取舍 + 系统设计类问题：停止条件看似简单，但实际部署中直接决定生成质量、成本和安全。刁钻点在于：候选人能否区分“硬停止”（如 max_t"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4138
updated: "2026-09-29"
---

## What are different ways you can define stopping criteria in large language model

#### 1️⃣ 考察意图

面试官想考察你对 LLM 解码过程的底层理解，而非简单背诵参数名。这题是典型的**工程取舍 + 系统设计**类问题：停止条件看似简单，但实际部署中直接决定生成质量、成本和安全。刁钻点在于：候选人能否区分“硬停止”（如 max_tokens）和“软停止”（如概率阈值、重复检测）的适用场景，并解释为什么 HuggingFace 的 `eos_token_id` 和 `stop_strings` 在长上下文下表现不同。答好了能展示你对生成流程的掌控力，以及处理过真实生产环境中的“无限生成”或“截断不完整句”等坑。

#### 2️⃣ 标准答

停止条件（stopping criteria）本质是解码循环中的**终止决策函数**，按控制粒度可分为四类：

- **硬长度限制**：最粗暴但最安全。`max_new_tokens` 控制生成 token 数，`max_length` 控制输入+输出总长。**坑**：在流式输出中，如果只设 `max_new_tokens`，模型可能在句子中间被截断，导致下游解析失败。**解法**：配合 `min_new_tokens` 保底，或使用 `truncation_strategy='do_not_truncate'` 结合后处理。
- **停止序列（Stop Sequences）**：指定 token 序列（如 `[EOS]`、`[SEP]`、`\n\n`）触发停止。HuggingFace 的 `eos_token_id` 是单 token 匹配，`stop_strings` 是多 token 匹配。**工程取舍**：`stop_strings` 更灵活（可匹配“```”这种多 token 序列），但每次解码后需做子串匹配，增加 O(L²) 开销。**实际落地的坑**：在 beam search 下，停止序列可能出现在不同 beam 的不同位置，需在 beam 合并前统一检查，否则会漏掉。
- **概率阈值（Probability Threshold）**：当生成 token 的 softmax 概率低于阈值（如 0.1）时停止。常用于**不确定性控制**：如果模型对下一个 token 很犹豫（概率分布平坦），说明可能已偏离主题。**为什么这么做**：避免模型在低置信区域“胡编”，尤其适合事实性任务（如摘要、翻译）。**坑**：阈值设太严（如 0.5）会导致过早停止，设太松（如 0.01）则几乎无效。**解法**：动态阈值——用 top-p 的累积概率作为参考，当 top-p 超过 0.95 但最大概率仍低于 0.2 时停止。
- **重复惩罚（Repetition Penalty）**：检测重复 n-gram 并强制停止或惩罚。常用 `no_repeat_ngram_size`（如设为 3，禁止出现重复三元组）。**工程取舍**：惩罚会改变概率分布，可能破坏连贯性（如“I think, therefore I am”中的“I”重复是合理的）。**解法**：用 `repetition_penalty`（如 1.2）做软惩罚，而非硬停止；或结合 `encoder_repetition_penalty` 对输入中的 token 也施加惩罚，防止模型复述输入。
- **自定义回调（Custom Callback）**：基于外部条件停止，如时间限制（`timeout=30s`）、API 成本（`max_cost=0.01 USD`）、内容安全（检测到敏感词）。**实现方式**：在解码循环中插入钩子函数，每次生成后检查条件。**坑**：回调函数需是纯函数且无副作用，否则在多线程解码中会死锁。**解法**：用 `transformers.StoppingCriteria` 子类，重写 `__call__` 方法，并在 `should_stop` 中返回布尔值。

**总结**：生产环境通常组合使用——硬长度做兜底，停止序列做精确控制，概率阈值做质量门控，重复惩罚做防复读，自定义回调做安全熔断。顺序也很重要：先检查停止序列（最快），再检查概率阈值（中等），最后检查重复惩罚（最慢）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从硬停止、软停止、自定义回调三个层面回答。硬停止包括 max_tokens 和停止序列，用于兜底和精确控制；软停止包括概率阈值和重复惩罚，用于质量门控；自定义回调则绑定外部条件如时间或成本。实际部署中，我会按‘停止序列→概率阈值→重复惩罚→硬长度’的顺序检查，并注意 beam search 下停止序列的跨 beam 同步问题。总结一句：停止条件不是单一参数，而是一套分层决策系统。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：在流式输出（streaming）中，如何实现停止条件？

> 流式输出下，token 是逐个返回的，不能等完整序列再检查。**解法**：维护一个滑动窗口（如 5 个 token），每次新 token 到来时，检查窗口内是否匹配停止序列。如果匹配，立即终止流并丢弃窗口内剩余 token。**坑**：如果停止序列跨多个 chunk（如“```”被拆成“`”和“`”），需用状态机记录部分匹配。**工程取舍**：窗口大小影响延迟——窗口越大，匹配越准但内存开销越高；窗口太小，可能漏匹配。实践中窗口设为停止序列最大长度 + 2 即可。

**追问 2**：如果模型生成时概率一直很高（如 0.99），但内容明显在复读，怎么停止？

> 概率阈值失效，因为复读时概率也很高。**解法**：结合重复惩罚的软停止——检测最近 50 个 token 的 n-gram 重复率（如三元组重复比例），当重复率超过 0.3 时，强制降低重复 token 的 logit（如乘以 0.8），如果连续 3 步仍无改善，则触发停止。**为什么这么做**：直接硬停止会破坏生成，软惩罚给了模型一次“自救”机会。**实际落地的坑**：重复率阈值需根据任务调——代码生成中重复是正常的（如循环），阈值应设到 0.6；故事生成中则设 0.2。

**追问 3**：在分布式推理（如 vLLM、TensorRT-LLM）中，停止条件如何实现？

> 分布式推理中，多个 GPU 并行生成不同序列，停止条件需在**调度器层面**统一管理。**解法**：每个序列维护一个状态机（如 `ACTIVE`、`STOPPED`、`FINISHED`），调度器在每次迭代前检查所有序列的状态。**坑**：停止条件检查本身有开销，如果每个序列都做子串匹配，会成为瓶颈。**解法**：用前缀树（Trie）存储所有停止序列，每次新 token 生成后，在 Trie 中查找，O(1) 匹配。**工程取舍**：Trie 的内存开销与停止序列数量成正比，生产环境通常限制停止序列不超过 10 个。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “停止条件就是设个 max_tokens 和 eos_token_id 就行。” → ✅ “max_tokens 是兜底，但会截断句子；eos_token_id 是单 token 匹配，无法处理多 token 序列如换行符。生产环境需要组合使用，并注意 beam search 下的跨 beam 同步。”
- ❌ “概率阈值设 0.1 就够用了。” → ✅ “概率阈值需动态调整：在事实性任务中设 0.3，在创意生成中设 0.05。且需结合 top-p 做参考，避免过早停止。”
- ❌ “重复惩罚用 no_repeat_ngram_size=3 就能防复读。” → ✅ “硬禁止会破坏合理重复（如‘I think’中的‘I’），应改用 repetition_penalty 做软惩罚，并配合重复率检测做软停止。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“停止条件在检索增强生成中的特殊作用”切入——当检索结果为空时，概率阈值应调低（如 0.05）让模型自由生成，而非硬停止；当检索结果充分时，停止序列应包含“```”等格式标记，确保输出结构化。
- **如果你只做过传统 NLP**：用“机器翻译中的 EOS 检测”类比——传统 Seq2Seq 只有单 token 停止，LLM 需要多 token 匹配和概率门控。强调你理解从“硬停止”到“软停止”的演进逻辑。
- **如果你是校招无项目**：聚焦“HuggingFace StoppingCriteria 接口实现”——展示你写过自定义回调类，并在文本摘要任务中对比过不同停止策略对 ROUGE 分数的影响。可以提你复现过论文《Stopping Criteria for Neural Machine Translation》中的动态阈值方法。
- 《The Curious Case of Neural Text Degeneration》（Holtzman et al., 2020）——讨论概率阈值与重复惩罚的关系
- HuggingFace Transformers 文档：`StoppingCriteria` 类源码及 `generate` 方法参数详解
- 《Efficient Beam Search with Stopping Criteria for LLM Inference》（2024, arXiv）——分布式推理下的停止条件优化
- vLLM 官方文档：`SamplingParams` 中的 `stop` 和 `stop_token_ids` 参数实现
- 《A Survey of LLM Decoding Strategies》（2024）——第 4 章专门讲停止条件的设计模式

---
