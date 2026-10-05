/**
 * 工具页互链数据层:每个工具页都会渲染「配套工具 + 全部工具 + 站内资源」。
 * why 一句话说明使用顺序,不写营销话术;站内资源行把题库/面经/路线串进工具域。
 */

export interface CrossLinkItem {
  href: string
  name: string
  why: string
}

const TOOLS = [
  { slug: "jd-analyzer", name: "JD 人话拆解器", desc: "拆考察词、隐藏考点，配站内真题" },
  { slug: "resume", name: "AI / Agent 岗简历体检", desc: "简历对 JD 打分，逐条批注追问风险" },
  { slug: "gap-test", name: "面试 Gap 自测", desc: "八项能力自评加真题抽验，出补课路径" },
  { slug: "project-matcher", name: "项目匹配器", desc: "按方向和时间推荐能写进简历的项目" },
  { slug: "mock-interview", name: "AI 模拟面试", desc: "五种面试官人格，简历深挖与压力追问" },
  { slug: "interview-log", name: "面试复盘本", desc: "记录被问题目与卡壳点，统计弱项（只存本机）" },
  { slug: "application-tracker", name: "投递看板", desc: "投递到 offer 八状态看板与漏斗（只存本机）" },
  { slug: "offer-compare", name: "Offer 对比器", desc: "六维打分加权对比，附谈判常识" },
  { slug: "bullet-grader", name: "简历 Bullet 打分器", desc: "单条经历四维打分，给改写骨架" },
  { slug: "resume-builder", name: "简历生成器", desc: "上传 PDF/Word 或粘贴文本，多模板排版导出" },
] as const

export type ToolSlug = (typeof TOOLS)[number]["slug"]

const toolHref = (slug: string) => `/tools/${slug}`

/** 每个工具的「配套工具」:3-4 个,why 说明谁先谁后 */
const RELATED: Record<string, CrossLinkItem[]> = {
  "jd-analyzer": [
    { href: toolHref("resume-builder"), name: "简历生成器", why: "同一份 JD 贴进「对着 JD 查覆盖」，看简历命中了哪些词" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "按拆出来的考点选岗位剧本，逐条练" },
    { href: toolHref("gap-test"), name: "面试 Gap 自测", why: "对照考察词测八项能力，看差距在哪" },
    { href: toolHref("resume"), name: "简历体检", why: "拆完 JD 再体检简历，批注更准" },
  ],
  resume: [
    { href: toolHref("resume-builder"), name: "简历生成器", why: "按批注改完，直接排版导出 PDF/Word" },
    { href: toolHref("bullet-grader"), name: "Bullet 打分器", why: "单条经历快诊断，引擎和这里同款" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "简历深挖模式：只问你简历里写过的地方" },
    { href: toolHref("jd-analyzer"), name: "JD 人话拆解器", why: "还没贴 JD？先拆这个岗位在考什么" },
  ],
  "gap-test": [
    { href: toolHref("project-matcher"), name: "项目匹配器", why: "缺项目就按方向和时间补一个能写的" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "抽真题当面问，验证自测结果" },
    { href: "/interview/qa", name: "面试题库", why: "按分类逐条刷，一题一页带答案" },
    { href: toolHref("resume"), name: "简历体检", why: "测完回头体检简历，看证据缺在哪" },
  ],
  "project-matcher": [
    { href: toolHref("resume-builder"), name: "简历生成器", why: "项目做完，把经历写进简历排版导出" },
    { href: toolHref("gap-test"), name: "面试 Gap 自测", why: "先测差距，再挑要补的项目" },
    { href: toolHref("bullet-grader"), name: "Bullet 打分器", why: "项目 bullet 写好先打分再上简历" },
  ],
  "mock-interview": [
    { href: toolHref("interview-log"), name: "面试复盘本", why: "把答崩的题记下来，统计反复挂在哪" },
    { href: "/interview/qa", name: "面试题库", why: "速答回炉：先背一层，再来挨追问" },
    { href: toolHref("resume-builder"), name: "简历生成器", why: "练完暴露的短板，回头改简历" },
    { href: toolHref("application-tracker"), name: "投递看板", why: "面到哪一家了，看板里记一笔" },
  ],
  "interview-log": [
    { href: toolHref("application-tracker"), name: "投递看板", why: "投递状态加面试复盘，凑成完整台账" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "卡壳的题当场重练同类" },
    { href: toolHref("gap-test"), name: "面试 Gap 自测", why: "反复挂的主题，回来自测确认" },
  ],
  "application-tracker": [
    { href: toolHref("interview-log"), name: "面试复盘本", why: "每场面试记三样：题目、卡壳点、下次策略" },
    { href: toolHref("offer-compare"), name: "Offer 对比器", why: "拿到多个 offer 后六维打分比一比" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "下周要面了，先按岗位剧本过一遍" },
  ],
  "offer-compare": [
    { href: toolHref("application-tracker"), name: "投递看板", why: "offer 状态在看板里收尾归档" },
    { href: "/mianjing", name: "真实面经", why: "看别人同岗位的轮次和谈法再定" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "入职前想再冲一轮，先练高压追问" },
  ],
  "bullet-grader": [
    { href: toolHref("resume-builder"), name: "简历生成器", why: "逐条改到 75 分以上，排版导出" },
    { href: toolHref("resume"), name: "简历体检", why: "单条改完，整份再体检一遍" },
    { href: toolHref("project-matcher"), name: "项目匹配器", why: "没素材可写？先挑个能做的项目" },
  ],
  "resume-builder": [
    { href: toolHref("resume"), name: "简历体检", why: "排完先体检：匹配度、证据评级、追问预演" },
    { href: toolHref("bullet-grader"), name: "Bullet 打分器", why: "单条快诊断，打分引擎同款" },
    { href: toolHref("mock-interview"), name: "AI 模拟面试", why: "导出前用简历深挖模式练一遍" },
    { href: toolHref("jd-analyzer"), name: "JD 人话拆解器", why: "对着目标 JD 查覆盖，缺词先补经历" },
  ],
}

/** 站内资源行:每个工具页都带,把题库/面经/路线串进工具域 */
export const SITE_RESOURCES: CrossLinkItem[] = [
  { href: "/interview/qa", name: "面试题库", why: "500+ 道真题，一题一页带答案" },
  { href: "/mianjing", name: "真实面经", why: "按公司整理的完整轮次实录" },
  { href: "/roadmap", name: "学习路线", why: "从基础到项目补齐知识版图" },
  { href: "/tools", name: "工具箱总览", why: "看懂岗位 → 测差距 → 补项目 → 改简历" },
]

export function getToolCrossLinks(slug: string): {
  current: { href: string; name: string; desc: string } | null
  related: CrossLinkItem[]
  others: Array<{ href: string; name: string; desc: string }>
} {
  const current = TOOLS.find((t) => t.slug === slug) || null
  const related = RELATED[slug] || []
  const others = TOOLS.filter((t) => t.slug !== slug).map((t) => ({ href: toolHref(t.slug), name: t.name, desc: t.desc }))
  return {
    current: current ? { href: toolHref(current.slug), name: current.name, desc: current.desc } : null,
    related,
    others,
  }
}
