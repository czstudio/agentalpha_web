---
slug: "mcp-protocol-boundaries"
title: "MCP 统一了工具接入，为什么还有这么多坑？"
excerpt: "MCP 统一了模型连工具、资源、提示模板的方式，但不会自动解决身份、权限、版本、租户隔离、副作用控制。协议统一只是起点。"
series: "工具调用"
seriesNo: "10"
number: "46"
minutes: 25
---

团队把十几个内部系统接进 Agent 后，产品经理问：“既然都有工具了，为什么还要 MCP？”工程师回答：“为了统一。”再问统一了什么，会议室突然安静。

MCP 的价值不是给每个工具换个新名字，而是约定主机、客户端和服务端如何发现能力、交换结构化消息、读取资源和处理生命周期。它能减少集成胶水，但不会替你决定哪些工具能被谁调用，更不会让危险写操作自动变安全。

## 拆完先给结论

MCP 可以看成模型应用连接外部能力的一层协议：Host 管理会话和用户上下文，Client 代表某个模型应用连接 Server，Server 暴露 tools、resources 或 prompts。标准化后，工具发现、参数 schema、结果回传和能力协商更容易复用；但身份认证、租户隔离、权限策略、版本兼容、资源投毒和副作用幂等仍属于部署方。接入 MCP 时要把协议层和 policy gateway 分开，按工具而不是按服务器授予最小权限。

![MCP 的 Host、Client、Server 与外部系统边界](/images/notes/mcp-protocol-boundaries/mcp-architecture.svg)

图 1：MCP 统一的是连接方式，不是把所有外部系统变成可信系统。

## 一、先分清四个角色

| 角色 | 负责什么 | 不应该负责什么 |
| --- | --- | --- |
| Host | 用户会话、模型编排、审批、展示 | 不把所有权限下放给 Server |
| Client | 与一个 Server 建立会话、转发请求 | 不绕过 Host 的身份上下文 |
| Server | 暴露工具、资源和提示模板 | 不自行决定用户是否有权执行 |
| 外部系统 | 真实数据和副作用 | 不把 Client 当成最终审计者 |

同一台 Host 可以连接多个 Server。风险也因此从“一个 API key”变成多条信任链：哪个 Server 能读什么，返回的资源是否可信，工具调用是否经过审批，都要逐项回答。

## 二、Tools、Resources、Prompts 不是一回事

- **Tools**：可被调用的动作，可能有副作用，例如查询订单、创建工单、提交代码。
- **Resources**：可读取的上下文，例如文件、数据库记录、文档或日志。
- **Prompts**：供 Host 选择的提示模板或工作流入口。

把资源当工具、把提示模板当权限策略，是常见误区。一个资源即使只读，也可能包含密钥、客户数据或未发布信息；一个 prompt 名字看起来安全，也不代表它里面没有要求写入生产的动作。

## 三、能力发现要经过筛选

服务端可以声明工具列表，但 Host 不应把所有工具原样塞给模型。先做租户、用户、环境和风险过滤，再生成当前会话的工具目录：

```python
def visible_tools(server_tools, identity, env):
    return [
        tool for tool in server_tools
        if policy.allows(identity, env, tool.name)
        and tool.schema_version in SUPPORTED_SCHEMAS
        and tool.risk_level <= env.max_risk
    ]
```

工具名还要带命名空间，例如 `crm.search_customer` 和 `analytics.search_customer`，避免模型因为同名而选错。发现到的 schema 要缓存版本，但不能永久信任；服务端升级后要重新协商并跑契约测试。

![能力发现经过命名空间、权限、版本和风险过滤后才进入模型上下文](/images/notes/mcp-protocol-boundaries/capability-filter.svg)

图 2：Server 宣布“我能做什么”，不等于当前用户真的“可以做什么”。

## 四、MCP 接入的五个坑

### 1. 把 Server 当成可信插件

Server 返回的资源可能被污染，工具描述也可能诱导模型把敏感内容发给第三方。对外部 Server 要做来源登记、代码审查、网络出口限制和数据分类；必要时只允许访问脱敏代理。

### 2. 只在连接层做认证

连接成功只说明 Client 认识 Server，不说明当前用户有权读某个客户。每次工具执行仍要带主体、租户、环境和 trace ID，policy gateway 重新检查。

### 3. 版本只看协议版本

