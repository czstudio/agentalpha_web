---
slug: agent-tk360
no: "1260"
title: "Agent评估体系包括哪些维度?如何衡量planning能力 vs hallucination rate"
question: "Agent评估体系包括哪些维度?如何衡量planning能力 vs hallucination rate"
excerpt: "面试官想看你能否从“系统设计”和“量化度量”两个层面构建Agent评估体系，而非只背概念。刁钻点在于：planning能力（多步推理、子任务分解）和hallucination rate（事实一致性、工具调用幻觉）是Age"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3947
updated: "2026-09-29"
---

## Agent评估体系包括哪些维度?如何衡量planning能力 vs hallucination rate

`P2` · `agent_architecture`

🏷 标签：`agent-evaluation`, `planning`, `hallucination`, `benchmark`

#### 1️⃣ 考察意图

面试官想看你能否从“系统设计”和“量化度量”两个层面构建Agent评估体系，而非只背概念。刁钻点在于：planning能力（多步推理、子任务分解）和hallucination rate（事实一致性、工具调用幻觉）是Agent评估中最难量化的两个维度，且常存在trade-off（如规划越复杂，幻觉率可能越高）。答好了能展示你对Agent系统瓶颈（可解释性、鲁棒性）的工程理解，以及设计可落地的评估指标（如结合自动化+人工）的硬实力。

#### 2️⃣ 标准答

**评估体系四大维度**（参考AgentBench、WebArena等基准设计）：

- **任务完成度**：核心指标是Success Rate（SR）和Goal Completion Rate（GCR）。例如在WebArena中，Agent需完成“在GitHub上创建issue并分配标签”，SR=1表示完全正确，GCR可容忍部分步骤失败（如标签分配错误但issue创建成功）。
- **规划合理性**：量化规划质量，包括：**规划成功率**（Plan Success Rate, PSR）：Agent生成的步骤序列是否在逻辑上可行（如先登录再操作，而非反序）。
- **步骤冗余度**（Step Redundancy）：用Levenshtein距离对比最优路径与Agent实际路径，冗余度>30%说明规划效率低。
- **子任务分解粒度**：用Tree Edit Distance衡量Agent分解的DAG（有向无环图）与专家标注的DAG的相似度。
工具调用准确性：关注工具选择正确率（Tool Selection Accuracy）和参数填充准确率（Parameter Filling Accuracy）。例如调用“search_web”时，参数“query”是否包含必要关键词。生成质量与鲁棒性：包括：
- **Hallucination Rate**：通过Factuality Consistency Check（如用NLI模型DeBERTa-v3判断生成内容是否与检索结果矛盾）或人工标注（如每100步采样10步，标注事实错误数）。
- **鲁棒性**：在输入扰动（如拼写错误、指令模糊）下，SR下降幅度是否<10%。

**衡量Planning能力 vs Hallucination Rate的工程方法**：

- **Planning能力**：用**Plan-Backtrack Ratio**（PBR）量化规划失败后的恢复能力。公式：PBR = 回溯步数 / 总步数。PBR>0.3说明规划能力弱（如ReAct Agent在复杂任务中常回溯）。实际落地坑：规划评估依赖人工标注最优路径，成本高。解法：用**DPR**（Dense Passage Retrieval）从历史日志中自动提取成功路径作为伪标签，再计算PSR。
- **Hallucination Rate**：用**Tool Call Hallucination**（TCH）指标，即Agent调用工具但返回结果与预期不符的比例。例如在WebArena中，Agent调用“click_button”但按钮不存在，TCH=1。Trade-off：降低TCH需增加验证步骤（如先“check_element_exists”再点击），但会提升规划步数（PBR上升）。实际解法：在Agent的prompt中注入“先验证再执行”的约束，并设置TCH阈值（如<5%），超过则触发回滚。

**综合评估框架**：

