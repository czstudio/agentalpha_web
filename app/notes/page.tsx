import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, Layers3, Search, Sparkles } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getAllNotes, getSeries } from "@/lib/notes"
import { getLearnDirectory } from "@/lib/learn-directory"
import publishedWechat from "@/content/notes/published-wechat.json"

export const metadata: Metadata = {
  title: "Agent 面试笔记",
  description:
    "每道题都从面试官的追问开始:先拆掉似是而非的回答,再把直觉、系统机制和工程边界连起来。",
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
      title: "先把 Agent 画成一张能运行的图",
      description: "从 Agentic RL、架构、Code Agent 到多智能体，沿着状态、行动、交接和恢复，把一套 Agent 系统讲明白。",
      count: seriesCount(["Agentic RL", "Agent 架构", "Code Agent", "多智能体"]),
      href: "#series-01",
    },
    {
      no: "02",
      label: "知识与多模态",
      title: "答案要有依据，图片和文档也要看得懂",
      description: "从 RAG、Embedding、重排到文档版面和视频时间轴，练习处理知识更新、空间关系和引用边界。",
      count: seriesCount(["RAG", "多模态"]),
      href: "#series-03",
    },
    {
      no: "03",
      label: "工具与治理",
      title: "每次调用都要留得下回执",
      description: "契约、MCP、重试、权限和评测，决定 Agent 在外部系统里会不会越帮越忙。",
      count: seriesCount(["工具调用", "评测"]),
      href: "#series-09",
    },
    {
      no: "04",
      label: "模型与表达",
      title: "公式要会推，项目也要讲得清",
      description: "LLM 基础和训练负责打底，项目复盘和面试表达负责把机制、取舍和证据说清楚。",
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
              <Sparkles aria-hidden /> AgentAlpha Notes · Vol. 01
            </p>
            <div className="aa-notes-hero-grid">
              <div>
                <h1>把 Agent 面试题，<br /><em>学成一套系统。</em></h1>
            <p className="aa-notes-lede">
              从基础概念到真实项目追问，沿着「理解 → 实现 → 评估 → 表达」四步走完。每篇笔记都给出原理、代码、边界和可复述的回答骨架。
            </p>
            <div className="aa-notes-stats">
              <span>{notes.length} 篇深度笔记</span>
              <span>{series.length} 个专题</span>
              <span>{totalMinutes}+ 分钟内容</span>
            </div>
              </div>
              <div className="aa-notes-map" aria-label="四步学习路线">
                <div className="aa-notes-map-line" />
                {[
                  ["01", "理解", "概念与直觉"],
                  ["02", "实现", "代码与工具"],
                  ["03", "评估", "指标与边界"],
                  ["04", "表达", "追问与项目"],
                ].map(([no, title, desc]) => <div className="aa-notes-map-step" key={no}><b>{no}</b><span><strong>{title}</strong>{desc}</span></div>)}
              </div>
            </div>
          </div>
        </header>

        <section className="aa-notes-aris-map" aria-labelledby="aa-notes-aris-title">
          <div className="aa-notes-shell">
            <div className="aa-notes-aris-head">
              <div>
                <p className="aa-notes-kicker">THREE-COLUMN STUDY MAP · INSPIRED BY ARIS</p>
                <h2 id="aa-notes-aris-title">一套题，拆成四条能互相喂养的主线。</h2>
              </div>
            <p>每篇文章都先讲基础，再接面试官的追问，最后落到实现和项目。先按主线挑题，读完用自己的项目复述一遍。</p>
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

        <section className="aa-notes-index-strip"><div className="aa-notes-shell"><div><Search aria-hidden /><span>先选一个入口</span></div><a href="#series-01">专题目录</a><a href="#method">学习方法</a><a href="#faq">常见问题</a></div></section>

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
                    <div className="aa-notes-series-meta"><span><Layers3 aria-hidden /> {seriesNotes.length} 篇</span><span><BookOpen aria-hidden /> 适合面试前系统复习</span></div>
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
              <div><p className="aa-notes-kicker">FROM AGENTALPHA · WECHAT ARCHIVE</p><h2 id="wechat-archive-title">公众号里的真实追问，继续读下去。</h2></div>
              <p>这里收录 AgentAlpha 已发表内容的公开入口；与站内笔记重复的主题会保持独立来源，不替换原文。</p>
            </div>
            <div className="aa-notes-wechat-grid">
              {publishedWechat.map((article) => <a className="aa-notes-wechat-card" href={article.url} target="_blank" rel="noreferrer" key={article.articleId}><span>{article.publishedAt} · 已发表</span><h3>{article.title}</h3><strong>打开原文 <ArrowUpRight aria-hidden /></strong></a>)}
            </div>
            <div className="aa-notes-cta-grid">
              <a className="aa-notes-cta-card" href="/community#3-课程体系"><span>课程入口</span><strong>按路线练，把面试题做成项目 <ArrowRight aria-hidden /></strong><small>公开课程体系 · 具体安排以站内信息为准</small></a>
              <a className="aa-notes-cta-card aa-notes-cta-card--dark" href="/#join"><span>社区入口</span><strong>加入 AgentAlpha，一起练习和复盘 <ArrowRight aria-hidden /></strong><small>社区与训练营信息 · 不承诺录取或结果</small></a>
            </div>
          </div>
        </section>

        <section id="learn-directory" className="aa-learn-directory">
          <div className="aa-notes-shell">
            <div className="aa-learn-directory-head">
              <div><p className="aa-notes-kicker">CLAUDE CODE · 逐章整理中</p><h2>{learn.title}</h2><p>{learn.description}</p></div>
              <span className="aa-learn-directory-count">{learn.chapters.length} 章目录</span>
            </div>
            {learn.volumes.map((volume) => {
              const chapters = learn.chapters.filter((chapter) => chapter.volumeId === volume.id)
              if (!chapters.length) return null
              return <div className="aa-learn-volume" key={volume.id}><h3>{volume.title}</h3><div className="aa-learn-chapters">{chapters.map((chapter) => <div className="aa-learn-chapter" key={chapter.slug}><span>{String(chapter.order).padStart(2, "0")}</span><strong>{chapter.title.replace(/^第 \d+ 章：/, "")}</strong><em>{chapter.status === "rewritten" ? "已整理" : "目录已建"}</em></div>)}</div></div>
            })}
          </div>
        </section>

        <section id="method" className="aa-notes-method"><div className="aa-notes-shell"><div><p className="aa-notes-kicker">HOW TO USE</p><h2>不要从第一篇开始硬啃。</h2><p>先看专题导读，再挑一篇能回答你当前问题的笔记。读完用右侧的追问清单复述一次，最后把答案映射到自己的项目。</p></div><div className="aa-notes-method-list"><div><CheckCircle2 aria-hidden /><span><b>第一次</b> 只看图和结论，建立地图</span></div><div><CheckCircle2 aria-hidden /><span><b>第二次</b> 跟着代码走，补齐机制</span></div><div><CheckCircle2 aria-hidden /><span><b>第三次</b> 用 STAR 讲给面试官听</span></div></div></div></section>

        <section id="faq" className="aa-notes-outro">
          <div className="aa-notes-shell">
            <p>△ AgentAlpha Notes</p>
            <h2>把复杂问题讲到可以推理，而不是背诵。</h2>
            <Link href="/#join" className="aa-notes-join">
              加入社区 <ArrowUpRight aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
