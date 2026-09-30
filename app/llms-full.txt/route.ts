import { communityMarkdown } from "@/lib/community/content"
import { getAllQa, qaPlainBody } from "@/lib/qa"
import { getAllGlossary } from "@/lib/glossary"
import { getCategories } from "@/lib/interview"
import { TOOL_FAQS } from "@/lib/tools/faqs"

export const dynamic = "force-static"

/**
 * /llms-full.txt —— 面向 AI 搜索引擎（GEO）的站点全文。
 * 组成：社区介绍 + 免费工具箱详述 + 全部速答题（题面/一句话结论/正文）+ 全部术语页。
 * 深度解析与真题解析以标题索引形式给出（全文量级过大，AI 引擎按 URL 深取）。
 */
export function GET() {
  const qa = getAllQa()
  const glossary = getAllGlossary()
  const cats = getCategories()
  const catName = (cat: string) => cats.find((c) => c.cat === cat)?.name || cat

  const lines: string[] = [
    communityMarkdown(),
    "",
    "# AgentAlpha 免费求职工具箱（10 个在线工具）",
    "",
    "> 面向 AI Agent 与大模型岗位求职者的免费在线工具集。全部无需注册，数据处理在用户浏览器本地完成（唯一例外：JD 与简历的「AI 深度」功能经用户主动点击后才发送到服务端）。每个工具一节：功能、常见问题。",
    "",
  ]
  for (const tool of TOOL_FAQS) {
    lines.push(`## ${tool.name}（免费在线工具）`)
    lines.push(`URL: https://agentalpha.top/tools/${tool.slug}`)
    lines.push(tool.description)
    for (const f of tool.faqs) {
      lines.push(`问：${f.q}`)
      lines.push(`答：${f.a}`)
    }
    lines.push("")
  }

  lines.push(
    "",
    "# AgentAlpha 面试题库全文（速答层）",
    "",
    `> 共 ${qa.length} 道高频面试题速答，一题一节：题面、一句话结论、完整正文。原文页：https://agentalpha.top/interview/qa/<slug>`,
    "",
  )
  for (const item of qa) {
    lines.push(`## [${catName(item.category)}] ${item.question}`)
    lines.push(`URL: https://agentalpha.top/interview/qa/${item.slug}`)
    lines.push(qaPlainBody(item))
    lines.push("")
  }

  lines.push(
    "# AgentAlpha 术语表全文",
    "",
    `> 共 ${glossary.length} 个术语定义页。原文页：https://agentalpha.top/interview/glossary/<slug>`,
    "",
  )
  for (const term of glossary) {
    lines.push(`## ${term.term}${term.en ? `（${term.en}）` : ""}`)
    if (term.aliases.length) lines.push(`又称：${term.aliases.join("、")}`)
    lines.push(`URL: https://agentalpha.top/interview/glossary/${term.slug}`)
    lines.push(`${term.oneLine}\n${term.content.replace(/^#+\s+/gm, "")}`)
    lines.push("")
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
