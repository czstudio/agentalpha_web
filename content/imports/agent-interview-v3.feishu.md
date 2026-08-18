<title>Agent 岗面试宝典 v3 · 精华版</title>

# 🎯 Agent 岗面试宝典 v3

<callout emoji="✅">
**大厂面经文档** · 覆盖 12 大章节 · 1500+ 大厂面试题 · 持续更新
</callout>

<callout emoji="📘">
**适用人群**：备战 Agent 岗（大模型算法 / AI 应用 / Agent 工程）的校招 & 社招候选人
**覆盖公司**：字节、阿里、腾讯、DeepSeek、美团、京东、百度、蔚来等一线大厂
**题目来源**：AgentAlpha社区成员真实面试题、牛客网真实面经、CSDN 面试题汇总、Datawhale 开源项目、掘金技术社区、公众号原创文章
</callout>



本文档由AgentAlpha社区：<cite doc-id="QtYQddrAFoLIb9xFe7PckJnmn1b" file-type="docx" title="AgentAlpha社区 —— 立志打造AI界黄埔军校" type="doc"></cite> 出品

<callout emoji="👍">
我们推出了[AgentAlpha](http://agentalpha.top)训练营计划，逼你从第一性原理出发，不再是“学习一个工具”，而是在获取一种定义未来规则的核心能力。这条路线和后续的训练营，就是一张“造浪者”的船票。学习路线
RAG →memory→  单 Agent 架构与强化  4) 多智能体协作   → 5) DeepSearch → 6) 高效推理 → 7)  code agent 8) →  自进化agent →9) Agentic RL→ 10) 综合实战
</callout>

![图片展示了AgentAlpha训练营的课程体系，分为10个模块。模块1是RAG基础，包含1.1 RAG基本架构等；模块2是2-agent memory，涵盖2.1记忆内容区分等；模块3是单Agent、多智能体协作，有3.1Agent基础结构等内容；模块4是DeepSearch，包含5.1Agentic Search In-Loop等；模块5是6-LLM推理加速，有6.1缓存优化等；模块6是7-Code Agent，涉及7.1端到端代码任务执行流程等；模块7是9-Agentic RL，包含9.1搜索“工具调用”嵌入强化学习环境中的动作等；模块8是8-掌握自进化编码；模块9是综合成长，有1.参与1000 - 7000星原创开源项目等。](https://api3-eeft-drive.feishu.cn/space/api/box/stream/download/authcode/?code=NmUwN2MzOWUwNzlkY2EyNmZjZDdkMGIyMzM0MmJiMjFfOGRmNThmNzc1MjkxNWRmZmNkNGI3YTQ4NzczZTA5NWNfSUQ6NzY3MDUzMzc2MzA4ODQzNjE4MF8xNzg2ODgwOTI5OjE3ODY4ODQ1MjlfVjM)

感兴趣的可以联系微信： aistudioyes 

## 📋 快速导航

点击章节名称即可跳转到对应文档。建议按 **「📖 章节导读 → 专项真题 → 综合真题」** 顺序复习。



<callout emoji="📊">
**学习仪表盘**
📚 **12 大章节**　|　📝 **1500+ 面试题**　|　⏱️ **建议总时长：20-30 天**
🟢 核心必考 4 章　|　🟡 高频出现 4 章　|　🔵 专项深挖 3 章
</callout>

| 序号 | 章节 | 题目量 | 考频 |
|-|-|-|-|
| 1 | 🔍 RAG（检索增强生成） | 50+ | 🟢 核心必考 |
| 2 | 🧠 LLM 基础 | 60+ | 🟢 核心必考 |
| 3 | 🎓 LLM 训练 | 25+ | 🟡 高频出现 |
| 4 | 🤖 Agent 架构 | 60+ | 🟢 核心必考 |
| 5 | 🌐 多智能体 | 60+ | 🔵 专项深挖 |
| 6 | 🎨 多模态 | 50+ | 🔵 专项深挖 |
| 7 | 📊 评测 | 55+ | 🟡 高频出现 |
| 8 | 🔧 工具调用 | 55+ | 🔵 专项深挖 |
| 9 | 💻 编程题 | 45+ | 🟡 高频出现 |
| 10 | 🚀 项目深挖 | 40+ | 🟡 高频出现 |
| 11 | 🗣️ 通用与软实力 | 800+ | 🟢 核心必考 |

**📍 推荐学习路线：Ch1 → Ch2 → Ch4 → Ch12 → Ch11 → Ch3 → Ch7 → Ch9 → Ch10 → Ch5 → Ch8 → Ch6**（先学核心，再做公司专项训练）

[**🏢 第 12 章 · 五厂高频面试题（500 题）**](https://agentalpha.feishu.cn/docx/EeMIdOtiMokxEExLSPwcqqUFnCe#doxcnPazELlYqa8Ct5Khuj631Td)：字节、阿里、腾讯、美团、百度各 100 题。

## 🔍 第 1 章 · RAG（检索增强生成）

面试必考核心章节，覆盖 Embedding、分块、向量数据库、重排、评测全链路。

<callout emoji="🎯">
**考点地图：**Embedding 原理 → 文本分块策略 → 向量数据库选型 → 检索与重排序 → RAG 全链路评测
</callout>

<grid>
<column width-ratio="0.333333">
📚 **题目总量**：80+ 题
</column>
<column width-ratio="0.333333">
⏱️ **建议时长**：3-5 天
</column>
<column width-ratio="0.333333">
🔥 **考频评级**：⭐⭐⭐⭐⭐ 核心必考
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| **📖 📖 章节导读 · 考点地图 & 复习路线** | [**👉 进入**](https://www.feishu.cn/docx/KuKddNj42olUrQxsXqZcCK3anSg) |
| 真题 · 检索（35 题） | [👉 进入](https://agentalpha.feishu.cn/docx/OAv1djOINospcIx6cEUcN3iHnKc) |
| 真题 · Embedding（13 题） | [👉 进入](https://www.feishu.cn/docx/MZzwdvbxho8x6Nxmwl6cg6ShnWd) |
| 真题 · 分块 | [👉 进入](https://www.feishu.cn/docx/D1qsd05GMoGkcEx1wsuc6U25nUh) |
| 真题 · 向量数据库 | [👉 进入](https://www.feishu.cn/docx/RSf2dod5No4TWIxhsvvcWIbAnsg) |
| 真题 · 重排 | [👉 进入](https://www.feishu.cn/docx/S5XsdQV8Roh66SxKavick6sln5X) |
| 真题 · 评测 | [👉 进入](https://agentalpha.feishu.cn/docx/BPX4dQDGIoYwLzxI40wcl4QwnWg) |
| 真题 · 综合（上）272 题 | [👉 进入](https://agentalpha.feishu.cn/docx/BLpeddsE0o6jxuxg0ZxcutSpnNd) |
| 真题 · 综合（下）272 题 | [👉 进入](https://agentalpha.feishu.cn/docx/GoqedAs4FozkdrxxBIockN7fnOc) |

---



## 🧠 第 2 章 · LLM 基础

Transformer、Attention、MoE、推理优化等地基知识，面试高频考点。

<callout emoji="📍">
**考点地图**
Transformer 架构 → Attention 机制 → MoE 稀疏激活 → KV Cache → 推理优化策略
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
60+
</column>
<column width-ratio="0.333333">
**建议时长**
2-3 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐⭐ 核心必考
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/EBnOdAXtJoO17jx985ZcKwvqnDd) |
| 真题 · Attention | [👉 进入](https://www.feishu.cn/docx/D3IpdiBJZoPcFWxgrKacNg3Qnbf) |
| 真题 · MoE | [👉 进入](https://www.feishu.cn/docx/ROtDdeyVQo65sOxuhk6coomDnVc) |
| 真题 · Transformer | [👉 进入](https://agentalpha.feishu.cn/docx/AB2TdVbVPo5jOgxcA1qcDBYjnGg) |
| 真题 · 推理优化 | [👉 进入](https://www.feishu.cn/docx/F3SFd4itcoL2eexjLAKcUOZmnbb) |
| 🧠 **真题 · 位置编码与长文本（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/W7vcdadtxoaBYIxgWPFcZHqBn2c) |
| 真题 · 综合 | [👉 进入](https://agentalpha.feishu.cn/docx/UU7YdmyXCofrZGxeLLnckzs7njc) |

---



## 🎓 第 3 章 · LLM 训练

RLHF、SFT、训练策略等进阶话题，决定面试深度。

<callout emoji="📍">
**考点地图**
SFT 微调 → RLHF 对齐 → DPO/PPO → 训练稳定性 → 数据工程
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
35+
</column>
<column width-ratio="0.333333">
**建议时长**
2-3 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐ 高频出现
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/H9N3dazDcovEdyxJJyQcZuMpnrg) |
| 真题 · RLHF | [👉 进入](https://www.feishu.cn/docx/SHc5dIJC1oQd80xoOW3cKiQQnTd) |
| 真题 · SFT | [👉 进入](https://www.feishu.cn/docx/OOCKdEeU0oyrHLxY555cHdSsn3b) |
| 真题 · 训练策略 | [👉 进入](https://www.feishu.cn/docx/LKUndRoOAot5UFxAcaxcunJkn7f) |
| 🎓 **真题 · 预训练与数据工程（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/HT20dVBdroIsNbxLgjvcSdrrn0c) |
| 真题 · 综合 | [👉 进入](https://agentalpha.feishu.cn/docx/IQVSd5HtMohw53xQVXeca8JKnQf) |

---



## 🤖 第 4 章 · Agent 架构

Agent 岗面试分水岭，覆盖 ReAct、记忆系统、规划、综合设计。

<callout emoji="📍">
**考点地图**
ReAct 循环 → 记忆系统设计 → 规划与反思 → Tool Use → Agent 评估
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
75+
</column>
<column width-ratio="0.333333">
**建议时长**
3-4 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐⭐ 核心必考
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/XRh1dOuaMoFhB4x4kRJcsnINnJg) |
| 真题 · ReAct | [👉 进入](https://www.feishu.cn/docx/DfQyd8vkDo5Om2xWwIscxpGAnod) |
| 真题 · 记忆系统 | [👉 进入](https://www.feishu.cn/docx/Ai5jdtTRto3VSHx4SarctA5Tnlf) |
| 真题 · 规划 | [👉 进入](https://www.feishu.cn/docx/Br6xdM34ooC3CYxz1onccQw9nmc) |
| 🤖 **真题 · Agent 安全与对齐（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/QOy5dbbT6oa9LsxObu4chFfsncf) |
| 🤖 **真题 · Agent 架构对比（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/I7AvdXX9loia4zxTVwBc4ZZLnqo) |
| 🤖 **真题 · Agent 部署与运维（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/CtredX5cGoOu51xWIqac7fMgnzg) |
| 🤖 **真题 · Agent 性能优化（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/Jaf6doznCozPTDxh9AOc6ta2nic) |
| 🤖 **真题 · Agent 调试与可观测性（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/WanGdCBAWodYalxQx1ecbhj8n2b) |
| 🤖 **真题 · Agent 设计模式进阶（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/Kc19dN4qbozYYDxtMrMcFEaqnje) |
| 真题 · 综合 | [👉 进入](https://agentalpha.feishu.cn/docx/UZ8idkcFqoON8SxV60lcgIw1nog) |

---



## 🌐 第 5 章 · 多智能体

多智能体系统设计与协作机制。

<callout emoji="📍">
**考点地图**
Multi-Agent 通信 → 协作策略 → 角色分配 → 共识机制 → 冲突解决
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
95+
</column>
<column width-ratio="0.333333">
**建议时长**
1-2 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐ 专项深挖
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/LxoBd5XaXoBQ1wx0MwCcQqk4nYN) |
| 真题汇总 | [👉 进入](https://www.feishu.cn/docx/BT0RdWadOoSsBQxdhPScabJ7nDf) |
| 📘 **真题 · Multi-Agent 基础（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/XFIhdDwRPoL1aXxZXmXceiGMntb) |
| 📘 **真题 · 通信与协作（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/NqcvdwolmoMecVxn02Bc3EURncc) |
| 📘 **真题 · 动态切换与共识（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/IkBWdanbPoK9cjxxvmCcQtOen6c) |
| 🌐 **真题 · Multi-Agent 框架实战（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/IQDRdgnwTo0US9x6jjNc8LnynAd) |
| 🌐 **真题 · Multi-Agent 容错与恢复（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/SySDdSRdmooLphx37zacsQZtnGe) |
| 🌐 **真题 · Multi-Agent 调度与资源管理（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/YUoPdZKwvoNuzcxUEEScEsuGnpf) |
| 🌐 **真题 · Multi-Agent 实战：软件开发（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/P3zTd3LNxobmfqxz4lbcStjdnDh) |
| 📘 **真题 · 场景设计（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/QEhIdLdcJoy3CTx2DkDcsOUUnWd) |

---



## 🎨 第 6 章 · 多模态

多模态大模型与跨模态对齐。

<callout emoji="📍">
**考点地图**
视觉-语言模型 → 跨模态 Embedding → 多模态 RAG → 模态融合
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
85+
</column>
<column width-ratio="0.333333">
**建议时长**
1-2 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐ 专项深挖
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/N1QMd5TuvoSgNPxpSeYculS7njf) |
| 真题汇总 | [👉 进入](https://www.feishu.cn/docx/WuYKd1KDboOlRhxiCjQcRZzsndb) |
| 🎨 **真题 · 多模态对齐与理解（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/OzFLdJuO1oXr9AxOZQAcHbe7nAc) |
| 🎨 **真题 · VLM 架构与微调（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/MRffdTqzfoxMZZx0r2BcCXzhn8c) |
| 🎨 **真题 · 多模态综合（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/CKEBdvzLLoAZRvxgepFckipxnYd) |

---



## 📊 第 7 章 · 评测

大模型与 Agent 的评测体系。

<callout emoji="📍">
**考点地图**
自动评测指标 → 人类评估 → Benchmark 设计 → Agent 评测框架
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
55+
</column>
<column width-ratio="0.333333">
**建议时长**
1-2 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐ 高频出现
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/HlxQdGT58oNMQfxHF0Gc0L82nCf) |
| 真题汇总 | [👉 进入](https://agentalpha.feishu.cn/docx/LvMndMSSWosj9sx9iiJctBHpnym) |
| 📏 **真题 · Eval 指标与方法（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/DvGRdh1KyotvkBxHraBcxp81n2j) |
| 📏 **真题 · Agent 评估与 Benchmark（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/AjpXdXzwkoOa4rxv89ycT8FSn6e) |
| 📏 **真题 · 评估综合（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/SjwLdIohAokYg4xChRUcLxFXnDc) |

