---
slug: enterprise-tk663
no: "1563"
title: "What kind of datasets are typically used for fine-tuning LLMs"
question: "What kind of datasets are typically used for fine-tuning LLMs"
excerpt: "面试官想考察的不是你背过几个数据集名字，而是你对微调数据“从哪来、怎么选、多大量、如何控质量”的工程判断力。刁钻点在于：很多人只会说“用Alpaca或ShareGPT”，但一问到数据污染检测、合成数据偏差、规模与遗忘的t"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4346
updated: "2026-09-29"
---

## What kind of datasets are typically used for fine-tuning LLMs

#### 1️⃣ 考察意图

面试官想考察的不是你背过几个数据集名字，而是你对微调数据“从哪来、怎么选、多大量、如何控质量”的工程判断力。刁钻点在于：很多人只会说“用Alpaca或ShareGPT”，但一问到数据污染检测、合成数据偏差、规模与遗忘的trade-off就露馅。答好了能展示你真正动手微调过模型，理解数据分布对下游任务的影响，并能设计数据策略。

#### 2️⃣ 标准答

微调数据集按用途分三类：指令微调、领域适配、对齐微调。每类的数据来源、规模和质控策略完全不同。

**1. 指令微调数据集（Instruction Tuning）**

- **典型来源**：公开数据集如 **ShareGPT**（用户与ChatGPT对话）、**OpenAssistant Conversations**（人工标注的多轮对话）、**Alpaca**（52k条，用Self-Instruct从text-davinci-003蒸馏）。还有 **Dolly**（15k条，人工编写）、**LIMA**（1k条，高质精选）。
- **数据格式**：输入-输出对或对话模板，常用 `{"instruction": "...", "input": "...", "output": "..."}` 或 `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]`。
- **规模与取舍**：LIMA论文证明1k条高质量数据就能明显提升，但实际工程中通常用5k-50k条。**关键取舍**：数据量过大（>100k）会导致灾难性遗忘，模型丢失预训练学到的通用知识；过少则指令遵循能力不足。实践中用 **10k-20k** 条作为起点，监控验证集loss和下游任务指标。
- **实际坑与解法**：**数据污染**——公开数据集可能包含测试集样本（如MMLU、HumanEval）。解法：用 **n-gram重叠检测**（如8-gram匹配）或 **embedding相似度**（如contriever）过滤掉与基准测试重叠的样本。我在一个项目中用 `datasets` 库的 `deduplicate` 函数结合自定义黑名单，减少了15%的污染率。

**2. 领域适配数据集（Domain Adaptation）**

- **典型来源**：从领域语料中构建。例如法律领域用 **CaseLaw**、**Pile of Law**；医疗用 **PubMedQA**、**MedQA**；代码用 **CodeAlpaca**、**Magicoder**（OSS-Instruct合成）。合成数据常用 **Self-Instruct** 或 **Evol-Instruct**（WizardLM方法）从基座模型生成。
- **数据质量要求**：多样性（覆盖领域子任务）、去重（MinHash或SimHash）、避免噪声（如过滤低质量网页）。**工程取舍**：合成数据成本低但可能引入模型偏见（如重复模式、事实错误）。解法：用 **GPT-4作为评判器**（LLM-as-a-Judge）筛选合成样本，或混合20%人工标注数据做锚点。
- **规模**：通常1k-10k条。例如 **Meditron** 用7k条医学QA微调，效果超过更大模型。**实际坑**：领域数据分布偏移——如果只从论文摘要构建，模型在临床对话上表现差。解法：按任务类型分层采样（如诊断、治疗、问答各占30%）。

**3. 对齐微调数据集（Alignment）**

- **典型来源**：RLHF的偏好数据，如 **Anthropic HH-RLHF**（约170k条，含helpful/harmless对比）、**OpenAI WebGPT comparisons**。DPO（Direct Preference Optimization）则直接用偏好对 `(chosen, rejected)`。
- **数据格式**：`{"prompt": "...", "chosen": "...", "rejected": "..."}`。注意chosen和rejected需来自同一prompt，且长度差异不宜过大（否则模型学会偷懒）。
- **规模与取舍**：偏好数据通常5k-20k条。**关键取舍**：数据质量比数量重要——一条标注错误的偏好对会误导模型。解法：用 **Inter-Annotator Agreement**（如Cohen's Kappa > 0.7）筛选标注员，或做 **majority voting**。
- **实际坑**：**Reward Hacking**——模型学会生成“看起来安全但无意义”的回答。解法：在偏好数据中加入 **adversarial examples**（如故意写有害但语法正确的回答），并监控reward分布。

