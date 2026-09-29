---
slug: baidu100-temp-nl2sql
question: "Temperature、Top-k、Top-p 分别怎么影响生成？NL2SQL 场景怎么设？"
oneLine: "Temperature 控制分布平滑度，Top-k 限候选数量，Top-p 按累积概率自适应截断；NL2SQL 应降低随机性，并用语法校验兜底。"
category: jingchang
company: baidu
track: ai-app
tags: [百度真题, 采样策略, NL2SQL]
minutes: 5
order: 174
updated: 2026-09-29
deep: 
---

## 先这样答

NL2SQL 要优先保证输出确定，Temperature 可以设为 0 到 0.2，Top-p 收紧到 0.1 到 0.3，也可以直接用贪心解码。同一个问题应生成同一条 SQL。生成后还要做语法校验，避免不合法的 SQL 直接进入后续流程。

Temperature 控制生成分布的平滑度。调高后，候选词之间的概率分布更平滑，输出也更容易多样、发散。Top-k 直接限制候选词数量，只从概率最高的 k 个候选中采样。Top-p 则按候选词的累积概率截断，保留的候选数量会随分布变化。

这三个参数都和采样有关，但控制方式不同。NL2SQL 要的是稳定的结构化输出，所以不该为了多样性放宽采样。创意生成才适合放宽采样，让输出有更多变化。低温度也可能放大复读倾向，因此 SQL 生成不能只靠调低 Temperature，还要配合语法校验兜底。

## 面试官会怎么追问

- **「Top-k 和 Top-p 都是在筛候选，它们有什么区别？」** Top-k 固定候选词的数量。Top-p 按累积概率截断，候选数量会自适应。回答时要区分固定数量和概率阈值。

- **「NL2SQL 为什么不直接把 Temperature 设成 0？」** NL2SQL 需要确定性输出，可以用低 Temperature，也可以直接贪心解码。还可以收紧 Top-p。无论怎么设，都要用语法校验兜底。

- **「是不是所有任务都应该用低 Temperature？」** 不是。NL2SQL 要稳定输出，所以要降低随机性。创意场景才适合放宽采样。参数设置要看任务目标。

## 回答的坑

- 把 Top-k 和 Top-p 都说成固定数量截断，会漏掉 Top-p 按累积概率自适应这一点。
- 只说低 Temperature 能让 SQL 更稳定，却不提复读倾向和语法校验兜底。