协议版本兼容，不代表业务 schema 兼容。`customer_id` 改成 `account_id`、金额单位从分改元，都可能让旧 Agent 产生有效但错误的调用。工具应声明语义版本和弃用日期，并对参数做兼容层。

### 4. 资源引用没有过期边界

把一个资源 URI 放进长上下文，几小时后它可能已经变化、失权或被删除。资源要带版本、租约和读取时的权限检查，重要数据最好返回快照哈希。

### 5. 把“标准化”误当成幂等

协议规定消息怎么传，不规定外部扣款是否只发生一次。所有写工具仍要自己设计幂等键、未知结果对账和补偿。

## 五、把权限放在协议外层

一个简化的调用路径应该是：

```text
模型提出 tool call
  → Host 校验 schema 与用户意图
  → Policy Gateway 检查身份、租户、环境、审批、预算
  → MCP Client 转发
  → MCP Server 调用外部系统
  → 结果经过脱敏、大小限制与审计后返回
```

如果 Client 直接把调用发到 Server，Host 可能看不到最终参数和真实回执，后续只能靠日志拼图。高风险工具还要要求人类确认，并把确认绑定到具体参数哈希，而不是“我同意这个工具”这种模糊授权。

## 六、如何处理资源和结果的可信度

资源返回值至少带：来源、版本、更新时间、敏感级别和内容哈希。工具结果要区分“外部系统确认的事实”和“Server 自己计算的建议”：

```json
{
  "source": {"server": "crm", "resource": "customer/42", "version": "v17"},
  "facts": [{"field": "status", "value": "active"}],
  "derived": [{"name": "risk_hint", "value": "review"}],
  "expires_at": "2026-08-19T21:00:00Z"
}
```

模型可以引用 `facts`，但不应把 `derived` 当成外部真值。这样发生争议时，能追溯是原始系统变了，还是 Server 的计算逻辑变了。

![MCP 的信任边界：身份、资源、工具和结果都要留下可审计的证据](/images/notes/mcp-protocol-boundaries/trust-boundaries.svg)

图 3：协议消息是链路，不是信任证明；每个边界都要重新验收。

## 七、传输方式不同，安全边界也不同

本地开发常用 stdio，远程部署则会遇到 HTTP+SSE 或 Streamable HTTP。不要把“能连上”当成选型完成：

| 传输 | 适合场景 | 需要额外处理 |
| --- | --- | --- |
| stdio | 同机、单用户、开发工具 | 进程隔离、子进程权限、输出污染 |
| HTTP + SSE | 长连接、服务端推送 | 鉴权、连接生命周期、代理超时 |
| Streamable HTTP | 远程多租户、流式结果 | 会话绑定、重放、背压和网关限流 |

远程 Server 不应直接信任请求里的 `user_id`。身份要由网关签发并绑定会话，Server 只消费经过验证的主体、租户和环境声明。流式结果中途断开时，仍要能用 `request_id` 查询最终状态。

![stdio、SSE 与 Streamable HTTP 的部署边界和治理重点](/images/notes/mcp-protocol-boundaries/mcp-transport-matrix.svg)

图 4：传输层只是运送消息，身份、租户和回执仍要在每一跳验证。

## 八、Tools、Resources、Prompts 要有不同生命周期

工具目录可以按会话刷新，资源引用应有版本和租约，prompt 模板则要有审核与发布流程。三者混在一个“插件列表”里，会导致权限、缓存和失效策略互相污染。

```text
tools    → discover → policy filter → invoke → receipt
resources→ locate   → permission   → snapshot → cite
prompts  → publish  → review       → select   → trace
```

例如，一个 prompt 可以建议“先查订单再退款”，但它不能替代退款工具的权限；一个 resource 可以提供订单详情，但不能因为被读取过就自动允许写操作。接口设计上最好给三类能力不同的 API 和审计事件。

## 九、远程 MCP Server 的多租户隔离

多租户 Server 最容易犯的错误是把租户过滤留给模型或客户端。真正的隔离至少要在 Server 查询层再做一次，并把租户条件写进数据库查询和缓存 key：

```python
def get_customer(ctx, customer_id):
    require_tenant(ctx.tenant_id)
    row = db.query_one(
        "select * from customers where tenant_id = ? and id = ?",
        [ctx.tenant_id, customer_id],
    )
    return redact(row, subject=ctx.subject)
```

缓存、资源 URI、日志和错误消息也要带租户边界。不能因为返回值是“只读”就忽略越权读取；数据泄露同样是高风险副作用。

## 十、协议升级要做契约测试和灰度