---



## 🔧 第 8 章 · 工具调用

Function Calling 与外部工具集成。

<callout emoji="📍">
**考点地图**
Function Calling → API 设计 → 工具选择 → 错误处理 → 安全约束
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
80+
</column>
<column width-ratio="0.333333">
**建议时长**
1-2 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐ 专项深挖
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/RD0Nd5iyQoWHTNxqWVHcqoqxnVg) |
| 真题汇总 | [👉 进入](https://www.feishu.cn/docx/Je4idCoDoogoCxxagDKcJFS4nzc) |
| 🔧 **真题 · Function Calling 与 Tool Use（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/UD3CddKwpoNo6txBeGkcCuxWnoh) |
| 🔧 **真题 · MCP 协议（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/HtiKd8gfnoItc6x0Qt0coQITnUe) |
| 🔧 **真题 · A2A / Skill / 通信网关（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/P3ZzdyWTkoGsCUxUUX7cl5oJnrb) |
| 🔧 **真题 · 工具注册中心与发现（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/Re2udZ5UAo4VknxazZrchgIdnLd) |
| 🔧 **真题 · Agent API 网关设计（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/GcpPdsR7cowbrbxYybqc4EU7ngd) |
| 🔧 **真题 · 工具调用安全深度（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/R6gjdHTuBo87cWx9ReYczPWInxe) |
| 🔧 **真题 · 工具与协议综合（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/QBIvdtmdroRDCWxywS2caaXBn3b) |

---



## 💻 第 9 章 · 编程题

算法与工程实现题。

