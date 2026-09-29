---
slug: enterprise-tk647
no: "1547"
title: "| Q100 | When should you prefer task-specific fine-tuning over prompt engineering"
question: "| Q100 | When should you prefer task-specific fine-tuning over prompt engineering"
excerpt: "面试官想考察你对模型定制化手段的工程决策能力，而非单纯背诵概念。核心是判断你能否在数据、性能、成本、维护四个维度上做量化权衡。刁钻点在于：很多人只答“数据多就微调”，但忽略了任务复杂度（如结构化输出、多步推理）和推理成本"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3983
updated: "2026-09-29"
---

## | Q100 | When should you prefer task-specific fine-tuning over prompt engineering

#### 1️⃣ 考察意图

面试官想考察你对模型定制化手段的工程决策能力，而非单纯背诵概念。核心是判断你能否在**数据、性能、成本、维护**四个维度上做量化权衡。刁钻点在于：很多人只答“数据多就微调”，但忽略了**任务复杂度**（如结构化输出、多步推理）和**推理成本**（长 prompt 的 token 消耗）才是关键。答好了能展示你从 demo 到生产环境的整条链路思考，以及处理过真实部署中的 trade-off。

#### 2️⃣ 标准答

选择 task-specific fine-tuning 还是 prompt engineering，本质是**在可控性、成本和迭代速度之间做取舍**。以下从四个维度给出决策框架：

- **任务复杂度与输出格式**
- 当任务需要**严格的结构化输出**（如 JSON schema、代码生成、多步推理链）时，微调更可靠。Prompt engineering 依赖模型对指令的遵循能力，但 GPT-4 在复杂格式上仍有 5-10% 的格式错误率（如缺失字段、类型错误），而微调后的模型可通过 loss 直接惩罚格式偏差，将错误率压到 <1%。
- 对于**多步推理**（如数学解题、法律条文匹配），微调能固化推理路径，避免 prompt 中“思维链”被模型随机打断。实际案例：在金融财报分析中，微调后的 LLaMA-13B 比 GPT-4 + 5-shot prompt 的 F1 高 12%，且输出格式完全对齐。
- **数据量与标注成本**
- 微调需要**至少 500-1000 条高质量标注数据**（具体取决于任务难度）。如果只有 50 条样本，prompt engineering + few-shot 是唯一可行方案。但注意：few-shot 的上下文窗口限制（如 4K/8K）会制约示例数量，而微调可无限吸收数据。
- **数据质量 > 数量**：微调时 100 条人工精标数据的效果，常优于 1000 条自动标注的噪声数据。一个坑：用 GPT-4 自动生成训练数据微调小模型，可能放大 GPT-4 的偏见（如性别歧视），需要人工审核。
- **性能与延迟要求**
- 微调模型在**特定任务上准确率通常高 5-15%**（对比同等参数量的 prompt 模型）。例如，在情感分类上，BERT-base 微调后准确率 93%，而 GPT-3.5 的 zero-shot 仅 85%，few-shot 提升到 89% 但需要 4 个示例。
- **推理延迟**：微调模型（如 7B 参数）单次推理约 50-100ms（A100），而 prompt engineering 如果使用长 prompt（如 2K tokens），推理时间会线性增长到 200-500ms，且 token 成本高 3-5 倍。生产环境通常优先微调以降低 P99 延迟。
- **维护与迭代成本**
- Prompt engineering 的**迭代周期短**：修改 prompt 只需几分钟，适合快速实验。但问题在于**脆弱性**：模型升级（如 GPT-3.5 → GPT-4）可能导致 prompt 失效，需要重新调试。
- 微调模型**稳定但更新慢**：重新训练需要 1-3 天（1000 条数据 + 单卡 A100），且需要持续监控数据分布漂移。一个落地坑：电商评论分类模型上线后，新品类（如“虚拟商品”）的准确率从 92% 暴跌到 70%，因为训练数据中无此分布。解法是建立**主动学习 pipeline**：每两周用不确定性采样筛选 200 条新数据，增量微调。

**总结决策树**：

