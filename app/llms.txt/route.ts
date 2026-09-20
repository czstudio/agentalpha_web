import { communityDocument } from "@/lib/community/content"
import { getAllQa } from "@/lib/qa"
import { getAllInterview } from "@/lib/interview"
import { CHAPTERS } from "@/lib/column"

export const dynamic = "force-static"

/**
 * /llms.txt —— 面向 AI 搜索引擎（GEO）的站点摘要。
 * 内容与库数据同源生成，build 时静态产出。
 */
export function GET() {
  const qa = getAllQa()
  const posts = getAllInterview()

  const lines: string[] = [
    "# AgentAlpha 面试题库与学习路线",
    "",
    `> 面向大模型 Agent 岗求职者的中文站点：${qa.length} 道高频面试题速答（一题一页、含一句话结论与追问要点）、${posts.length} 篇深度解析、12 章学习路线与五厂真题索引。题目来自社区成员真实面经，持续更新。`,
    "",
    "## 高频面试题速答（每题一页，含答案）",
    "",
  ]

  for (const item of qa) {
    lines.push(`- [${item.question}](https://agentalpha.top/interview/qa/${item.slug})：${item.oneLine}`)
  }

  lines.push(
    "",
    "## 深度解析（长文逐层拆解）",
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
