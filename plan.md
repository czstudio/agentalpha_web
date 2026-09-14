# plan.md · 面试间知识库扩容计划

> **本文是唯一的任务源。** 任何新会话（workbuddy / ZCode / 人工）接手时：先通读本文，再从 §8 进度表里认领一个未勾选任务，按 §6 执行协议干活。做完一项勾一项。
> 创建：2026-09-13。对标：小林 coding（xiaolincoding.com）、卡码笔记（notes.kamacoder.com）。
> 站点：agentalpha.top，面试间子站 `/interview`。仓库：`H:/myCODE/xhs-pic/_repos/agentalpha_web`（master，push 触发 Vercel）。

---

## 0. 一句话目标

把 `/interview` 从「17 篇题解列表」扩成**对标小林/卡码的分类式面试知识库**：8 个主题分类、60+ 篇题解与图解教程、每分类一篇真题集、飞书纸笔记风排版（配图卡 + 论文卡 + 额外链接卡），全部内容源自 AgentAlpha 自有知识库与社区面经，人物形象统一为「小蓝」（DeepSeek 女生手绘风）。

**对标拆解（我们拿什么赢）：**
| 对手的武器 | 他们的做法 | 我们的对位 |
|---|---|---|
| 卡码：分类清晰 | 大模型面经 → 5 个子分类，每篇编号题解 | §3 的 8 个分类 + 分类落地页（工程任务 E1/E2） |
| 卡码：真题集长文 | 每分类一篇 12 题合集带锚点目录 | §4 B 类「真题集」8 篇（五厂 500 题就在本地知识库里） |
| 卡码：追问式写法 | 面试官会问 → 逐条追问 → 大厂追问汇总 | A 类题解已具备，B/C 类沿用，模板见 §6.4 |
| 小林：图解 | 每系列 500 图 + 15 万字 | C 类「图解教程」（feishu 纸笔记排版 + 小蓝配图 + 流程图） |
| 小林：系列感 | 图解网络/系统/MySQL 各自成系列 | 同分类侧栏「相关文章」+ 上下篇串联（E4） |
| 共同：更新感 | Last Updated、持续更新 | 每篇 frontmatter `updated` 字段 + 列表页显示 |

---

## 1. 现状盘点（接手前先知道这些）

### 1.1 已上线
- `/interview` 列表 + `/interview/[slug]` 详情，**17 篇**（No.01–No.17），8 分类雏形：FunctionCall 5、RAG 4、Agent 架构 3、多智能体 1、企业级 2、评测 1、Memory 1（详见 `content/interview/index.json`）
- 设计系统：`app/interview/interview.css`（`.ivu-` 前缀，暖米纸 #FAF6EF / 紫 #6E22F0 / 阅卷红 #B31B1B），规范全文 `H:/myCODE/xhs-pic/output/gzh-subsite/design-spec.md`
- 人物形象：**「小蓝」= DeepSeek 女生手绘风**（深蓝丸子头 + 齐刘海 + 鲸鱼发夹 + 蓝白卫衣），生成提示词固化在 `H:/myCODE/xhs-pic/tools/gzh/gen_hero_v3.py`
- 组件：题卡（Q01 虚线）、论文卡（红顶条 arXiv）、参考答案要点卡（紫底）、笔录体对话（👔/🙋 → `.ivu-u/.ivu-c`）、图注白卡、TOC、上下篇、CTA

### 1.2 内容源（唯一允许的取材地）
- **知识库**：`content/imports/agent-interview-v3.feishu.md`（12 章 + 五厂 500 真题，题目本身可引用，标注「AgentAlpha 面试题库 · 字节篇」等）
- **60 篇选题路线图**：`docs/feishu-60-article-roadmap.md`
- **社区语料**：`H:/myCODE/writingHUB/weixin-material-corpus/published/AgentAlpha__*.md`（自有公众号稿）
- **论文**：只允许引用经 arXiv 页面核实过的（已有 20 条在 `content/interview/index.json` 的 papers 字段）；新论文必须 WebFetch abs 页核实后才能上卡

### 1.3 内容管线工具（都在 `H:/myCODE/xhs-pic/tools/gzh/`）
| 工具 | 用途 |
|---|---|
| `gen_hero_v3.py` | 生成小蓝题图/内页插图（gpt-image-2，key 在 `C:/Users/40825/.unikeyx/key.txt`，不入库）。**新文章必跑**：cover.png + 可选 spot-1.png |
| `reindex_interview.py` | 重建 index.json + 字数/tags 校验 + 论文概念一致性检查 + 图片引用检查 |
| `fix_bold_pairs2.py` | 加粗 `**` 配对修复（中文标点贴边规则），**每次改完 md 必跑** |
| `clean_and_localize.py` | 微信导出稿清洗（新公众号稿入站时用） |

