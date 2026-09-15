import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Clock3 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { claudeCodeManifest, getApprovedEntries } from "@/lib/learn/content"

export const metadata: Metadata = {
  title: claudeCodeManifest.title,
  description: claudeCodeManifest.description,
  alternates: { canonical: "/learn/claude-code" },
  robots: { index: false, follow: false },
}

/** 正式正文（飞书文档），按发布清单锁定的阅读顺序排列。 */
const FEISHU_DIRECTORY: { label: string; url: string }[] = [
  { label: "第 1 章：Claude Code 基础与工作边界", url: "https://agentalpha.feishu.cn/wiki/I7IawfLwHi92QQkTFeRcSKVlnNf" },
  { label: "第 2 章：Agentic Loop 入门", url: "https://agentalpha.feishu.cn/wiki/ZBXPwaYuviOi8ikwPW6cclwEnQg" },
  { label: "第 3 章：工具调用与执行模型", url: "https://agentalpha.feishu.cn/wiki/N1DgwOKWxihC8skml04cM8xEnHe" },
  { label: "第 4 章：上下文工程", url: "https://agentalpha.feishu.cn/wiki/SJaDwh8Mgizjt4kbImZcQi3Wn3b" },
  { label: "第 5 章：实验、验证与可复现性", url: "https://agentalpha.feishu.cn/wiki/KlxRwvwQSiKRMakP6oRckaounyb" },
  { label: "第 6 章：Agent Harness", url: "https://agentalpha.feishu.cn/wiki/DYXwwLIPviPImtkcN0DcdsAHnXc" },
  { label: "第 7 章：系统提示词与指令层级", url: "https://agentalpha.feishu.cn/wiki/HGk4wIcZ3inB2Yk6iZ5cP4RHnlg" },
  { label: "第 8 章：工具治理", url: "https://agentalpha.feishu.cn/wiki/NNlEwIWSqicTwYk5CY4cxoAzn3e" },
  { label: "第 9 章：权限与执行边界", url: "https://agentalpha.feishu.cn/wiki/Brk9wLtUKiqHMykHLj8cYFifnQe" },
  { label: "第 10 章：上下文压缩与记忆", url: "https://agentalpha.feishu.cn/wiki/YCpuwFo97i2qinkrXcVcJ0Qantd" },
  { label: "第 11 章：进阶上下文管理", url: "https://agentalpha.feishu.cn/wiki/VuqQwxJXwiDCk7kvzBUcljDBnve" },
  { label: "第 12 章：源码阅读方法", url: "https://agentalpha.feishu.cn/wiki/HUHzwy0A4iUhkYkwwrIchKlBnuh" },
  { label: "第 13 章：自定义 Agent", url: "https://agentalpha.feishu.cn/wiki/QD1zwOZpAihmOxkHkxycrRBsntb" },
  { label: "第 14 章：调试、评测与优化", url: "https://agentalpha.feishu.cn/wiki/Re2nwdGwOigXhOkxvSIc4283nFd" },
  { label: "专题：Claude Code、Codex 与其他 Agent 系统对比", url: "https://agentalpha.feishu.cn/wiki/C5aiwa9aFip9NLk1hGocLL1Nngr" },
  { label: "专题：MCP、Subagent 与安全", url: "https://agentalpha.feishu.cn/wiki/IvWvwEc7BiSoT2kelk5cyo2wn0b" },
  { label: "第 15 章：系统设计面试", url: "https://agentalpha.feishu.cn/wiki/GtUSwKUb8iDkV7k0pemchVAvnwb" },
  { label: "第 16 章：安全面试", url: "https://agentalpha.feishu.cn/wiki/KgnnwAglIij4BNkvt6ycGFhUnJK" },
  { label: "第 17 章：性能面试", url: "https://agentalpha.feishu.cn/wiki/MjhMwNQ1aiVNM0kfvgFcamSPnKd" },
  { label: "附录 A：技术栈", url: "https://agentalpha.feishu.cn/wiki/Xlg0w7iHKi4EJukBMYfcmBYenRD" },
  { label: "附录 B：Prompt 模板", url: "https://agentalpha.feishu.cn/wiki/LqcCwENZSiSSBykNGGEcwmiunse" },
  { label: "附录 C：工具分类", url: "https://agentalpha.feishu.cn/wiki/FaljwjhYYijFw2kQ6MrcioKensh" },
  { label: "附录 D：权威资源", url: "https://agentalpha.feishu.cn/wiki/Rp5Lwh7zhiqNZekpj0PcuK83nTb" },
]

