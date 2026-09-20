/**
 * 面试间「专栏」数据层。
 *
 * 事实来源（不要凭记忆改数字）：
 * - 章节结构 / 题量 / 建议时长 / 考频：Agent 岗面试宝典 v3（content/imports/agent-interview-v3.feishu.md）
 * - 考点地图 / 项目类目 / 真题总数：社区知识图谱（2582 道题聚类，52 考点 · 45 项目类目），
 *   镜像见飞书 wiki「2026 Agent 岗面试题 · 知识图谱」
 * - docs 里的飞书链接全部来自宝典 v3 原文，逐字保留
 */

export type ChapterFreq = "core" | "high" | "deep"

export interface ColumnChapterDoc {
  label: string
  href: string
}

export interface ColumnChapter {
  no: number
  /** 锚点 id */
  id: string
  name: string
  intro: string
  /** 考点地图（箭头链，来自宝典各章 callout） */
  points: string
  /** 题目总量，如 "80+" */
  count: string
  /** 建议时长，如 "3-5 天" */
  days: string
  freq: ChapterFreq
  /** 章首徽章，如「新手先看这篇」 */
  badge?: string
  /** 站内题解所属的分类 cat（lib/interview.ts 词表），渲染成「站内详解」 */
  cats: string[]
  /** 宝典子文档（飞书） */
  docs: ColumnChapterDoc[]
}

export const FREQ_LABEL: Record<ChapterFreq, string> = {
  core: "核心必考",
  high: "高频出现",
  deep: "专项深挖",
}

/** 宝典推荐学习路线（Ch 序号） */
export const RECOMMENDED_ROUTE = [1, 2, 4, 12, 11, 3, 7, 9, 10, 5, 8, 6]

