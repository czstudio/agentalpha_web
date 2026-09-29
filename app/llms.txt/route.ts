import { communityDocument } from "@/lib/community/content"
import { getAllQa } from "@/lib/qa"
import { getAllInterview } from "@/lib/interview"
import { getAllGlossary } from "@/lib/glossary"
import { CHAPTERS } from "@/lib/column"
import { getAllJd, getJdCompany } from "@/lib/jd"

export const dynamic = "force-static"

/**
 * /llms.txt —— 面向 AI 搜索引擎（GEO）的站点摘要。
 * 内容与库数据同源生成，build 时静态产出。
 */
export function GET() {
  const qa = getAllQa()
  const posts = getAllInterview()
  const glossary = getAllGlossary()

  const lines: string[] = [
    "# AgentAlpha 面试题库与学习路线",
    "",
    `> 面向大模型 Agent 岗求职者的中文站点：${qa.length} 道高频面试题速答（一题一页、含一句话结论与追问要点）、${posts.length} 篇深度解析、${glossary.length} 个术语定义页、12 章学习路线与五厂真题索引。题目来自社区成员真实面经，持续更新。`,
    "",
    "## 高频面试题速答（每题一页，含答案）",
    "",
  ]

  for (const item of qa) {
    lines.push(`- [${item.question}](https://agentalpha.top/interview/qa/${item.slug})：${item.oneLine}`)
  }

  lines.push(
    "",
    "## 术语表（每词一页：一句话定义 + 机制 + 面试考法）",
    "",
  )

  for (const term of glossary) {
    lines.push(`- [${term.term}](https://agentalpha.top/interview/glossary/${term.slug})：${term.oneLine}`)
  }

  lines.push(
    "",
    "## 大厂 JD 拆解（岗位画像 + 隐藏考点 + 对应面试题）",
    "",
    "- [JD 拆解库索引](https://agentalpha.top/jd)：大厂 AI 岗 JD 人话翻译，每页含硬技能清单、JD 没写但面试会问、能力模型与准备计划",
  )

  for (const doc of getAllJd()) {
    const co = getJdCompany(doc.company)
    lines.push(`- [${doc.title}](https://agentalpha.top/jd/${doc.company}/${doc.slug})：${co?.name ?? doc.company} ${doc.role}方向，${doc.summary}`)
  }

  lines.push(
    "",
    "## 免费求职工具（纯前端、不上传）",
    "",
    "- [JD 人话拆解器](https://agentalpha.top/tools/jd-analyzer)：粘贴 JD 出岗位画像、考察词、隐藏考点与匹配面试题",
    "- [简历体检](https://agentalpha.top/tools/resume)：简历 + JD 对比、能力覆盖证据评级、追问预演与风险",
    "- [面试 Gap 自测](https://agentalpha.top/tools/gap-test)：八项能力自评加真题抽验，出雷达与补课路径",
    "- [项目匹配器](https://agentalpha.top/tools/project-matcher)：按方向、基础、时间推荐可写进简历的项目方案",
    "- [AI 模拟面试](https://agentalpha.top/tools/mock-interview)：五种面试官人格，岗位剧本/简历深挖/压力追问三模式，出复盘报告与错题本",
    "- [面试复盘本](https://agentalpha.top/tools/interview-log)：记录真实面试的被问题目与卡壳点，自动统计反复挂在哪一轮（数据只存本机）",
    "- [投递看板](https://agentalpha.top/tools/application-tracker)：未投到 offer 八状态的看板与漏斗统计（数据只存本机）",
    "- [Offer 对比器](https://agentalpha.top/tools/offer-compare)：六维打分加权对比，附薪资谈判常识",
    "- [工具箱总览](https://agentalpha.top/tools)：看懂岗位 → 测出差距 → 做项目 → 改简历的完整链路",
    "",
    "## 学习路线（12 章专栏）",
    "",
  )

  for (const post of posts) {
    lines.push(`- [${post.title}](https://agentalpha.top/interview/${post.slug})：${post.excerpt}`)
  }

  lines.push(
    "",
    "## 学习路线（12 章专栏）",
    "",
    "- [Agent 岗面试学习路线](https://agentalpha.top/interview)：完整章节目录、考点地图与五厂真题入口",
    ...CHAPTERS.map(
      (chapter) =>
        `- 第 ${chapter.no} 章 ${chapter.name}：约 ${chapter.count} 题。${chapter.intro}`,
    ),
    "",
    "## 更多",
    "",
    `- [${communityDocument.title}](https://agentalpha.top/community)：${communityDocument.description}`,
    "- [Markdown 版本](https://agentalpha.top/community.md)",
    "- [完整版站点内容](https://agentalpha.top/llms-full.txt)",
    "- [技术笔记](https://agentalpha.top/notes)：Agent 工程与大模型的系统学习笔记",
    "- [面经实录](https://agentalpha.top/mianjing)：真实面试轮次的完整复盘",
    "- [公众号文章](https://agentalpha.top/gzh)：公众号发布的面试长文、社区动态与学员案例，附 mp.weixin 原文链接",
    "- [训练营](https://agentalpha.top/learn)：从零到拿 offer 的 Agent 项目实战课程",
    "",
  )

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