### 1.4 已知边界
- 内容文件可能被其他会话并发编辑——**动手前先 `git pull`，提交前先 `git status` 检查没夹带别人的半成品**
- GitHub 直连/代理都不稳：push 用重试循环（见 §6.5）
- 每篇论文卡数量宁缺毋滥（1–2 张真实 > 3 张凑数）；无出处的数字一律不写

---

## 2. 排版与组件规范（新增内容的硬要求）

文章排版 = 现有 `/interview` 模板 + 以下增强（飞书纸笔记风的落地件）：

1. **配图**：每篇至少 1 张小蓝题图（cover，自动）+ 至少 1 张内页元素（论文卡 / spot 插图 / 表格 / 代码块，四选二以上）
2. **额外链接卡**（新增组件 `E3`）：文末「延伸阅读」区，除论文卡外，可放站内笔记链接卡（`/notes/xxx`）与官方文档卡——样式沿用 `.ivu-paper` 但顶条改紫、徽章文字换成「站内 / DOC」
3. **笔录体**：场景开场与追问段用 `👔 面试官：…` / `🙋 我：…`（渲染器已支持，源文件不要加粗标签）
4. **60 秒回答骨架**：题解类（A/B 类）固定结尾章节，渲染成紫底结论卡（管线自动拆分，写 md 时照常写 `## 60 秒回答骨架` 即可）
5. **列表符号**：ul/ol 已恢复 disc/decimal；表格至少 1 张/篇
6. **加粗卫生**：写完必跑 `fix_bold_pairs2.py`，再以「渲染页无字面 `**`」为验收（curl 检查命令见 §6.5）

---

## 3. 目标站点架构

### 3.1 分类体系（8 个，固定词表，新增需先改本文）

| cat | 分类名 | 现有篇目 | 规划篇数（第一批后） |
|---|---|---|---|
| rag | RAG 检索增强 | 4 | 8 |
| agent | Agent 架构 | 3 | 8 |
| tooluse | 工具调用 | 5 | 9 |
| multiagent | 多智能体 | 1 | 4 |
| memory | 记忆系统 | 1 | 3 |
| eval | 评测与可观测 | 1 | 4 |
| enterprise | 项目实战与企业级 | 2 | 6 |
| jingchang | 五厂面经真题集 | 0 | 8（B 类真题集） |

> LLM 基础/训练/多模态暂不设独立分类（对标卡码是把大模型基础并进面经子分类）；后续篇目多了再拆。

**词表落地位置**：`content/interview/categories.json` 是分类词表与元数据（cat / name / intro / kbChapter / planned）的**唯一来源**，`reindex_interview.py` 按它校验 frontmatter 的 `category`。新增分类必须先改本节和这个文件。

**E1 实际分布（2026-09-14）**：rag 4、tooluse 4、agent 3、enterprise 3、multiagent 1、memory 1、eval 1，共 17 篇；`jingchang` 仅有定义、暂无篇目，列表页分类卡用 `includeEmpty=false` 口径自动隐藏，等 B1 上线后自动出现。

### 3.1.1 B 类篇目 ↔ KB 分组对应（实测 2026-09-14）

KB 第 12 章的公司分段行号与跨公司分组已核实，B 类选题时直接按此取材：

| 公司段 | KB 行号 |
|---|---|
| 字节跳动 | 498–629 |
| 阿里巴巴 | 630–761 |
| 腾讯 | 762–896 |
| 美团 | 897–1031 |
| 百度 | 1032–1166 |

B6/B7/B8 是**跨公司**选题，不是公司题集，取材自五厂各自分组：B6 取各公司 `RAG（11–16 题）` 组；B7 取 `MCP/Tool（8–10 题）` + `Tool/MCP/Skill（10 题）` 组；B8 取 `Agent（6–13 题）` + `Agent与规划（10 题）` 组。

### 3.2 路由
- `/interview` —— 升级为分类首页：顶部 8 个分类卡（图 + 篇数 + 一句话），下方「最新更新」列表（替换现在的纯平铺）
- `/interview/category/[cat]` —— 分类落地页：分类简介 + 全部文章（按 no 序）+ 同分类真题集置顶
- `/interview/[slug]` —— 详情页不变，新增：① 面包屑带分类；② 右栏 TOC 下方「同分类文章」列表（E4）
- frontmatter 新增 `category: <cat>` 字段；index.json 同步；**存量 17 篇要补 category**