**总结**：微调数据集的核心是“质量 > 数量，多样性 > 规模”。实际项目中，我会从公开数据集（如ShareGPT、Dolly）开始，用Self-Instruct补充领域数据，再用人工标注的偏好数据做对齐，每一步都做污染检测和分布分析。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，按用途分指令微调、领域适配和对齐三类数据集，典型来源包括ShareGPT、LIMA、PubMedQA和HH-RLHF；第二，数据质量控制是关键，包括污染检测（n-gram重叠）、去重（MinHash）和合成数据筛选（LLM-as-a-Judge）；第三，规模上通常5k-20k条足够，过大导致灾难性遗忘。总结一句：微调数据要‘质量优先、多样性覆盖、规模适度’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你如何检测并避免微调数据与测试集（如MMLU）的污染？

> 用两步法：第一步，n-gram重叠检测——将测试集所有样本拆成8-gram，与微调数据做Jaccard相似度，阈值设为0.8（经验值）。第二步，embedding相似度——用contriever或gte-small编码后做cosine相似度，阈值0.9。如果发现重叠，直接删除微调数据中的污染样本。注意：不要只做精确匹配，因为测试集可能被改写（如paraphrase）。实际项目中，我还会在微调后跑一遍测试集，对比污染前后的准确率变化，如果下降超过2%，说明污染严重。

**追问 2**：合成数据（如Self-Instruct）有什么常见问题？如何缓解？

> 三个问题：一是模式重复——模型会生成相同结构的指令（如“写一个关于X的故事”），导致微调后模型缺乏多样性。解法：用Evol-Instruct方法，对指令做深度和广度演化（如增加约束、反转角色）。二是事实错误——合成数据可能包含幻觉。解法：用GPT-4做事实性评判，或结合检索（如Wikipedia）做验证。三是分布偏移——合成数据偏向基座模型的偏好。解法：混合20%人工标注数据，并做domain randomization（随机替换实体、句式）。

**追问 3**：微调数据规模如何确定？有没有经验法则？

> 经验法则是：从1k条高质量数据开始，监控验证集loss和下游任务指标（如BLEU、准确率）。如果loss下降但指标不涨，说明数据质量不够；如果指标涨但loss不降，说明数据量不够。具体数字：指令微调通常5k-20k条，领域适配1k-10k条，对齐5k-20k条。**工程取舍**：数据量翻倍带来的收益递减——从1k到5k提升明显，但从10k到20k可能只提升1-2%。所以我会先用10k条做快速实验，再根据结果决定是否增加。另外，注意类别平衡：如果数据中“问答”占80%，“摘要”占5%，模型会偏向问答。解法：按任务类型做stratified sampling。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“微调数据越多越好，用百万级数据集” → ✅ 正确切入：指出灾难性遗忘风险，并给出经验规模（5k-20k条），强调质量优先。
- ❌ 只列举数据集名字（如“Alpaca、ShareGPT、Dolly”）而不谈质量控制 → ✅ 正确切入：补充污染检测、去重、合成数据筛选方法，展示工程经验。
- ❌ 忽略数据格式和分布影响，只说“用JSON格式” → ✅ 正确切入：讨论对话模板（如角色标签）、长度分布（避免过长截断）、类别平衡（stratified sampling）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“数据检索与微调数据构建”切入，强调如何用检索增强（如BM25+embedding）从领域语料中筛选高质量样本，并对比纯合成数据与检索增强数据的微调效果。
- **如果你只做过传统NLP**：用“数据增强与质量控制”类比，将传统NLP中的数据清洗（如正则过滤、停用词）迁移到LLM微调，强调n-gram污染检测和MinHash去重，展示迁移能力。
- **如果你是校招无项目**：聚焦“Self-Instruct论文复现”，描述如何用GPT-4生成1k条指令数据，并用LLM-as-a-Judge筛选，对比不同规模（500/1k/2k）微调后的模型在AlpacaEval上的表现，展示动手能力。
- LIMA: Less Is More for Alignment (NeurIPS 2023)
- Self-Instruct: Aligning Language Models with Self-Generated Instructions (ACL 2023)
- WizardLM: Empowering Large Language Models to Follow Complex Instructions (ICLR 2024)
- Direct Preference Optimization: Your Language Model is Secretly a Reward Model (NeurIPS 2023)
- Scaling Data-Constrained Language Models (Touvron et al., 2023)

---