- 自动化评估：用BLEU/ROUGE评估生成文本，但需注意Agent任务中“语义等价”比“字面匹配”更重要。建议用**BERTScore**或**BLEURT**（基于预训练模型的语义相似度）。
- 人工评估：每100个任务采样20个，标注“规划是否合理”和“是否产生幻觉”，计算Cohen’s Kappa系数确保标注一致性（>0.7）。
- 基准工具：AgentBench（覆盖8个环境，如SQL、Web）、WebArena（真实网站交互）、ALFWorld（家居任务）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，评估体系包括任务完成度、规划合理性、工具调用准确性和生成质量四大维度；第二，Planning能力用Plan Success Rate和Plan-Backtrack Ratio量化，Hallucination Rate用Factuality Consistency Check和Tool Call Hallucination指标；第三，两者存在trade-off，降低幻觉率可能增加规划步数，需在prompt中设置约束并动态调整阈值。总结一句：构建Agent评估体系的核心是平衡自动化指标和人工标注，并针对规划与幻觉的冲突设计联合优化策略。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到用NLI模型检测幻觉，但NLI模型本身也有错误率，怎么处理？

> 应对策略：采用**多模型投票**机制，例如用DeBERTa-v3、RoBERTa-large和T5-3B三个NLI模型，取多数结果（如2/3一致）。若仍不一致，则标记为“需人工审核”。实际落地中，可设置置信度阈值（如>0.9才视为幻觉），降低误报率。Trade-off：多模型推理增加延迟（约3倍），但幻觉检测准确率可从85%提升至93%（基于TruthfulQA数据集）。

**追问 2**：在WebArena上，如何区分“规划失败”和“工具调用失败”？

> 应对策略：设计**因果链分析**。例如，Agent规划“先搜索再点击”，但搜索返回空结果（工具调用失败），则规划本身可能正确。用**Action Dependency Graph**（ADG）记录每个步骤的前置条件，若前置条件满足但工具返回错误，则归因于工具调用；若前置条件不满足（如未登录就点击），则归因于规划失败。实际坑：WebArena环境不稳定（如页面加载超时），需设置重试机制（如重试3次）再判定。

**追问 3**：你如何保证人工标注的一致性？

> 应对策略：采用**标注指南+校准会议**。首先，编写详细指南（如“规划合理”定义为“步骤顺序符合常识，无冗余步骤>3”）。其次，每标注50个任务后，随机抽取10个进行一致性校验，计算Cohen’s Kappa系数，若<0.7则重新校准。实际解法：用**Active Learning**策略，只标注模型置信度低的样本（如NLI模型输出概率在0.4-0.6之间），减少人工成本。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“用BLEU/ROUGE评估Agent生成” → ✅ 强调Agent任务中“语义等价”比“字面匹配”重要，推荐BERTScore或BLEURT，并说明BLEU在工具调用场景下失效（如“click_button”与“press_button”语义等价但字面不同）。
- ❌ 认为Planning能力和Hallucination Rate是独立维度 → ✅ 指出两者存在trade-off：降低幻觉率（如增加验证步骤）会提升规划步数（PBR上升），需在prompt中设置约束（如“先验证再执行”）并动态调整阈值（如TCH>5%时触发回滚）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索增强的Agent”角度切入，强调如何用检索结果作为事实锚点降低幻觉率（如用DPR检索相关文档，再与生成内容做NLI对比），并量化规划能力（如检索步骤是否冗余）。
- **如果你只做过传统NLP**：用“机器翻译评估”类比，说BLEU/ROUGE在Agent场景的局限性，并迁移到“语义相似度评估”（如BERTScore），同时强调人工标注的Kappa系数一致性校验。
- **如果你是校招无项目**：聚焦论文复现，如复现WebArena的评估框架，并设计一个简化版Agent（如ReAct），在ALFWorld上测试规划成功率与幻觉率的相关性，展示对基准工具和指标的理解。

#### 7️⃣ 延伸阅读

- “AgentBench: Evaluating LLMs as Agents” (2023) - 基准设计细节
- “WebArena: A Realistic Web Environment for Building Autonomous Agents” (2023) - 环境与评估指标
- “TruthfulQA: Measuring How Models Mimic Human Falsehoods” (2022) - 幻觉检测数据集
- “DeBERTa: Decoding-enhanced BERT with Disentangled Attention” (2021) - NLI模型
- “ReAct: Synergizing Reasoning and Acting in Language Models” (2022) - Agent架构与规划评估

---