### 3.3 导航
- 主导航「面试题库」指向 `/interview`（不变）
- 子站顶栏加一行分类快捷 chips（复用 `.ivu-tag` 样式，链到各分类页）

---

## 4. 内容路线图（三批，共 43 篇新增 → 总 60 篇）

> 每篇的完整 spec = slug / 标题 / question / 分类 / 大纲要点 / 真题来源 / 论文候选。下表给到「可直接开工」的粒度；写前仍需读对应 KB 章节。

### 第一批（B 类·真题集，8 篇）——性价比最高，先做

题库内容已经在本地（imports 第 12 章，五厂各 100 题），格式对标卡码「12 题合集 + 锚点目录 + 大厂追问汇总」。每篇 = 一个公司一道真题集：

| # | slug | 标题 | 来源章节 | 特殊要求 |
|---|---|---|---|---|
| B1 | jingchang-bytedance | 字节 Agent 岗 100 题精选：高频 20 问与答题骨架 | 第12章·字节 498–629 | 按 KB 分组（LLM基础/RAG/Memory/Agent架构）组织锚点 |
| B2 | jingchang-alibaba | 阿里 Agent 岗 100 题精选：高频 20 问与答题骨架 | 第12章·阿里 630–761 | 同上 |
| B3 | jingchang-tencent | 腾讯 Agent 岗 100 题精选：高频 20 问 | 第12章·腾讯 762–896 | 同上 |
| B4 | jingchang-meituan | 美团 Agent 岗 100 题精选：高频 20 问 | 第12章·美团 897–1031 | 同上 |
| B5 | jingchang-baidu | 百度 Agent 岗 100 题精选：高频 20 问 | 第12章·百度 1032–1166 | 同上 |
| B6 | jingchang-rag-50 | RAG 面试 50 题速览（按链路分层） | 第1章 58–93 + 五厂 RAG 组 | 每题一行结论 + 锚点 |
| B7 | jingchang-tooluse-50 | 工具调用面试 50 题速览（FC/MCP/A2A/Skills） | 第8章 324–350 + 五厂工具组 | 对标卡码「FC/MCP/Skills 区别」题 |
| B8 | jingchang-agent-75 | Agent 架构面试 75 题速览 | 第4章 169–210 + 五厂架构组 | 含 ReAct/记忆/规划/评估四组 |

### 第二批（A 类·题解补齐，20 篇）——补厚各分类

从 60 篇 roadmap + KB 各章「考点地图」选题，每篇写法与现有 17 篇一致。优先这些（slug / 主题 / 分类）：

| slug | 主题 | 分类 |
|---|---|---|
| rag-chunking | 分块策略：固定长度/语义/递归怎么选 | rag |
| rag-hybrid-retrieval | 稀疏+稠密混合检索与融合排序 | rag |
| rag-eval-dataset | RAG 评测集怎么构造（Recall@k、忠实度） | rag |
| rag-query-rewrite | 多轮对话的 Query Rewrite | rag |
| memory-write-policy | 什么信息值得写进长期记忆 | memory |
| memory-recall-fusion | 记忆召回后怎么与当前对话融合 | memory |
| agent-planning-reflection-v2 | 规划与反思：什么时候有用什么时候是废话 | agent |
| agent-observability | Agent 调试与可观测性：trace 怎么打 | eval |
| agent-guardrails | Agent 的安全边界与护栏设计 | enterprise |
| mcp-protocol | MCP 协议是什么，和 Function Call 什么关系 | tooluse |
| a2a-protocol | A2A 协议与多 Agent 通信 | tooluse |
| agent-skills | Skills 是什么，和 Prompt 的区别 | tooluse |
| multiagent-message-protocol | 多 Agent 的消息协议与状态同步 | multiagent |
| multiagent-conflict | 多 Agent 互相甩锅怎么办：监督者与仲裁 | multiagent |
| proj-rag-interview | 简历上的 RAG 项目怎么讲（三层追问实战） | enterprise |
| proj-agent-upgrade | 从 demo 到生产：Agent 项目升级路径 | enterprise |
| interview-trend-2026 | 2026 面试变天：四层追问（已有 No.16，补分类与系列链接） | enterprise |
| eval-golden-set | Golden Set 与回归测试在非确定系统里的用法 | eval |
| fc-schema-design | 工具 Schema 设计的 12 条军规 | tooluse |
| rag-permission | 检索权限与多租户隔离（缓存越权必考题） | rag |

### 第三批（C 类·图解教程，8 篇）——对位小林「图解系列」

