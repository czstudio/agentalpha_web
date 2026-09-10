---
slug: "agent-memory-system"
title: "记忆系统不是聊天记录：短期、长期和压缩到底怎么分工"
excerpt: "记忆系统不是聊天记录仓库。先决定什么值得留下、该存成什么、什么时候取回；遇到新旧信息冲突，还要知道怎么覆盖和过期。"
series: "Agent 架构"
seriesNo: "06"
number: "25"
minutes: 20
---

客服 Agent 连续聊了三个月，突然把用户已经改过的地址又改回旧地址。

排查日志时，团队发现它“记得很多”：每轮对话都写进了向量库，检索命中率也不低。问题偏偏出在这里——它记住了用户三个月前说过的偏好，却没有记住那条偏好后来已经被改掉。

这就是记忆系统最容易踩的坑：把“存得多”当成了“记得好”。

面试官问 Agent Memory，通常不是想听你背 Working Memory、Episodic Memory 这些名词，而是想知道你能不能回答四个工程问题：什么信息值得写入，写入前如何核验，取回时怎样排序，冲突和删除如何真正生效。

## 先给一个能复述的答案

Agent 记忆应该分层设计：当前任务需要立即使用的内容放在 Working Memory；已经发生过的交互和任务轨迹放在 Episodic Memory；稳定的事实、用户偏好和业务知识放在 Semantic Memory；可复用的操作步骤和策略放在 Procedural Memory。写入不是“每轮对话都存”，而要经过相关性、重要性、置信度、敏感信息和冲突检查；读取也不是只按向量相似度，而是结合时间、租户、任务阶段和权限做重排。上下文压缩负责让当前窗口装得下，长期记忆负责跨会话复用，两者不能互相替代。

![Agent 记忆分层：当前上下文、经历、事实和程序各自承担不同职责](/images/notes/agent-memory-system/memory-layers.svg)

图 1：记忆不是一个大桶。越靠近当前任务，更新越快；越靠近长期知识，写入门槛越高。

## 一、先区分四种记忆，不然所有问题都会变成“要不要存”

### Working Memory：这一轮马上要用的东西

Working Memory 是任务工作台，不是数据库。当前目标、用户约束、已经完成的步骤、未决问题、最近一次工具结果，都应该在这里。

它的特点是生命周期短、更新频繁、对当前任务最重要。一个订单 Agent 在处理退款时，需要记住订单号、退款原因、用户确认状态和已经调用过的接口；任务结束后，这些内容不一定值得保留成长期记忆。

工程上可以把它设计成结构化状态，而不是一段不断变长的聊天文本：

```json
{
  "task_id": "refund-2026-0819-17",
  "goal": "确认订单是否满足退款条件并提交申请",
  "constraints": ["不得修改收货地址", "金额超过 500 元需要人工确认"],
  "facts": {"order_id": "A1024", "amount": 699},
  "completed": ["读取订单", "核对支付状态"],
  "pending": ["确认商品签收状态", "请求人工确认"],
  "last_tool_result": {"tool": "get_delivery", "status": "delivered"}
}
```

状态字段有一个好处：模型可以看到“还缺什么”，系统也可以检查“是否偷偷改了约束”。如果把这些信息全部埋在自然语言摘要里，后面很难判断是模型忘了，还是摘要时就丢了。

### Episodic Memory：发生过什么

Episodic Memory 保存一次次具体经历，例如“上周用户因为发票抬头错误退过一次货”“这个仓库的测试需要先启动 mock 服务”。它回答的是“以前发生过什么”，适合在相似任务出现时提供参考。

经历要带时间、来源、结果和置信度。单独保存一句“用户喜欢蓝色”没有意义；保存“用户在 2026-07-01 的选购对话中明确选择蓝色，并在 2026-08-03 又选择了黑色”才有可能处理冲突。

### Semantic Memory：比较稳定的事实

