---
slug: tooluse-tk021
no: "921"
title: "如何提升agent 的 function call 能力"
question: "如何提升agent 的 function call 能力"
excerpt: "面试官想考察你能否系统性地提升Agent的function call能力，而非只懂调prompt。这是一道系统设计+工程取舍题，刁钻点在于：候选人常只提“写好prompt”或“微调模型”，但忽略了数据质量、函数选择、评估"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3647
updated: "2026-09-29"
---

## 如何提升agent 的 function call 能力

#### 1️⃣ 考察意图

面试官想考察你能否系统性地提升Agent的function call能力，而非只懂调prompt。这是一道**系统设计+工程取舍**题，刁钻点在于：候选人常只提“写好prompt”或“微调模型”，但忽略了**数据质量、函数选择、评估完整流程**。答好了能展示你从数据到部署的整条链路思维，以及处理多轮、嵌套调用的实战经验。

#### 2️⃣ 标准答

提升function call能力需要从**数据、模型、提示、检索、评估**五个层面系统推进，每个层面都有具体方法和取舍。

#### 数据层面：构建高质量训练/测试集

- **核心方法**：使用Self-Instruct或GPT-4生成多轮、嵌套的function call数据。例如，ToolBench数据集包含16k+真实API，覆盖单步、多步和依赖调用。
- **关键技巧**：确保数据包含**参数错误恢复**（如用户输入“北京天气”但函数需要city_code，模型应主动转换或询问）。
- **坑与解法**：直接使用GPT-4生成的数据可能过拟合其风格。解法：混合人工标注的边界案例（如空参数、非法值），并加入**负样本**（模型不应调用函数时却调用了）。
- **取舍**：数据量 vs 质量。1000条高质量多轮数据优于10万条单步数据，因为嵌套调用依赖关系更难学。

#### 模型层面：微调与架构选择

- **微调策略**：对基座模型（如Llama-3-8B）进行LoRA微调，使用函数描述+调用历史的拼接格式。论文Gorilla证明，在API文档上微调后，调用准确率从70%提升至85%+。
- **专用模型**：考虑使用Toolformer或GPT-4-0613（原生支持function calling），但注意闭源模型的成本和控制力。
- **取舍**：全参数微调 vs LoRA。全参数效果好但资源消耗大（8B模型需4×A100），LoRA在1%参数下能达到95%的效果，适合快速迭代。

#### 提示工程：结构化描述与模式选择

- **函数描述**：使用JSON Schema格式，明确参数类型、枚举值、必填项。例如：

`{**"name": "get_weather",
"description": "获取指定城市的天气",
"parameters": {
"city": {"type": "string", "description": "城市名，如北京"},
"date": {"type": "string", "format": "date"}
}
}
`
- **模式选择**：ReAct模式（思考-行动-观察）适合简单任务，Plan-and-Solve模式（先规划再执行）适合多步依赖。实测Plan-and-Solve在嵌套调用中错误率降低30%。
- **坑与解法**：模型可能忽略函数描述中的约束（如日期格式）。解法：在system prompt中加入“必须严格遵循参数格式，否则返回错误码”，并在few-shot示例中展示错误恢复。

#### 检索增强：动态函数选择

- **核心问题**：当函数库超过100个时，全量输入会超过上下文窗口且稀释注意力。
- **方法**：使用BM25或DPR检索Top-K个相关函数（K=5-10）。例如，用户说“订机票”，检索出“search_flights”“book_flight”“cancel_booking”等。
- **取舍**：检索精度 vs 召回。BM25速度快但语义差，DPR精度高但需维护索引。工业界常用两阶段：BM25粗筛+Cross-Encoder精排。

#### 评估：构建完整流程指标

- **指标**：调用准确率（是否调用了正确函数）、参数正确率（参数值是否合法）、成功率（任务是否完成）。例如，在ToolBench上，微调后模型调用准确率从65%提升至82%。
- **测试集**：构建包含正常、边界、错误三种场景的测试集。边界案例如“查询未来100天的天气”（函数只支持7天），模型应返回错误提示而非乱填参数。
- **坑与解法**：自动评估可能误判（如模型返回“函数不可用”但实际可用）。解法：人工抽检+LLM-as-Judge（用GPT-4评估输出合理性）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据、模型、提示、检索、评估五个层面回答。数据层面，用Self-Instruct生成多轮嵌套数据并加入负样本；模型层面，用LoRA微调基座模型；提示层面，用JSON Schema+Plan-and-Solve模式；检索层面，用BM25+DPR两阶段筛选；评估层面，构建多维度指标和边界测试集。总结一句：提升function call能力是一个系统工程，数据质量和评估完整流程比模型选择更重要。”

#### 4️⃣ 高频追问 & 应对
追问 1**：如果函数库有1000个，你怎么保证检索效率？

> 采用两阶段策略：第一阶段用BM25（基于函数名和描述的关键词匹配）快速筛选Top-50，第二阶段用DPR（稠密检索）或Cross-Encoder精排到Top-5。取舍点：BM25延迟<10ms但召回率约70%，DPR召回率>90%但需GPU推理。工业界常用缓存机制，对高频函数预计算embedding，冷门函数实时检索。另外，可以按领域分桶（如天气、电商、金融），先分类再检索，减少候选集。

**追问 2**：模型在复杂嵌套调用中经常出错，怎么解决？

> 核心问题是模型缺乏**依赖关系建模**。解法：1）在数据中显式标注函数依赖（如“book_flight”依赖“search_flights”的结果）；2）使用Plan-and-Solve模式，让模型先生成执行计划（如“先搜索航班，再预订”），再逐步执行；3）引入**回溯机制**：如果某步失败，模型应能回退并调整参数。实测在ToolBench上，Plan-and-Solve比ReAct错误率降低40%。

**追问 3**：如何评估function call的鲁棒性，特别是对抗性输入？

> 构建对抗性测试集：1）参数注入（如用户输入“北京; DROP TABLE”）；2）函数名混淆（如“get_weather”写成“get_weathr”）；3）多意图请求（如“订机票和查天气”）。评估指标：模型是否拒绝非法调用、是否正确解析模糊输入。解法：在prompt中加入安全约束（如“只调用明确匹配的函数”），并在微调数据中加入对抗样本。工业界常用红队测试，用GPT-4生成对抗案例。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“用GPT-4的function calling API” → ✅ 强调需要微调或提示工程来适配私有API，因为闭源模型对自定义函数理解有限。
- ❌ 说“数据越多越好” → ✅ 强调数据质量优先，特别是多轮嵌套和负样本，否则模型会学坏。
- ❌ 忽略评估，只讲训练方法 → ✅ 必须提到评估完整流程，包括边界案例和自动评估工具（如ToolBench的评估脚本）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“函数描述类似文档块，检索增强类似RAG”切入，强调BM25+DPR的两阶段检索经验，并对比RAG中的chunking策略。
- **如果你只做过传统NLP**：用“序列标注类比函数调用”迁移，强调参数提取类似NER，函数选择类似文本分类，并展示微调经验。
- **如果你是校招无项目**：聚焦ToolBench论文复现，展示你如何用Self-Instruct生成数据、用LoRA微调Llama-3-8B，并构建评估指标。可以提到你对比了ReAct和Plan-and-Solve的效果。
- ToolBench: Open Large-Scale Real-World API Benchmark for Training and Evaluating Tool-Augmented LLMs
- Gorilla: Large Language Model Connected with Massive APIs
- ReAct: Synergizing Reasoning and Acting in Language Models
- Plan-and-Solve: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models
- LoRA: Low-Rank Adaptation of Large Language Models

---