<callout emoji="📍">
**考点地图**
字符串处理 → 树/图遍历 → 动态规划 → LLM 推理优化代码题
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
65+
</column>
<column width-ratio="0.333333">
**建议时长**
2-3 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐ 高频出现
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/HCX3dGfhgoMhwQxrwTycoQ0nnSg) |
| 真题汇总 | [👉 进入](https://www.feishu.cn/docx/DnL4dnxiZosgokxXuprc01P5nmf) |
| 💻 **真题 · Agent 核心代码（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/Cwg4dH57log1v0xhjQtcPsJ8nnh) |
| 💻 **真题 · Agent 系统集成实战（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/X6bhdFwK5oGkBixj0sLcM0SanQf) |
| 💻 **真题 · Agent 测试与 CI/CD（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/PsdvdTw0xouLRBxwLcXc1M18nEb) |
| 💻 **真题 · 工程与算法代码（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/PVkEdvPEJox8OxxWisjcXjHSnBc) |

| **🆕 真题 · Agent 核心代码（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/Cwg4dH57log1v0xhjQtcPsJ8nnh) |
|-|-|
| **🆕 真题 · 工程与算法代码（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/PVkEdvPEJox8OxxWisjcXjHSnBc) |

---



## 🚀 第 10 章 · 项目深挖

项目经验与架构设计深挖。

<callout emoji="📍">
**考点地图**
项目选型 → 架构设计 → 性能优化 → 故障排查 → 迭代演进
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
90+
</column>
<column width-ratio="0.333333">
**建议时长**
2-3 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐ 高频出现
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/NIl4d94YlosWF6xTFOZc3fAUn3Q) |
| 真题汇总 | [👉 进入](https://agentalpha.feishu.cn/docx/NyJbdFirjoNsByxZmtQcEZiUnEg) |
| 🚀 **真题 · 智能客服 Agent（10题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/MczZdJVb9oCk8KxsEp5crbYCn2f) |
| 🚀 **真题 · 业务 Agent 设计（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/TVB5du9xcopE9jxcOi7cr1Wpn1d) |
| 🚀 **真题 · 智能办公 Agent（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/FZkvdgK50o8ZIjxRWdfcfP7gnof) |
| 🚀 **真题 · 数据分析 Agent（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/CEU1dqXyYoxHLvx7uWBcBcDdnpf) |
| 🚀 **真题 · 编程助手 Agent（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/OO0ddFQO8oZySZx0hitcWzWsnZe) |
| 🚀 **真题 · 通用设计方法（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/WgRmd3IOAoEzZ1xbD00cwTbznFm) |