接入新版本时，先用真实历史 trace 做兼容回放：工具名、参数 schema、错误码、资源版本和结果 envelope 都要比较。破坏性变更可以通过新命名空间并行发布，旧客户端在弃用期内继续获得明确的迁移提示。

```text
旧 Server v1 ──┐
                ├─ policy gateway ── Host
新 Server v2 ──┘
       ↑
  contract tests + canary + rollback
```

灰度期间要观察拒绝率、参数迁移率、资源命中率和未知结果比例。只看连接成功率，会漏掉“协议通了但业务语义错了”的问题。

## 十一、分层题库：从协议角色到部署设计

### L1：MCP 解决什么问题？

它标准化了模型应用与外部 Server 之间的能力发现、结构化调用、资源读取和会话通信，减少每个应用重复写适配器的成本。

### L2：用了 MCP 是否就安全了？

不是。身份、租户、工具权限、资源敏感性、版本兼容、网络出口、审批、审计和幂等仍要由 Host 与 policy gateway 控制。

### L3：多个 MCP Server 同时提供同名工具怎么办？

使用命名空间和语义版本，Host 根据当前任务、权限和风险筛选可见工具；结果还要做 schema、来源和副作用验证，不能只按名字自动路由。

### L1：stdio 和远程 HTTP 的主要差异是什么？

stdio 更适合同机隔离，HTTP 适合共享和远程调用；HTTP 需要额外处理身份、会话、代理超时、限流和流式断线恢复。

### L1：Resources 能不能直接当成 Tools 用？

不能。Resource 是读取上下文，Tool 是可执行动作；读取资源也要做敏感级别和租户权限检查，不能因为没有写副作用就默认公开。

### L1：Prompt 模板是不是权限策略？

不是。Prompt 只能引导模型，最终权限仍由 Host 和 policy gateway 在每次调用前判断。

### L2：为什么要给工具加命名空间？

不同 Server 可能有同名工具但语义、数据源和副作用不同。命名空间让路由和审计可解释，也便于版本并行。

### L2：远程 MCP Server 如何防止伪造租户？

租户和主体由网关签发并绑定会话，Server 重新校验并把租户条件放入查询、缓存、资源 URI 和日志，不能信任模型或客户端参数。

### L2：资源为什么需要租约和快照哈希？

长上下文中的资源可能失权或变化。租约限制使用时间，快照哈希帮助确认回答引用的具体版本。

### L2：MCP 协议升级如何灰度？

用历史 trace 做契约回放，旧新 Server 并行部署，按租户或流量比例灰度，监控拒绝率、迁移率和未知结果，异常时回滚命名空间。

### L3：如何设计一个 MCP policy gateway？

网关接收 Host 的主体、租户、环境、工具、参数摘要和 trace，完成 schema、风险、审批、速率与数据分类判断，再签发短期可验证的执行上下文。

### L3：Server 返回的资源含有提示注入怎么办？

按来源和数据分类隔离资源，把原文当不可信数据，做内容扫描和字段脱敏；模型只能把它作为事实候选，不能让资源内容改变权限或系统指令。

### L3：如何验证某个 MCP 工具真的产生了预期副作用？

要求外部系统返回 request_id 和可查询状态，做沙箱契约测试与线上对账；不要以 Server 返回的自然语言描述作为唯一证据。

## 能力发现也要发一张可回放的登记回执

MCP 的能力发现很容易被讲成“列出工具名称和参数”。真正接入生产系统时，我还需要知道：这个工具从哪里来、属于哪个租户、允许在哪个环境使用、会不会产生副作用，以及这份描述什么时候失效。否则模型看到的只是一个漂亮的工具列表，策略层却不知道它是不是刚刚换过实现。

可以给每次发现结果发一张登记回执。回执不是给模型看的长说明，而是给网关、审计和回放系统共同消费的契约：

```json
{
  "discovery_id": "disc_aac566",
  "server": "billing-mcp",
  "tenant": "team-alpha",
  "transport": "https",
  "tools": [{
    "name": "billing.refund",
    "schema_hash": "sha256:8e1...",
    "risk": "high",
    "side_effect": "write",
    "requires_approval": true
  }],
  "source_attestation": "signed:v4",
  "policy_snapshot": "policy-2026-08-19.3",
  "expires_at": "2026-08-19T18:00:00Z"
}
```