export const CHAPTERS: ColumnChapter[] = [
  {
    no: 1,
    id: "ch1",
    name: "RAG（检索增强生成）",
    intro: "基本每场都会问。从 Embedding 怎么选、文本怎么切、向量库怎么挑，到检索完怎么重排、整套评测怎么设计。",
    points: "Embedding 原理 → 文本分块策略 → 向量数据库选型 → 检索与重排序 → RAG 全链路评测",
    count: "80+",
    days: "3-5 天",
    freq: "core",
    badge: "新手先看这篇",
    cats: ["rag"],
    docs: [
      { label: "章节导读 · 考点地图 & 复习路线", href: "https://www.feishu.cn/docx/KuKddNj42olUrQxsXqZcCK3anSg" },
      { label: "真题 · 检索（35 题）", href: "https://agentalpha.feishu.cn/docx/OAv1djOINospcIx6cEUcN3iHnKc" },
      { label: "真题 · Embedding（13 题）", href: "https://www.feishu.cn/docx/MZzwdvbxho8x6Nxmwl6cg6ShnWd" },
      { label: "真题 · 分块", href: "https://www.feishu.cn/docx/D1qsd05GMoGkcEx1wsuc6U25nUh" },
      { label: "真题 · 向量数据库", href: "https://www.feishu.cn/docx/RSf2dod5No4TWIxhsvvcWIbAnsg" },
      { label: "真题 · 重排", href: "https://www.feishu.cn/docx/S5XsdQV8Roh66SxKavick6sln5X" },
      { label: "真题 · 评测", href: "https://agentalpha.feishu.cn/docx/BPX4dQDGIoYwLzxI40wcl4QwnWg" },
      { label: "真题 · 综合（上）272 题", href: "https://agentalpha.feishu.cn/docx/BLpeddsE0o6jxuxg0ZxcutSpnNd" },
      { label: "真题 · 综合（下）272 题", href: "https://agentalpha.feishu.cn/docx/GoqedAs4FozkdrxxBIockN7fnOc" },
    ],
  },
  {
    no: 2,
    id: "ch2",
    name: "LLM 基础",
    intro: "地基就是这章。Transformer、Attention、MoE、KV Cache，绕不开，问得又细又勤。",
    points: "Transformer 架构 → Attention 机制 → MoE 稀疏激活 → KV Cache → 推理优化策略",
    count: "60+",
    days: "2-3 天",
    freq: "core",
    cats: ["basics", "inference"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/EBnOdAXtJoO17jx985ZcKwvqnDd" },
      { label: "真题 · Attention", href: "https://www.feishu.cn/docx/D3IpdiBJZoPcFWxgrKacNg3Qnbf" },
      { label: "真题 · MoE", href: "https://www.feishu.cn/docx/ROtDdeyVQo65sOxuhk6coomDnVc" },
      { label: "真题 · Transformer", href: "https://agentalpha.feishu.cn/docx/AB2TdVbVPo5jOgxcA1qcDBYjnGg" },
      { label: "真题 · 推理优化", href: "https://www.feishu.cn/docx/F3SFd4itcoL2eexjLAKcUOZmnbb" },
      { label: "真题 · 位置编码与长文本（8 题）", href: "https://agentalpha.feishu.cn/docx/W7vcdadtxoaBYIxgWPFcZHqBn2c" },
      { label: "真题 · 综合", href: "https://agentalpha.feishu.cn/docx/UU7YdmyXCofrZGxeLLnckzs7njc" },
    ],
  },
  {
    no: 3,
    id: "ch3",
    name: "LLM 训练",
    intro: "决定你能不能聊深。SFT、RLHF、DPO 和 PPO，训练稳不稳、数据怎么喂，都在这儿。",
    points: "SFT 微调 → RLHF 对齐 → DPO/PPO → 训练稳定性 → 数据工程",
    count: "35+",
    days: "2-3 天",
    freq: "high",
    cats: ["finetune"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/H9N3dazDcovEdyxJJyQcZuMpnrg" },
      { label: "真题 · RLHF", href: "https://www.feishu.cn/docx/SHc5dIJC1oQd80xoOW3cKiQQnTd" },
      { label: "真题 · SFT", href: "https://www.feishu.cn/docx/OOCKdEeU0oyrHLxY555cHdSsn3b" },
      { label: "真题 · 训练策略", href: "https://www.feishu.cn/docx/LKUndRoOAot5UFxAcaxcunJkn7f" },
      { label: "真题 · 预训练与数据工程（8 题）", href: "https://agentalpha.feishu.cn/docx/HT20dVBdroIsNbxLgjvcSdrrn0c" },
      { label: "真题 · 综合", href: "https://agentalpha.feishu.cn/docx/IQVSd5HtMohw53xQVXeca8JKnQf" },
    ],
  },
  {
    no: 4,
    id: "ch4",
    name: "Agent 架构",
    intro: "分水岭。ReAct 怎么转、记忆怎么存、规划和用工具怎么做，最后合成一道设计题。",
    points: "ReAct 循环 → 记忆系统设计 → 规划与反思 → Tool Use → Agent 评估",
    count: "75+",
    days: "3-4 天",
    freq: "core",
    cats: ["agent", "memory", "prompt", "safety"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/XRh1dOuaMoFhB4x4kRJcsnINnJg" },
      { label: "真题 · ReAct", href: "https://www.feishu.cn/docx/DfQyd8vkDo5Om2xWwIscxpGAnod" },
      { label: "真题 · 记忆系统", href: "https://www.feishu.cn/docx/Ai5jdtTRto3VSHx4SarctA5Tnlf" },
      { label: "真题 · 规划", href: "https://www.feishu.cn/docx/Br6xdM34ooC3CYxz1onccQw9nmc" },
      { label: "真题 · Agent 安全与对齐（8 题）", href: "https://agentalpha.feishu.cn/docx/QOy5dbbT6oa9LsxObu4chFfsncf" },
      { label: "真题 · Agent 架构对比（8 题）", href: "https://agentalpha.feishu.cn/docx/I7AvdXX9loia4zxTVwBc4ZZLnqo" },
      { label: "真题 · Agent 部署与运维（8 题）", href: "https://agentalpha.feishu.cn/docx/CtredX5cGoOu51xWIqac7fMgnzg" },
      { label: "真题 · Agent 性能优化（8 题）", href: "https://agentalpha.feishu.cn/docx/Jaf6doznCozPTDxh9AOc6ta2nic" },
      { label: "真题 · Agent 调试与可观测性（8 题）", href: "https://agentalpha.feishu.cn/docx/WanGdCBAWodYalxQx1ecbhj8n2b" },
      { label: "真题 · Agent 设计模式进阶（8 题）", href: "https://agentalpha.feishu.cn/docx/Kc19dN4qbozYYDxtMrMcFEaqnje" },
      { label: "真题 · 综合", href: "https://agentalpha.feishu.cn/docx/UZ8idkcFqoON8SxV60lcgIw1nog" },
    ],
  },
  {
    no: 5,
    id: "ch5",
    name: "多智能体",
    intro: "多个 Agent 凑一起怎么通信、怎么分工、怎么达成一致，又怎么收拾吵起来的场面。",
    points: "Multi-Agent 通信 → 协作策略 → 角色分配 → 共识机制 → 冲突解决",
    count: "95+",
    days: "1-2 天",
    freq: "deep",
    cats: ["multiagent"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/LxoBd5XaXoBQ1wx0MwCcQqk4nYN" },
      { label: "真题汇总", href: "https://www.feishu.cn/docx/BT0RdWadOoSsBQxdhPScabJ7nDf" },
      { label: "真题 · Multi-Agent 基础（8 题）", href: "https://agentalpha.feishu.cn/docx/XFIhdDwRPoL1aXxZXmXceiGMntb" },
      { label: "真题 · 通信与协作（8 题）", href: "https://agentalpha.feishu.cn/docx/NqcvdwolmoMecVxn02Bc3EURncc" },
      { label: "真题 · 动态切换与共识（8 题）", href: "https://agentalpha.feishu.cn/docx/IkBWdanbPoK9cjxxvmCcQtOen6c" },
      { label: "真题 · Multi-Agent 框架实战（8 题）", href: "https://agentalpha.feishu.cn/docx/IQDRdgnwTo0US9x6jjNc8LnynAd" },
      { label: "真题 · Multi-Agent 容错与恢复（8 题）", href: "https://agentalpha.feishu.cn/docx/SySDdSRdmooLphx37zacsQZtnGe" },
      { label: "真题 · Multi-Agent 调度与资源管理（8 题）", href: "https://agentalpha.feishu.cn/docx/YUoPdZKwvoNuzcxUEEScEsuGnpf" },
      { label: "真题 · Multi-Agent 实战：软件开发（8 题）", href: "https://agentalpha.feishu.cn/docx/P3zTd3LNxobmfqxz4lbcStjdnDh" },
      { label: "真题 · 场景设计（8 题）", href: "https://agentalpha.feishu.cn/docx/QEhIdLdcJoy3CTx2DkDcsOUUnWd" },
    ],
  },
  {
    no: 6,
    id: "ch6",
    name: "多模态",
    intro: "图文怎么对齐。视觉语言模型、跨模态 Embedding、多模态检索，专项岗的重点，应用岗的加分项。",
    points: "视觉-语言模型 → 跨模态 Embedding → 多模态 RAG → 模态融合",
    count: "85+",
    days: "1-2 天",
    freq: "deep",
    cats: ["multimodal"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/N1QMd5TuvoSgNPxpSeYculS7njf" },
      { label: "真题汇总", href: "https://www.feishu.cn/docx/WuYKd1KDboOlRhxiCjQcRZzsndb" },
      { label: "真题 · 多模态对齐与理解（8 题）", href: "https://agentalpha.feishu.cn/docx/OzFLdJuO1oXr9AxOZQAcHbe7nAc" },
      { label: "真题 · VLM 架构与微调（8 题）", href: "https://agentalpha.feishu.cn/docx/MRffdTqzfoxMZZx0r2BcCXzhn8c" },
      { label: "真题 · 多模态综合（8 题）", href: "https://agentalpha.feishu.cn/docx/CKEBdvzLLoAZRvxgepFckipxnYd" },
    ],
  },
  {
    no: 7,
    id: "ch7",
    name: "评测",
    intro: "怎么给大模型和 Agent 打分。自动指标、人工评估、Benchmark 怎么搭。这一层刷掉大半候选人。",
    points: "自动评测指标 → 人类评估 → Benchmark 设计 → Agent 评测框架",
    count: "55+",
    days: "1-2 天",
    freq: "high",
    cats: ["eval"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/HlxQdGT58oNMQfxHF0Gc0L82nCf" },
      { label: "真题汇总", href: "https://agentalpha.feishu.cn/docx/LvMndMSSWosj9sx9iiJctBHpnym" },
      { label: "真题 · Eval 指标与方法（8 题）", href: "https://agentalpha.feishu.cn/docx/DvGRdh1KyotvkBxHraBcxp81n2j" },
      { label: "真题 · Agent 评估与 Benchmark（8 题）", href: "https://agentalpha.feishu.cn/docx/AjpXdXzwkoOa4rxv89ycT8FSn6e" },
      { label: "真题 · 评估综合（8 题）", href: "https://agentalpha.feishu.cn/docx/SjwLdIohAokYg4xChRUcLxFXnDc" },
    ],
  },
  {
    no: 8,
    id: "ch8",
    name: "工具调用",
    intro: "Function Calling 只是开头。API 怎么设计、选哪个工具、出错怎么办、安全怎么兜，还有工具过百之后的注册、发现与路由。",
    points: "Function Calling → API 设计 → 工具选择 → 错误处理 → 安全约束",
    count: "80+",
    days: "1-2 天",
    freq: "deep",
    cats: ["tooluse"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/RD0Nd5iyQoWHTNxqWVHcqoqxnVg" },
      { label: "真题汇总", href: "https://www.feishu.cn/docx/Je4idCoDoogoCxxagDKcJFS4nzc" },
      { label: "真题 · Function Calling 与 Tool Use（8 题）", href: "https://agentalpha.feishu.cn/docx/UD3CddKwpoNo6txBeGkcCuxWnoh" },
      { label: "真题 · MCP 协议（8 题）", href: "https://agentalpha.feishu.cn/docx/HtiKd8gfnoItc6x0Qt0coQITnUe" },
      { label: "真题 · A2A / Skill / 通信网关（8 题）", href: "https://agentalpha.feishu.cn/docx/P3ZzdyWTkoGsCUxUUX7cl5oJnrb" },
      { label: "真题 · 工具注册中心与发现（8 题）", href: "https://agentalpha.feishu.cn/docx/Re2udZ5UAo4VknxazZrchgIdnLd" },
      { label: "真题 · Agent API 网关设计（8 题）", href: "https://agentalpha.feishu.cn/docx/GcpPdsR7cowbrbxYybqc4EU7ngd" },
      { label: "真题 · 工具调用安全深度（8 题）", href: "https://agentalpha.feishu.cn/docx/R6gjdHTuBo87cWx9ReYczPWInxe" },
      { label: "真题 · 工具与协议综合（8 题）", href: "https://agentalpha.feishu.cn/docx/QBIvdtmdroRDCWxywS2caaXBn3b" },
    ],
  },
  {
    no: 9,
    id: "ch9",
    name: "编程题",
    intro: "手写代码那一关。字符串、树和图、动态规划，再配几道 LLM 推理优化的实现题。",
    points: "字符串处理 → 树/图遍历 → 动态规划 → LLM 推理优化代码题",
    count: "65+",
    days: "2-3 天",
    freq: "high",
    cats: [],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/HCX3dGfhgoMhwQxrwTycoQ0nnSg" },
      { label: "真题汇总", href: "https://www.feishu.cn/docx/DnL4dnxiZosgokxXuprc01P5nmf" },
      { label: "真题 · Agent 核心代码（8 题）", href: "https://agentalpha.feishu.cn/docx/Cwg4dH57log1v0xhjQtcPsJ8nnh" },
      { label: "真题 · Agent 系统集成实战（8 题）", href: "https://agentalpha.feishu.cn/docx/X6bhdFwK5oGkBixj0sLcM0SanQf" },
      { label: "真题 · Agent 测试与 CI/CD（8 题）", href: "https://agentalpha.feishu.cn/docx/PsdvdTw0xouLRBxwLcXc1M18nEb" },
      { label: "真题 · 工程与算法代码（8 题）", href: "https://agentalpha.feishu.cn/docx/PVkEdvPEJox8OxxWisjcXjHSnBc" },
    ],
  },
  {
    no: 10,
    id: "ch10",
    name: "项目深挖",
    intro: "简历上写的会被反复问。为什么这么选、架构怎么搭、崩了怎么查、后来怎么改。",
    points: "项目选型 → 架构设计 → 性能优化 → 故障排查 → 迭代演进",
    count: "90+",
    days: "2-3 天",
    freq: "high",
    cats: ["enterprise"],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/NIl4d94YlosWF6xTFOZc3fAUn3Q" },
      { label: "真题汇总", href: "https://agentalpha.feishu.cn/docx/NyJbdFirjoNsByxZmtQcEZiUnEg" },
      { label: "真题 · 智能客服 Agent（10 题）", href: "https://agentalpha.feishu.cn/docx/MczZdJVb9oCk8KxsEp5crbYCn2f" },
      { label: "真题 · 业务 Agent 设计（8 题）", href: "https://agentalpha.feishu.cn/docx/TVB5du9xcopE9jxcOi7cr1Wpn1d" },
      { label: "真题 · 智能办公 Agent（8 题）", href: "https://agentalpha.feishu.cn/docx/FZkvdgK50o8ZIjxRWdfcfP7gnof" },
      { label: "真题 · 数据分析 Agent（8 题）", href: "https://agentalpha.feishu.cn/docx/CEU1dqXyYoxHLvx7uWBcBcDdnpf" },
      { label: "真题 · 编程助手 Agent（8 题）", href: "https://agentalpha.feishu.cn/docx/OO0ddFQO8oZySZx0hitcWzWsnZe" },
      { label: "真题 · 通用设计方法（8 题）", href: "https://agentalpha.feishu.cn/docx/WgRmd3IOAoEzZ1xbD00cwTbznFm" },
    ],
  },
  {
    no: 11,
    id: "ch11",
    name: "通用与软实力",
    intro: "题最多的地方。八股、系统设计、行为面试，还有职业规划和你的技术口味，建议拉长战线。",
    points: "八股基础 → 系统设计 → 行为面试 → 职业规划 → 技术视野",
    count: "800+",
    days: "7-10 天",
    freq: "core",
    cats: [],
    docs: [
      { label: "章节导读", href: "https://www.feishu.cn/docx/EW9ede7oEoACS5x5r2UcWYsSnVc" },
      { label: "真题 · P0 基础 188 题", href: "https://agentalpha.feishu.cn/docx/Mv5Hd1YXIo05e9xCiprcAnj2nJL" },
      { label: "真题 · P1 进阶 ❶ 158 题", href: "https://agentalpha.feishu.cn/docx/AU2ZdkTPYorujax3kjVcV2ixnMM" },
      { label: "真题 · P1 进阶 ❷ 158 题", href: "https://agentalpha.feishu.cn/docx/TZWUdzUwOomZ1Ix041ccHGAvn5b" },
      { label: "真题 · P1 进阶 ❸ 158 题", href: "https://agentalpha.feishu.cn/docx/C60Wdey2lo2v8cx9zQjcRlnWnYb" },
      { label: "真题 · P1 进阶 ❹ 158 题", href: "https://agentalpha.feishu.cn/docx/FsYXdJDFsotidhxmsFtcoFmonzb" },
    ],
  },
  {
    no: 12,
    id: "ch12",
    name: "五厂高频面试题",
    intro: "按字节、阿里、腾讯、美团、百度各 100 题。先能把结论说出口，再谈细节。",
    points: "推荐/搜索 · Agent 工程 · RAG · Memory · 系统设计 · 训练与部署",
    count: "500",
    days: "3-5 天",
    freq: "core",
    badge: "500 题专项",
    cats: ["jingchang"],
    docs: [
      {
        label: "第 12 章 · 五厂高频面试题（500 题）",
        href: "https://agentalpha.feishu.cn/docx/EeMIdOtiMokxEExLSPwcqqUFnCe",
      },
    ],
  },
]