Semantic Memory 保存脱离某一次对话仍然成立的事实，例如企业报销规则、项目的服务入口、用户明确确认的语言偏好。它适合被检索，但仍然要有版本和来源。

“公司差旅标准是每晚 500 元”如果没有生效日期和适用地区，严格说还不是可用事实。知识库里的事实与记忆里的事实都要回答：谁说的、什么时候说的、适用范围是什么、后来有没有被撤销。

### Procedural Memory：怎么做

Procedural Memory 保存可复用的步骤和策略，例如“先查库存，再锁定，再创建订单”“遇到 429 时指数退避并换备用接口”。它比一段成功对话更接近 SOP，适合驱动工具调用。

程序记忆的风险也更高：如果一次偶然成功的轨迹被误存成流程，Agent 以后可能在错误场景里照做。因此程序记忆最好来自多次验证、人工确认或明确的版本化配置，而不是单条自动总结。

| 类型 | 主要内容 | 生命周期 | 适合的载体 | 常见风险 |
| --- | --- | --- | --- | --- |
| Working | 目标、约束、未决事项 | 当前任务 | 状态对象 / checkpoint | 被摘要丢掉约束 |
| Episodic | 具体经历、工具结果 | 天到月 | 事件表 + 向量索引 | 把偶然成功当规律 |
| Semantic | 事实、偏好、规则 | 月到年 | 版本化知识表 | 过期和冲突 |
| Procedural | 步骤、策略、恢复动作 | 版本周期 | 规则 / workflow | 越权或错误复用 |

## 二、写入长期记忆前，先过一扇门

如果每轮对话都自动写入长期记忆，系统迟早会得到一个“很会胡说的用户画像”。写入应该是一个有证据、有门槛的决策，而不是副作用。

### 相关性不等于重要性

用户说“今天下雨”，对当前打车任务可能相关，对三个月后的推荐任务却没有长期价值；用户说“我对花生过敏”，出现频率不高，但重要性和安全风险极高。

我会把写入评分拆成四项：

```python
def should_write(candidate, context):
    if candidate.contains_secret or candidate.contains_unverified_claim:
        return "reject"
    if not candidate.explicit or not candidate.reusable:
        return "working_only"

    score = (
        0.35 * candidate.relevance
        + 0.25 * candidate.importance
        + 0.20 * candidate.confidence
        + 0.20 * candidate.future_value
    )

    if candidate.conflict_with:
        return "review" if score < 0.8 else "replace_after_verify"
    return "write" if score >= 0.65 else "working_only"
```

这段逻辑的重点不是 0.65 这个数字，而是把“不写入长期记忆”变成一种正常结果。很多系统只有 write 和 error 两条路，模型自然会尽量写；真正稳定的系统还需要 working_only、review 和 reject。

![长期记忆写入门：候选事实先做证据、敏感性、冲突和价值判断](/images/notes/agent-memory-system/write-gate.svg)

图 2：写入门把“当前对话中出现过”与“值得跨会话保存”分开。

### 事实核验要看来源，而不是看语气

模型说得很确定，不代表信息可靠。写入前至少检查：

- 是用户明确陈述，还是模型从上下文推断出来的；
- 是工具返回的事实，还是工具错误后的空结果；
- 是否包含租户、账号、权限和时间范围；
- 是否和已有记忆冲突；
- 是否涉及密码、身份证号、支付信息等不应落库的秘密。

对于高风险领域，记忆候选要保留证据指针而不是只保留结论。例如“用户不接受乳糖”应关联原始消息 ID、确认时间和确认方式。没有证据指针，后面无法让用户查看、纠正或删除。

## 三、取回不是相似度搜索，而是一次任务级排序

向量相似度适合回答“这段文字像不像当前问题”，却不能单独回答“现在该不该用它”。一条旧记忆可能语义很相似，但已经过期；一条权限不匹配的记忆再相关，也必须被过滤掉。

一个更实用的检索分数可以写成：

\[
S(m, q) = w_r R(m,q) + w_i I(m) + w_t T(m) + w_c C(m) - w_x X(m,q)
\]

