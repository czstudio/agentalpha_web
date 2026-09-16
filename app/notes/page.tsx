import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Clock3, Layers3, Search, Sparkles } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getAllNotes, getSeries } from "@/lib/notes"
import { getLearnDirectory } from "@/lib/learn-directory"
import publishedWechat from "@/content/notes/published-wechat.json"

export const metadata: Metadata = {
  title: "Agent 面试笔记",
  description:
    "AgentAlpha 面试笔记库：题目来自大厂 Agent 岗位的真实面试，每篇把一个追问从拆解写到能落地的答案。",
  alternates: { canonical: "/notes" },
}

export default function NotesIndexPage() {
  const notes = getAllNotes()
  const series = getSeries()
  const learn = getLearnDirectory()
  const totalMinutes = notes.reduce((sum, note) => sum + note.minutes, 0)
  const seriesCount = (names: string[]) => series
    .filter((item) => names.includes(item.name))
    .reduce((total, item) => total + notes.filter((note) => note.seriesNo === item.no).length, 0)
  const learningRails = [
    {
      no: "01",
      label: "系统骨架",
      title: "先把 Agent 画成一张跑得通的图",
      description: "从 Agentic RL、架构、Code Agent 到多智能体，讲状态、行动、交接、恢复这几块怎么做。",
      count: seriesCount(["Agentic RL", "Agent 架构", "Code Agent", "多智能体"]),
      href: "#series-01",
    },
    {
      no: "02",
      label: "知识与多模态",
      title: "答案要有依据，图片和文档也要看得懂",
      description: "更新知识库、看懂图里的空间关系、判断引用到哪算越界，都在这条线里练。",
      count: seriesCount(["RAG", "多模态"]),
      href: "#series-03",
    },
    {
      no: "03",
      label: "工具与治理",
      title: "工具调用老出错？先把这几关过了",
      description: "契约、MCP、重试、权限和评测，决定 Agent 在外部系统里会不会越帮越忙。",
      count: seriesCount(["工具调用", "评测"]),
      href: "#series-09",
    },
    {
      no: "04",
      label: "模型与表达",
      title: "公式要会推，项目也要讲得清",
      description: "前半段打底子，后半段练怎么把项目讲清楚：机制是什么、当时怎么取舍、证据在哪。",
      count: seriesCount(["LLM 基础", "LLM 训练", "项目深挖", "通用与软实力", "五厂高频题"]),
      href: "#series-04",
    },
  ]

  return (
    <>
      <Navigation />
      <main className="aa-notes">
        <header className="aa-notes-hero">
          <div className="aa-notes-shell">
            <p className="aa-notes-eyebrow">
              <Sparkles aria-hidden /> AgentAlpha 笔记 · 第 1 辑
            </p>
            <div className="aa-notes-hero-grid">
              <div>
                <h1>Agent 面试都问什么，<br /><em>我们一篇篇拆过。</em></h1>
            <p className="aa-notes-lede">
              题目来自大厂 Agent 岗位的真实面试，每篇把一个追问从拆解写到能落地的答案。
            </p>
            <div className="aa-notes-stats">
              <span>{notes.length} 篇笔记</span>
              <span>{series.length} 个专题</span>
              <span>{totalMinutes} 分钟</span>
            </div>
              </div>
            </div>
          </div>
        </header>

        <section className="aa-notes-aris-map" aria-labelledby="aa-notes-aris-title">
          <div className="aa-notes-shell">
            <div className="aa-notes-aris-head">
              <div>
                <p className="aa-notes-kicker">按问题挑</p>
                <h2 id="aa-notes-aris-title">四条主线，按问题分组。</h2>
              </div>
            <p>每条主线收的是解决同一类问题的笔记。对上你手头的题，就从那条进。</p>
            </div>
            <div className="aa-notes-aris-rails">
              {learningRails.map((rail) => (
                <a href={rail.href} className="aa-notes-aris-rail" key={rail.no}>
                  <span className="aa-notes-aris-no">{rail.no}</span>
                  <span className="aa-notes-aris-label">{rail.label}<b>{rail.count} 篇</b></span>
                  <strong>{rail.title}</strong>
                  <span className="aa-notes-aris-description">{rail.description}</span>
                  <span className="aa-notes-aris-link">进入专题 <ArrowRight aria-hidden /></span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="aa-notes-index-strip"><div className="aa-notes-shell"><div><Search aria-hidden /><span>找个入口开始</span></div><a href="#series-01">专题目录</a><a href="#wechat-archive">公众号文章</a><a href="https://agentalpha.feishu.cn/wiki/LKPMwJz7GiMUMUkt6P0cFQqun0d" target="_blank" rel="noreferrer">完整面试题合集 ↗</a><a href="#faq">常见问题</a></div></section>

        {series.map((s) => {
          const seriesNotes = notes.filter((note) => note.seriesNo === s.no)
          if (seriesNotes.length === 0) return null
          return (
            <section id={`series-${s.no}`} key={s.no} className={`aa-notes-series aa-notes-series--${s.no}`}>
              <div className="aa-notes-shell">
                <div className="aa-notes-series-head">
                  <span className="aa-notes-series-no">{s.no}</span>
                  <div>
                    <p className="aa-notes-series-name">{s.name}</p>
                    <h2>{s.title}</h2>
                    <p className="aa-notes-series-desc">{s.description}</p>
                    <div className="aa-notes-series-meta"><span><Layers3 aria-hidden /> {seriesNotes.length} 篇</span><span><Clock3 aria-hidden /> 约 {seriesNotes.reduce((sum, note) => sum + note.minutes, 0)} 分钟</span></div>
                    {s.no === "04" && <div className="aa-notes-series-route" aria-label="LLM 基础五步阅读路径"><span>Attention</span><i>→</i><span>Transformer</span><i>→</i><span>MoE</span><i>→</i><span>KV Cache</span><i>→</i><span>推理优化</span></div>}
                  </div>
                </div>
                <div className="aa-notes-grid">
                  {seriesNotes.map((note) => (
                    <Link key={note.slug} href={`/notes/${note.slug}`} className="aa-notes-card">
                      <div className="aa-notes-card-top">
                        <span className="aa-notes-card-no">{note.number}</span>
                        <span className="aa-notes-card-minutes">
                          <Clock3 aria-hidden /> {note.minutes} 分钟
                        </span>
                      </div>
                      <h3>{note.title}</h3>
                      <p>{note.excerpt}</p>
                      <span className="aa-notes-card-cta">
                        开始阅读 <ArrowRight aria-hidden />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )
        })}

        <section id="wechat-archive" className="aa-notes-wechat" aria-labelledby="wechat-archive-title">
          <div className="aa-notes-shell">
            <div className="aa-notes-wechat-head">
              <div><p className="aa-notes-kicker">AgentAlpha 公众号 · 已发表文章</p><h2 id="wechat-archive-title">公众号发过的内容，原文都收在这里。</h2></div>
              <p>共 {publishedWechat.length} 篇，原文照收。</p>
            </div>
            <div className="aa-notes-wechat-grid">
              {publishedWechat.map((article) => <a className="aa-notes-wechat-card" href={article.url} target="_blank" rel="noreferrer" key={article.articleId}><span>{article.publishedAt} · 已发表</span><h3>{article.title}</h3><strong>打开原文 <ArrowUpRight aria-hidden /></strong></a>)}
            </div>
            <div className="aa-notes-cta-grid">
              <Link className="aa-notes-cta-card" href="/community#3-课程体系"><span>课程入口</span><strong>训练营要交的作业是开源项目和论文 <ArrowRight aria-hidden /></strong><small>课程体系全部公开，成品去社区项目页看</small></Link>
              <Link className="aa-notes-cta-card aa-notes-cta-card--dark" href="/#join"><span>社区入口</span><strong>来 AgentAlpha，一起练习和复盘 <ArrowRight aria-hidden /></strong><small>offer 我们不敢保证，能保证的是每周有人陪你过代码、看结果</small></Link>
            </div>
          </div>
        </section>

        {learn.chapters.length > 0 && (
        <section id="learn-directory" className="aa-learn-directory">
          <div className="aa-notes-shell">
            <div className="aa-learn-directory-head">
              <div><p className="aa-notes-kicker">Claude Code · 逐章整理中</p><h2>{learn.title}</h2><p>{learn.description}</p></div>
              <span className="aa-learn-directory-count">{learn.chapters.length} 章目录</span>
            </div>
            {learn.volumes.map((volume) => {
              const chapters = learn.chapters.filter((chapter) => chapter.volumeId === volume.id)
              if (!chapters.length) return null
              return <div className="aa-learn-volume" key={volume.id}><h3>{volume.title}</h3><div className="aa-learn-chapters">{chapters.map((chapter) => <div className="aa-learn-chapter" key={chapter.slug}><span>{String(chapter.order).padStart(2, "0")}</span><strong>{chapter.title.replace(/^第 \d+ 章：/, "")}</strong><em>{chapter.status === "rewritten" ? "已整理" : "目录已建"}</em></div>)}</div></div>
            })}
          </div>
        </section>
        )}

        <section id="faq" className="aa-notes-outro">
          <div className="aa-notes-shell">
            <p>△ AgentAlpha 笔记</p>
            <h2>题库跟着真实面试持续更新。</h2>
            <Link href="/#join" className="aa-notes-join">
              加入社区 <ArrowUpRight aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
