import { getAllQa, type QaItem } from "@/lib/qa"

/**
 * 公司维度词表与聚合。
 * company 字段的口径：题目方向来自该公司公开面经/岗位 JD 的高频归纳，
 * 不代表「内部真题」；页面上也按这个口径表述。
 */
export interface Company {
  slug: string
  /** 展示名 */
  name: string
  /** 常见叫法/搜索词，用于聚合页文案 */
  aliases: string[]
  /** 一句话介绍该公司在 AI Agent 方向的业务重心（聚合页导语用） */
  note: string
}

export const COMPANIES: Company[] = [
  { slug: "bytedance", name: "字节跳动", aliases: ["字节", "Seed", "豆包", "扣子", "Coze"], note: "豆包大模型与 Seed 团队、扣子（Coze）Agent 平台、飞书场景，Agent 应用与推理部署岗位多。" },
  { slug: "alibaba", name: "阿里巴巴", aliases: ["阿里", "通义", "千问", "Qwen", "夸克", "钉钉"], note: "通义千问系列与百炼平台、夸克搜索、钉钉 AI 助手，企业级 RAG 与 Agent 平台需求大。" },
  { slug: "tencent", name: "腾讯", aliases: ["腾讯", "混元", "元宝", "微信 AI"], note: "混元大模型、元宝与微信场景的 AI 助手，社交内容与游戏 AI 方向有自己的侧重。" },
  { slug: "baidu", name: "百度", aliases: ["百度", "文心", "文心一言", " ERNIE"], note: "文心系列与搜索主业结合紧密，搜索增强、知识问答类 RAG 岗位是传统重心。" },
  { slug: "meituan", name: "美团", aliases: ["美团", "LongCat"], note: "到店、外卖与客服场景的交易 Agent、商品知识库问答，业务落地色彩重。" },
  { slug: "jd", name: "京东", aliases: ["京东", "京言", "言犀"], note: "言犀大模型与电商客服、商品问答场景，Agent 落地与评测岗位常见。" },
  { slug: "huawei", name: "华为", aliases: ["华为", "盘古"], note: "盘古大模型面向行业（气象、矿山、政务），工程与系统设计题占比高。" },
  { slug: "xiaohongshu", name: "小红书", aliases: ["小红书"], note: "搜索推荐与 AIGC 内容结合，社区治理与内容安全方向有独特考法。" },
  { slug: "deepseek", name: "DeepSeek", aliases: ["深度求索"], note: "以模型能力与 Infra 见长，推理优化、训练框架、RL 相关题的密度高。" },
  { slug: "moonshot", name: "月之暗面", aliases: ["Moonshot", "Kimi"], note: "Kimi 助手与长上下文技术，长文本处理与 Agent 记忆是高频方向。" },
  { slug: "minimax", name: "MiniMax", aliases: ["MiniMax", "海螺"], note: "多模态与助手产品并行，语音、视频与 Agent 工程题都可能出现。" },
  { slug: "zhipu", name: "智谱", aliases: ["智谱", "智谱 AI", "GLM", "ChatGLM"], note: "GLM 系列开放平台与 AutoGLM，工具调用与 Agent 基座能力考查多。" },
  { slug: "bilibili", name: "B站", aliases: ["B站", "bilibili", "哔哩哔哩"], note: "AI Agent 开发岗笔试面试题以 RAG 全流程、LangChain 组件、多轮 Agent 设计为主，工程题密度高。" },
  { slug: "pdd", name: "拼多多", aliases: ["拼多多"], note: "Agent 研发社招面试强度大，MCP 交互细节、内部数据安全与上下文压缩是高频方向；大模型算法岗的推理与 RL 追问链业内最深。" },
  { slug: "antgroup", name: "蚂蚁集团", aliases: ["蚂蚁", "蚂蚁集团", "支付宝"], note: "Agent 交付风险与回滚机制、Harness 上下文管理等生产化考题常见；大模型算法岗反复考 PPO 四模型与量化选型。" },
  { slug: "didi", name: "滴滴", aliases: ["滴滴"], note: "大模型算法岗以 GRPO 全家桶著称：损失函数手写、KL 估计、熵坍塌、训练监控指标层层下钻。" },
  { slug: "kuaishou", name: "快手", aliases: ["快手"], note: "大模型应用开发岗考 RAG 全链路十连问与手写公式（GAE、重要性采样），GenAI 岗另考量化与推理成本。" },
  { slug: "xiaomi", name: "小米", aliases: ["小米"], note: "Agent 岗偏工程落地：RAG 知识库更新、MCP 传输选型这类「上过生产没有」的问题常见。" },
  { slug: "douyin", name: "抖音", aliases: ["抖音"], note: "大模型岗位考基础原理的演进逻辑：RNN 缺陷到 Attention、Decoder-only 胜因，追问链条完整。" },
  { slug: "netease", name: "网易", aliases: ["网易", "网易有道", "伏羲"], note: "游戏 AI（伏羲）与有道教育场景，Agent 业务落地与内容生成的结合题多。" },
  { slug: "iflytek", name: "科大讯飞", aliases: ["讯飞", "科大讯飞", "星火"], note: "星火大模型与语音主业结合，语音交互 Agent、多模态与行业落地方向题多。" },
  { slug: "sensetime", name: "商汤科技", aliases: ["商汤", "SenseTime"], note: "多模态与具身智能方向：视觉语言 Agent、GUI 理解操作、多模态训练与评估题密度高。" },
  { slug: "microsoft", name: "微软", aliases: ["微软", "Microsoft", "Copilot"], note: "企业级 Copilot 方向：Azure 技术栈选型、企业数据隐私增强、工具协议与错误恢复设计。" },
  { slug: "google", name: "谷歌", aliases: ["谷歌", "Google", "Gemini"], note: "Gemini 多模态原生架构、A2A 协议、大规模 ML 管线与 TPU 推理优化方向。" },
  { slug: "openai", name: "OpenAI", aliases: ["OpenAI", "GPT"], note: "Agent 对齐与工具调用底层：RLHF 在 Agent 的应用、推理模型的取舍、Function Calling 原理。" },
  { slug: "nio", name: "蔚来", aliases: ["蔚来", "NIO"], note: "智能座舱与车载语音 Agent 场景，端侧部署、低延迟与多模态交互是特色方向。" },
]

export function getCompany(slug: string): Company | null {
  return COMPANIES.find((c) => c.slug === slug) || null
}

/** 该公司的速答题（frontmatter company 字段，逗号分隔多值） */
export function getQaByCompany(companySlug: string): QaItem[] {
  return getAllQa().filter((item) =>
    item.company
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(companySlug),
  )
}