其中 \(R\) 是任务相关性，\(I\) 是重要性，\(T\) 是时间衰减，\(C\) 是置信度，\(X\) 表示冲突或风险。权重不需要永远固定：医疗场景提高安全和置信度，客服场景提高时效性，代码 Agent 则提高仓库版本匹配。

读取流程建议分三步：先做租户、用户、版本和权限过滤；再用关键词与向量取候选；最后按时间、重要性、冲突和任务阶段重排。顺序不能倒。先把不该看的记忆召回，再在模型层“提醒它别用”，等于把权限问题交给最不可靠的环节。

![记忆读取链路：权限过滤先于召回，任务重排晚于候选生成](/images/notes/agent-memory-system/retrieval-rerank.svg)

图 3：记忆服务的边界先由系统守住，再把少量有用内容交给模型。

## 四、冲突、覆盖和遗忘：记忆必须允许自己被改写

一个不会遗忘的记忆系统，最后一定会把旧事实和新事实一起塞给模型，让模型自己猜哪个是真的。

### 冲突不是异常，是正常生命周期

用户地址变化、产品规则更新、项目分支切换、员工权限回收，都会产生冲突。冲突处理至少有三种策略：

| 情况 | 处理方式 | 需要留下的证据 |
| --- | --- | --- |
| 新事实明确覆盖旧事实 | 新版本生效，旧版本标记 superseded | 新旧来源、时间、操作者 |
| 两条事实适用范围不同 | 按租户、地区、时间或任务分层 | scope 与优先级 |
| 无法判定哪条正确 | 暂不覆盖，进入澄清或人工审核 | 冲突双方及待确认问题 |

“最后写入者赢”是最危险的默认规则。它会让一个低权限、低置信度的自动总结覆盖用户刚确认的事实。

### 删除要覆盖所有副本

用户要求删除个人信息时，删除对象不是一条向量。至少要检查结构化记忆、向量索引、缓存、会话摘要、日志、备份和下游训练数据。

工程上最好给每条记忆一个稳定的 `memory_id` 和 `source_ids`，删除时发出可追踪的 tombstone 事件；在线读取先过滤 tombstone，异步任务再清理物理副本。这样即使向量库清理有延迟，也不会在删除窗口内继续把旧记忆提供给模型。

![记忆冲突的处理生命周期：保留证据、建立新版本，再决定覆盖或撤销旧事实](/images/notes/agent-memory-system/conflict-lifecycle.svg)

图 4：长期记忆的“遗忘”应该是有证据、有版本、可撤销的状态变更。

### 摘要不是压缩机，是有损编码器

上下文压缩常被写成“让模型总结一下前面的对话”。但摘要会丢掉否定、条件、时间和未决事项，尤其容易把“用户不允许做 X”压成“用户偏好 X”。

更稳妥的做法是把摘要拆成固定槽位：目标、硬约束、已验证事实、工具结果、未决问题、下一步、过期时间。每轮摘要都和原始状态做差异检查，关键约束变化时拒绝静默覆盖。

```python
SUMMARY_FIELDS = [
    "goal", "hard_constraints", "verified_facts", "tool_results",
    "open_questions", "next_actions", "expires_at"
]

def compress(state, old_summary):
    draft = llm_extract(state, fields=SUMMARY_FIELDS)
    if not draft.hard_constraints:
        raise ValueError("missing constraints")
    if contradicts(old_summary, draft):
        return {"status": "review", "draft": draft}
    return {"status": "accepted", "summary": draft}
```

## 五、怎么证明 Memory 带来了收益

只看“记忆命中率”很容易自欺。命中相似度高，不代表任务做得更好；系统还可能因为记忆变多，反而把上下文污染得更严重。

我会至少设置四组对照：无记忆、只保留 Working Memory、Working + 结构化长期记忆、全量记忆检索。每组在同一批跨会话任务上比较：任务成功率、约束遵守率、错误写入率、冲突解决率、上下文 token、延迟和删除生效时间。