- 数据量 < 500 条 → prompt engineering
- 需要严格格式/多步推理 → 微调
- 延迟要求 < 100ms → 微调
- 快速迭代原型 → prompt engineering
- 生产环境长期稳定 → 微调 + 定期增量更新

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据量、任务复杂度、性能成本三个层面回答。数据层面，少于 500 条标注数据优先 prompt engineering，否则微调更优；任务层面，需要结构化输出或多步推理时微调更可靠；成本层面，微调训练成本高但推理成本低，prompt engineering 开发快但长 prompt 推理贵。总结一句：微调适合生产环境的高精度、低延迟任务，prompt engineering 适合快速验证和低数据场景。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果数据只有 200 条，但任务要求严格 JSON 输出，你怎么选？

> 我会选 prompt engineering + 后处理校验。200 条数据微调容易过拟合，且对格式的泛化能力差。具体做法：用 GPT-4 写一个包含 JSON schema 的 prompt，并在输出后加一个正则校验 + 自动修复层（如用 `json.loads` 捕获异常后重试）。如果格式错误率仍高（>10%），考虑用这 200 条数据做 LoRA 微调，但需要加数据增强（如用 GPT-4 生成 1000 条伪数据，人工抽检 10%）。注意：LoRA 的 rank 设为 8，避免过拟合。

**追问 2**：微调模型的推理成本比 prompt engineering 低，但训练成本高，你怎么量化这个 trade-off？

> 假设每天 10 万次推理，微调模型（7B）单次推理 0.001 元，prompt 模型（GPT-4）单次 0.01 元（含 2K tokens）。微调训练成本约 500 元（单卡 A100 跑 3 天），那么 500 / (0.01 - 0.001) = 55,555 次推理后回本。如果任务持续超过 2 个月，微调更划算。另外，微调模型可以部署在自建 GPU 上，无 API 调用限制，适合高并发场景。

**追问 3**：如果模型升级（如 GPT-4 → GPT-5），你的 prompt 工程方案需要重写吗？

> 需要，但可以降低风险。做法：在 prompt 中避免依赖模型特定行为（如“请用 step-by-step 思考”），而是用通用指令 + 示例。同时建立 prompt 回归测试集（100 条 golden 数据），每次模型升级后自动跑一遍，对比准确率和格式正确率。如果下降超过 5%，则回退到旧模型或调整 prompt。微调模型则不受影响，但需要重新评估新模型是否更优。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “数据多就微调，数据少就 prompt engineering。” → ✅ 正确切入：数据量只是因素之一，任务复杂度（如格式、推理链）和性能要求（延迟、准确率）同样关键。例如，即使有 1 万条数据，如果任务只是简单分类，prompt engineering 可能更省成本。
- ❌ “微调模型一定比 prompt engineering 准确率高。” → ✅ 正确切入：微调在特定任务上准确率高，但 prompt engineering 结合 RAG（如检索相关文档）在开放域问答上可能更强。例如，法律问答中，GPT-4 + 检索的准确率比微调 LLaMA 高 8%，因为微调模型无法覆盖所有法律条文。
- ❌ “微调成本高，所以永远优先 prompt engineering。” → ✅ 正确切入：微调训练成本高，但推理成本低，长期运行（如超过 2 个月）反而更省钱。需要做 ROI 计算，不能一刀切。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“任务复杂度”切入，强调微调在结构化输出（如 SQL 生成）上的优势，对比 RAG 在开放域检索上的灵活性。举例：在电商客服系统中，用微调模型处理订单查询（JSON 格式），用 RAG + prompt 处理产品推荐。
- **如果你只做过传统 NLP**：用“数据量与性能”类比，微调类似传统机器学习中的模型训练（如 BERT 分类），prompt engineering 类似规则系统。强调微调需要特征工程（数据清洗、标注），而 prompt 需要 prompt 设计（示例选择、指令优化）。
- **如果你是校招无项目**：聚焦“成本 trade-off”论文复现，引用《Scaling Monosemanticity》或《LIMA》中关于数据量与微调效果的结论。可以描述一个 demo：用 500 条数据微调 DistilBERT 做情感分类，对比 GPT-3.5 的 few-shot，记录准确率和推理时间。
- 《LIMA: Less Is More for Alignment》—— 1000 条数据微调效果接近 GPT-4
- 《Scaling Monosemanticity》—— 微调对模型内部表征的影响
- 《Prompt Engineering Guide》—— 微软官方 prompt 设计最佳实践
- LoRA: Low-Rank Adaptation of Large Language Models —— 低成本微调方法
- 《The Cost of Prompt Engineering vs Fine-Tuning》—— 量化分析博客（Hugging Face 社区）

---
