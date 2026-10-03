import type { Metadata } from "next"
import Link from "next/link"
import { BookMarked, Building2, Crosshair, Hammer, GraduationCap, Route, Zap, type LucideIcon } from "lucide-react"
import { getAllGlossary } from "@/lib/glossary"
import { getAllInterview, getCategories, getCategoriesWithPosts } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"
import { CHAPTERS, EXAM_MAP, FACTORIES, FREQ_LABEL, PROJECTS, type ColumnChapter } from "@/lib/column"

export const metadata: Metadata = {
  title: "Agent 岗面试主线课程 · 面试间",
  description:
    "12 章主线课程：RAG、LLM 基础、Agent 架构、工具调用、评测、五厂真题，目录顺序即推荐学习顺序。速答题库一题一页，附 2582 道真题的考点地图。",
  alternates: { canonical: "/interview" },
}

function freqClass(freq: ColumnChapter["freq"]): string {
  return freq === "core" ? "ivc-freq-core" : freq === "high" ? "ivc-freq-high" : "ivc-freq-deep"
}

/* ── 分区头 ───────────────── */
function SecHead({
  icon: Icon,
  title,
  lede,
  aside,
}: {
  icon: LucideIcon
  title: string
  lede?: string
  aside?: { href: string; label: string }
}) {
  return (
    <div className="ivt-sec-head">
      <div className="ivt-sec-titlerow">
        <span className="ivt-sec-chip">
          <Icon aria-hidden size={16} />
        </span>
        <h2 className="ivt-sec-title">{title}</h2>
        {aside ? (
          <Link href={aside.href} className="ivt-sec-more">
            {aside.label}
          </Link>
        ) : null}
      </div>
      {lede ? <p className="ivt-sec-lede">{lede}</p> : null}
    </div>
  )
}

/* ── ① Hero：学 / 刷 / 练 三个动作 ─────────────── */
function Hero() {
  const qaTotal = getAllQa().length
  return (
    <header className="ivc-hero">
      <div className="ivc-hero-kicker">AGENTALPHA INTERVIEW ROOM</div>
      <h1 className="ivc-hero-title">Agent 岗面试主线课程</h1>
      <p className="ivc-hero-sub">
        12 章课程从 LLM 基础一路排到五厂真题，目录顺序就是推荐学习顺序：你知道从哪儿开始，刷到哪儿算完。
        题干来自面试官原话，解法附论文原文，这里的每场面试都允许翻书。
      </p>
      <div className="ivc-hero-stats">
        <span><b>{CHAPTERS.length}</b> 章主线</span>
        <span><b>{qaTotal}</b> 道速答</span>
        <span><b>52</b> 个考点</span>
        <span><b>2582</b> 道真题图谱</span>
      </div>
      <div className="ivc-hero-actions">
        <Link className="ivc-hero-btn" href="#chapters">
          学 · 主线课程 12 章
        </Link>
        <Link className="ivc-hero-btn ivc-hero-btn--ghost" href="#drill">
          刷 · 速答题库
        </Link>
        <Link className="ivc-hero-btn ivc-hero-btn--ghost" href="/tools/mock-interview">
          练 · AI 模拟面试
        </Link>
      </div>
      <nav className="ivt-anchor" aria-label="本页分区导航">
        <a href="#chapters">主线课程</a>
        <a href="#exam-map">考点地图</a>
        <a href="#drill">刷题</a>
        <a href="#ref">字典与实战</a>
        <a href="#all">全部题目</a>
      </nav>
    </header>
  )
}

/* ── ② 主线课程：12 章一行卡，章号 1→12 自然序 ─────── */