| 指标 | 要回答的问题 | 失败信号 |
| --- | --- | --- |
| 任务成功率 | 记忆是否帮助完成目标 | 加记忆后反而下降 |
| 约束遵守率 | 旧约束是否被正确带回 | 忘记禁区或重复询问 |
| 错误写入率 | 模型幻觉有没有进入长期库 | 低频但高风险事实增多 |
| 冲突解决率 | 新旧事实能否正确覆盖 | 旧事实仍被召回 |
| 上下文成本 | 记忆是否值得这笔 token | 命中率升、成本翻倍 |
| 删除生效时间 | 用户控制是否真实有效 | 删除后仍能检索到 |

实验集要故意放入反例：用户先说 A 后改成 B、摘要跨越否定句、相似但不同租户的事实、过期规则和删除请求。没有这些题，Memory 看起来永远很聪明。

## 六、一个可回放的记忆记录

线上出错时，不能只看到“模型引用了这条记忆”。还要知道它为什么被写入、为什么被取回、当时有哪些候选被排除。

```json
{
  "memory_id": "mem_7f2",
  "tenant_id": "tenant_a",
  "kind": "semantic",
  "content": "用户明确要求中文回答",
  "source_ids": ["msg_182", "msg_183"],
  "confidence": 0.96,
  "scope": {"user_id": "u_9", "expires_at": null},
  "status": "active",
  "write_decision": "explicit_user_statement",
  "retrieval": {"query": "回答语言", "rank": 1, "score": 0.87},
  "version": 3
}
```

只要这条记录完整，下面四种故障就能区分：写错了、取错了、排序错了，还是模型取到后没有遵守。没有记录时，团队往往会重新调 embedding，然后希望问题自己消失。

## 面试官的三层追问

### L1：短期记忆和长期记忆有什么区别？

短期记忆服务当前任务，内容可以高频修改，重点是目标、约束、已完成步骤和未决事项；长期记忆跨会话复用，写入门槛更高，必须带来源、时间、范围和置信度。上下文压缩是让当前窗口装得下，不等于把压缩结果永久当事实。

### L2：什么信息值得写入长期记忆？

我会要求它具备跨会话复用价值，并且来源可核验、范围明确、风险可接受。用户明确确认的偏好、稳定业务事实和多次验证的流程更适合写入；一次偶然对话、模型推断、秘密和没有来源的总结只能留在当前任务或直接拒绝。

### L3：记忆冲突怎么办？

先做版本、时间、作用域和来源比较，不采用简单的最后写入覆盖。明确的新事实可以 supersede 旧事实；作用域不同的事实并存；无法判定时进入澄清或人工审核。删除还要通过 tombstone 事件覆盖缓存、向量、摘要、日志和备份。

## 删除请求还要做一次“tombstone 传播探针”

从向量索引删掉一条记录，只能证明主路径做过删除，不能证明缓存、异步队列、摘要和备份都已经忘记它。删除请求落地后，我会发出带版本号的 tombstone，等待各层确认，再用原始 id 和语义改写各查一次；如果任一层仍命中，就把状态留在 `DELETION_PENDING`，不对外宣称删除完成。

~~~yaml
tombstone_probe_receipt: tpr_20260820_46
memory_id: mem-8848
tenant_id: team-alpha
tombstone_version: 7
layers:
  vector_index: absent
  semantic_cache: absent
  summary_store: absent
  async_queue: drained
  backup_manifest: masked
negative_queries:
  exact_id: no_hit
  paraphrase: no_hit
decision: deletion_propagated
~~~

探针回执只记录层级状态和版本，不把被删除的原文、个人信息或密钥复制进日志。对多租户记忆，还要把 tenant_id 作为传播边界的一部分，避免“同一 memory_id 在另一个租户仍可命中”的误判。

![Tombstone 传播探针：删除完成要穿过缓存、队列、摘要与备份](/images/notes/agent-memory-system/tombstone-probe-card.svg)

