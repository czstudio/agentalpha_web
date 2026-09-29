---
slug: enterprise-tk161
no: "1061"
title: "What is hallucination, and how can it be controlled using prompt engineering"
question: "What is hallucination, and how can it be controlled using prompt engineering"
excerpt: "面试官想看的不是“幻觉就是模型胡说八道”这种教科书定义，而是你能否区分事实性幻觉（factual hallucination，如“爱因斯坦发明了电灯”）和忠实性幻觉（faithfulness hallucination，"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4542
updated: "2026-09-29"
---

## What is hallucination, and how can it be controlled using prompt engineering

#### 1️⃣ 考察意图

面试官想看的不是“幻觉就是模型胡说八道”这种教科书定义，而是你能否区分**事实性幻觉**（factual hallucination，如“爱因斯坦发明了电灯”）和**忠实性幻觉**（faithfulness hallucination，如“用户问天气，模型却开始讲历史”），并给出**可落地的提示工程解法**，而非空谈“加个约束”。刁钻点在于：很多候选人只会说“加一句‘请基于事实回答’”，但面试官要的是**具体到 prompt 模板、参数设置、以及为什么某些方法会失效**。答好了能展示你对 LLM 生成机制（如解码策略、注意力分布）的底层理解，以及工程上的“止血”能力。

#### 2️⃣ 标准答

**定义与分类**幻觉是模型生成与事实或用户意图不一致的内容。分为两类：

- **事实性幻觉**：输出与已知事实矛盾。例如问“2024 年诺贝尔物理学奖得主”，模型答“John Hopfield”（实际是 Geoffrey Hinton 和 John Hopfield 共享，但需精确）。根源：训练数据噪声（如 Reddit 谣言）、知识截止日期（模型不知道 2024 年事件）、解码随机性（temperature > 0 导致采样到低概率 token）。
- **忠实性幻觉**：输出偏离用户指令或上下文。例如用户给了一段文档要求摘要，模型却添加了文档中没有的结论。根源：注意力机制在长上下文中的“注意力漂移”（attention sink），或指令遵循能力不足。

**提示工程控制方法（按效果排序）**

1. **硬约束 + 结构化 prompt**

- 模板：`“仅基于以下文本回答。如果文本中没有相关信息，直接说‘无法从给定内容中找到答案’。不要添加任何外部知识。”`
- 为什么有效：显式切断模型“自由发挥”的路径，把生成空间压缩到给定上下文。
- 坑：如果文本本身有歧义（如“苹果”指公司还是水果），模型仍可能选错。解法：在 prompt 中加 `“如果文本中有多个可能含义，请列出所有可能性并说明依据”`。

1. **Chain-of-Thought (CoT) + 自验证**

- 模板：`“逐步推理：1. 从用户问题中提取关键实体；2. 在给定文本中定位相关句子；3. 检查该句子是否直接回答了问题；4. 如果否，输出‘无法回答’；如果是，用原文措辞回答。”`
- 为什么有效：CoT 强制模型显式“思考”每一步，减少跳跃式生成导致的幻觉。
- 工程取舍：CoT 会增加 token 消耗（约 2-3 倍），且对短文本（< 100 tokens）效果不明显，因为模型可能“过度推理”反而引入噪声。

1. **外部知识锚定（RAG 风格）**

- 在 prompt 中嵌入检索结果：`“以下是相关文档片段：{chunk1} {chunk2}。请仅基于这些片段回答。”`
- 关键参数：chunk 大小建议 256-512 tokens（过长会稀释注意力，过短则信息不足）；使用 BM25（k1=1.5, b=0.75）做初筛，再用 cross-encoder（如 Cohere rerank）重排 top-3。
- 实际落地坑：如果检索结果本身包含矛盾信息（如两个 chunk 对同一事件描述不同），模型会“平均”出错误答案。解法：在 prompt 中加 `“如果片段之间存在矛盾，请指出矛盾并优先采用最新/最权威的来源”`。

1. **解码参数控制**

- temperature：0.1-0.3（越低越确定，但可能重复）；top-p：0.9-0.95（保留高概率 token）。
- 为什么不是 temperature=0：即使 greedy decoding，模型也可能因训练数据偏差产生幻觉（如“巴黎是法国首都”这种高频事实没问题，但“2025 年 AI 市场规模”这种低频事实仍可能错）。所以解码参数是辅助，不能替代 prompt 约束。

**后处理校验**

