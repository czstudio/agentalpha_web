import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LearnToc } from "./learn-toc"

/** 社区内训会议的公开回放（来自训练营课程文档） */
const REPLAYS: { title: string; desc: string; href: string }[] = [
  {
    title: "课程介绍会回放",
    desc: "十个阶段逐一说明：RAG、Memory、单 / 多 Agent、Deep-Research、Code Agent、自进化 Agent、Agentic RL。",
    href: "https://meeting.tencent.com/crm/2G4ZrQVAd0",
  },
  {
    title: "答疑会回放",
    desc: "技术学习路线、职业发展方向与当前市场供需关系的讨论。",
    href: "https://meeting.tencent.com/crm/KwBp84aQ74",
  },
  {
    title: "一对一辅导示例回放",
    desc: "强化学习与深度学习的理论与实践串讲。",
    href: "https://meeting.tencent.com/crm/N8XDyErX4b",
  },
]

/** 学完能达到的水平（来自训练营课程文档） */
const OUTCOMES: { name: string; desc: string }[] = [
  {
    name: "技术能力",
    desc: "能独立设计、实现、优化完整的 Agent 系统：从单 Agent 到多智能体协作，再到深度搜索与代码 Agent。",
  },
  {
    name: "面试竞争力",
    desc: "实习和校招同学，学完达到互联网大厂 LLM Agent 工程师的面试要求，有可展示的项目成果。",
  },
  {
    name: "职业竞争力",
    desc: "社招转大模型的同学，学完达到一到两年经验的大模型工程师水平，能直接参与核心项目。",
  },
]

/** 课程特色（来自训练营课程文档） */
const FEATURES: { name: string; desc: string }[] = [
  {
    name: "从跑通示例到解决实际问题",
    desc: "不是只跑通 AutoGen 官方示例，而是用阶段式任务逐步构建能解决真实问题的 Agent 系统。",
  },
  {
    name: "每阶段做深度对比分析",
    desc: "每个阶段都要求做性能对比，例如 ReAct 与 Reflection、仓库复用与从零生成，训练工程判断。",
  },
  {
    name: "前沿方向全覆盖",
    desc: "Agentic Search、DeepSearch、Code Agent、自进化编码、Agentic RL 都在路线内。",
  },
]

const FIT_YES: string[] = [
  "想进入大模型 / Agent 领域，但不知从何入手的开发者",
  "想增加简历项目含量、准备大厂面试的求职者",
  "非科班但对大模型有兴趣，需要系统指导的学习者",
  "自学遇到瓶颈，需要实战指导与项目驱动的学习者",
]

const FIT_NO: string[] = [
  "只想看课、不打算动手做项目的人：训练营的产出都来自动手，只看课跟不上节奏",
  "追求速成承诺、近期没有时间投入的人：能力成长需要周期，这里不提供短期保证",
]

/** 学员结果速览：每行都对应本页下方或社区文档中的截图与反馈 */
const BRIEF: { bg: string; via: string; result: string }[] = [
  { bg: "双非本科", via: "社区学习，3 段内推实习，补 5 个项目（GitHub 1,300 星），参与顶会论文", result: "3 个中厂 offer，入职杭州初创 64k" },
  { bg: "985 硕", via: "主攻 Memory 方向，多模态 memory 顶会论文", result: "Qwen memory offer（另有百度文心、微信 offer）" },
  { bg: "专科 · 8 年后端", via: "参与 Idea2Paper 项目后转行 Agent 开发", result: "56w offer，公司准备上市" },
  { bg: "双非本 211 硕", via: "多对一陪跑，拿到多家大厂实习", result: "入职美团，NeurIPS 合作论文（二作）" },
  { bg: "大厂在职", via: "用 Agent Memory 项目做述职", result: "获大领导认可与年终激励" },
  { bg: "社招学员", via: "学习两个月", result: "除 DeepSeek、Seed 外，头部大厂 offer 基本拿了一遍" },
  { bg: "211 本", via: "科研训练与论文合作", result: "5 个 985 直博 offer" },
  { bg: "大二 · 零基础", via: "一对一辅导 5 个月", result: "完成论文并投出 ICASSP 2026" },
]

/** 学员去向（依据本页录用截图与学员反馈；logo 为 simple-icons 单色图形） */
const ORGS: { svg?: string; label?: string; text?: string }[] = [
  { svg: "bytedance", label: "字节 Seed" },
  { svg: "tencent", label: "腾讯" },
  { svg: "alibaba", label: "阿里 Qwen" },
  { svg: "baidu", label: "百度" },
  { svg: "ant", label: "蚂蚁 Plan A" },
  { svg: "huawei", label: "华为" },
  { svg: "meituan", label: "美团" },
  { svg: "moonshot", label: "Kimi" },
  { svg: "deepseek", label: "DeepSeek" },
  { text: "京东 TGT" },
]