### L5：为什么删除后还要做反向查询？

因为删除 API 的成功只代表写入了删除意图，不能代表所有异步消费者都处理完。反向查询把“没有命中”变成可验收的负向证据；原始 id 查不到还不够，语义改写也查不到，才说明泄漏路径被一起覆盖。

## 记忆系统还要把“谁能看到”写进记录

记忆的正确性不止是内容对不对，还包括租户、用户、会话和用途边界。一个用户在对话中透露的偏好，不能因为语义相似就被另一个用户检索到；同一用户的私人记忆，也不一定允许被团队 Agent 共享。写入和取回都要带 scope，并把跨 scope 的拒绝作为可观测事件。

```yaml
memory_record:
  id: mem_902
  subject: user_17
  scope: [tenant_a, user_17, assistant:shopping]
  content: "偏好无糖饮料"
  source: conversation_441
  visibility: private
  retention: 90d
  retrieval_guard: "scope exact match; no semantic bypass"
  delete_key: tombstone:mem_902
```

![记忆的可见范围与检索闸门](/images/notes/agent-memory-system/memory-scope-gate-card.svg)

做评测时要专门放入跨用户、跨租户和角色切换样本，检查模型是否会把“相关”误当成“可见”。删除也要沿着同一个 scope 传播到向量索引、摘要缓存和离线导出；否则用户看到的只是主库里删掉了，系统实际仍可能从旧副本召回。

### L5：为什么 scope 不能只放在 prompt 里？

因为 prompt 是可被模型改写的输入，不是访问控制。scope 应在存储查询、索引过滤和工具执行层强制生效，并在 trace 中记录命中与拒绝原因。模型可以帮助解释记忆，却不能决定自己有没有资格读取它。

## 记忆读取还要有“新鲜度租约”，避免旧事实长期污染任务

记忆经过权限过滤并不代表可以永久使用。岗位、价格、项目状态和用户偏好都会过期；如果只按相似度召回，几个月前的旧决定可能比当前事实更像问题，模型也很难知道它已经失效。读取长期记忆时，我会把 `valid_from`、`expires_at`、来源版本和最近一次验证状态一起带入排序，并对高风险事实要求重新确认。

新鲜度租约不是简单按时间删数据，而是把“多久可以直接引用”和“多久必须回查”写成字段。租约到期后，记忆仍可作为线索展示，但不能直接驱动写操作；如果新的权威来源与旧记忆冲突，要产生 tombstone 或 supersede 事件，保证后续召回不会又把旧版本带回来。

~~~yaml
memory_freshness_lease: mfl_20260820_71
memory_id: mem-8848
scope: tenant-a/user-17
claim: billing_contact_is_alice
source: crm-record-2026w33
valid_from: 2026-08-12T09:00:00Z
expires_at: 2026-08-19T09:00:00Z
status: expired
read_policy:
  low_risk: cite_as_stale_hint
  high_risk: require_authoritative_recheck
superseded_by: crm-record-2026w34
decision: no_write_from_memory
~~~

![记忆新鲜度租约卡：来源版本、有效期和风险级别共同决定能否直接引用](/images/notes/agent-memory-system/memory-freshness-lease-card.svg)

### L5：为什么过期记忆不能直接删除？

删除会丢掉冲突和演进的证据，也无法解释模型过去为什么做出某个决定。更稳妥的是标记过期或被替代，限制它的使用范围，并让新的权威来源完成 supersede；只有满足隐私删除要求时，才沿副本链做真正删除。

## 记忆写入先过 provenance 和置信度门

长期记忆不是“对话里出现过就保存”。一次用户陈述可能是猜测、临时偏好或来自没有权限的材料；如果直接写入，后续每次召回都会把它伪装成稳定事实。写入前应保存来源类型、原文定位、主体范围、有效期、置信度和撤销方式；读取时再按任务、时间和权限过滤。记忆条目最好能回到一条可审计的 evidence，而不是只留下模型改写后的句子。