const GROUPS: { name: string; desc: string; range: [number, number] }[] = [
  { name: "卷一 · 基础与核心循环", desc: "从工作边界、Agentic Loop、工具调用、上下文和可复现实验开始，建立后续所有工程判断的共同语言。", range: [1, 5] },
  { name: "卷二 · 工程治理", desc: "理解 Harness、指令层级、工具治理、权限和上下文压缩，把「能运行」推进到「可控、可审计、可维护」。", range: [6, 10] },
  { name: "卷三 · 源码与进阶", desc: "学习进阶上下文、源码阅读、自定义 Agent、调试与评测方法，形成独立定位问题的能力。", range: [11, 14] },
  { name: "专题 · 系统协作与安全", desc: "用一致维度比较 Claude Code、Codex 与其他 Agent 系统，并系统讲解 MCP、Subagent 和安全边界。", range: [15, 16] },
  { name: "卷四 · 面试与系统设计", desc: "围绕系统设计、安全和性能组织追问。重点不是背答案，而是展示假设、权衡、故障模式和验证方法。", range: [17, 19] },
  { name: "附录", desc: "集中维护技术栈、Prompt 模板、工具分类和权威资源。", range: [20, 23] },
]

export default function ClaudeCodeCollectionPage() {
  const approved = getApprovedEntries()
  const approvedOrders = new Set(approved.map((chapter) => chapter.order))

  return (
    <>
      <Navigation />
      <main className="aa-notes aa-note-detail">
        <article className="aa-notes-shell aa-note-article learn-collection-page">
          <nav className="aa-note-breadcrumb">
            <Link href="/notes"><ArrowLeft aria-hidden /> 返回面试笔记</Link>
          </nav>
          <header className="learn-collection-header">
            <p className="aa-notes-kicker">Claude Code · 课程目录</p>
            <h1>{claudeCodeManifest.title}</h1>
            <p>{claudeCodeManifest.description}</p>
            <div className="learn-pending-meta">
              <span><BookOpen aria-hidden /> {FEISHU_DIRECTORY.length} 篇正式文档</span>
              <span><Clock3 aria-hidden /> 飞书持续更新 · 本站快照已收录 {approved.length} 章</span>
            </div>
          </header>

          <section className="learn-directory" aria-label="课程目录（飞书文档）">
            <div className="learn-directory-note">
              正式正文托管在飞书文档中并持续更新，点击任意章节即可阅读原文；通过审核的章节会同步为本站快照。
            </div>
            {GROUPS.map((group) => {
              const items = FEISHU_DIRECTORY.slice(group.range[0] - 1, group.range[1]).map(
                (item, i) => ({ ...item, order: group.range[0] + i }),
              )
              return (
                <div key={group.name} className="learn-directory-group">
                  <h2>{group.name}</h2>
                  <p>{group.desc}</p>
                  <ol>
                    {items.map((item) => {
                      const localSlug =
                        (claudeCodeManifest.chapters.find((c) => c.order === item.order) || {}).slug ?? ""
                      return (
                        <li key={item.url}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.label} <ArrowUpRight aria-hidden className="learn-dir-arrow" />
                          </a>
                          {approvedOrders.has(item.order) ? (
                            <Link className="learn-dir-local" href={`/learn/claude-code/${localSlug}`}>
                              站内快照
                            </Link>
                          ) : null}
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )
            })}
          </section>

          <Link href="/notes#learn-directory" className="aa-note-promo-cta learn-back-link">先读现有面试笔记 <ArrowRight aria-hidden /></Link>
        </article>
      </main>
    </>
  )
}