| **🆕 真题 · 智能客服 Agent（10题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/MczZdJVb9oCk8KxsEp5crbYCn2f) |
|-|-|
| **🆕 真题 · 业务 Agent 设计（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/TVB5du9xcopE9jxcOi7cr1Wpn1d) |
| **🆕 真题 · 通用设计方法（8题）** | [**👉 进入**](https://agentalpha.feishu.cn/docx/WgRmd3IOAoEzZ1xbD00cwTbznFm) |

---



## 🗣️ 第 11 章 · 通用与软实力

通用技术问题与软实力考察。

<callout emoji="📍">
**考点地图**
八股基础 → 系统设计 → 行为面试 → 职业规划 → 技术视野
</callout>

<grid>
<column width-ratio="0.333333">
**题目总量**
800+
</column>
<column width-ratio="0.333333">
**建议时长**
7-10 天
</column>
<column width-ratio="0.333333">
**考频评级**
⭐⭐⭐⭐⭐ 核心必考
</column>
</grid>

| 📄 文档 | 🔗 链接 |
|-|-|
| 📖 **章节导读** | [**👉 进入**](https://www.feishu.cn/docx/EW9ede7oEoACS5x5r2UcWYsSnVc) |
| 真题 · P0 基础 188 题 | [👉 进入](https://agentalpha.feishu.cn/docx/Mv5Hd1YXIo05e9xCiprcAnj2nJL) |
| 真题 · P1 进阶 ❶ 158 题 | [👉 进入](https://agentalpha.feishu.cn/docx/AU2ZdkTPYorujax3kjVcV2ixnMM) |
| 真题 · P1 进阶 ❷ 158 题 | [👉 进入](https://agentalpha.feishu.cn/docx/TZWUdzUwOomZ1Ix041ccHGAvn5b) |
| 真题 · P1 进阶 ❸ 158 题 | [👉 进入](https://agentalpha.feishu.cn/docx/C60Wdey2lo2v8cx9zQjcRlnWnYb) |
| 真题 · P1 进阶 ❹ 158 题 | [👉 进入](https://agentalpha.feishu.cn/docx/FsYXdJDFsotidhxmsFtcoFmonzb) |

---



## 🏢 第 12 章 · 五厂高频面试题（500 题）

本章按字节跳动、阿里巴巴、腾讯、美团、百度五家公司整理，每家公司 100 题。所有题目使用同一种编号形式，直接进入练习。复习时先口述结论，再补原理、方案取舍、项目数据和失败案例。

| 公司 | 题量 | 重点方向 |
|-|-|-|
| 字节跳动 | 100 题 | 推荐/搜索、Agent 工程、训练、推理与高并发 |
| 阿里巴巴 | 100 题 | 电商/企业服务、RAG、工具平台、模型训练与部署 |
| 腾讯 | 100 题 | 社交/内容场景、Memory、多 Agent、系统设计与工程实现 |
| 美团 | 100 题 | 搜索推荐、本地生活、RAG、训练、算法与稳定性 |
| 百度 | 100 题 | 搜索、知识增强、Agent、模型训练、推理与平台能力 |

### 字节跳动（100 题）

**LLM基础（10 题）**

1. 训练好模型后如何评测？
2. Transformer 中残差连接和 LayerNorm 分别解决什么问题？Pre-LN 与 Post-LN 如何取舍？
3. 为什么注意力分数要除以根号 d_k？不缩放会发生什么？
4. RoPE 如何编码相对位置信息？长上下文外推时为什么容易退化？
5. MQA、GQA 和 MHA 的计算与 KV Cache 开销有什么区别？
6. MoE 的路由、负载均衡和专家并行分别有哪些工程难点？
7. 大模型幻觉可以分成哪些类型？如何区分知识缺失、检索失败与生成偏差？
8. 如何解释 Scaling Law？数据、参数量和训练计算量应该怎样配比？
9. 为什么自回归模型适合生成任务？与编码器模型相比有什么能力边界？
10. 如果中文电商语料中存在大量行业缩写，Tokenizer 应如何评估和改进？

**RAG与检索（10 题）**

1. 业务链路上线后主要看哪些衡量指标？
2. 企业知识库从文档接入、清洗、切片、索引到生成的完整链路怎么设计？
3. 如何为短文本、长文档、表格、图片和代码分别设计 Chunk 策略？
4. 向量召回、BM25、规则召回与图检索怎样做多路召回和融合排序？
5. 如何构造 RAG 离线评测集？检索和生成分别用哪些指标？
6. 多轮对话中如何做 Query Rewrite，避免改写后丢失用户约束？
7. 如果召回内容高度相关但答案仍然错误，你怎样定位生成端问题？
8. 知识库频繁增量更新时，如何保证索引、缓存和在线服务版本一致？
9. 如何实现文档级、段落级权限过滤，并防止缓存导致越权？
10. 面对搜索、推荐或广告领域的多跳问题，怎样构建可验证的证据链？

**Memory与上下文（10 题）**

1. 解释一下 Agent 的记忆机制，为什么主流 Agent 要淘汰传统 RAG？
2. Working Memory、Episodic Memory、Semantic Memory 和 Procedural Memory 如何划分？
3. 什么信息应该写入长期记忆？写入决策如何避免把幻觉永久保存？
4. 如何设计记忆的相关性、重要性、时效性与置信度综合排序？
5. 用户画像发生变化时，如何检测记忆冲突并完成覆盖、合并或遗忘？
6. 超长任务中怎样做上下文压缩，同时保留目标、约束、工具结果和未决事项？
7. 工具返回几十万 Token 日志时，应该如何抽取、分层存储和按需回放？
8. 多租户 Agent 的长期记忆如何做权限隔离、加密和可删除？
9. 如何评测 Memory 对任务成功率的真实增益，而不是只看检索相似度？
10. 当摘要多轮迭代后发生语义漂移，你如何发现并纠正？

**Agent与规划（10 题）**

1. 什么时候工作流就够了，什么时候才该上 Agent？
2. ReAct、Plan-and-Execute、ReWOO 与状态机分别适合什么任务？
3. Planner 生成的计划不可执行时，Executor 应该怎样反馈并触发 Replan？
4. 如何设计 Agent 的停止条件，避免死循环、空转和无限反思？
5. 一个 Agent 连续三次反思失败后，系统应该如何降级或转人工？
6. 怎样区分任务失败、工具失败、模型失败和权限失败，并制定恢复策略？
7. 如何让 Agent 在开放任务中先澄清需求，而不是直接执行高风险操作？
8. Agent 的结构化输出持续不稳定时，Prompt、Schema、解码和校验层如何协同？
9. 如何设计可回放的 Agent 状态，使线上 Bad Case 能完整复现？
10. 搜索广告场景中，怎样让 Agent 在效果、成本、合规和延迟之间做决策？

**Tool/MCP/Skill（10 题）**

1. 说说什么是 MCP？它的核心内容是什么？
2. 说说 Agent Skill 是什么？
3. Function Calling、MCP、REST API 和本地 CLI 的职责边界是什么？
4. 一个 Agent 有几百个工具时，怎样做工具检索、路由和候选集裁剪？
5. 工具 Schema 应如何设计，才能降低选错工具和参数生成错误？
6. 工具调用的超时、重试、幂等、补偿和熔断分别如何实现？
7. MCP 的 stdio、旧版 HTTP+SSE 与 Streamable HTTP 传输方式如何选型？
8. 如何防止 Prompt Injection 诱导 Agent 调用越权工具或泄露工具结果？
9. Skill 与普通 Prompt 的区别是什么？Skill 如何发现、加载、版本化和评测？
10. 当多个工具都能回答同一问题时，如何训练或评测模型的工具选择能力？

**Multi-Agent（10 题）**

1. 反思失败三次以后怎么办？
2. 单 Agent、Supervisor-Worker、层级式与去中心化多 Agent 架构如何选型？
3. 多 Agent 之间传自然语言还是结构化状态？怎样控制信息损失？
4. 多个 Agent 对结论产生冲突时，怎样仲裁而不靠简单多数投票？
5. 多 Agent 并行调用同一数据库时，如何处理事务、锁、幂等和资源竞争？
6. 如何发现多 Agent 系统中的循环委派、任务重复和责任漂移？
7. 不同 Agent 使用不同模型时，怎样根据任务难度、成本和延迟做路由？
8. 如何评测每个 Agent 的局部贡献，识别拖累系统的节点？
9. 多 Agent 的共享记忆与私有记忆怎样划分，如何防止错误传播？
10. 在内容审核场景中，如何设计规则、检索、判定和复核 Agent 的协作链路？

**训练与Agent RL（10 题）**

1. 如何构造高质量 SFT 数据，并识别数据泄漏、模板偏置和答案污染？
2. SFT、DPO、PPO、GRPO 各自优化什么目标？应怎样选型？
3. DPO 为什么不需要显式奖励模型？它的假设和局限是什么？
4. 工具调用训练数据应该包含哪些字段？无效调用和拒绝调用样本怎样构造？
5. 一个 Query 有两个正确工具时，训练标签如何设计才不会惩罚合理策略？
6. 如何从线上轨迹中筛选 Agent RL 数据，避免把偶然成功当成优质样本？
7. 稀疏最终奖励下，怎样做过程奖励、信用分配和奖励塑形？
8. 如何防止 Agent 在强化学习中奖励黑客、走捷径或伪造工具结果？
9. 合成训练数据如何做质量过滤、难度分层和去重？
10. 如何评估微调后模型的通用能力是否回退，并定位灾难性遗忘？

**推理部署（10 题）**

1. 对模型的推理框架有了解吗？
2. vLLM 的 PagedAttention 解决了什么问题？连续批处理怎样提升吞吐？
3. Prefill 和 Decode 阶段的计算特征有什么不同？如何分别优化？
4. KV Cache 的显存如何估算？长上下文服务怎样避免显存耗尽？
5. 张量并行、流水并行、数据并行和专家并行各适合什么部署规模？
6. 量化会怎样影响精度、吞吐和显存？AWQ、GPTQ 与 FP8 如何选择？
7. 模型网关如何实现多模型路由、限流、熔断、重试与降级？
8. 流式输出场景下，首 Token 延迟、Token 间延迟和总延迟如何监控？
9. 如何设计推理服务压测，避免只看平均吞吐掩盖 P99 抖动？
10. 线上模型升级如何做灰度、A/B、回滚和会话一致性？

**系统设计与评测（10 题）**

1. 复杂的 Agent 层（多个 Agent 组成、多模块）怎么去评测？
2. 设计一个日均亿级请求的内容理解 Agent 服务，如何拆分入口、编排、模型、工具和观测层？
3. 如何建立 Agent 的离线评测、回放评测、灰度评测和线上指标闭环？
4. 任务成功率、步骤正确率、工具成功率和答案质量之间怎样做分层归因？
5. 如何控制一次 Agent 任务的 Token、模型、检索和工具总成本？
6. 怎样设计全链路 Trace，使每次规划、调用、检索和生成都可审计？
7. Agent 服务遇到流量突增时，如何做排队、背压、限流、降级和容量保护？
8. 如何为外部工具设计沙箱、权限、配额和人工确认机制？
9. 内容安全 Agent 如何降低漏放与误杀，并支持申诉和规则迭代？
10. 如果一次线上升级让成功率下降 3%，你会如何止损和定位？

**项目拷打与算法（10 题）**

1. DataAgent 的项目是怎么样的？能介绍一下吗？
2. 你的 Agent 项目解决了什么真实业务问题？为什么不用规则系统或普通工作流？
3. 项目中最严重的三个 Bad Case 是什么？根因和修复结果分别是什么？
4. 你如何证明 RAG、Memory 或 Multi-Agent 模块确实带来收益？
5. 项目压测的并发量、P95 延迟、成功率、Token 成本和机器配置是多少？
6. 如果删除项目中的一个核心模块，你会删什么？为什么？
7. 手写多头注意力前向过程，并说明张量形状变化。
8. 实现一个带 TTL 和 LRU 淘汰的线程安全缓存。
9. 给定 Agent 工具依赖关系，判断是否存在循环依赖并输出可执行顺序。
10. 设计一个任务调度器：支持优先级、重试、超时、取消和幂等。

### 阿里巴巴（100 题）

**LLM基础（10 题）**

1. 大模型微调的全过程
2. Transformer 的 Self-Attention 为什么能够建模长距离依赖？复杂度瓶颈在哪里？
3. Pre-LN、Post-LN 和 Sandwich-LN 对深层训练稳定性有什么影响？
4. RoPE、ALiBi 和可学习位置编码各有什么优缺点？
5. GQA 为什么能降低推理成本？它可能牺牲哪些能力？
6. MoE 中 Top-k 路由、容量因子和负载均衡损失分别起什么作用？
7. 如何区分事实性幻觉、逻辑幻觉、引用幻觉与指令冲突？
8. Tokenizer 对中英文、电商 SKU、错误码和多语言站点有什么影响？
9. 大模型的上下文学习为什么有效？它与参数更新有什么本质区别？
10. 如何为跨境电商多语言场景选择基座模型并设计能力评测？

**RAG与检索（10 题）**

1. RAG 的核心流程是什么？
2. 企业知识库中 PDF、网页、表格、扫描件和工单应如何统一解析与标准化？
3. 文档切片如何兼顾语义完整性、召回率、上下文成本和答案引用？
4. BM25、Dense Retrieval、Rerank 与 Metadata Filter 怎样组成生产级检索链路？
5. 如何评测 RAG 的 Recall、Precision、MRR、Faithfulness 和 Answer Relevance？
6. 商品规则频繁变化时，如何实现知识增量更新、版本治理和过期清退？
7. 同一规则在多个国家站点冲突时，如何做时效性、地域和可信度融合？
8. 如何实现租户、角色、店铺和文档多级权限过滤？
9. 查询中同时包含 SKU、规则编号和自然语言描述时，混合检索权重怎么设计？
10. RAG 无法找到答案时，怎样设计置信度、拒答、追问和转人工机制？

**Memory与上下文（10 题）**

1. Agent 的短期记忆和长期记忆分别保存什么？边界如何确定？
2. 如何把非结构化对话转成可更新的用户偏好、业务状态和任务档案？
3. 长期记忆写入前如何做事实核验、去重、冲突检测和敏感信息过滤？
4. 记忆库规模持续增长时，怎样防止污染、陈旧信息和检索噪声？
5. 怎样结合时间衰减、使用频率、语义相关性和业务优先级排序记忆？
6. 用户要求删除个人信息时，向量库、缓存、日志和备份怎样同步删除？
7. 跨会话任务如何恢复执行状态，同时避免重放已经完成的副作用？
8. 超长上下文压缩时，如何保留合同条款、订单约束和工具执行结果？
9. 多 Agent 共享记忆怎样实现版本控制和并发写冲突处理？
10. 如何构造离线集评估记忆命中、错误写入和任务收益？

**Agent与规划（10 题）**

1. 工作流和agent的区别，什么时候用哪个
2. 如何为客服、营销、商家运营和研发助手分别选择 ReAct、工作流或状态机？
3. Planner 怎样把复杂目标拆成可验证、可重试、带依赖的子任务？
4. Agent 执行太长或出现死循环时，怎样检测、早停、Replan 和降级？
5. 工具执行结果与计划假设冲突时，Agent 应该如何修正后续步骤？
6. 如何设计 Human-in-the-loop，让高风险操作必须审批且可恢复？
7. 面对模糊需求，Agent 何时应追问，何时应基于默认值继续？
8. 如何让 Agent 生成结构化计划，同时允许在运行时动态调整？
9. Agent 如何处理部分成功：保留有效结果、回滚副作用并继续剩余任务？
10. 企业场景中怎样定义 Agent 的自主边界和责任边界？

**Tool/MCP/Skill（10 题）**

1. mcp和其他restful api有什么区别，为什么要给大模型单独设置一个mcp
2. Function Calling 与 MCP 分别解决什么问题？二者如何协同？
3. MCP 的 Tools、Resources 和 Prompts 应如何划分？
4. 当 Agent 有数百个 MCP 工具时，怎样做语义检索、权限裁剪和动态加载？
5. MCP 的 stdio、旧版 HTTP+SSE 与 Streamable HTTP 在本地、云端和跨租户场景如何选型？
6. 工具 Schema 怎样表达必填参数、互斥条件、枚举、权限和副作用？
7. 如何实现工具调用的幂等键、超时、重试、补偿和审计？
8. Skill、Tool、Workflow 和 Agent 的边界是什么？企业能力应如何封装？
9. 如何防止恶意网页或文档通过 Prompt Injection 触发敏感工具？
10. 怎样评测工具选择、参数正确性、调用顺序和最终任务完成质量？

**Multi-Agent（10 题）**

1. 多 Agent 系统怎么协作？常见架构有哪些？
2. 什么时候应该拆成多个 Agent，什么时候单 Agent 加工具更简单可靠？
3. Supervisor-Worker、层级式、辩论式和黑板模式各适合什么业务？
4. 多 Agent 的消息协议应包含哪些字段，如何保证可追踪和可重放？
5. 多个 Agent 同时修改订单、库存或配置时，如何处理并发与一致性？
6. Agent 之间产生分歧时，如何按证据、权限和置信度进行仲裁？
7. 如何避免多 Agent 循环委派、重复执行和 Token 成本失控？
8. 不同 Agent 使用不同模型时，如何做模型路由和故障隔离？
9. 如何评估单个 Agent 的边际贡献，决定是否保留该角色？
10. 跨境电商场景中，怎样设计规则检索、风险判断、解释和人工复核 Agent？

**训练与Agent RL（10 题）**

1. SFT 数据怎样从业务日志中构造，并完成脱敏、去重和质量分层？
2. 大模型的多轮对话训练数据应如何表示角色、状态、工具调用和最终答案？
3. SFT、DPO、PPO 和 GRPO 的目标、数据与稳定性有什么差异？
4. 工具调用模型的训练集应包含哪些正例、负例、拒绝例和纠错轨迹？
5. 多个工具都能完成任务时，怎样设计偏好数据避免单一答案偏置？
6. Agent RL 中只有最终交易成功奖励时，怎样解决长链路信用分配？
7. 如何设计过程奖励模型，并防止模型迎合评审器而非完成真实任务？
8. 线上轨迹回流训练前，如何识别用户中断、外部故障和偶然成功？
9. 合成数据如何做多样性控制、难度课程、事实校验和污染检测？
10. 微调后怎样评估领域提升、通用能力回退和安全能力变化？

**推理部署（10 题）**

1. 如何为 Qwen 系列模型选择 vLLM、SGLang 或其他推理引擎？
2. Prefill 与 Decode 为什么具有不同瓶颈？如何做分离部署？
3. PagedAttention、Continuous Batching 和 Prefix Cache 分别怎样提升效率？
4. 长上下文和高并发同时出现时，KV Cache 应如何估算、调度和淘汰？
5. 张量并行、流水并行、专家并行和数据并行如何组合？
6. INT8、INT4、AWQ、GPTQ 与 FP8 如何在质量和成本之间取舍？
7. 多模型网关如何根据任务难度、SLA、价格和安全等级动态路由？
8. 流式推理如何监控 TTFT、TPOT、吞吐、P95 和 P99 延迟？
9. 推理服务如何做弹性扩缩、请求排队、背压、熔断和降级？
10. 模型与 Prompt 升级如何进行灰度、影子流量、回滚和会话粘性？

**系统设计与评测（10 题）**

1. Agent Infra和之前的Agent应用开发有什么区别？
2. 设计一个面向百万商家的企业级 Agent 平台，如何划分控制面和数据面？
3. 怎样建立任务级、步骤级、工具级、检索级和生成级评测体系？
4. 如何把离线黄金集、历史回放、影子流量、A/B 和人工抽检串成闭环？
5. Agent 平台如何实现多租户隔离、RBAC/ABAC、配额与成本归属？
6. 如何设计可观测性，记录计划、Prompt、模型、检索、工具和状态变更？
7. 外部工具不稳定时，怎样保证任务最终一致性并避免重复扣款或重复发货？
8. 高峰流量下如何做容量规划、优先级队列、限流、降级和故障隔离？
9. 如何控制 Prompt、模型、Embedding、Rerank 和工具的综合成本？
10. 线上成功率突然下降时，怎样按版本、租户、模型和工具快速归因？

**项目拷打与算法（10 题）**

1. 你对网络安全方向怎么看，为什么 AI 应用在这个方向上既有价值又有风险
2. 你的 Agent 项目为什么值得用大模型？规则引擎、搜索或工作流为什么不够？
3. 项目中最难复现的 Bad Case 是什么？你如何构造最小复现并修复？
4. 你做过哪些对照实验来证明 RAG、Memory、Rerank 或 Multi-Agent 的收益？
5. 项目真实流量、数据规模、成功率、P95 延迟和单任务成本是多少？
6. 如果今天把项目交给另一个团队维护，哪些隐性知识最容易丢失？
7. 手写一个支持超时、重试和并发上限的异步工具调用器。
8. 实现 LRU Cache，并说明并发环境下如何保证线程安全。
9. 给定工具依赖有向图，检测环并输出一条合法执行顺序。
10. 设计配置热更新模块：监听 YAML/INI 变化，完成校验、原子切换和失败回滚。

### 腾讯（100 题）

**Memory（12 题）**

1. 记忆模块存在哪种介质上
2. 跨会话通过压缩保留关键症状，这一块详细介绍
3. 请谈谈 AI Agent 中上下文工程与记忆管理的关系，二者的核心作用是什么？
4. 当上下文超出限制时，会采用什么处理机制？
5. 影响 AI Agent 上下文容量的因素有哪些？
6. agent memory管理有哪些难点
7. 为QQ内容助手的长期助手设计短期、情景、语义和程序性记忆。
8. 用户偏好发生变化时，如何更新旧记忆并保留可追溯历史？
9. 如何设计记忆写入门槛，避免把模型幻觉或敏感信息写入长期记忆？
10. 多租户 Agent 的记忆如何做用户绑定、权限隔离和删除？
11. 记忆库不断增长时，如何做压缩、过期、去重和重要性评分？
12. 如何评估 Agent 记忆的命中率、错误召回和跨用户泄漏？

**Agent（13 题）**

1. FSM状态机分哪个部分，怎么实现
2. 为什么选择ReAct
3. langchain和langgraph的区别？为什么有了langchain还要langgraph 分别解决什么问题？为什么有了langchain还要langgraph
4. agent失败/中断如何处理？重试安全？
5. 智能回答（传统大模型）与 AI Agent 的核心区别是什么？AI Agent 的核心要素有哪些？
6. 写对应agent的提示词
7. 为游戏运营设计一个有界 Agent，哪些步骤交给模型，哪些写成确定性 Workflow？
8. ReAct 循环如何设置停止条件，避免无限思考和重复调用？
9. Planner-Executor 架构在什么情况下优于单 Agent ReAct？
10. Agent 执行到一半被中断，如何通过 Checkpoint 安全恢复？
11. 如何把 Agent 的失败拆成模型、工具、状态和业务校验四类？
12. Agent 输出置信度不可直接相信时，系统如何决定重试、拒答或转人工？
13. 如何构建 Agent 轨迹评测集，并同时评估最终结果与中间步骤？

**系统设计（9 题）**

1. 工厂模式的优点是什么？
2. 第一个项目后台怎么搭建的
3. 你对ai和数据库的结合有什么看法
4. 请设计微信客服的端到端 Agent 平台，覆盖网关、编排、模型、工具、状态和观测。
5. 如何让QQ内容助手系统满足数据最小化、权限控制和全链路审计？
6. 模型输出具有随机性时，如何设计可重放的 Trace 和事故复盘机制？
7. 如何建立模型、Prompt、知识库、工具和评测集的联合版本管理？
8. 用户量从 100 增长到 10 万时，Agent 服务的主要扩展瓶颈在哪里？
9. 如何设计任务队列，使长任务可取消、可恢复且不会重复产生副作用？

**Multi-Agent（9 题）**

1. 多 Agent 框架怎么设计，为什么这么划分 Agent
2. 多agent怎么编排？具体流程？
3. 如何设计一个多agent
4. 广告投放需要多个 Agent 时，如何划分角色、共享状态和完成条件？
5. 多 Agent 并行执行产生冲突结果时，如何仲裁而不依赖无限讨论？
6. Orchestrator-Worker 与去中心化协作分别适合什么任务？
7. 多 Agent 系统如何避免重复工具调用和共享记忆写冲突？
8. 如何衡量多 Agent 相比单 Agent 带来的质量收益是否值得额外成本？
9. 一个并行分支失败而其他分支成功时，汇总节点应如何处理？

**MCP/Tool（10 题）**

1. skill是什么 Auto-coder skill怎么工作。
2. Skill 的核心价值是什么？为什么会有这个概念？
3. 在这个 AI Agent 里边有 thinking 阶段，你这个 thinking 阶段它怎么决定是调用工具还是直接回复？
4. 请完整描述模型生成 Tool Call 到真实 API 返回 Observation 的执行链路。
5. 在金融风控中，如何设计工具 schema 以降低参数错误和工具误选？
6. MCP 的 Resources、Tools 和 Prompts 应分别承载什么能力？
7. 远程 MCP Server 如何设计鉴权、授权、审计和租户隔离？
8. 工具具有转账、发消息等副作用时，如何实现幂等与人工审批？
9. 当 Agent 可见 100 个工具时，如何降低工具描述占用和选择混乱？
10. 工具超时、限流和部分成功时，Agent 应如何重试与补偿？

**RAG（11 题）**

1. 可插拔 RAG、一键配置切换、是不是热更新？（热更新--运行时不停机动态替换）
2. RAG知识库更新怎么不停服
3. 向量数据库了解过吗，常见向量索引的实现细节
4. 讲讲diskann
5. 为微信客服设计 RAG 时，如何在 BM25、向量检索和混合检索之间选型？
6. 文档包含表格、图片和多栏 PDF 时，切分与索引流程如何设计？
7. 如何用离线评测区分召回失败、重排失败和生成失败？
8. Reranker 放在召回链路的什么位置，候选数量如何确定？
9. 知识库高频更新时，如何做到增量索引、原子切换和不停服？
10. 什么时候应该使用 GraphRAG，而不是普通向量 RAG？
11. 如何处理检索证据冲突、过期和权限不一致的问题？

**推理部署（8 题）**

1. 本地部署要考虑什么？配置管理放在哪里？
2. 为腾讯云企业助手服务制定首 Token 延迟、端到端延迟、吞吐和成本 SLO。
3. PagedAttention 如何缓解 KV Cache 碎片并提高批处理效率？
4. 连续批处理、投机解码和 Prefix Cache 分别适合什么流量模式？
5. 模型量化到 INT8/INT4 时，如何评估质量、吞吐和显存变化？
6. 多 LoRA Adapter 在线服务如何隔离、切换和控制显存？
7. 云端大模型不可用时，边缘或小模型降级链路如何保证基本功能？
8. 模型升级时如何做影子流量、灰度、回滚和结果一致性评测？

**项目拷打（6 题）**

1. XX有没有正式用户使用？为什么没有上线？
2. 你的QQ内容助手项目到底替代了哪段人工流程，基线和上线结果分别是什么？
3. 项目中最严重的 Bad Case 是什么，你如何定位到具体链路节点？
4. 为什么选择当前模型和框架，替代方案的实验结果是什么？
5. 你个人主导了哪些决策，哪些结果可以由日志或指标验证？
6. 如果重新做一次该项目，你会删除哪一层复杂度，为什么？

**训练/RL（8 题）**

1. 训练样本哪里来的？有无模型调优？
2. 为金融风控构造 SFT 数据时，如何保证覆盖难例并避免数据泄漏？
3. LoRA、QLoRA 与全量微调如何根据显存、效果和部署成本选型？
4. DPO 中 chosen/rejected 质量不足会造成什么问题，如何清洗？
5. GRPO 与 PPO 在大模型强化学习中的优势函数估计有何差异？
6. 如何识别 Reward Hacking，并设计不可被表面格式轻易投机的奖励？
7. SFT 后模型通用能力下降时，如何判断是否发生灾难性遗忘？
8. 工具调用训练数据应包含哪些成功、失败和多工具组合轨迹？

**LLM基础（9 题）**

1. 上下文大小是被什么限制？
2. 你对 Transformer 架构的了解有多少？
3. 在腾讯云企业助手场景中，Transformer 的自注意力复杂度为何会成为长上下文瓶颈？
4. 请推导多头注意力中 Q、K、V 从输入到输出的张量维度变化。
5. RMSNorm 与 LayerNorm 的核心差异是什么，部署时如何取舍？
6. RoPE 如何把相对位置信息注入注意力分数，外推长度时会遇到什么问题？
7. 为什么主流生成模型多采用 Decoder-only，而不是 Encoder-Decoder？
8. KV Cache 为什么能加速自回归解码，它对显存和并发有什么影响？
9. Temperature、Top-k、Top-p 分别如何影响生成结果，金融风控场景怎么设？

**算法（5 题）**

1. 实现一个支持 O(1) 查询和更新的 LRU Cache，并说明并发安全方案。
2. 海量向量中查找 Top-K 近邻时，精确检索与近似检索如何取舍？
3. 给定 Agent 调用依赖图，如何检测循环并输出一个可执行拓扑序？
4. 实现一个限流器，比较令牌桶与漏桶在突发请求下的差异。
5. 给定多路检索结果，如何高效实现 Reciprocal Rank Fusion？

### 美团（100 题）

**系统设计（10 题）**

1. 怎么理解大模型安全，包含哪些方面的内容？
2. 从上面这些方面有哪些防护措施，有量化指标吗？
3. 模型安全相关是怎么做的，有哪些注入的手段？
4. 设计了边缘侧fallback降级引擎，它的一个处理逻辑是什么样的?比如云端大模型不能用的时候边缘侧该如何保证它的基本功能?
5. 语义识别的准确率是如何评估的?
6. 硬件成本是如何计算的?有考虑过其他开销如人工，算力等吗?
7. 请设计到店搜索的端到端 Agent 平台，覆盖网关、编排、模型、工具、状态和观测。
8. 如何让商家运营系统满足数据最小化、权限控制和全链路审计？
9. 模型输出具有随机性时，如何设计可重放的 Trace 和事故复盘机制？
10. 如何建立模型、Prompt、知识库、工具和评测集的联合版本管理？

**训练/RL（14 题）**

1. 大模型训练有哪些步骤？
2. 讲讲RLHF的具体过程？涉及几个模型？
3. LLM复读机现象的原因是什么？怎么解决？
4. 数据角度来看有什么问题？
5. 分布式训练有哪些技术？
6. 特定任务用预训练还是微调？
7. SFT导致的通用能力遗忘应该怎么解决？
8. 微调过哪些模型，微调占用的显存是多大？跟哪些因素有关系？
9. 如果微调模型出现复读机现象，是什么原因
10. 如果微调效果不好，怎么去分析
11. 为骑手助手构造 SFT 数据时，如何保证覆盖难例并避免数据泄漏？
12. LoRA、QLoRA 与全量微调如何根据显存、效果和部署成本选型？
13. DPO 中 chosen/rejected 质量不足会造成什么问题，如何清洗？
14. GRPO 与 PPO 在大模型强化学习中的优势函数估计有何差异？

**LLM基础（16 题）**

1. Transformer的结构？
2. 知道哪些注意力机制？
3. 现场手写自注意力机制公式
4. llama是怎么优化注意力机制的计算的？（这个我真的不知道）
5. 讲讲你知道的大模型技术最新发展。
6. 多模态了解吗？
7. Encoder-Decoder，Casual Decoder，Prefix Decoder的区别
8. 模型涌现现象的原因？
9. 百川，千问，LLAMA的Position Embedding是怎么做的？有什么区别？
10. LLAMA的输入可以是无限长吗？输入变长会有哪些变化？
11. 介绍下transformer的结构
12. 在外卖客服场景中，Transformer 的自注意力复杂度为何会成为长上下文瓶颈？
13. 请推导多头注意力中 Q、K、V 从输入到输出的张量维度变化。
14. RMSNorm 与 LayerNorm 的核心差异是什么，部署时如何取舍？
15. RoPE 如何把相对位置信息注入注意力分数，外推长度时会遇到什么问题？
16. 为什么主流生成模型多采用 Decoder-only，而不是 Encoder-Decoder？

**项目拷打（10 题）**

1. 讲讲项目，有哪些跟大模型有关的？
2. 实习过程中有哪些自己想到的创新点，效果如何？
3. 你们是如何跟进最新的大模型技术？
4. 有哪些让你印象深刻的大模型产品？
5. 说一下第一个项目的目标是什么，主要做了什么?
6. 第二个项目小组有多少人?自己负责的内容是哪些?大概说一下项目具体做了什么?
7. 你的商家运营项目到底替代了哪段人工流程，基线和上线结果分别是什么？
8. 项目中最严重的 Bad Case 是什么，你如何定位到具体链路节点？
9. 为什么选择当前模型和框架，替代方案的实验结果是什么？
10. 你个人主导了哪些决策，哪些结果可以由日志或指标验证？

**RAG（14 题）**

1. RAG的过程是什么样的？
2. RAG和微调的区别，优劣分别是什么？
3. 为什么选择rrf混合检索，而不是简单的加权?
4. 这里用了hyde技术，原理是什么?为什么能提高语义匹配度?
5. 结构感知切分如何确定边界?如果换个格式的文档是不是会有问题?
6. reranker和embedding模型在原理上有哪些区别?
7. 专属的高质量goldendataset是怎么构建的呢?忠实度的评测是基于什么?评测结果遇到过稳定性问题吗?
8. FAISS和其他的向量数据库相比他有哪些优点?一般你会选择哪一个?
9. 怎么看待rag和微调这两种方案，会倾向哪种?
10. 为到店搜索设计 RAG 时，如何在 BM25、向量检索和混合检索之间选型？
11. 文档包含表格、图片和多栏 PDF 时，切分与索引流程如何设计？
12. 如何用离线评测区分召回失败、重排失败和生成失败？
13. Reranker 放在召回链路的什么位置，候选数量如何确定？
14. 知识库高频更新时，如何做到增量索引、原子切换和不停服？

**MCP/Tool（9 题）**

1. Function call怎么训练的？怎么微调的？
2. Function call怎么组织文本的格式喂给模型？
3. Function call怎么把下游的一些工具，插件变成模型可以理解的方式？
4. 能不能讲一下你对function call的理解
5. 请完整描述模型生成 Tool Call 到真实 API 返回 Observation 的执行链路。
6. 在骑手助手中，如何设计工具 schema 以降低参数错误和工具误选？
7. MCP 的 Resources、Tools 和 Prompts 应分别承载什么能力？
8. 远程 MCP Server 如何设计鉴权、授权、审计和租户隔离？
9. 工具具有转账、发消息等副作用时，如何实现幂等与人工审批？

**推理部署（5 题）**

1. 为什么选择qwen2.5-7b这个大小?
2. 为外卖客服服务制定首 Token 延迟、端到端延迟、吞吐和成本 SLO。
3. PagedAttention 如何缓解 KV Cache 碎片并提高批处理效率？
4. 连续批处理、投机解码和 Prefix Cache 分别适合什么流量模式？
5. 模型量化到 INT8/INT4 时，如何评估质量、吞吐和显存变化？

**算法（6 题）**

1. 深度相机2d图像转3d坐标数据是怎么实现的?
2. 三维坐标到机械臂的动作映射是解析解还是数值解?机械臂的自由度大概是多少?
3. 实现一个支持 O(1) 查询和更新的 LRU Cache，并说明并发安全方案。
4. 海量向量中查找 Top-K 近邻时，精确检索与近似检索如何取舍？
5. 给定 Agent 调用依赖图，如何检测循环并输出一个可执行拓扑序？
6. 实现一个限流器，比较令牌桶与漏桶在突发请求下的差异。

**Agent（6 题）**

1. langchain框架和agent在设计理念上有什么区别?在什么场景你会选择哪一种?
2. 为配送调度设计一个有界 Agent，哪些步骤交给模型，哪些写成确定性 Workflow？
3. ReAct 循环如何设置停止条件，避免无限思考和重复调用？
4. Planner-Executor 架构在什么情况下优于单 Agent ReAct？
5. Agent 执行到一半被中断，如何通过 Checkpoint 安全恢复？
6. 如何把 Agent 的失败拆成模型、工具、状态和业务校验四类？

**Memory（5 题）**

1. 为商家运营的长期助手设计短期、情景、语义和程序性记忆。
2. 用户偏好发生变化时，如何更新旧记忆并保留可追溯历史？
3. 如何设计记忆写入门槛，避免把模型幻觉或敏感信息写入长期记忆？
4. 多租户 Agent 的记忆如何做用户绑定、权限隔离和删除？
5. 记忆库不断增长时，如何做压缩、过期、去重和重要性评分？

**Multi-Agent（5 题）**

1. 生成式推荐需要多个 Agent 时，如何划分角色、共享状态和完成条件？
2. 多 Agent 并行执行产生冲突结果时，如何仲裁而不依赖无限讨论？
3. Orchestrator-Worker 与去中心化协作分别适合什么任务？
4. 多 Agent 系统如何避免重复工具调用和共享记忆写冲突？
5. 如何衡量多 Agent 相比单 Agent 带来的质量收益是否值得额外成本？

### 百度（100 题）

**RAG（16 题）**

1. 向量匹配计算指标
2. 你的知识源具体是什么？API 文档、日志、DDL、Wiki 这几类数据里，最难处理的是哪类？
3. 你们知识入库前做了哪些预处理？这些步骤分别在解决什么问题？
4. 你为什么把 chunk 设成 512？和 128、1024 相比，各自的 trade-off 是什么？
5. 如果 top-k 已经召回了正确证据，但模型还是答错了，你怎么判断问题是在检索、排序，还是生成？
6. 如果检索结果本身互相冲突，或者证据不充分，你怎么约束模型？
7. RAG的流程
8. retrieve模型的使用
9. rerank如何融合多路召回的结果
10. 检索策略
11. 为文心智能体设计 RAG 时，如何在 BM25、向量检索和混合检索之间选型？
12. 文档包含表格、图片和多栏 PDF 时，切分与索引流程如何设计？
13. 如何用离线评测区分召回失败、重排失败和生成失败？
14. Reranker 放在召回链路的什么位置，候选数量如何确定？
15. 知识库高频更新时，如何做到增量索引、原子切换和不停服？
16. 什么时候应该使用 GraphRAG，而不是普通向量 RAG？

**MCP/Tool（8 题）**

1. agent工具调用流程是什么？客户端是agent，服务端是调用的api
2. agent skill开发
3. 请完整描述模型生成 Tool Call 到真实 API 返回 Observation 的执行链路。
4. 在NL2SQL中，如何设计工具 schema 以降低参数错误和工具误选？
5. MCP 的 Resources、Tools 和 Prompts 应分别承载什么能力？
6. 远程 MCP Server 如何设计鉴权、授权、审计和租户隔离？
7. 工具具有转账、发消息等副作用时，如何实现幂等与人工审批？
8. 当 Agent 可见 100 个工具时，如何降低工具描述占用和选择混乱？

**项目拷打（7 题）**

1. 这个项目里你真正主导的部分是什么？
2. 你这个项目到底解决了什么业务问题？原来人工是怎么做的，痛点在哪？
3. 你的百度智能云项目到底替代了哪段人工流程，基线和上线结果分别是什么？
4. 项目中最严重的 Bad Case 是什么，你如何定位到具体链路节点？
5. 为什么选择当前模型和框架，替代方案的实验结果是什么？
6. 你个人主导了哪些决策，哪些结果可以由日志或指标验证？
7. 如果重新做一次该项目，你会删除哪一层复杂度，为什么？

**Agent（9 题）**

1. 你这个 Agent 是问答型、决策型，还是执行型？边界是什么？
2. 如果不用 Agent，只用规则、检索、模板 SQL，能做到几成效果？为什么还要上 Agent？
3. 计划模式
4. 为地图问答设计一个有界 Agent，哪些步骤交给模型，哪些写成确定性 Workflow？
5. ReAct 循环如何设置停止条件，避免无限思考和重复调用？
6. Planner-Executor 架构在什么情况下优于单 Agent ReAct？
7. Agent 执行到一半被中断，如何通过 Checkpoint 安全恢复？
8. 如何把 Agent 的失败拆成模型、工具、状态和业务校验四类？
9. Agent 输出置信度不可直接相信时，系统如何决定重试、拒答或转人工？

**系统设计（11 题）**

1. 从用户输入到最终输出，你这套系统的真实链路是什么？
2. 哪些环节必须用大模型，哪些环节不用大模型也能做？
3. 你这个 LLM-as-a-Judge 是怎么设计的？rubric 里哪些维度是硬门槛，哪些只是加分项？
4. 为什么要做一致性检测 / swap consistency？它防的是哪类偏差？
5. 在整个大项目中，遇到一个新的需求，添加一个新的功能的工作流是怎么样的？
6. 请设计文心智能体的端到端 Agent 平台，覆盖网关、编排、模型、工具、状态和观测。
7. 如何让百度智能云系统满足数据最小化、权限控制和全链路审计？
8. 模型输出具有随机性时，如何设计可重放的 Trace 和事故复盘机制？
9. 如何建立模型、Prompt、知识库、工具和评测集的联合版本管理？
10. 用户量从 100 增长到 10 万时，Agent 服务的主要扩展瓶颈在哪里？
11. 如何设计任务队列，使长任务可取消、可恢复且不会重复产生副作用？

**LLM基础（9 题）**

1. 你怎么区分“模型上下文长度”和“知识切片长度”这两个概念？
2. 如何评估大模型基座的推理能力
3. 在百度搜索场景中，Transformer 的自注意力复杂度为何会成为长上下文瓶颈？
4. 请推导多头注意力中 Q、K、V 从输入到输出的张量维度变化。
5. RMSNorm 与 LayerNorm 的核心差异是什么，部署时如何取舍？
6. RoPE 如何把相对位置信息注入注意力分数，外推长度时会遇到什么问题？
7. 为什么主流生成模型多采用 Decoder-only，而不是 Encoder-Decoder？
8. KV Cache 为什么能加速自回归解码，它对显存和并发有什么影响？
9. Temperature、Top-k、Top-p 分别如何影响生成结果，NL2SQL场景怎么设？

**训练/RL（14 题）**

1. 你为什么选 QLoRA，而不是全量微调？
2. 你这里的 SFT，本质上是在教模型什么？是教知识、风格，还是行为边界？
3. 你做 DPO 的时候，chosen 和 rejected 是怎么定义的？
4. 如果 chosen 和 rejected 差异太小，会发生什么？
5. 你怎么证明 rejected 真的是有效负样本，而不是误杀？
6. 有哪些提高推理能力的方法
7. reward信号的设计
8. 避免rewrard hacking的方法
9. 为NL2SQL构造 SFT 数据时，如何保证覆盖难例并避免数据泄漏？
10. LoRA、QLoRA 与全量微调如何根据显存、效果和部署成本选型？
11. DPO 中 chosen/rejected 质量不足会造成什么问题，如何清洗？
12. GRPO 与 PPO 在大模型强化学习中的优势函数估计有何差异？
13. 如何识别 Reward Hacking，并设计不可被表面格式轻易投机的奖励？
14. SFT 后模型通用能力下降时，如何判断是否发生灾难性遗忘？

**算法（8 题）**

1. python中元组列表区别
2. 函数是对象吗
3. 修饰器
4. 实现一个支持 O(1) 查询和更新的 LRU Cache，并说明并发安全方案。
5. 海量向量中查找 Top-K 近邻时，精确检索与近似检索如何取舍？
6. 给定 Agent 调用依赖图，如何检测循环并输出一个可执行拓扑序？
7. 实现一个限流器，比较令牌桶与漏桶在突发请求下的差异。
8. 给定多路检索结果，如何高效实现 Reciprocal Rank Fusion？

**Memory（6 题）**

1. 为百度智能云的长期助手设计短期、情景、语义和程序性记忆。
2. 用户偏好发生变化时，如何更新旧记忆并保留可追溯历史？
3. 如何设计记忆写入门槛，避免把模型幻觉或敏感信息写入长期记忆？
4. 多租户 Agent 的记忆如何做用户绑定、权限隔离和删除？
5. 记忆库不断增长时，如何做压缩、过期、去重和重要性评分？
6. 如何评估 Agent 记忆的命中率、错误召回和跨用户泄漏？

**Multi-Agent（6 题）**

1. 企业知识库需要多个 Agent 时，如何划分角色、共享状态和完成条件？
2. 多 Agent 并行执行产生冲突结果时，如何仲裁而不依赖无限讨论？
3. Orchestrator-Worker 与去中心化协作分别适合什么任务？
4. 多 Agent 系统如何避免重复工具调用和共享记忆写冲突？
5. 如何衡量多 Agent 相比单 Agent 带来的质量收益是否值得额外成本？
6. 一个并行分支失败而其他分支成功时，汇总节点应如何处理？

**推理部署（6 题）**

1. 为百度搜索服务制定首 Token 延迟、端到端延迟、吞吐和成本 SLO。
2. PagedAttention 如何缓解 KV Cache 碎片并提高批处理效率？
3. 连续批处理、投机解码和 Prefix Cache 分别适合什么流量模式？
4. 模型量化到 INT8/INT4 时，如何评估质量、吞吐和显存变化？
5. 多 LoRA Adapter 在线服务如何隔离、切换和控制显存？
6. 云端大模型不可用时，边缘或小模型降级链路如何保证基本功能？

## ⚠️ 边界与验收

<callout emoji="💡">
**使用说明**
- 所有题目统一按知识模块或公司分类呈现，直接用于口述训练和查漏补缺。
- 专项题库提供考察意图、标准答、答题模板、高频追问、避坑指南和简历呼应；五厂 500 题用于公司专项训练。
- 建议按 **P0 → P1 → P2** 难度梯度复习，先脱稿再展开
- 📖 **章节导读**含考点地图、题目分布、复习路线建议，务必先读
</callout>

<callout emoji="🚨">
**验收标准**
- 目录链接可正常跳转，对应文档内容完整
- 所有延伸阅读仅保留可验证来源，编造内容已全部清除
- 文档持续更新，建议收藏本页获取最新链接
</callout>



欢迎加入知识星球获得更多更详细的资料和一对一答疑：



![图片展示的是AgentAlpha创客星球的加入方式。上方文字为“AgentAlpha创客星球”，下方是“微信扫码加入星球”，并配有“知识星球”的标识。右侧有一个绿色的二维码，二维码内有蓝色的卡通形象。该图片位于文档结尾处，是对文档中加入知识星球获取更多资料和一对一答疑的引导，与文档中鼓励加入知识星球以获取更多面试资料和答疑的内容相呼应。](https://api3-eeft-drive.feishu.cn/space/api/box/stream/download/authcode/?code=ZDk2Mjk4M2E4MzE0OWYxOTcyYmNhMTY5ZWM3MWI5MzlfN2QzZmU0NTg5YTYxZTA0YjQ0YzRmMmM1OGI2YTVkYmZfSUQ6NzY0MDMyMjk5MzcwNDc2NjY1NF8xNzg2ODgwOTI5OjE3ODY4ODQ1MjlfVjM)