```yaml
memory_provenance_gate: mpg_20260820_100
candidate:
  subject: user_a
  claim: "偏好使用轻量模型做草稿"
  source: explicit_user_statement
  source_ref: chat_20260820_17#8
  confidence: 0.96
scope: user_a
valid_until: 2026-12-31
revoke_if: [user_correction, policy_change]
decision: write_versioned_memory
```

![记忆写入门：来源、范围、有效期和撤销条件共同决定是否进入长期记忆](/images/notes/agent-memory-system/memory-provenance-gate-card.svg)

### L5：为什么“用户说过”仍然不代表可以永久记住？

用户可能在角色扮演、临时任务或过期上下文中说出一句话。没有 scope 和有效期，临时偏好会污染未来任务；没有撤销路径，错误事实会越积越深。记忆系统要把“曾经出现”与“当前可用”分成两个状态。

## 60 秒面试回答

我不会把 Agent Memory 设计成一个“所有聊天记录都进向量库”的大桶。当前任务的目标、约束和未决事项放在 Working Memory；具体经历、稳定事实和可复用流程分别放进 Episodic、Semantic 和 Procedural Memory。写入长期记忆前先做来源、敏感信息、置信度和冲突检查；读取时先做租户、权限和版本过滤，再按相关性、重要性、时间和置信度重排。上下文压缩只解决窗口容量，不替代长期记忆。评测时要做无记忆和分层记忆的对照，除了成功率还看错误写入、冲突、删除生效时间和 token 成本。

## 容易被扣分的说法

- “所有对话都存起来，召回时让模型自己判断。”——把权限和冲突交给模型了。
- “向量相似度高就说明记忆有用。”——没有考虑时间、范围、版本和风险。
- “摘要就是压缩，不会影响事实。”——摘要会丢否定、条件和未决事项。
- “删除向量就完成了隐私删除。”——缓存、日志、备份和下游副本仍可能存在。
- “记忆越多，Agent 越个性化。”——噪声和错误写入会让行为更不稳定。

## 带走一张 Memory 检查清单

- [ ] 当前任务是否有结构化 Working Memory，而不是只有聊天文本？
- [ ] 四种记忆的边界、生命周期和写入来源是否明确？
- [ ] 长期记忆是否经过来源、敏感性、冲突和可复用性检查？
- [ ] 读取是否先做租户、用户、版本和权限过滤？
- [ ] 冲突、覆盖、过期和删除是否都有可追踪事件？
- [ ] 摘要是否保留硬约束、工具结果和未决事项？
- [ ] 是否有无记忆、分层记忆和全量记忆的对照评测？

## 本篇总结

- 记忆系统的核心不是“存更多”，而是“在正确的时间带回正确的信息”。
- Working、Episodic、Semantic、Procedural Memory 解决的是不同时间尺度和复用方式。
- 写入长期记忆需要证据门；读取需要任务级重排；冲突需要版本化处理。
- 上下文压缩是容量管理，不应该悄悄变成事实覆盖。
- 记忆收益必须用任务成功、约束、错误写入、删除和成本一起证明。

## 相关内容

- [RAG 不只是“向量库 + 提示词”：证据怎样一路到答案？](/notes/rag-retrieval-pipeline)
- [Attention 到底在算什么？从一行公式讲清上下文理解](/notes/llm-attention-context)
- [Code Agent 跑到一半挂了，怎样恢复又不重复执行？](/notes/code-agent-resume-exactly-once)
- [Agent 已经会 ReAct，为什么还要做 Agentic RL？](/notes/agentic-rl-react)

## 参考资料

1. AgentAlpha《Agent 岗面试宝典 v3》第 4 章：Memory 与上下文题群。
2. Packer et al., *MemGPT: Towards LLMs as Operating Systems*（2023）。
3. Park et al., *Generative Agents: Interactive Simulacra of Human Behavior*（2023）。