每篇 = feishu 纸笔记排版的长教程（4000–6000 字 + 6–10 张小蓝场景插图/流程图 + 1 个可运行最小示例）：

| slug | 图解主题 | 配图重点 |
|---|---|---|
| digest-rag-pipeline | 图解 RAG 全链路：从文档到答案的 12 站 | 小蓝走 12 站流程图（逐站 1 图） |
| digest-function-call | 图解 Function Call：一次调用的完整生命周期 | 时序图 + 小蓝分段演示 |
| digest-agent-loop | 图解 Agent Loop：ReAct 循环的状态机 | 状态机图 + 断点场景 |
| digest-memory-layers | 图解记忆分层：工作/情景/语义/程序性 | 四层书架隐喻图 |
| digest-context-budget | 图解上下文预算：token 都花在哪了 | 预算分配图 |
| digest-multiagent-topo | 图解多智能体拓扑：四种编排模式 | 四种拓扑对比图 |
| digest-eval-metrics | 图解评测指标：从 BLEU 到 LLM-as-Judge | 指标决策树 |
| digest-harness | 图解 Agent Harness：模型外面那五层 | 分层解剖图 |

---

## 5. 工程任务清单（全部完成后「知识库」才成立）

- [x] E1 `content/interview/index.json` 增加 `category` 字段；存量 17 篇补齐分类（映射表见 §3.1）
- [x] E2 新路由 `/interview/category/[cat]`：分类落地页（简介 + 文章列表 + 真题集置顶）
- [x] E3 新组件「额外链接卡」（站内笔记 / 官方文档），样式沿用 `.ivu-paper` 顶条换紫
- [x] E4 详情页右栏新增「同分类文章」列表（当前分类、按 no 序，排除自身前 6 篇）
- [x] E5 `/interview` 列表页改版：8 分类卡置顶（图 + 篇数 + 一句话），最新更新列表下移
- [x] E6 子站顶栏加分类快捷 chips
- [x] E7 frontmatter 与列表/详情显示 `updated` 字段（最后更新时间）
- [x] E8 移动端分类页适配（分类卡单列、chips 44px）
- [x] E9 `lib/interview.ts` 支持 category 过滤与分类元数据（名称/简介/篇数）
- [x] E10 面包屑升级：首页 / 面试间 / 分类 / 文章

---

## 6. workbuddy 执行协议（每个会话照此办）

### 6.1 会话启动（必做，顺序执行）
1. `cd H:/myCODE/xhs-pic/_repos/agentalpha_web && git -c http.proxy= pull origin master`（失败就用带代理重试）
2. 读本文 §2、§6；读 `docs/article-quality-standard.md`
3. 在 §8 认领**一个**未勾选任务（一次会话只做一个内容任务或一个工程任务）
4. `git status` 确认工作区没有别人未提交的半成品

### 6.2 内容任务（A/B/C 类通用 SOP）
1. 读该篇 spec 指定的知识库章节（imports 文件 + 行号）
2. 写 `content/interview/<slug>.md`：frontmatter（slug/no/title/question/excerpt/tags/**category**/author: AgentAlpha/source: AgentAlpha 社区/minutes/words）+ 正文
   - 结构：场景开场（笔录体）→ 简要回答 → 4–6 个 `##` 章节 → 至少 1 表 → `## 60 秒回答骨架`
   - 2600–3800 字；真题引用标注「AgentAlpha 面试题库 · X 篇」；论文只用已核实列表
3. `python H:/myCODE/xhs-pic/tools/gzh/gen_hero_v3.py --only <slug> --force`（生成小蓝题图）
4. `python H:/myCODE/xhs-pic/tools/gzh/fix_bold_pairs2.py`
5. `python H:/myCODE/xhs-pic/tools/gzh/reindex_interview.py`（0 WARN 才算过）
6. 题图转 WebP：PIL 800/1600 两档（参照既有 cover-800.webp）
7. 门禁：`pnpm exec tsc --noEmit`（或 `./node_modules/.bin/tsc --noEmit`）→ `next build` → 起本地服务 curl 该页确认无字面 `**`、图片 200
8. 提交：`feat(interview): <slug> <标题>`；推送（重试循环，直连/代理交替）；勾选 §8 对应项并单独提交 `docs(plan): 勾选 <任务>`

### 6.3 工程任务 SOP
改动集中在 `app/interview/`、`components/interview/`、`lib/interview.ts`；每个工程任务独立 commit；完成后必须用真实内容页面截图/README 自验，不得只过编译。

