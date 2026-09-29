---
slug: agent-tk375
no: "1275"
title: "Q6: 有微调过 Agent 能力吗？数据集如何收集？**"
question: "Q6: 有微调过 Agent 能力吗？数据集如何收集？**"
excerpt: "面试官想考察你是否有从零构建 Agent 微调数据管线的实战经验，而非只调过 API。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：多数人只会背 ToolBench 或 AgentInstruct 的名字，但说不出"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4330
updated: "2026-09-29"
---

## Q6: 有微调过 Agent 能力吗？数据集如何收集？**

`P2` · `agent_architecture`

🏷 标签：`fine-tuning`, `agent`, `dataset`, `tool-use`, `lora`

#### 1️⃣ 考察意图

面试官想考察你是否有从零构建 Agent 微调数据管线的实战经验，而非只调过 API。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：多数人只会背 ToolBench 或 AgentInstruct 的名字，但说不出数据质量控制的细节、正负样本比例如何平衡、以及微调后如何避免灾难性遗忘。答好了能展示你对 Agent 数据完整流程（采集→清洗→格式化→评估）的端到端理解，以及面对稀疏奖励信号时的工程直觉。

#### 2️⃣ 标准答

**微调目标**：增强 Agent 的规划（planning）、工具调用（tool-use）、记忆管理（memory）和错误恢复（recovery）能力。核心是让模型学会“思考链 + 行动 + 观察”的循环，而非单纯生成文本。

**数据集收集**：分三类来源，各有 trade-off。

- **公开数据集**：ToolBench（8 万+ 轨迹，覆盖 16 类 API）、AgentInstruct（合成轨迹，含多轮交互）、APIBank（中文场景）。优点：量大、开箱即用。缺点：工具集固定，泛化到未见工具时成功率下降 15-20%（【通用知识】）。解法：混合使用，并做领域适配。
- **自建模拟环境**：用 Gym 风格环境（如 VirtualHome、WebShop）生成轨迹。关键步骤：定义工具 schema（JSON 格式，含 name、description、parameters）。
- 用 GPT-4 或 Claude 作为“教师模型”生成示范轨迹（teacher-forcing），确保每一步有思考链（reasoning）和行动（action）。
- 加入随机扰动（如工具返回错误、环境状态变化）生成负样本，让模型学会恢复。
- **真实日志回放**：从生产环境（如客服系统、代码助手）脱敏后提取成功/失败轨迹。坑：用户行为噪声大，需人工标注“正确路径”。解法：只保留完成率 > 80% 的会话，并用规则过滤掉含敏感信息的片段。

**数据格式**：统一为 ReAct 风格，每步包含：

- `thought`: 当前推理（如“用户需要查询天气，我需要调用 get_weather API”）
- `action`: 工具调用（JSON 格式，如 `{"tool": "get_weather", "params": {"city": "北京"}}`）
- `observation`: 工具返回结果（如 `{"temperature": 25, "condition": "晴"}`）
- 最终 `answer`: 汇总给用户的回复

**数据质量控制**：

- **去重**：用 MinHash + LSH 去除相似轨迹（避免模型过拟合高频模式）。
- **平衡多样性**：确保每个工具至少出现 50 次，长尾工具通过数据增强（替换参数值）扩充。
- **人工校验**：抽检 5% 轨迹，检查思考链是否合理、工具调用参数是否匹配 schema。发现错误率 > 10% 则整批重做。
- **正负样本比例**：正样本（成功轨迹）: 负样本（失败轨迹） = 7:3。负样本太少会导致模型不会恢复，太多则模型变得保守。

**微调方法**：

- 基础模型：LLaMA-3-8B 或 Qwen2.5-7B（性价比高）。
- 方法：LoRA（rank=16, alpha=32），只更新 0.5% 参数，避免灾难性遗忘。全参数微调只在数据量 > 100k 时考虑。
- 损失函数：标准语言建模损失（cross-entropy），但只计算 action 和 thought 部分的 loss（忽略 observation，因为它是环境输出，模型不应学习预测它）。
- 训练细节：batch size=64, learning rate=2e-4（LoRA 常用），warmup 10% steps，训练 3 个 epoch。用 DeepSpeed ZeRO-2 节省显存。

**实际落地的坑 + 解法**：