/** 考点地图：8 个大类（知识图谱 2582 道真题聚类）。related = 关联题集条目数（一题可关联多个考点）。 */
export interface ExamMapRow {
  name: string
  points: number
  related: number
  top: { name: string; count: number }[]
}

export const EXAM_MAP: ExamMapRow[] = [
  {
    name: "RAG 检索增强",
    points: 8,
    related: 1094,
    top: [
      { name: "RAG 常识", count: 537 },
      { name: "幻觉", count: 59 },
      { name: "向量化", count: 58 },
      { name: "分块", count: 58 },
      { name: "向量库", count: 54 },
      { name: "长上下文", count: 45 },
      { name: "重排序", count: 43 },
    ],
  },
  {
    name: "LLM 训练",
    points: 15,
    related: 970,
    top: [
      { name: "强化学习", count: 121 },
      { name: "RLHF", count: 121 },
      { name: "LoRA", count: 73 },
      { name: "PPO", count: 68 },
      { name: "SFT", count: 66 },
      { name: "对齐", count: 52 },
      { name: "GRPO", count: 31 },
    ],
  },
  {
    name: "Agent 架构",
    points: 9,
    related: 575,
    top: [
      { name: "架构设计", count: 76 },
      { name: "提示工程", count: 69 },
      { name: "系统设计", count: 69 },
      { name: "推理能力", count: 61 },
      { name: "工具使用", count: 51 },
      { name: "Function Call", count: 48 },
      { name: "ReAct", count: 43 },
    ],
  },
  {
    name: "LLM 基础",
    points: 5,
    related: 408,
    top: [
      { name: "Transformer 架构", count: 194 },
      { name: "注意力机制", count: 98 },
      { name: "生成机制", count: 46 },
      { name: "MoE", count: 37 },
      { name: "BERT 与编码器", count: 33 },
    ],
  },
  {
    name: "评测",
    points: 6,
    related: 421,
    top: [
      { name: "评测体系", count: 232 },
      { name: "评测指标", count: 48 },
      { name: "对比分析", count: 38 },
      { name: "鲁棒性", count: 36 },
      { name: "Benchmark", count: 34 },
      { name: "线上监控", count: 33 },
    ],
  },
  {
    name: "性能优化",
    points: 7,
    related: 337,
    top: [
      { name: "性能优化", count: 75 },
      { name: "推理", count: 57 },
      { name: "效率", count: 54 },
      { name: "量化", count: 49 },
      { name: "延迟优化", count: 41 },
    ],
  },
  {
    name: "多智能体",
    points: 1,
    related: 84,
    top: [{ name: "Multi-Agent", count: 84 }],
  },
  {
    name: "多模态",
    points: 1,
    related: 70,
    top: [{ name: "多模态", count: 70 }],
  },
]