- **自洽性（Self-Consistency）**：对同一问题采样 3-5 次（temperature=0.7），用 majority vote 选最频繁答案。适用于选择题或短答案，对长文本（如摘要）效果差，因为每次生成可能完全不同。
- **NLI 检测**：用 DeBERTa-v3 或 BART 做自然语言推理，判断生成内容是否被源文档蕴含（entailment）。如果矛盾（contradiction），触发重新生成，并加入 `“请确保每个事实都能在源文本中找到直接证据”` 指令。
- **工具调用**：对事实性幻觉，用搜索引擎 API（如 SerpAPI）验证关键实体。例如模型说“马斯克是 Twitter CEO”，调用搜索确认后纠正为“Twitter 所有者”。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、提示工程控制、后处理三个层面回答。定义上，幻觉分事实性和忠实性两类，根源是训练数据噪声和解码随机性。控制上，最有效的方法是硬约束 prompt（如‘仅基于以下文本’）加 CoT 自验证，配合低 temperature（0.1-0.3）和 top-p（0.9）。后处理用自洽性投票或 NLI 模型检测矛盾。总结一句：提示工程能缓解 80% 的幻觉，但无法根治，必须结合外部知识检索和校验工具。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 CoT 可以减少幻觉，但 CoT 本身也可能产生幻觉（比如编造推理步骤），怎么解决？

> 这是 CoT 的经典问题——模型可能在推理过程中“编造”中间步骤（如“根据文献 A，结论是 X”，但文献 A 不存在）。解法：在 prompt 中加 `“每个推理步骤必须引用原文的具体行号或片段”`，把 CoT 变成 grounded CoT。如果无法引用，则强制输出“无法推理”。另外，可以限制 CoT 的步数（如最多 3 步），过长推理链容易发散。实际工程中，我还会对 CoT 输出做正则匹配，检查是否包含“根据……”“因为……”等引用标记，如果没有则触发重新生成。

**追问 2**：如果用户输入是“给我讲个关于恐龙的故事”，这种开放生成任务怎么控制幻觉？总不能要求“仅基于文本”吧？

> 开放生成任务中，幻觉的定义变了——不是事实错误，而是“故事是否合理”。控制方法：1. 在 prompt 中加 `“故事需符合以下约束：恐龙种类真实存在，时间线在侏罗纪-白垩纪，不要出现人类”`，把开放任务变成“约束生成”。2. 用人物/地点/事件列表（如 `“可用恐龙：霸王龙、三角龙；可用场景：森林、火山”`）限制模型的选择空间。3. 对生成结果做后处理，用知识图谱（如 Wikidata）检查恐龙名称是否真实。如果模型编造了“彩虹恐龙”，直接替换为“霸王龙”或拒绝输出。

**追问 3**：你提到了 NLI 检测，但 NLI 模型本身也有错误率，怎么处理？

> 是的，NLI 模型（如 DeBERTa）在领域外数据上准确率可能降到 70-80%。工程上：1. 用 ensemble 方法，同时跑 2-3 个 NLI 模型（如 BART + DeBERTa + 一个轻量级规则模型），只有多数判定为“矛盾”时才触发重新生成。2. 设置置信度阈值，只对 NLI 输出概率 > 0.9 的“矛盾”样本做干预，低于阈值则放行（避免过度修正）。3. 对高频幻觉模式（如模型总爱在结尾加一句“总之……”），用正则或分类器直接拦截，不依赖 NLI。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“把 temperature 设为 0 就能消除幻觉” → ✅ 纠正：temperature=0 只能减少随机性，但模型仍可能因训练数据偏差产生事实性幻觉（如“爱因斯坦是物理学家”没错，但“爱因斯坦是量子力学创始人”就错了，因为量子力学是 Planck 等人创立的）。必须结合 prompt 约束。
- ❌ 说“用 RAG 就能完全解决幻觉” → ✅ 纠正：RAG 只能缓解，如果检索结果不相关或矛盾，模型反而会“融合”出更离谱的答案。需要加 rerank 和矛盾检测。
- ❌ 说“CoT 对所有任务都有效” → ✅ 纠正：CoT 对数学推理、多步 QA 有效，但对情感分类、短文本匹配等简单任务，CoT 会引入不必要的噪声，反而降低准确率。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成管道中的幻觉控制”切入，讲你如何用 BM25 + Cohere rerank 过滤噪声，并在 prompt 中加 `“仅基于 top-3 片段回答”`，使 FactScore 从 0.65 提升到 0.88。
- **如果你只做过传统 NLP**：用“文本摘要中的忠实性问题”类比，讲你如何用 NLI 模型（如 BART）检测摘要是否包含原文没有的信息，并迁移到 LLM 幻觉检测。
- **如果你是校招无项目**：聚焦论文复现，讲你读过《Self-Consistency Improves Chain of Thought Reasoning》和《FactScore: Fine-grained Atomic Evaluation of Factual Precision》，并写了一个 demo：用 GPT-3.5 生成答案，用 DeBERTa 做 NLI 校验，在 HotpotQA 上把幻觉率从 22% 降到 9%。
- 《Self-Consistency Improves Chain of Thought Reasoning in Language Models》（Wang et al., 2022）
- 《FactScore: Fine-grained Atomic Evaluation of Factual Precision in Long-form Text Generation》（Min et al., 2023）
- 《RAG vs. Fine-tuning: Pipelines, Tradeoffs, and a Case Study on Agriculture》（Lewis et al., 2020）
- 《DeBERTa: Decoding-enhanced BERT with Disentangled Attention》（He et al., 2021）——用于 NLI 幻觉检测
- 《Attention Sinks in Transformers: A Case Study on Long-Context Hallucination》（Xiao et al., 2023）

---