这里有三个细节经常被忽略。第一，`schema_hash` 绑定的不只是名称，而是参数、枚举和副作用声明，工具偷偷改字段时要让旧回执失效。第二，`policy_snapshot` 让一次调用可以回到当时的授权版本，避免今天看日志、明天用新策略解释昨天的动作。第三，`expires_at` 把发现结果当成短租约，远程 Server 下线、证书轮换或租户切换时不必等客户端重启才生效。

模型真正拿到的可以是裁剪后的工具卡；网关保留完整回执，并在调用前重新核对租户、环境、风险和版本。面试时这样回答，比“使用 MCP 可以动态发现工具”多了一层工程闭环：发现是事实，授权是判断，执行还要再次验证。

![MCP 能力发现登记回执](/images/notes/mcp-protocol-boundaries/capability-discovery-receipt.svg)

### L5：如果远程 Server 在租约内替换了工具实现怎么办？

我会要求 Server 对能力清单和实现版本做签名，网关在调用前校验签名、`schema_hash` 和证书状态；发现签名变化就冻结高风险工具，保留旧版本回执，并触发重新审批。这样不是假设远程端永远诚实，而是让“能力变了”成为一个可观测、可回滚的事件。

## 能力发现后还要做一次“调用前重校验”

能力发现回执只说明“刚才看见了什么”，不等于“现在允许做什么”。从发现到执行可能已经过了几秒甚至几分钟，租户、环境、工具 schema、审批状态和副作用声明都可能变化。高风险调用必须在网关再做一次短路检查：

~~~json
{
  "mcp_preflight_receipt": "mpr_9d9dbf",
  "discovery_id": "disc_aac566",
  "current_schema_hash": "sha256:8e1...",
  "policy_snapshot": "policy-2026-08-20.2",
  "lease": {
    "expires_at": "2026-08-20T18:00:00Z",
    "valid": true
  },
  "params_digest": "sha256:4cb...",
  "approval": {
    "required": true,
    "status": "approved",
    "scope": "billing.refund:single"
  },
  "decision": "execute"
}
~~~

重校验至少要比较当前 schema hash、租户与环境、调用参数摘要、租约有效期和审批 scope；任一项变化就冻结执行，并返回需要重新发现或重新审批，而不是让模型自行猜测。尤其要防止“工具名没变但参数语义变了”，这类兼容性事故往往比工具消失更隐蔽。

![MCP 调用前重校验：发现回执、当前策略、参数摘要与租约](/images/notes/mcp-protocol-boundaries/preflight-recheck-card.svg)

### L5：为什么能力发现回执不能直接当作执行授权？

因为发现是一个带时间点的事实，授权是结合当前身份、策略、参数和副作用做出的判断。把两者混在一起会让过期 schema 或旧审批继续生效；调用前重校验能把变化变成明确的拒绝和重新审批事件。

## 协议升级要有一张兼容性矩阵

MCP 的协议边界不只发生在“能不能连上”。Server 升级后，工具名可能没变，参数却新增了必填字段；资源 URI 仍然可访问，返回结构却换了版本。若客户端只做启动时握手，兼容问题会在真正调用时才暴露，最后变成一条难以归因的模型错误。

我会把客户端、Server、schema 和策略版本放在同一张兼容性矩阵里，并用最小契约样本做灰度：

~~~json
{
  "compatibility_matrix": "mcp_86ab22",
  "client": "host-2.4",
  "server": "billing-mcp-3.1",
  "tool": "billing.refund",
  "client_schema": "sha256:old...",
  "server_schema": "sha256:new...",
  "changes": ["amount.currency required"],
  "probe": {
    "legacy_fixture": "failed_fast",
    "current_fixture": "passed",
    "side_effect": "none"
  },
  "action": "hold_high_risk_and_offer_upgrade"
}
~~~

兼容性检查要覆盖旧客户端、当前客户端和待发布客户端，不要只测最新版本。对高风险写工具，schema 不兼容时宁可明确拒绝并提示升级，也不要让模型根据旧描述拼一个“看起来合理”的参数。对只读资源，可以在字段未知时降级到稳定子集，但要把被裁剪的字段写入回执，防止回答缺少信息却没有解释。

![MCP 协议兼容性矩阵：版本差异先用无副作用探针验证，再决定升级或阻断](/images/notes/mcp-protocol-boundaries/compatibility-matrix-card.svg)

### L5：为什么不能只依赖 JSON Schema 校验？