- **坑**：模型学会“假装思考”但实际不调用工具（即生成 thought 但 action 为空）。**解法**：在 loss 中给 action 部分加 2x 权重，强制模型输出有效工具调用。
- **坑**：微调后通用能力下降（如数学推理变差）。**解法**：混合 20% 通用指令数据（如 Alpaca）一起训练，保持基础能力。
- **坑**：工具调用格式错误（如 JSON 不闭合）。**解法**：后处理用正则修复常见错误，并在训练数据中故意加入 5% 格式错误的样本让模型学会修正。

**评估**：在未见过的工具集上测试工具调用成功率（tool-call accuracy）和任务完成率（task success rate）。基准：未微调模型成功率约 40%，微调后可达 75-85%（【通用知识】）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据来源、格式设计、质量控制三个层面回答。数据来源分公开数据集、模拟环境生成和真实日志回放，各有优缺点；格式统一为 ReAct 风格，包含 thought、action、observation；质量控制靠去重、平衡正负样本和人工抽检。总结一句：Agent 微调的核心不是堆数据量，而是确保轨迹的多样性和思考链的合理性，同时用 LoRA 避免灾难性遗忘。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到用 GPT-4 生成示范轨迹，但这样会引入教师模型的偏差，怎么处理？

> 应对策略：这是典型问题。解法是“多教师投票 + 自洽性过滤”。用 GPT-4、Claude-3 和 Gemini 各生成一条轨迹，只保留至少两个模型一致的轨迹（即 majority voting）。另外，在训练后用小模型（如 LLaMA-3-8B）在验证集上自生成轨迹，与教师轨迹对比，丢弃那些模型自己无法复现的样本（即 self-consistency filter）。这样能减少对单一教师风格的过拟合。

**追问 2**：如果工具数量从 10 个扩展到 1000 个，你的数据收集策略需要怎么调整？

> 应对策略：核心 trade-off 是数据覆盖 vs 成本。解法：1）用层次化工具分类（如按领域分 10 类），每类选 5 个代表性工具生成轨迹，然后通过参数替换（如把 get_weather 的 city 参数换成 get_stock 的 symbol）做数据增强，覆盖同类其他工具。2）引入检索增强生成（RAG）来动态选择工具，微调时只训练模型学会“读工具文档 + 调用”，而不是记住每个工具。这样工具数从 10 到 1000，数据量只需从 10k 增加到 30k，而非线性增长。

**追问 3**：微调后模型在未见过的工具上调用成功率不高，怎么改进？

> 应对策略：这是 Agent 微调的核心挑战。解法：1）在训练数据中引入“工具无关”的思考链样本，例如“我需要先理解用户意图，然后根据工具描述选择最匹配的 API”，让模型学会泛化。2）用 in-context learning 混合微调：在 prompt 中加入 2-3 个未见工具的示例（few-shot），模型能直接复用。3）如果效果仍差，考虑用 GRPO（Group Relative Policy Optimization）做强化学习，以工具调用成功率为奖励信号，让模型在探索中学会适应新工具。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“直接用 ToolBench 数据集微调就行，不需要额外处理” → ✅ 正确切入：ToolBench 的工具集固定，直接微调会导致模型在未见工具上泛化差。必须混合自建数据或做数据增强，并加入负样本。
- ❌ 说“微调时所有 token 都算 loss，包括 observation” → ✅ 正确切入：observation 是环境输出，模型不应学习预测它。只计算 thought 和 action 部分的 loss，否则模型会浪费容量在无关内容上。
- ❌ 说“用全参数微调效果最好” → ✅ 正确切入：全参数微调容易导致灾难性遗忘，且成本高。LoRA 在 Agent 任务上通常足够，且能保留基础能力。只在数据量 > 100k 且算力充足时才考虑全参数。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“数据质量控制”角度切入，对比 RAG 中文档分块的质量控制与 Agent 轨迹的质量控制，强调两者都需要人工抽检和去重。
- **如果你只做过传统 NLP**：用“序列标注”类比 Agent 微调，把 thought 看作 BOS token，action 看作标签序列，强调 loss 权重分配（类似 NER 中给实体标签加权重）。
- **如果你是校招无项目**：聚焦 ToolBench 论文复现，描述如何用 LLaMA-3-8B + LoRA 复现其微调流程，并给出在未见工具上的评估结果（如成功率从 40% 提升到 75%），展示动手能力。

#### 7️⃣ 延伸阅读

- ToolBench: Tool Learning with Large Language Models (Qin et al., 2023)
- AgentInstruct: Towards Generative Teaching with Agentic Workflows (Mitra et al., 2024)
- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)
- LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)
- GRPO: Group Relative Policy Optimization (Shazeer et al., 2024)

---