function ChapterRow({
  chapter,
  siteTitles,
}: {
  chapter: ColumnChapter
  siteTitles: Map<string, { slug: string; no: string; title: string }[]>
}) {
  const allPosts = siteTitles.get(chapter.id) || []
  const sitePosts = [...allPosts].sort((a, b) => Number(a.no) - Number(b.no)).slice(0, 3)
  const hiddenPosts = allPosts.length - sitePosts.length
  return (
    <article className="ivc-ch ivt-ch-oneline" id={chapter.id}>
      <div className="ivc-ch-rail">
        <span className="ivc-ch-no">{String(chapter.no).padStart(2, "0")}</span>
      </div>
      <div className="ivc-ch-main">
        <div className="ivc-ch-head">
          <h3 className="ivc-ch-name">第 {chapter.no} 章 · {chapter.name}</h3>
          <span className={`ivc-ch-freq ${freqClass(chapter.freq)}`}>{FREQ_LABEL[chapter.freq]}</span>
          <span className="ivc-ch-count">{chapter.count} 题 · {chapter.days}</span>
          {chapter.badge ? <span className="ivc-ch-badge">{chapter.badge}</span> : null}
        </div>
        <p className="ivc-ch-intro">{chapter.intro}</p>
        {sitePosts.length ? (
          <div className="ivc-ch-links">
            <span className="ivc-ch-links-label">站内详解</span>
            <div className="ivc-ch-links-list">
              {sitePosts.map((post) => (
                <Link key={post.slug} href={`/interview/${post.slug}`} className="ivc-ch-link">
                  <em>No.{post.no}</em> {post.title}
                </Link>
              ))}
              {chapter.cats.some((cat) => getCategories().some((c) => c.cat === cat)) ? (
                <Link
                  href={`/interview/category/${chapter.cats[0]}`}
                  className="ivc-ch-link ivc-ch-link--path"
                >
                  <em>方向页</em> 按方向刷本章题目 →
                </Link>
              ) : null}
              {hiddenPosts > 0 ? (
                <span className="ivt-ch-linkmore">+{hiddenPosts} 篇进方向页看</span>
              ) : null}
            </div>
          </div>
        ) : null}
        {chapter.docs.length ? (
          <details className="ivc-ch-docs">
            <summary>
              面试宝典（原文）· {chapter.docs.length} 份
              <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="ivc-ch-links-list">
              {chapter.docs.map((doc) => (
                <a
                  key={doc.label}
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ivc-ch-link ivc-ch-link--ext"
                >
                  {doc.label} ↗
                </a>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  )
}

function Curriculum() {
  const posts = getAllInterview()
  const byChapter = new Map<string, { slug: string; no: string; title: string }[]>()
  for (const chapter of CHAPTERS) {
    const inChapter = posts.filter((post) => chapter.cats.includes(post.category))
    if (inChapter.length) {
      byChapter.set(
        chapter.id,
        inChapter.map((post) => ({ slug: post.slug, no: post.no, title: post.title })),
      )
    }
  }
  return (
    <section className="ivt-sec" id="chapters" aria-label="主线课程">
      <SecHead
        icon={GraduationCap}
        title="主线课程 · 12 章"
        lede="目录顺序即推荐学习顺序：从 LLM 基础、RAG 打底，到 Agent、工具调用、多智能体，最后五厂真题与通用收尾。跟着章号从上往下刷即可。"
      />
      <div className="ivc-chlist">
        {[...CHAPTERS]
          .sort((a, b) => a.no - b.no)
          .map((chapter) => (
            <ChapterRow key={chapter.id} chapter={chapter} siteTitles={byChapter} />
          ))}
      </div>
      <p className="ivt-route-note">
        按岗位读这条主线：
        <Link href="/roadmap/agent-developer" className="ivc-route-chip">Agent 应用开发</Link>
        <Link href="/roadmap/rag-engineer" className="ivc-route-chip">RAG 工程师</Link>
        <Link href="/roadmap/llm-application" className="ivc-route-chip">LLM 应用开发</Link>
        <Link href="/roadmap/ai-infra" className="ivc-route-chip">AI Infra</Link>
        —— 四条求职路线是本课程的岗位侧重顺序。
      </p>
    </section>
  )
}

/* ── ③ 考点地图 ──────────────────────────────── */
function ExamMap() {
  return (
    <section className="ivt-sec" id="exam-map" aria-label="考点地图">
      <SecHead
        icon={Crosshair}
        title="面试官在考什么"
        lede="2582 道真题按考点聚成 8 个大类。先看哪里问得多，再回主线课程安排优先级。"
      />
      <div className="ivc-mapgrid ivt-mapgrid">
        {EXAM_MAP.map((row) => (
          <div key={row.name} className="ivc-mapcard">
            <div className="ivc-mapcard-head">
              <span className="ivc-mapcard-name">{row.name}</span>
              <span className="ivc-mapcard-nums">
                {row.points} 考点 · {row.related} 题
              </span>
            </div>
            <div className="ivc-mapcard-chips">
              {row.top.slice(0, 4).map((point) => (
                <span key={point.name} className="ivc-mapchip">
                  {point.name} <em>{point.count}</em>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <details className="ivt-fold">
        <summary>
          45 个项目类目 · 反推你的下一个项目
          <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="ivc-projgrid">
          {PROJECTS.map((project) => (
            <div key={project.name} className="ivc-projcard">
              <div className="ivc-projcard-name">
                {project.name}
                <em>{project.count} 题</em>
              </div>
              <div className="ivc-projcard-out">{project.output}</div>
              <div className="ivc-projcard-group">{project.group}</div>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}

/* ── ④ 刷题区：定位语 + 速答 6 卡 + 三入口 ───────── */

const QA_FEATURED = [
  "what-is-agent",
  "agentic-rl-vs-sft",
  "rag-vs-finetune",
  "mcp-vs-function-calling",
  "deep-research-architecture",
  "what-is-kv-cache",
]

function Drill() {
  const all = getAllQa()
  const catNames = new Map(getCategories().map((c) => [c.cat, c.name]))
  const featured = QA_FEATURED.map((slug) => all.find((item) => item.slug === slug)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  )
  return (
    <section className="ivt-sec" id="drill" aria-label="刷题">
      <SecHead
        icon={Zap}
        title="刷题"
        lede="要口语答案进速答题库；要看考察意图、标准答与追问链进真题解析；5 分钟查一个概念进术语表。"
      />
      <div className="ivt-qagrid">
        {featured.map((item) => (
          <Link key={item.slug} href={`/interview/qa/${item.slug}`} className="ivt-qcard">
            <span className="ivt-qcard-q">Q · {item.question}</span>
            <span className="ivt-qcard-a">{item.oneLine}</span>
            <span className="ivt-qcard-foot">
              <em>{catNames.get(item.category) || item.category}</em>
              <i>看答案 →</i>
            </span>
          </Link>
        ))}
      </div>
      <div className="ivt-drill-entries">
        <Link href="/interview/best" className="ivt-drill-entry">
          <b>高频合集 · 速记版</b>
          <span>Agent 60 问 / RAG 50 问 / 大模型八股 60 问 / MCP 20 问——同页给全答案</span>
        </Link>
        <Link href="/interview/qa" className="ivt-drill-entry">
          <b>速答题库 · {all.length} 题</b>
          <span>一题一页，先这样答 → 追问 → 坑（含 AI 产品经理面试题）</span>
        </Link>
        <Link href="/interview/tk" className="ivt-drill-entry">
          <b>真题解析 · 2500+ 篇</b>
          <span>宝典 12 章真题：考察意图 / 标准答 / 30 秒模板 / 追问链</span>
        </Link>
        <Link href="/interview/jingchang" className="ivt-drill-entry">
          <b>五厂与公司真题</b>
          <span>字节、阿里、腾讯、美团、百度各 100 题清单 + 17 家公司解析</span>
        </Link>
      </div>
      <p className="ivt-facchips" aria-label="五厂真题直达">
        <Building2 aria-hidden size={13} />
        {FACTORIES.map((f) => (
          <Link key={f.slug} href={`/interview/company/${f.slug}`} className="ivc-route-chip">
            {f.name} {f.count} 题
          </Link>
        ))}
        <Link href="/interview/jingchang" className="ivc-route-chip">
          20 厂总览 →
        </Link>
        <Link href="/mianjing" className="ivt-updline-link">
          面经实录：阿里 RL Data 一面 15 题复盘 →
        </Link>
      </p>
    </section>
  )
}

/* ── ⑤ 字典与实战 ────────────────────────────── */

function RefAndPractice() {
  const glossary = getAllGlossary()
  const posts = getAllInterview()
  const comparisons = posts.filter((post) => (post.tags || []).some((t) => t.includes("对比选型")))
  const packs = posts.filter((post) => (post.tags || []).some((t) => t.includes("项目面试")))
  return (
    <section className="ivt-sec" id="ref" aria-label="字典与实战">
      <SecHead
        icon={BookMarked}
        title="字典与实战"
        lede="查概念、看对比、学项目讲法——三样随手翻的工具书。"
      />
      <div className="ivt-refgrid">
        <Link href="/interview/glossary" className="ivt-refcard">
          <b>术语表 · {glossary.length} 个</b>
          <span>一句话定义 + 机制 + 面试考法与追问链，题目里的术语都链到这里。</span>
        </Link>
        <Link href="/interview/tk" className="ivt-refcard">
          <b>对比选型 · {comparisons.length} 篇</b>
          <span>BM25 vs 向量、PPO vs GRPO、vLLM vs SGLang……每篇给结论表与面试答法。</span>
        </Link>
      </div>
      <div className="ivt-refgrid">
        {packs.map((pack) => (
          <Link key={pack.slug} href={`/interview/${pack.slug}`} className="ivt-refcard">
            <b>{pack.title}</b>
            <span>{pack.excerpt.slice(0, 52)}…</span>
          </Link>
        ))}
      </div>
      <p className="ivt-facchips">
        <Hammer aria-hidden size={13} />
        <Link href="/tools" className="ivc-route-chip">
          免费求职工具箱 · 10 个工具（JD 拆解 / 简历体检 / AI 模拟面试…）
        </Link>
      </p>
    </section>
  )
}

/* ── ⑥ 全量入口 ──────────────────────────────── */

function AllEntry() {
  const allPosts = getAllInterview()
  const categories = getCategoriesWithPosts(false)
  return (
    <section className="ivt-sec" id="all" aria-label="全部题目">
      <SecHead
        icon={Route}
        title="全部题目 · 按方向"
        lede={`站内已上线 ${allPosts.length} 篇深度解析与真题解析，按方向分页浏览。`}
      />
      <div className="ivu-allentry-cats">
        {categories.map((c) => (
          <Link key={c.cat} href={`/interview/category/${c.cat}/all`}>
            {c.name}（{c.count}）
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function InterviewPage() {
  return (
    <div className="ivc-page">
      <Hero />
      <Curriculum />
      <ExamMap />
      <Drill />
      <RefAndPractice />
      <AllEntry />
    </div>
  )
}