JSON Schema 只能回答结构是否满足，不能证明字段语义、权限范围和副作用仍然兼容。我会把 schema 校验、版本差异、无副作用契约探针和策略回执放在一起；结构通过但语义变化时，仍然要进入人工或灰度门槛。

## Resource、Tool 和 Prompt 的生命周期不能混成一个缓存

MCP 里三类能力看起来都能被 Host 发现，但生命周期和风险不同：Resource 更像带版本的事实读取，Tool 可能产生副作用，Prompt 是可组合的模板。把它们放进同一份长缓存，会让撤销、版本和权限变更无法及时生效。能力目录应分别记录 TTL、订阅/刷新方式、敏感级别和是否需要每次调用前重校验。

对 Resource，可以缓存稳定的只读元数据，但正文仍要按版本和 ACL 取回；对 Tool，只缓存描述和 schema，不缓存执行授权；对 Prompt，要记录来源、模板版本和注入边界，防止旧模板把过期规则带进新任务。发现回执只是“现在看到了什么”，不是永久许可。

```yaml
mcp_lifecycle_matrix: mlm_c8a700
resource:
  cache: metadata_only
  refresh: version_or_ttl
  acl: read_before_inject
tool:
  cache: schema_only
  refresh: every_high_risk_call
  authorization: capability_per_request
prompt:
  cache: template_with_source
  refresh: release_version
  injection_boundary: host_owned
gates:
  revoked_tool_executable: false
  stale_resource_in_context: 0
  prompt_source_traceable: true
decision: separate_lifecycles
```

![MCP 生命周期矩阵：Resource、Tool、Prompt 分别管理缓存、刷新、权限和注入边界](/images/notes/mcp-protocol-boundaries/lifecycle-matrix-card.svg)

### L5：为什么 Resource 可以缓存，Tool 却不能缓存授权？

Resource 缓存的是可重新校验的描述或只读事实；Tool 授权绑定当前主体、参数、风险和副作用，过一段时间就可能被撤销或改 scope。缓存 Tool 描述可以，执行 capability 必须每次按当前策略签发或重校验。

## MCP 能力发现要和“执行授权”分成两次握手

能力列表解决的是“服务器能做什么”，不是“这个主体现在可以做什么”。发现阶段可以缓存名称、输入 schema 和版本；真正调用前仍要把 principal、resource、action 和过期时间重新绑定，并验证授权没有被撤销。

```yaml
capability_handshake:
  contract: mch_4d24d2
  discovery:
    server: files.example
    tool: delete_document
    schema_version: 3
    cache_ttl_seconds: 300
  execution_recheck:
    principal: user_42
    resource: doc_8f2c
    action: delete
    authorization_version: auth-91
    expires_at: 2026-08-20T10:15:00Z
  deny_if: [revoked, expired, resource_mismatch, schema_changed]
```

![MCP 两次握手：能力发现可以缓存，执行授权必须在调用前重新绑定并检查撤销](/images/notes/mcp-protocol-boundaries/capability-handshake-card.svg)

### L5：为什么能力发现回执不能直接当执行授权？

能力发现往往比真实请求早几分钟，期间用户权限、资源归属和工具 schema 都可能变化。把发现结果当授权，会把“服务器支持某能力”误解成“这个主体可以对这个资源执行动作”。

## 最后，把它讲清楚

我把 MCP 看成 Host、Client、Server 和外部系统之间的连接协议。它统一能力发现、tool/resource/prompt 的描述和结构化消息，能降低接入成本，但不替代权限和安全。接入时我会给工具加命名空间和语义版本，只把经过身份、租户、环境和风险过滤的能力交给模型；资源带版本、租约和敏感级别，结果区分事实与推导。所有写工具仍走 policy gateway，具备审批、幂等、未知结果对账和审计。

## 带走一张检查清单

- [ ] 是否分清 Host、Client、Server 和外部系统的责任？
- [ ] Tools、Resources、Prompts 是否分别治理？
- [ ] 能力发现是否经过租户、风险、版本和命名空间过滤？
- [ ] 外部 Server 是否有来源、代码、网络和数据审查？
- [ ] 写工具是否仍有审批、幂等、回执与审计？

## 相关笔记

- [Function Calling 不是模型会调函数就完事：先把契约验清楚](/notes/tool-function-contract)
- [工具返回一大段 JSON，为什么 Agent 反而更容易做错](/notes/tool-output-shaping)
- [Agent 安全不是加一句提示词：权限、工具和数据边界怎么设计](/notes/agent-security-boundaries)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