export const metadata: Metadata = {
  title: "大模型 Agent 训练营 · AgentAlpha",
  description:
    "项目驱动、导师带教、实战落地：五个可核验的自研项目、三层课程体系与十阶段实战路线、带教服务实录，大厂 offer 与顶会录用结果墙。资料研习、项目实战、深度陪跑三种参与方式，完整介绍见社区文档。",
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: "/learn",
    siteName: "AgentAlpha",
    title: "大模型 Agent 训练营 · AgentAlpha",
    description:
      "五个可核验的自研项目、十阶段实战路线、大厂 offer 与顶会录用结果墙。项目驱动、导师带教、实战落地。",
    images: [
      {
        url: "/ai-agent-network-visualization-with-nodes-and-conn.jpg",
        width: 1024,
        height: 1024,
        alt: "AgentAlpha 大模型 Agent 训练营",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "大模型 Agent 训练营 · AgentAlpha",
    description: "五个可核验的自研项目、十阶段实战路线、真实结果墙。",
    images: ["/ai-agent-network-visualization-with-nodes-and-conn.jpg"],
  },
}

/** 社区完整介绍文档（定位、项目战绩、导师、学员结果、参与方式都在这里） */
const COMMUNITY_DOC_URL = "https://agentalpha.feishu.cn/docx/QtYQddrAFoLIb9xFe7PckJnmn1b"

const IMG = "/images/learn/community/"

const HERO_STATS: { value: string; label: string }[] = [
  { value: "9.2k+", label: "自研开源 Star 合计（Idea2Paper 1.4k + InkOS 7.8k）" },
  { value: "日榜第 1", label: "Hugging Face Daily Papers（Idea2Paper）" },
  { value: "150+", label: "学员拿到大厂 offer、顶会论文录用、顶级高校实验室录取" },
  { value: "10 亿字", label: "InkOS 累计产出文字" },
]

type ProjLink = { label: string; href: string }

const PROJECTS: {
  name: string
  kicker: string
  desc: string
  points: string[]
  links: ProjLink[]
  shots: { src: string; w: number; h: number; alt: string; cap?: string }[]
  strip?: { srcs: { src: string; w: number; h: number; alt: string }[]; cap: string }
  mini?: { label: string; srcs: { src: string; w: number; h: number; alt: string; cap: string }[] }
  wide?: boolean
}[] = [
  {
    name: "Idea2Paper · AI 科研智能体",
    kicker: "RESEARCH · 学术",
    desc: "从想法到论文的全流程 auto research，内置 10 万+ 顶会论文向量知识库和多智能体评审，解决「想法好、写不出、投不中」的科研痛点。",
    points: [
      "Hugging Face Daily Paper 日榜第 1，超越阿里、美团、千问等大厂成果",
      "GitHub 1.4k stars，1,000+ 内测用户、200+ 付费用户",
      "Agent 自动迭代出 1,800+ 篇论文，正推进约 300 万天使轮合作",
    ],
    links: [
      { label: "GitHub 仓库", href: "https://github.com/AgentAlphaAGI/Idea2Paper" },
      { label: "官网 paperbuild.cn", href: "https://paperbuild.cn" },
      { label: "技术报告 arXiv:2601.20833", href: "https://arxiv.org/abs/2601.20833" },
      { label: "Hugging Face 项目页", href: "https://huggingface.co/papers/2603.27065" },
    ],
    shots: [
      {
        src: "idea2paper-site.webp",
        w: 1294,
        h: 767,
        alt: "Idea2Paper 官网 paperbuild.cn 首页截图",
        cap: "官网 paperbuild.cn：输入一个初步想法，生成研究叙事与结构蓝图",
      },
    ],
    strip: {
      srcs: [
        { src: "paper-gen-1.webp", w: 560, h: 1252, alt: "Idea2Paper 自动生成的论文第 1 页" },
        { src: "paper-gen-2.webp", w: 560, h: 1252, alt: "Idea2Paper 自动生成的论文协议章节" },
        { src: "paper-gen-3.webp", w: 560, h: 1252, alt: "Idea2Paper 自动生成的论文金融 XBRL 章节" },
        { src: "paper-gen-4.webp", w: 560, h: 1252, alt: "Idea2Paper 自动生成的论文模型架构章节" },
      ],
      cap: "Agent 自动生成的论文示例（四篇不同课题的成稿页面，滚动查看全文）",
    },
    mini: {
      label: "第三方报道与内测实况",
      srcs: [
        {
          src: "idea2paper-media.webp",
          w: 807,
          h: 961,
          alt: "第三方公众号文章《从一个灵感，到一篇论文：Idea2Paper 介绍与上手指南》封面",
          cap: "第三方公众号文章《从一个灵感，到一篇论文》",
        },
        {
          src: "chat-idea2paper-beta.webp",
          w: 720,
          h: 1610,
          alt: "Idea2Paper 产品内测群聊天截图",
          cap: "产品内测群：系统定向升级后的讨论",
        },
      ],
    },
  },
  {
    name: "InkOS · AI 小说创作智能体",
    kicker: "CREATION · 小说",
    desc: "10 个协作 Agent 的工程化写作管线：世界观搭建、情节编排、伏笔追踪、33 维连续性审计与自动修订，内置反 AIGC 检测。",
    points: [
      "GitHub 7,800+ stars、1,500+ forks，npm 下载 3.6 万+",
      "kimi 首批开源合作伙伴",
      "150+ 部作品签约番茄、七猫，头部作者月入 3-5 万",
      "兼职作者稳定月增收 5,000+ 元，每章模型调用成本约 0.2 元",
      "InkOS 1.6.0 引入互动影游、剧本与分镜工作台，以及可插拔 Skill 系统",
    ],
    links: [{ label: "GitHub 仓库", href: "https://github.com/Narcooo/inkos" }],
    shots: [
      {
        src: "inkos-github.webp",
        w: 1400,
        h: 794,
        alt: "InkOS 的 GitHub 仓库页面截图",
        cap: "GitHub 仓库：7,800+ stars、1,500+ forks",
      },
    ],
    strip: {
      srcs: [
        { src: "inkos-readers.webp", w: 555, h: 332, alt: "InkOS 作品在读人数 40,115 的后台截图" },
        { src: "inkos-fanqie.webp", w: 1260, h: 921, alt: "InkOS 作品在番茄小说的平台数据截图" },
      ],
      cap: "平台公开数据：在读人数 4 万+；番茄连载中，男频传统玄幻新书榜第 24 名",
    },
    mini: {
      label: "第三方报道 · 用户与作者反馈",
      srcs: [
        {
          src: "inkos-media.webp",
          w: 719,
          h: 964,
          alt: "第三方技术社区关于 InkOS 的推文",
          cap: "第三方推文：InkOS 五智能体流水线与工程约束解析",
        },
        {
          src: "inkos-card.webp",
          w: 976,
          h: 803,
          alt: "InkOS 项目信息卡片：GitHub stars 与 npm 下载量",
          cap: "项目卡片：GitHub 7,800+ stars、npm 下载 3.6 万+",
        },
        {
          src: "chat-inkos-sign.webp",
          w: 720,
          h: 700,
          alt: "作者群聊天截图：作品审核通过并签约",
          cap: "作者群实录：作品审核通过、正式签约",
        },
        {
          src: "chat-inkos-income.webp",
          w: 720,
          h: 552,
          alt: "作者群聊天截图：讨论稳定收入",
          cap: "作者群实录：讨论稳定收入与延伸玩法",
        },
        {
          src: "chat-inkos-flavor.webp",
          w: 720,
          h: 227,
          alt: "读者聊天截图：从第 6 章开始就没 AI 味了",
          cap: "读者反馈：「调教好从 6 章开始，就没 AI 味了」",
        },
        {
          src: "chat-inkos-quality.webp",
          w: 720,
          h: 230,
          alt: "读者聊天截图：起码 InkOS 出的比我自己写要好",
          cap: "读者反馈：「起码 InkOS 出的，比我自己写要好」",
        },
        {
          src: "chat-inkos-author.webp",
          w: 720,
          h: 595,
          alt: "作者聊天截图：用 InkOS 写作发布到平台赚钱",
          cap: "作者反馈：用 InkOS 完成作品并发布到平台",
        },
        {
          src: "chat-inkos-arch.webp",
          w: 720,
          h: 167,
          alt: "社区成员评价 InkOS 产品架构",
          cap: "社区成员评价：产品架构不错",
        },
      ],
    },
  },
  {
    name: "潜艇 AI · TikTok 跨境电商 AI 引擎",
    kicker: "COMMERCE · 跨境电商",
    desc: "社区成员真实创业项目，从 0 到 1 全程带教：一键成片、智能脚本、素材生成、合规优化全流程。",
    points: [
      "3 人团队 20 天上线，30 天用户破万",
      "帮卖家创造营收 300 万-350 万",
      "技术链路：商品链接解析 → 多视角图片提取与九宫格参考图（解决 AI 货不对版）→ Gemini 拆解爆款脚本 → 生成合规短视频",
      "成员由此掌握工程、产品、运营变现全流程",
    ],
    links: [{ label: "访问产品官网 qiantingai.com", href: "https://qiantingai.com" }],
    shots: [
      {
        src: "qianting-site.webp",
        w: 1400,
        h: 721,
        alt: "潜艇 AI 官网首页截图，展示一站式带货视频解决方案",
        cap: "官网 qiantingai.com：商品链接一键成片，生成合规带货短视频",
      },
    ],
  },
  {
    name: "SellAI Pro · 跨境电商 AI 运营中枢",
    kicker: "ENTERPRISE · 企业定制",
    desc: "企业定制电商项目：把选品判断、竞品雷达、Listing 转化、货源与利润、AI 经营对话、风险门禁六个板块，做成可判断、可迭代的经营系统。",
    points: [
      "10 大核心功能矩阵，覆盖机会发现到运营复盘",
      "Goal 执行中心 + 多 Agent 协作",
      "企业定制落地案例",
    ],
    links: [{ label: "访问产品官网", href: "https://sellaipro.fly.dev/" }],
    shots: [
      {
        src: "sellai-hero.webp",
        w: 1400,
        h: 652,
        alt: "SellAI Pro 平台首页截图，展示高端跨境卖家 AI 运营中枢",
        cap: "平台首页：今日运营判断 + 机会、ASIN 池、毛利、风险分区",
      },
      {
        src: "sellai-features.webp",
        w: 1400,
        h: 604,
        alt: "SellAI Pro 十大核心功能矩阵截图",
        cap: "10 大核心功能矩阵，可独立使用，也可被 Goal 自动调用",
      },
      {
        src: "sellai-cockpit.webp",
        w: 1280,
        h: 797,
        alt: "SellAI Pro 实战舱界面截图",
        cap: "实战舱：今日商机、项目任务与项目助手分区",
      },
      {
        src: "sellai-arch.webp",
        w: 1400,
        h: 534,
        alt: "SellAI Pro 决策架构图：先判断战场，再调度数字员工",
        cap: "决策架构：把每日运营问题变成可判断、可验证、可执行的经营动作",
      },
    ],
    wide: true,
  },
  {
    name: "火花数据 API · 专业数据接入",
    kicker: "DATA · 数据设施",
    desc: "把专业数据与主流模型接入 AI Agent：13 个专业数据库，覆盖研报、投融事件、高考真题、社交搜索等场景。",
    points: ["17.3 万研报数据库", "31.8 万投融事件数据库", "可直接分享到 Agent 使用"],
    links: [{ label: "访问 API 站点", href: "https://kkaiapi.com" }],
    shots: [
      {
        src: "huohua-home.webp",
        w: 1400,
        h: 853,
        alt: "火花数据 API 官网首页截图",
        cap: "给 Agent 的专业数据 API 和模型调用服务",
      },
      {
        src: "huohua-databases.webp",
        w: 1400,
        h: 817,
        alt: "火花数据 13 个专业数据库列表截图",
        cap: "13 个专业数据库，按需分享到 Agent",
      },
    ],
    wide: true,
  },
]

const COURSES: { name: string; tag: string; desc: string; href: string }[] = [
  {
    name: "基础课",
    tag: "入门",
    desc: "从 Python 到 Agent 入门，把动手前要补的基础一次补齐。",
    href: "https://agentalpha.feishu.cn/wiki/VtFawIdrAiLd80kmkF1c57onnIg",
  },
  {
    name: "大模型入门到入行",
    tag: "入门级",
    desc: "两个月掌握 LLM：从原理到工程，面向转岗与就业的第一门主线课。",
    href: "https://agentalpha.feishu.cn/docx/VjP3djEdCoJgjtxTLAPcmm1Lntc",
  },
  {
    name: "Agent 系列课",
    tag: "十个阶段",
    desc: "RAG、Memory、Single/Multi Agent、Deep-Research、Coding Agent、自进化 Agent、Agentic RL。",
    href: "https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb",
  },
  {
    name: "多模态大模型论文课",
    tag: "论文级 · 小班课",
    desc: "面向论文产出的多模态专项：跟着做研究、写论文、投稿。",
    href: "https://appjtakvrjf8935.h5.xiaoe-live.com/p/course/ecourse/course_2smnCZOJQAgrzg1qjqPvJALrb4a?sub_course_list_mode=0",
  },
  {
    name: "多模态大模型深度课",
    tag: "Offer 级",
    desc: "Unified Model 多模态统一模型：为顶尖人才计划和大厂核心岗准备。",
    href: "https://agentalpha.feishu.cn/docx/DFPPdFYbmoTF9nxsCwqcadpgnph",
  },
  {
    name: "具身智能 VLA",
    tag: "前沿方向",
    desc: "视觉-语言-动作模型与具身智能：和青稞实验室共建的前沿课。",
    href: "https://qingkelab.feishu.cn/wiki/EWlEwqyOIirxOEktJGgc86YnnMf",
  },
]

/** Agent 系列课十阶段（来自训练营课程文档，每阶段：掌握内容 → 实践 → 考核 → 产出） */
const STAGES: { no: string; name: string; focus: string; out: string }[] = [
  {
    no: "01",
    name: "RAG：从理论到实践",
    focus: "检索器 + 生成器协同、文档预处理与嵌入选型、混合检索（关键词 + 向量 + 重排序）、检索质量与幻觉评估。",
    out: "可回答指定领域问题的 RAG 系统 + 全链路评测报告（对接北美金融独角兽定制项目：智能知识引擎）",
  },
  {
    no: "02",
    name: "记忆系统：长短期记忆",
    focus: "短期 / 长期记忆（语义、事件、程序性）、写入与淘汰策略、mem0 等框架、跨会话记忆保持。",
    out: "带长短期记忆的个人科研助手（本周项目带做）",
  },
  {
    no: "03",
    name: "单 Agent 架构（AutoGen）",
    focus: "ReAct / Reflexion / Tool Use 经典范式、工具调用与执行隔离、Self-Reflection 自我反思。",
    out: "增强版单 Agent：能完成任务并在出错时自动反思修复",
  },
  {
    no: "04",
    name: "多智能体协作（AutoGen）",
    focus: "Planner / Researcher / Coder / Critic 角色分工、GroupChat 轮次控制、LangGraph 图驱动编排与回滚。",
    out: "多 Agent ReAct 流程与互相纠错机制",
  },
  {
    no: "05",
    name: "DeepSearch 路线",
    focus: "推理中检索（动态触发搜索）、文档内推理（RiD）、复现最小可运行的 Search-o1 流程。",
    out: "「思考 → 搜索 → 整合」报告，与纯 RAG 从答案质量、引用准确性、推理链完整性做对照",
  },
  {
    no: "06",
    name: "高效推理与大规模服务",
    focus: "KV cache、PagedAttention、连续批处理、量化（GPTQ / AWQ 等）、vLLM / SGLang 部署与可观测性。",
    out: "开源模型部署 + 吞吐 / 延迟对比实验与流式接口演示",
  },
  {
    no: "07",
    name: "Code Agent：SWE-agent 等框架",
    focus: "仓库级代码理解（调用图 / 依赖图）、SWE-bench 评测、SWE-agent / OpenHands / RepoMaster。",
    out: "修复真实 GitHub issue + 含性能对比与失败分析的复现报告",
  },
  {
    no: "08",
    name: "AlphaEvolve：自进化编码",
    focus: "进化循环：生成 → 评估 → 筛选 → 迭代；MAP-Elites 与岛屿模型、并行评估、SE-Agent 轨迹级进化。",
    out: "在可量化任务上跑通完整自进化流程 + 实验记录（性能曲线、种群演化、失败案例）",
  },
  {
    no: "09",
    name: "Agentic RL（Search-R1）",
    focus: "把搜索建模为 RL 动作、奖励函数设计、PPO / GRPO / Reinforce 对比、veRL / EasyR1 / Search-R1 三框架。",
    out: "小规模 RL 实验：训练 3B-7B 模型学习搜索时机，报告检索行为与答案质量变化",
  },
  {
    no: "10",
    name: "综合项目考核（1–2 周）",
    focus: "三选一：DepResearch × CodeAgent、自进化 × 代码推理、Agentic RL 应用（可与导师协商自定义）。",
    out: "完整技术报告（方法、实验日志、失效分析、复现脚本）+ 可一键复现的代码仓库",
  },
]

/** 带教服务（来自训练营课程文档的课程形式与资源） */
const SERVICE: { name: string; desc: string }[] = [
  { name: "直播 + 录播 + 代码库", desc: "企业级 Agent 项目源码随课开放，可复跑、可改进、可写进简历。" },
  { name: "每周固定答疑", desc: "字节 3-2、NeurIPS Spotlight 得主、大厂 P7-P8 背景的导师每周固定答疑。" },
  { name: "周报与阶段考核", desc: "每周提交学习周报，阶段性考核跟踪学习成果，不做只打卡的旁观者。" },
  {
    name: "内推与论文辅导",
    desc: "结业优秀项目获内推机会，已有学员入职 Seed、Kimi 等团队；论文方向有两年课题记录可查。",
  },
]

/** 辅导过程实录（来自训练营课程文档的真实记录） */
const SERVICE_WALL: { src: string; w: number; h: number; cap: string }[] = [
  { src: "teach-1v1-meeting.webp", w: 1200, h: 726, cap: "一对一辅导会议：强化学习与深度学习理论串讲" },
  { src: "teach-rag-qa.webp", w: 1000, h: 489, cap: "RAG 答疑：检索效果优化、参数调优与多语言处理" },
  { src: "teach-ama-memory.webp", w: 1000, h: 541, cap: "AMA：Agent Memory 分层架构与技术趋势" },
  { src: "teach-live-notice.webp", w: 720, h: 1197, cap: "周日直播项目课：项目介绍与现场答疑" },
  { src: "teach-mem-week.webp", w: 720, h: 1028, cap: "课程群：本周 Memory 项目安排与高频面试题" },
  { src: "chat-gcn-baseline.webp", w: 647, h: 561, cap: "正在辅导的例子：学员魔改方法追上基线后的讨论" },
  { src: "teach-weekly-report.webp", w: 1000, h: 859, cap: "学员学习周报：逐日记录进展、收获与问题" },
  { src: "teach-exp-report.webp", w: 1200, h: 992, cap: "学员实验进度报告：多方案指标对比" },
  { src: "teach-effibench.webp", w: 1200, h: 447, cap: "EffiBench 实验复现结果表：与论文逐项对比" },
  { src: "teach-au-lesson.webp", w: 1200, h: 1040, cap: "海外导师辅导课：怎么读论文" },
  {
    src: "paper-mentor-table.webp",
    w: 1092,
    h: 702,
    cap: "两年论文辅导课题记录（已匿名）：学员以合作作者参与期刊与会议论文",
  },
]

const FIGURES: { src: string; w: number; h: number; alt: string; cap: string }[] = [
  {
    src: "syllabus-llm.webp",
    w: 1400,
    h: 989,
    alt: "AgentAlpha 大模型基础课程大纲图：八个模块与实战安排",
    cap: "大模型基础课大纲：基础知识 → 数据工程 → 分布式训练框架 → 微调 → 推理与部署优化 → 评测与分析 → 应用，每个模块配实战，最后并入训练营现有路线",
  },
  {
    src: "syllabus-agent.webp",
    w: 1400,
    h: 803,
    alt: "智能体系统开发实战课十个阶段思维导图",
    cap: "Agent 系列课十个阶段：RAG、记忆系统、单 Agent、多智能体、DeepSearch、Code Agent、自进化、Agentic RL、综合项目考核，每阶段标注掌握内容、实战与考核",
  },
]

const MENTORS: { title: string; items: string[] }[] = [
  {
    title: "产业界核心成员",
    items: [
      "原大厂 AI 大模型算法负责人：10 多篇 Agent、RL 方向顶会论文与 SOTA 开源项目，多段大厂经历",
      "MIT 博士、985 青年教授：腾讯、OPPO 等 AI lab 产学研合作的资深研究科学家，CVPR、ECCV 等顶会 Workshop challenge 全球冠军",
      "香港科技大学计算机系博士后：高效 LLM/VLM 训练与推理方向，成果发表于 NeurIPS（含 Spotlight）、ICML、COLM、ACL、ICLR，论文 80 余篇",
      "中科院 PhD：2025 年面试超 80 场，国内 LLM 大厂通过率 100%，拿到多个大厂顶尖人才计划 offer",
      "社区成员来自字节 Seed、Meta、Google、Apple、阿里 P7 等",
    ],
  },
  {
    title: "学术界核心成员（含核心导师团队）",
    items: [
      "MIT 博士（大模型与多智能体方向）",
      "北大 / 港科博士后（具身智能方向）",
      "中科院研究员（AI 工程化落地方向）",
      "国内顶尖高校 AI lab 讲师、博后",
      "顶会顶刊一作 20 多篇",
    ],
  },
]

/** 一对一辅导老师（来自训练营课程文档的详细介绍） */
const TUTORS: { name: string; tag: string; points: string[] }[] = [
  {
    name: "Ben 老师",
    tag: "研究方向 · 产学研",
    points: [
      "MIT 博士，985 青年教授",
      "担任腾讯、OPPO、字节、阿里等大厂 AI lab 产学研项目合作的资深研究科学家，项目资金支持数百万级",
      "多次获 CVPR、ECCV 等顶会 Workshop Challenge 全球冠军",
    ],
  },
  {
    name: "Jack 老师",
    tag: "训练与系统方向",
    points: [
      "香港 Top 3 博士后研究员，曾赴新加坡国立大学交流访学，有知名科技公司研究经历",
      "在 ICLR、NeurIPS、ICML、ACL、AAAI、ASPLOS 等国际会议发表论文 80 余篇",
      "获 NeurIPS Spotlight、Outstanding Student Paper Award；方向：Agentic RL、自进化 Agent、推理加速、联邦学习与分布式训练",
    ],
  },
]

const PRINCIPLES: { name: string; against: string; insist: string }[] = [  {
    name: "实战为王",
    against: "只看课、只跑示例、只记概念。",
    insist: "围绕真实项目拆需求、写代码、做评估、复盘结果。",
  },
  {
    name: "产学研结合",
    against: "科研只讲论文，工程只讲框架，产业只讲变现。",
    insist: "把论文思路、工程系统和业务场景放到同一个项目里训练。",
  },
  {
    name: "项目驱动",
    against: "学习结束后没有作品，简历和申请材料仍然空。",
    insist: "每个阶段都留下可检查、可展示、可讲解的项目产出。",
  },
  {
    name: "长期主义",
    against: "用焦虑和速成承诺制造冲动。",
    insist: "承认能力成长需要周期，用扎实训练代替短期幻觉。",
  },
]

const TRACKS: { name: string; who: string; train: string; outcome: string }[] = [
  {
    name: "职场实战",
    who: "学生、转岗者、想进入大模型 / Agent 岗的人。",
    train: "复杂系统拆解、代码实现、工程规范、项目表达、面试追问。",
    outcome: "多个能写进简历、能演示、能讲清楚的 Agent 项目。",
  },
  {
    name: "学术科研",
    who: "研究生、博士、申博者、想把 AI 用到科研流程的人。",
    train: "文献检索、科研 Agent、自动科研系统、论文 / Proposal 写作。",
    outcome: "面向科研场景的 Agent 项目，论文与申博履历、内推机会。",
  },
  {
    name: "产业落地",
    who: "OPC 创业者、产品经理、电商从业者、企业团队。",
    train: "MVP 设计、可落地工作流、用户反馈、产品迭代。",
    outcome: "有真实用户反馈、能实现盈利的 Agent 产品。",
  },
]

const OFFERS: { src: string; w: number; h: number; cap: string }[] = [
  { src: "offer-tencent.webp", w: 790, h: 725, cap: "腾讯公司录用意向书（已脱敏）" },
  { src: "offer-bytedance.webp", w: 884, h: 1184, cap: "字节跳动录用通知（大模型安全算法工程师 · Seed）" },
  { src: "offer-jd-tgt.webp", w: 1400, h: 862, cap: "京东 TGT（Tech Genius Team）意向函（已脱敏）" },
  { src: "offer-ant.webp", w: 1400, h: 706, cap: "蚂蚁集团 Plan A 意向书（已脱敏）" },
  { src: "offer-huawei.webp", w: 1200, h: 706, cap: "华为天才少年计划录取通知（已脱敏）" },
  { src: "offer-collage.webp", w: 900, h: 1200, cap: "腾讯、字节、NeurIPS 等录用与意向结果合集（已脱敏）" },
]

const PAPER_RESULTS: { src: string; w: number; h: number; cap: string }[] = [
  { src: "paper-iclr-accept.webp", w: 370, h: 148, cap: "ICLR Decision：Accept (Poster)" },
  { src: "paper-iclr-review.webp", w: 1179, h: 438, cap: "ICLR 评审结果" },
  { src: "paper-kdd.webp", w: 680, h: 1226, cap: "KDD 2025 Research Track 录用通知" },
  { src: "paper-iccv.webp", w: 680, h: 1114, cap: "ICCV 2025 录用通知" },
  { src: "paper-icml.webp", w: 680, h: 1295, cap: "ICML 2024 录用通知" },
  { src: "paper-emnlp.webp", w: 876, h: 292, cap: "EMNLP 2025 录用邮件" },
  { src: "paper-aaai24.webp", w: 850, h: 735, cap: "AAAI-24 录用通知" },
  { src: "paper-aaai-status.webp", w: 840, h: 836, cap: "AAAI 2024 提交状态：Accept（已打码）" },
  { src: "paper-aaai-score.webp", w: 893, h: 589, cap: "AAAI 评审分数" },
  { src: "paper-positive-reviews.webp", w: 1080, h: 2055, cap: "两位审稿人涨分，最终全正分接收" },
  { src: "paper-neurips.webp", w: 509, h: 729, cap: "NeurIPS 2024 Poster 接收通知" },
  { src: "paper-ieee-tit.webp", w: 1228, h: 496, cap: "IEEE Transactions on Information Theory 接收通知" },
  { src: "phd-usc.webp", w: 609, h: 785, cap: "南加州大学计算机科学博士录取与四年资助" },
  { src: "phd-duke.webp", w: 1229, h: 966, cap: "杜克大学计算机科学博士录取通知" },
  { src: "phd-hkust.webp", w: 680, h: 955, cap: "香港科技大学入学奖学金通知" },
  { src: "phd-collage.webp", w: 900, h: 1028, cap: "多校博士录取结果合集（已脱敏）" },
]

const CHAT_FEATURED: { quote: string; tag: string; src: string; w: number; h: number; cap: string }[] = [
  {
    quote:
      "双非本科，去年在社区学习，内推了三个实习，补了 5 个有含金量的项目（GitHub 1300 星），也参与了顶会论文，拿到 3 个中厂 offer，最后选了杭州一家初创 64k。RAG 项目最有帮助，面试里项目被追问了 30 分钟，面经都没考。",
    tag: "双非本科 · RAG 项目",
    src: "chat-triple-offer.webp",
    w: 720,
    h: 1602,
    cap: "学员群聊：实战项目三投三中，深圳一家初创 Agent 岗开了 47k×13",
  },
  {
    quote:
      "985 学弟，主推 memory 模块，多模态 memory 发了篇顶会，方向对口拿到 Qwen memory offer，此外还有百度文心基模和微信的 offer。",
    tag: "985 硕 · Qwen",
    src: "chat-qwen.webp",
    w: 720,
    h: 1561,
    cap: "学员反馈：经社区内推引荐，拿到 Qwen offer",
  },
  {
    quote:
      "专科出身、工作 8 年的后端程序员，参与 Idea2Paper 项目后转行 Agent 开发，靠项目拿下 56w offer，现公司准备上市。",
    tag: "转行 Agent · 56w",
    src: "chat-56w-1.webp",
    w: 720,
    h: 606,
    cap: "学员反馈：因 Idea2Paper 项目经历跳槽升任组长",
  },
  {
    quote: "211 学弟在社区参与科研训练与论文合作，申请季拿到 5 个 985 直博 offer，最终进入意向导师的实验室。",
    tag: "211 本 · 5 个 985 直博",
    src: "phd-985-offers.webp",
    w: 900,
    h: 2000,
    cap: "学员报喜聊天（已打码）：拿到多个直博 offer 后向导师报喜",
  },
  {
    quote: "大二学弟，Python 和深度学习零基础起步，一对一辅导 5 个月完成第一篇论文，投出 ICASSP 2026。",
    tag: "大二 · ICASSP 2026",
    src: "chat-icassp.webp",
    w: 720,
    h: 1600,
    cap: "论文辅导群实录：从零基础到论文成稿（辅导记录）",
  },
  {
    quote: "硕士学员参与 NeurIPS 合作论文后，获导师推荐赴香港大学读博。",
    tag: "NeurIPS 合作 · 港大读博",
    src: "chat-hkust-rec.webp",
    w: 720,
    h: 980,
    cap: "顶会论文合作后获推荐读博（聊天已打码）",
  },
]

const CHAT_MORE: { src: string; w: number; h: number; cap: string }[] = [
  { src: "chat-meituan-nips.webp", w: 720, h: 1609, cap: "双非本 211 硕：拿到多家大厂实习后选择美团，参与 NeurIPS 合作论文（二作）" },
  { src: "chat-memory-review.webp", w: 720, h: 1429, cap: "大厂在职学员：靠 Agent Memory 项目述职获大领导认可，拿到年终大礼包" },
  { src: "chat-two-months.webp", w: 720, h: 1468, cap: "学习两个月：除 DeepSeek、Seed 外，头部大厂 offer 基本拿了一遍" },
  { src: "chat-56w-2.webp", w: 720, h: 1230, cap: "Idea2Paper 技术组群聊：学员所在公司产品准备上市" },
]

const PARTICIPATION: { level: string; who: string; support: string }[] = [
  {
    level: "资料研习",
    who: "还在判断方向，想先理解 Agent 项目和学习路线。",
    support: "资料、项目文档、站内笔记与面试题库。",
  },
  {
    level: "项目实战",
    who: "明确想做出一个完整 Agent 项目的人。",
    support: "周任务、作业、代码 Review、阶段验收、项目说明。",
  },
  {
    level: "深度陪跑",
    who: "有求职、申博、比赛、创业或企业落地目标的人。",
    support: "项目打磨、简历 / 申请材料、讲解稿、模拟面试、高频追问拆解。",
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: "零基础能跟吗？",
    a: "可以。基础课从 Python 讲到 Agent 入门，大模型专项课也分层到入门级；确认方向后，再按「资料研习 → 项目实战 → 深度陪跑」逐步加深。",
  },
  {
    q: "课程和资料在哪里看？",
    a: "基础课、大模型专项课、Agent 系列课的大纲都是飞书公开文档，本页课程卡片可直接点开；站内还有 Claude Code 全套 23 章教程和面试题库。",
  },
  {
    q: "训练营怎么上课？怎么跟进我的进度？",
    a: "直播 + 录播 + 代码库（企业级 Agent 项目源码）。导师每周固定答疑；每周提交学习周报，并有阶段性考核；结业优秀项目有内推机会，已有学员入职 Seed、Kimi 等团队。",
  },
  {
    q: "有论文和升学方面的辅导吗？",
    a: "有。科研方向依托 Idea2Paper 平台与论文辅导课题，两年课题记录见上方截图（学员以合作作者参与期刊与会议论文）；升学方向已有多位学员拿到南加大、杜克、港科大等博士录取。",
  },
  {
    q: "怎么判断我适合哪种参与深度？",
    a: "把四件事发给我们：你的背景（学生 / 在职 / 科研 / 创业 / 企业）、你的目标、你的基础（编程、论文、产品、运营分别到什么程度）、你能投入的时间和预算。",
  },
  {
    q: "上面的成果可以核验吗？",
    a: "可以。五个代表项目都给出 GitHub / 官网链接，两个自研项目在 Hugging Face 与 npm 上有公开记录；offer 与论文录用截图已脱敏，扫码可进社区进一步了解。",
  },
  {
    q: "和市面上其他大模型课程的区别是什么？",
    a: "三点。项目可核验：五个代表项目都有公开链接和第三方平台记录，不是虚构的案例名。产学研一体：导师同时来自产业界和学术界，课程、项目、论文共用一条主线。结果可查：offer、论文录用、博士录取的截图都放在本页，社区文档全程公开。",
  },
]

const CTA_ASKS: { k: string; v: string }[] = [
  { k: "你的背景", v: "学生 / 在职 / 科研 / 创业 / 企业" },
  { k: "你的目标", v: "求职、升学、项目、变现、企业落地" },
  { k: "你的基础", v: "编程、论文、产品、运营分别到什么程度" },
  { k: "你的时间与预算", v: "能投入多久，想做到什么结果" },
]

export default function LearnIndexPage() {
  return (
    <>
      <Navigation />
      <LearnToc />
      <main className="aa-notes learn-home">
        <article className="aa-notes-shell learn-home-shell">
          <nav className="aa-note-breadcrumb">
            <Link href="/">
              <ArrowLeft aria-hidden /> 返回首页
            </Link>
          </nav>

          <header className="learn-home-hero">
            <p className="aa-kicker">AGENTALPHA 训练营 · 项目驱动 · 导师带教</p>
            <h1>大模型 Agent 训练营</h1>
            <p className="learn-home-lede">
              以真实项目训练为主线：五个自研开源与商用项目就是课堂案例，课程、带教、验收都围绕它们展开。
              项目战绩、课程大纲、学员结果全部放在页面上，每一条都可以点开核验。
            </p>
            <div className="learn-home-actions">
              <a className="aa-btn-primary" href={COMMUNITY_DOC_URL} target="_blank" rel="noopener noreferrer">
                查看社区完整介绍 <ArrowUpRight aria-hidden />
              </a>
              <a
                className="aa-btn-ghost"
                href="https://meeting.tencent.com/crm/2G4ZrQVAd0"
                target="_blank"
                rel="noopener noreferrer"
              >
                先看课程介绍会回放
              </a>
              <Link className="aa-btn-ghost" href="/learn/claude-code">
                逛公开教程
              </Link>
            </div>
            <ul className="learn-home-stats">
              {HERO_STATS.map((s) => (
                <li key={s.label}>
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </header>

          <section id="projects" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">01 · REPRESENTATIVE PROJECTS</p>
                <h2>五个代表项目，链接全部可核验</h2>
                <p className="aa-section-desc">
                  训练营的实战载体：自研四大学术核心成果加企业定制项目，技术研发、项目实战、人才培养都围绕它们展开。
                </p>
              </div>
              <a className="aa-section-link" href={COMMUNITY_DOC_URL} target="_blank" rel="noopener noreferrer">
                社区文档里的项目章节 <ArrowUpRight aria-hidden />
              </a>
            </div>

            <div className="learn-projects">
              {PROJECTS.map((proj) => (
                <article key={proj.name} className={proj.wide ? "learn-proj learn-proj--wide" : "learn-proj"}>
                  <div className="learn-proj-shots">
                    {proj.shots.map((shot) => (
                      <figure key={shot.src} className="learn-shot">
                        <img src={IMG + shot.src} alt={shot.alt} width={shot.w} height={shot.h} loading="lazy" decoding="async" />
                        {shot.cap ? <figcaption>{shot.cap}</figcaption> : null}
                      </figure>
                    ))}
                  </div>
                  <div className="learn-proj-body">
                    <p className="learn-proj-kicker">{proj.kicker}</p>
                    <h3>{proj.name}</h3>
                    <p className="learn-proj-desc">{proj.desc}</p>
                    <ul className="learn-proj-points">
                      {proj.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <div className="learn-proj-links">
                      {proj.links.map((link) => (
                        <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.label} <ArrowUpRight aria-hidden />
                        </a>
                      ))}
                    </div>
                    {proj.strip ? (
                      <div className="learn-proj-strip">
                        <div className={proj.strip.srcs.length > 2 ? "learn-strip learn-strip--tall" : "learn-strip"}>
                          {proj.strip.srcs.map((s) => (
                            <img key={s.src} src={IMG + s.src} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
                          ))}
                        </div>
                        <p className="learn-strip-cap">{proj.strip.cap}</p>
                      </div>
                    ) : null}
                    {proj.mini ? (
                      <div className="learn-proj-strip">
                        <p className="learn-mini-label">{proj.mini.label}</p>
                        <div className="learn-mini-wall">
                          {proj.mini.srcs.map((s) => (
                            <figure key={s.src} className="learn-wall-item">
                              <img src={IMG + s.src} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
                              <figcaption>{s.cap}</figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="courses" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">02 · COURSES</p>
                <h2>三层课程体系 + 十阶段 Agent 系列课</h2>
                <p className="aa-section-desc">
                  课程体系 + 实战训练营 + 项目定制三大板块：基础课打底，大模型专项课分层到入门 / 论文 / offer 三级，Agent
                  系列课按十个阶段推进。
                </p>
              </div>
            </div>
            <div className="learn-home-courses">
              {COURSES.map((course, index) => (
                <a
                  key={course.name}
                  className="learn-home-course learn-home-course--link"
                  href={course.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="learn-home-course-top">
                    <span className="learn-home-course-no">{String(index + 1).padStart(2, "0")}</span>
                    <span className="learn-home-course-tag">{course.tag}</span>
                  </span>
                  <h3>{course.name}</h3>
                  <p>{course.desc}</p>
                  <span className="learn-home-course-go">查看课程 ↗</span>
                </a>
              ))}
            </div>
            <div className="learn-figures">
              {FIGURES.map((fig) => (
                <figure key={fig.src} className="learn-fig">
                  <img src={IMG + fig.src} alt={fig.alt} width={fig.w} height={fig.h} loading="lazy" decoding="async" />
                  <figcaption>{fig.cap}</figcaption>
                </figure>
              ))}
            </div>

            <h3 className="learn-sub">Agent 系列课 · 十阶段实战路线</h3>
            <p className="aa-section-desc learn-stages-intro">
              每个阶段都按「掌握内容 → 实践任务 → 阶段考核 → 实战产出」推进：先跑通经典范式，再做对比分析，最后留下能写进简历的项目。
            </p>
            <div className="learn-stages">
              {STAGES.map((s) => (
                <div key={s.no} className="learn-stage">
                  <div className="learn-stage-top">
                    <span className="learn-stage-no">{s.no}</span>
                    <h3>{s.name}</h3>
                  </div>
                  <p>{s.focus}</p>
                  <p className="learn-stage-out">{s.out}</p>
                </div>
              ))}
            </div>

            <h3 className="learn-sub">学完能达到的水平</h3>
            <div className="learn-svc learn-svc--3">
              {OUTCOMES.map((o) => (
                <div key={o.name} className="learn-svc-card">
                  <h3>{o.name}</h3>
                  <p>{o.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="learn-sub">介绍会与答疑会回放</h3>
            <div className="learn-replays">
              {REPLAYS.map((r) => (
                <a key={r.href} className="learn-replay" href={r.href} target="_blank" rel="noopener noreferrer">
                  <strong>{r.title}</strong>
                  <span>{r.desc}</span>
                  <em>腾讯会议回放 ↗</em>
                </a>
              ))}
            </div>
          </section>

          <section id="service" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">03 · SERVICE</p>
                <h2>带教服务与课程形式</h2>
                <p className="aa-section-desc">
                  训练营不是看课自习：直播带做、每周答疑、周报考核、内推与论文辅导都写在流程里。下面是服务内容与真实的辅导过程记录。
                </p>
              </div>
            </div>
            <div className="learn-svc">
              {SERVICE.map((s) => (
                <div key={s.name} className="learn-svc-card">
                  <h3>{s.name}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
            <h3 className="learn-sub">辅导过程实录（答疑、周报与论文课题记录）</h3>
            <div className="learn-wall">
              {SERVICE_WALL.map((o) => (
                <figure key={o.src} className="learn-wall-item">
                  <a href={IMG + o.src} target="_blank" rel="noopener noreferrer" title="点击查看原图">
                    <img src={IMG + o.src} alt={o.cap} width={o.w} height={o.h} loading="lazy" decoding="async" />
                  </a>
                  <figcaption>{o.cap}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section id="fit" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">04 · WHO IT'S FOR</p>
                <h2>课程特色与适合谁</h2>
                <p className="aa-section-desc">先说清楚训练营怎么教，再说清楚谁适合来、谁不适合来。</p>
              </div>
            </div>
            <div className="learn-svc learn-svc--3 learn-fit-features">
              {FEATURES.map((f) => (
                <div key={f.name} className="learn-svc-card">
                  <h3>{f.name}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="learn-fit">
              <div className="learn-fit-col">
                <h3>适合谁</h3>
                <ul>
                  {FIT_YES.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="learn-fit-col learn-fit-col--no">
                <h3>暂不适合谁</h3>
                <ul>
                  {FIT_NO.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="mentors" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">05 · MENTORS</p>
                <h2>导师与社区成员</h2>
                <p className="aa-section-desc">产学研三方都在一线做项目：研究问题、工程难点和真实场景放在同一个训练场里。</p>
              </div>
            </div>
            <div className="learn-mentors">
              {MENTORS.map((group) => (
                <div key={group.title} className="learn-mentor-col">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <h3 className="learn-sub">一对一辅导老师</h3>
            <div className="learn-svc learn-svc--2">
              {TUTORS.map((t) => (
                <div key={t.name} className="learn-svc-card learn-tutor">
                  <h3>{t.name}</h3>
                  <span className="learn-tutor-tag">{t.tag}</span>
                  <ul>
                    {t.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="method" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">06 · PRINCIPLES</p>
                <h2>训练营的方法</h2>
              </div>
            </div>
            <div className="learn-method">
              {PRINCIPLES.map((p) => (
                <div key={p.name} className="learn-method-row">
                  <h3>{p.name}</h3>
                  <p>
                    <span className="learn-home-against">不做</span>
                    {p.against}
                  </p>
                  <p>
                    <span className="learn-home-insist">坚持</span>
                    {p.insist}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="tracks" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">07 · TRACKS</p>
                <h2>三类成长方向</h2>
                <p className="aa-section-desc">不同人的目标不一样，但训练底层相通：围绕真实 Agent 项目，形成可展示、可解释、可迁移的能力。</p>
              </div>
            </div>
            <div className="learn-tracks">
              {TRACKS.map((t) => (
                <div key={t.name} className="learn-track">
                  <h3>{t.name}</h3>
                  <dl>
                    <dt>适合谁</dt>
                    <dd>{t.who}</dd>
                    <dt>核心训练</dt>
                    <dd>{t.train}</dd>
                    <dt>最终留下什么</dt>
                    <dd>{t.outcome}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section id="results" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">08 · RESULTS</p>
                <h2>真实结果与学员案例</h2>
                <p className="aa-section-desc">以下截图均已脱敏，来自社区学员的真实结果；每个项目本身也有公开链接可查。</p>
              </div>
            </div>

            <h3 className="learn-sub">学员结果速览</h3>
            <div className="learn-brief-wrap">
              <table className="learn-brief">
                <thead>
                  <tr>
                    <th>背景</th>
                    <th>经过</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {BRIEF.map((row) => (
                    <tr key={row.bg}>
                      <td>{row.bg}</td>
                      <td>{row.via}</td>
                      <td>{row.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="learn-sub">学员去向</h3>
            <div className="learn-orgs" aria-label="学员去向">
              {ORGS.map((o) =>
                o.text ? (
                  <span key={o.text} className="learn-org learn-org--text">
                    {o.text}
                  </span>
                ) : (
                  <span key={o.label} className="learn-org">
                    <img aria-hidden src={`/images/learn/logos/${o.svg}.svg`} alt="" width="22" height="22" loading="lazy" decoding="async" />
                    <span>{o.label}</span>
                  </span>
                ),
              )}
            </div>

            <h3 className="learn-sub">大厂 Offer 与录用结果</h3>
            <div className="learn-wall">
              {OFFERS.map((o) => (
                <figure key={o.src} className="learn-wall-item">
                  <a href={IMG + o.src} target="_blank" rel="noopener noreferrer" title="点击查看原图">
                    <img src={IMG + o.src} alt={o.cap} width={o.w} height={o.h} loading="lazy" decoding="async" />
                  </a>
                  <figcaption>{o.cap}</figcaption>
                </figure>
              ))}
            </div>

            <h3 className="learn-sub">论文录用与博士升学</h3>
            <div className="learn-wall">
              {PAPER_RESULTS.map((o) => (
                <figure key={o.src} className="learn-wall-item">
                  <a href={IMG + o.src} target="_blank" rel="noopener noreferrer" title="点击查看原图">
                    <img src={IMG + o.src} alt={o.cap} width={o.w} height={o.h} loading="lazy" decoding="async" />
                  </a>
                  <figcaption>{o.cap}</figcaption>
                </figure>
              ))}
            </div>

            <h3 className="learn-sub">部分案例和学员反馈</h3>
            <div className="learn-chats">
              {CHAT_FEATURED.map((c) => (
                <figure key={c.src} className="learn-chat">
                  <blockquote>
                    <p>{c.quote}</p>
                    <span className="learn-chat-tag">{c.tag}</span>
                  </blockquote>
                  <div className="learn-chat-shot">
                    <img src={IMG + c.src} alt={c.cap} width={c.w} height={c.h} loading="lazy" decoding="async" />
                    <figcaption>{c.cap}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
            <div className="learn-wall learn-wall--chats">
              {CHAT_MORE.map((c) => (
                <figure key={c.src} className="learn-wall-item">
                  <a href={IMG + c.src} target="_blank" rel="noopener noreferrer" title="点击查看原图">
                    <img src={IMG + c.src} alt={c.cap} width={c.w} height={c.h} loading="lazy" decoding="async" />
                  </a>
                  <figcaption>{c.cap}</figcaption>
                </figure>
              ))}
            </div>

            <p className="learn-next-step">
              想核对细节：项目链接都在上方卡片里，结果截图可点开看原图。不确定是否合适，先看
              <a href="https://meeting.tencent.com/crm/2G4ZrQVAd0" target="_blank" rel="noopener noreferrer">
                课程介绍会回放
              </a>
              ，再对照
              <a href="#participate">三种参与方式</a>；页底二维码可以直接把你的情况发给我们。
            </p>
          </section>

          <section id="participate" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">09 · PARTICIPATION</p>
                <h2>三种参与方式</h2>
                <p className="aa-section-desc">不同人需要的不是同一种服务，而是不同深度的参与方式。</p>
              </div>
            </div>
            <div className="learn-home-part">
              {PARTICIPATION.map((item) => (
                <div key={item.level} className="learn-home-part-card">
                  <h3>{item.level}</h3>
                  <p className="learn-home-part-who">{item.who}</p>
                  <p className="learn-home-part-support">{item.support}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="learn-home-block">
            <div className="aa-section-head">
              <div className="aa-section-head-main">
                <p className="aa-kicker">10 · FAQ</p>
                <h2>常见问题</h2>
              </div>
            </div>
            <div className="learn-faq">
              {FAQ.map((item) => (
                <details key={item.q} className="learn-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="learn-home-cta">
            <div className="learn-cta-copy">
              <h2>想加入社区，先发 4 个信息</h2>
              <ol className="learn-cta-asks">
                {CTA_ASKS.map((ask) => (
                  <li key={ask.k}>
                    <strong>{ask.k}</strong>
                    <span>{ask.v}</span>
                  </li>
                ))}
              </ol>
              <p className="learn-cta-note">我们据此判断你适合哪种参与深度；也可以先看社区文档和公开教程，判断合适后再来。</p>
              <div className="learn-home-actions">
                <a
                  className="learn-cta-btn-ghost"
                  href={COMMUNITY_DOC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看社区完整介绍 <ArrowUpRight aria-hidden />
                </a>
                <Link className="learn-cta-btn-ghost" href="/learn/claude-code">
                  站内公开教程
                </Link>
              </div>
            </div>
            <figure className="learn-cta-qr">
              <img src={IMG + "wechat-qr.webp"} alt="社区联系人微信二维码" width={939} height={1056} loading="lazy" decoding="async" />
              <figcaption>扫码添加微信，发送上面 4 个信息</figcaption>
            </figure>
          </section>

          {/* 移动端底部固定操作条（桌面端隐藏） */}
          <div className="learn-mcta">
            <a className="aa-btn-primary" href="https://meeting.tencent.com/crm/2G4ZrQVAd0" target="_blank" rel="noopener noreferrer">
              看介绍会回放
            </a>
            <a className="aa-btn-ghost" href="#participate">
              参与方式
            </a>
          </div>
        </article>
      </main>
    </>
  )
}