### 6.4 写作模板（B 类真题集骨架）
```
# 标题
> 一句话说明本篇覆盖的题量与来源
## 目录（锚点列表，12/20 题）
## 每题一节（### N. 题目）
  - 面试官会问（1–2 问）
  - 答题要点（3–6 条，加粗关键词）
  - 追问预测（1–2 条）
## 大厂真实追问汇总（KB 里挑 5–8 条原题，只列问题）
## 写在最后（引流 CTA 与上/下篇）
```

### 6.5 门禁与推送命令速查
```bash
# 类型与构建
cd H:/myCODE/xhs-pic/_repos/agentalpha_web
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
# 本地预览（占 4318）
(./node_modules/.bin/next start -p 4318 &)
# 零残留检查（所有详情页无字面 **）
for s in $(python -c "import json;[print(x['slug']) for x in json.load(open('content/interview/index.json',encoding='utf-8'))['posts']]"); do
  c=$(curl -s "http://localhost:4318/interview/$s" | grep -o '\*\*' | wc -l); [ "$c" != "0" ] && echo "$s=$c"
done
# 推送（直连/代理交替重试）
for i in 1 2 3 4 5; do
  git -c http.proxy= -c https.proxy= push origin master && break
  git push origin master && break; sleep 10
done
```

---

## 7. 质量门与红线（违反即回退）

1. **原创**：只从 §1.2 允许的源取材；禁止复用「吴师兄学大模型」等任何外部公众号的句子/案例/配图；全站 grep「吴师兄」必须为 0
2. **论文**：新论文先 WebFetch arXiv abs 页核实标题与编号，再上卡；figure 编号必须在论文页面确认存在
3. **数字**：无出处的数字不写具体值；KB 真题原句可引用但需标注社区题库来源
4. **图片**：每张题图必须含小蓝（人物一致性），暖米纸底；生成后人工过目再入库
5. **门禁**：tsc 0 错、build 0 错、零字面 `**`、图片引用 0 缺失、reindex 0 WARN
6. **节奏**：对齐日更——每会话最多推进 1 篇内容；工程任务可单独会话批量做
7. **不动既有页面**：`/`、`/notes`、`/learn`、`/community` 的设计零改动

---

## 8. 进度跟踪（做完勾选并提交）

### 工程（§5）
- [x] E1 category 字段 + 存量补齐
- [x] E2 分类落地页
- [x] E3 额外链接卡组件
- [x] E4 同分类文章侧栏
- [x] E5 列表页改版（分类卡置顶）
- [x] E6 顶栏分类 chips
- [x] E7 updated 字段
- [x] E8 移动端适配
- [x] E9 lib category 支持
- [x] E10 面包屑升级

### 第一批 B 类真题集（8 篇）
- [ ] B1 jingchang-bytedance
- [ ] B2 jingchang-alibaba
- [ ] B3 jingchang-tencent
- [ ] B4 jingchang-meituan
- [ ] B5 jingchang-baidu
- [ ] B6 jingchang-rag-50
- [ ] B7 jingchang-tooluse-50
- [ ] B8 jingchang-agent-75

### 第二批 A 类题解（20 篇）
- [ ] rag-chunking　- [ ] rag-hybrid-retrieval　- [ ] rag-eval-dataset　- [ ] rag-query-rewrite
- [ ] rag-permission
- [ ] memory-write-policy　- [ ] memory-recall-fusion
- [ ] agent-planning-reflection-v2　- [ ] agent-observability
- [ ] agent-guardrails
- [ ] mcp-protocol　- [ ] a2a-protocol　- [ ] agent-skills　- [ ] fc-schema-design
- [ ] multiagent-message-protocol　- [ ] multiagent-conflict
- [ ] proj-rag-interview　- [ ] proj-agent-upgrade　- [ ] interview-trend-2026（补链接）
- [ ] eval-golden-set

### 第三批 C 类图解教程（8 篇）
- [ ] digest-rag-pipeline　- [ ] digest-function-call　- [ ] digest-agent-loop　- [ ] digest-memory-layers
- [ ] digest-context-budget　- [ ] digest-multiagent-topo　- [ ] digest-eval-metrics　- [ ] digest-harness

---

## 9. 里程碑

| 里程碑 | 内容 | 预计会话数 |
|---|---|---|
| M1 架构成立 | E1–E10 全部完成，分类页可用 | 3–4 个会话 |
| M2 真题集上线 | B 类 8 篇 + 分类页充实 | 8 个会话 |
| M3 题解补齐 | A 类 20 篇 | 20 个会话（日更节奏） |
| M4 图解系列 | C 类 8 篇 | 8–12 个会话（配图量大） |
| **完成态** | 60 篇、8 分类、对标小林/卡码的内容密度与分类体验 | — |