/** 项目反推：45 个项目类目里的代表项（知识图谱项目卡，含关联题数与产出形态） */
export interface ProjectItem {
  name: string
  /** 关联题数 */
  count: number
  /** 产出形态（知识图谱项目卡原文） */
  output: string
  group: string
}

export const PROJECTS: ProjectItem[] = [
  { name: "RAG 检索方法对比评测", count: 178, output: "对比表 + 检索召回示例 + 性能-召回 Pareto 图", group: "RAG 项目" },
  { name: "RAG 系统自动化评估与错误归因", count: 121, output: "评估一致性报告 + 错误归因周报模板", group: "RAG 项目" },
  { name: "文档分块策略对 RAG 效果的影响实验", count: 85, output: "Recall@K 和 F1 对比图 + 最佳分块参数建议", group: "RAG 项目" },
  { name: "RAG 生成忠实度提升与幻觉检测", count: 72, output: "忠实度修正前后指标对比 + 错误案例分析", group: "RAG 项目" },
  { name: "Agent 长期记忆机制设计与评估", count: 120, output: "记忆系统架构图 + 评估指标对比表", group: "Agent 架构项目" },
  { name: "Agent 工具选择与排序模块", count: 80, output: "工具选择代码 + 对比实验报告", group: "Agent 架构项目" },
  { name: "Agent 自动化评测与迭代系统", count: 60, output: "自动化评测流水线 + 回滚机制文档", group: "Agent 架构项目" },
  { name: "基于 MCTS 的 Agent 规划与决策", count: 59, output: "MCTS 实现代码 + 搜索深度-成功率曲线", group: "Agent 架构项目" },
  { name: "从零实现带掩码的 Attention 机制", count: 95, output: "实现代码 + 正确性验证测试", group: "LLM 基础项目" },
  { name: "MoE 路由机制实现与分析", count: 32, output: "MoE 实现代码 + 负载均衡分析图", group: "LLM 基础项目" },
  { name: "DPO 与 PPO 在 RLHF 中的对比", count: 109, output: "训练日志 + 胜率对比图", group: "LLM 训练项目" },
  { name: "LoRA 微调效果与参数分析", count: 81, output: "微调对比报告 + 秩影响曲线", group: "LLM 训练项目" },
  { name: "多 Agent 协作系统设计与实现", count: 79, output: "架构设计文档 + 原型代码 + 性能指标", group: "多智能体项目" },
  { name: "LLM-as-a-Judge 偏见分析与缓解", count: 39, output: "偏见分布报告 + 缓解前后一致性对比", group: "评测项目" },
  { name: "Function Call 能力训练与优化", count: 44, output: "消融实验报告 + 微调模型", group: "工具调用项目" },
  { name: "KV-cache 实现与性能分析", count: 27, output: "KV-cache 代码 + 加速比曲线", group: "编程题项目" },
]

/** 五厂真题（宝典第 12 章，各 100 题） */
export interface FactoryRow {
  name: string
  count: number
  focus: string
}

export const FACTORIES: FactoryRow[] = [
  { name: "字节跳动", count: 100, focus: "推荐/搜索、Agent 工程、训练、推理与高并发" },
  { name: "阿里巴巴", count: 100, focus: "电商/企业服务、RAG、工具平台、模型训练与部署" },
  { name: "腾讯", count: 100, focus: "社交/内容场景、Memory、多 Agent、系统设计与工程实现" },
  { name: "美团", count: 100, focus: "搜索推荐、本地生活、RAG、训练、算法与稳定性" },
  { name: "百度", count: 100, focus: "搜索、知识增强、Agent、模型训练、推理与平台能力" },
]

export const FACTORY_DOC_HREF = "https://agentalpha.feishu.cn/docx/EeMIdOtiMokxEExLSPwcqqUFnCe"
