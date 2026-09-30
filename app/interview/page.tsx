import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  Building2,
  ClipboardList,
  Compass,
  Crosshair,
  FileCheck2,
  FileUser,
  MessagesSquare,
  NotebookPen,
  PenLine,
  Radar,
  Route,
  Scale,
  ScanSearch,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { getAllInterview, getCategories, getCategoriesWithPosts } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"
import {
  CHAPTERS,
  EXAM_MAP,
  PROJECTS,
  FACTORIES,
  FACTORY_DOC_HREF,
  FREQ_LABEL,
  RECOMMENDED_ROUTE,
  type ColumnChapter,
} from "@/lib/column"

export const metadata: Metadata = {
  title: "Agent 岗面试学习路线 · 面试间",
  description:
    "12 章面试专栏：RAG、LLM 基础、Agent 架构、工具调用、评测、五厂真题。速答题库一题一页，附 2582 道真题的考点地图与 10 个免费求职工具，按章复习、速答直查、工具落地三条路径使用。",
  alternates: { canonical: "/interview" },
}

function freqClass(freq: ColumnChapter["freq"]): string {
  return freq === "core" ? "ivc-freq-core" : freq === "high" ? "ivc-freq-high" : "ivc-freq-deep"
}

/* ── 分区头：图标胶囊 + 衬线标题 ───────────────── */
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

/* ── ① Hero：统计保留，行动按钮收敛到 3 个 ─────── */
function Hero() {
  const qaTotal = getAllQa().length
  return (
    <header className="ivc-hero">
      <div className="ivc-hero-kicker">AGENTALPHA INTERVIEW ROOM · COLUMN</div>
      <h1 className="ivc-hero-title">Agent 岗面试学习路线</h1>
      <p className="ivc-hero-sub">
        12 章题库从 RAG 一路排到五厂真题，每章标好考点、题量和考频，你知道从哪儿开始，刷到哪儿算完。
        题干来自面试官原话，解法附论文原文，这里的每场面试都允许翻书。
      </p>
      <div className="ivc-hero-stats">
        <span><b>{CHAPTERS.length}</b> 章</span>
        <span><b>{qaTotal}</b> 道速答</span>
        <span><b>52</b> 个考点</span>
        <span><b>2582</b> 道真题图谱</span>
      </div>
      <div className="ivc-hero-actions">
        <Link className="ivc-hero-btn" href="/interview/quiz">
          模拟面试 · 抽题自测
        </Link>
        <Link className="ivc-hero-btn ivc-hero-btn--ghost" href="/interview/qa">
          高频题速答 · {qaTotal} 题一题一页
        </Link>
        <Link className="ivc-hero-btn ivc-hero-btn--ghost" href="/tools">
          免费求职工具箱 · 10 个工具
        </Link>
      </div>
      <nav className="ivt-anchor" aria-label="本页分区导航">
        <a href="#qa-picks">高频速答</a>
        <a href="#chapters">学习路线</a>
        <a href="#exam-map">考点地图</a>
        <a href="#tools">实战工具</a>
        <a href="#factories">五厂真题</a>
        <a href="#updates">更新动态</a>
      </nav>
    </header>
  )
}

/* ── ② 高频速答精选：直接展示题目，一题一页 ─────── */
const QA_FEATURED = [
  "what-is-agent",
  "agentic-rl-vs-sft",
  "rag-vs-finetune",
  "mcp-vs-function-calling",
  "deep-research-architecture",
  "what-is-react",
  "agent-memory-design",
  "code-agent-resume",
  "what-is-multi-agent",
  "what-is-hallucination",
  "function-calling-accuracy",
  "what-is-kv-cache",
]

function QaPicks() {
  const all = getAllQa()
  const catNames = new Map(getCategories().map((c) => [c.cat, c.name]))
  const featured = QA_FEATURED.map((slug) => all.find((item) => item.slug === slug)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  )
  return (
    <section className="ivt-sec" id="qa-picks" aria-label="高频速答精选">
      <SecHead
        icon={Zap}
        title="高频速答"
        lede={`${all.length} 道大家真实在搜的题，这里先摆 12 道：先给一句能直接说出口的结论，再补追问点和常见的坑。点开就是完整答案，面试前速刷用。`}
        aside={{ href: "/interview/qa", label: `全部 ${all.length} 题 →` }}
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
    </section>
  )
}

/* ── ③ 学习路线：前沿章节提前，老主题收后降权；编号与锚点不变 ── */

/** 前沿主题直达：全部指向站内真实存在的速答题 / 训练营页 */
const FRONTIER_TOPICS: { href: string; tag: string; name: string }[] = [
  { href: "/interview/qa/agentic-rl-vs-sft", tag: "速答", name: "Agentic RL 和 SFT 差在哪" },
  { href: "/interview/qa/agentic-rl-reward-design", tag: "速答", name: "Agent RL 的奖励怎么设计" },
  { href: "/interview/qa/deep-research-architecture", tag: "速答", name: "Deep Research 怎么实现" },
  { href: "/interview/qa/code-agent-resume", tag: "速答", name: "Code Agent 断点恢复" },
  { href: "/learn#courses", tag: "训练营", name: "自进化编码（AlphaEvolve）" },
]

/** 展示顺序：前沿主题章节在前，RAG / LLM 基础这类基本功收尾；章节编号与锚点 id 不变 */
const CHAPTER_ORDER = [4, 8, 5, 3, 7, 10, 12, 9, 11, 6, 1, 2]
/** 挂「前沿」徽章的章节（新主题速答题对应的分类所在章） */
const FRONTIER_CHAPTERS = new Set([3, 4, 5, 8])
/** 降权收尾的章节（紧凑排版） */
const SLIM_CHAPTERS = new Set([1, 2])

function ChapterRow({
  chapter,
  siteTitles,
  slim,
  frontier,
}: {
  chapter: ColumnChapter
  siteTitles: Map<string, { slug: string; no: string; title: string }[]>
  slim?: boolean
  frontier?: boolean
}) {
  const allPosts = siteTitles.get(chapter.id) || []
  // 每章只露出前几条站内详解，全量走分类分页，避免 hub 被长列表淹没
  const MAX_LINKS = slim ? 4 : 6
  const sitePosts = [...allPosts].sort((a, b) => Number(a.no) - Number(b.no)).slice(0, MAX_LINKS)
  const hiddenPosts = allPosts.length - sitePosts.length
  return (
    <article className={`ivc-ch${slim ? " ivt-ch-slim" : ""}`} id={chapter.id}>
      <div className="ivc-ch-rail">
        <span className="ivc-ch-no">{String(chapter.no).padStart(2, "0")}</span>
        <span className="ivc-ch-count">{chapter.count} 题 · {chapter.days}</span>
      </div>
      <div className="ivc-ch-main">
        <div className="ivc-ch-head">
          <h3 className="ivc-ch-name">第 {chapter.no} 章 · {chapter.name}</h3>
          <span className={`ivc-ch-freq ${freqClass(chapter.freq)}`}>{FREQ_LABEL[chapter.freq]}</span>
          {frontier ? <span className="ivt-ch-frontier">前沿</span> : null}
          {chapter.badge ? <span className="ivc-ch-badge">{chapter.badge}</span> : null}
        </div>
        <p className="ivc-ch-intro">{chapter.intro}</p>
        {!slim ? (
          <p className="ivc-ch-points">
            <span className="ivc-ch-points-label">考点地图</span>
            {chapter.points}
          </p>
        ) : null}
        {sitePosts.length ? (
          <div className="ivc-ch-links">
            <span className="ivc-ch-links-label">站内详解</span>
            <div className="ivc-ch-links-list">
              {sitePosts.map((post) => (
                <Link key={post.slug} href={`/interview/${post.slug}`} className="ivc-ch-link">
                  <em>No.{post.no}</em> {post.title}
                </Link>
              ))}
              {chapter.cats.filter((cat) => getCategories().some((c) => c.cat === cat)).map((cat) => {
                const meta = getCategories().find((c) => c.cat === cat)
                const qaCount = getAllQa().filter((q) => q.category === cat).length
                return qaCount > 0 ? (
                  <Link key={cat} href={`/interview/category/${cat}`} className="ivc-ch-link ivc-ch-link--path">
                    <em>学习路径</em> {meta?.name}（{qaCount} 道速答题 + 深度解析 + 术语）
                  </Link>
                ) : null
              })}
              {hiddenPosts > 0 ? (
                <span className="ivt-ch-linkmore">+{hiddenPosts} 篇进分类页看</span>
              ) : null}
            </div>
          </div>
        ) : null}
        {chapter.docs.length ? (
          <details className="ivc-ch-docs">
            <summary>
              真题集原文（{chapter.docs.length} 份 · 飞书文档）
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

function Chapters() {
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
  const ordered = CHAPTER_ORDER.map((no) => CHAPTERS.find((chapter) => chapter.no === no)).filter(
    (chapter): chapter is ColumnChapter => Boolean(chapter),
  )
  return (
    <section className="ivt-sec" id="chapters" aria-label="学习路线">
      <SecHead
        icon={Route}
        title="学习路线 · 12 章"
        lede="十二个章节按「前沿优先」重排展示：Agent 架构、工具调用（MCP / A2A）、多智能体、LLM 训练排在前排，RAG、LLM 基础这些基本功收在后面。章节编号、锚点和宝典完全一致，拿不准顺序就照推荐路线走："
      />
      <div className="ivt-frontier" aria-label="前沿主题直达">
        <span className="ivt-frontier-t">2026 前沿主题</span>
        {FRONTIER_TOPICS.map((topic) => (
          <Link key={topic.href} href={topic.href} className="ivt-frontier-item">
            <em>{topic.tag}</em>
            {topic.name}
          </Link>
        ))}
      </div>
      <p className="ivt-route-note">
        推荐路线：
        {RECOMMENDED_ROUTE.slice(0, 5).map((no) => (
          <a key={no} href={`#ch${no}`} className="ivc-route-chip">
            Ch{no}
          </a>
        ))}
        ，其余按需补。
      </p>
      <div className="ivc-chlist">
        {ordered.map((chapter) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            siteTitles={byChapter}
            slim={SLIM_CHAPTERS.has(chapter.no)}
            frontier={FRONTIER_CHAPTERS.has(chapter.no)}
          />
        ))}
      </div>
    </section>
  )
}

/* ── ④ 考点地图：紧凑化，项目反推收进折叠 ─────── */
function ExamMap() {
  return (
    <section className="ivt-sec" id="exam-map" aria-label="考点地图">
      <SecHead
        icon={Crosshair}
        title="面试官在考什么"
        lede="2582 道真题按考点聚类，归出 52 个考点、8 个大类。RAG 压着 1094 道关联题，往后是 LLM 训练、Agent 架构、评测——问得最多的地方，就是复习优先级。"
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
      <p className="ivc-map-note">
        关联题数按「题—考点」关联统计，一道题可以挂多个考点。数据来自社区真题知识图谱（52 考点 · 45 项目类目）。
      </p>
      <details className="ivt-fold">
        <summary>
          45 个项目类目 · 反推你的下一个项目（{PROJECTS.length} 个代表项）
          <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <p className="ivt-fold-lede">
          真题图谱还从题目缺口聚出 45 个可执行项目类目，每个类目挂着关联题集和产出形态。面试要的项目深度，可以顺着这些类目做出来。
        </p>
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

/* ── ⑤ 实战工具区：紧跟学习路线，10 个工具直接可点 ── */

/** 工具清单与 /tools 页保持同源（app/tools/page.tsx TOOLS），文案缩为一句话 */
const HUB_TOOLS: { href: string; badge: string; icon: LucideIcon; title: string; desc: string }[] = [
  { href: "/tools/jd-analyzer", badge: "引流", icon: ScanSearch, title: "JD 人话拆解器", desc: "粘贴 JD，拆出考察词、隐藏考点，匹配站内真题。" },
  { href: "/tools/gap-test", badge: "诊断", icon: Radar, title: "面试 Gap 自测", desc: "八项能力自评加真题抽验，出雷达图和补课路径。" },
  { href: "/tools/project-matcher", badge: "诊断", icon: Compass, title: "项目匹配器", desc: "选方向和时间，拿到扛得住追问的项目方案。" },
  { href: "/tools/resume", badge: "诊断", icon: FileCheck2, title: "AI / Agent 岗简历体检", desc: "逐条批注、追问预演与翻车风险，全在本机。" },
  { href: "/tools/resume-builder", badge: "陪跑", icon: FileUser, title: "简历生成器", desc: "旧简历重排成一页 A4，本地导出 PDF / Word。" },
  { href: "/tools/bullet-grader", badge: "诊断", icon: PenLine, title: "简历 Bullet 打分器", desc: "一条经历十秒打分，给问题清单和改写骨架。" },
  { href: "/tools/mock-interview", badge: "陪跑", icon: MessagesSquare, title: "AI 模拟面试", desc: "五种面试官人格、三种模式，错题自动进错题本。" },
  { href: "/tools/interview-log", badge: "管理", icon: NotebookPen, title: "面试复盘本", desc: "面完当天记录被问题目，统计你常挂在哪一轮。" },
  { href: "/tools/application-tracker", badge: "管理", icon: ClipboardList, title: "投递看板", desc: "投递漏斗与进面率自动汇总，看问题出在哪。" },
  { href: "/tools/offer-compare", badge: "决策", icon: Scale, title: "Offer 对比器", desc: "六维加权对比，附薪资谈判的实用常识。" },
]

function ToolsSection() {
  return (
    <section className="ivt-sec" id="tools" aria-label="实战工具">
      <SecHead
        icon={Wrench}
        title="实战工具 · 浏览器里直接用"
        lede="从拆 JD 到比 Offer，十个工具覆盖整条求职链路。免费、不用注册，简历和 JD 不出你的浏览器。"
        aside={{ href: "/tools", label: "工具箱总览 →" }}
      />
      <div className="ivt-tools-panel">
        <div className="ivt-tools-chips" aria-hidden>
          <span>免费</span>
          <span>无注册</span>
          <span>数据不上传</span>
        </div>
        <div className="ivt-tools-grid">
          {HUB_TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="ivt-tool">
              <span className="ivt-tool-top">
                <span className="ivt-tool-icon">
                  <tool.icon aria-hidden size={17} />
                </span>
                <span className="ivt-tool-badge">{tool.badge}</span>
              </span>
              <span className="ivt-tool-name">{tool.title}</span>
              <span className="ivt-tool-desc">{tool.desc}</span>
              <span className="ivt-tool-go">打开工具 →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── ⑥ 五厂真题 ───────────────────────────── */
function Factories() {
  return (
    <section className="ivt-sec" id="factories" aria-label="五厂真题">
      <SecHead
        icon={Building2}
        title="五厂真题"
        lede="第 12 章把真题按公司分成五堆，字节、阿里、腾讯、美团、百度各 100 题，每家的侧重都标在卡片上。一天啃一家：先张口把结论说清楚，再往下补原理、方案怎么取舍、项目数据。"
      />
      <div className="ivc-facgrid">
        {FACTORIES.map((factory) => (
          <a
            key={factory.name}
            href={FACTORY_DOC_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="ivc-faccard"
          >
            <div className="ivc-faccard-head">
              <span className="ivc-faccard-name">{factory.name}</span>
              <span className="ivc-faccard-count">{factory.count} 题</span>
            </div>
            <p className="ivc-faccard-focus">{factory.focus}</p>
            <span className="ivc-faccard-go">打开真题集 →</span>
          </a>
        ))}
      </div>
    </section>
  )
}

/* ── ⑦ 更新动态：缩小到底部 ─────────────────── */
function Updates() {
  return (
    <section className="ivt-sec" id="updates" aria-label="更新动态">
      <SecHead
        icon={Activity}
        title="更新动态"
        lede="面经实录已经放上来了，新题会持续补，解析系列也还在往下写。"
      />
      <div className="ivc-updgrid">
        <Link href="/mianjing/ali-rl-data-interview" className="ivc-updcard ivc-updcard--mianjing">
          <span className="ivc-updcard-kicker">面经实录 · 新</span>
          <span className="ivc-updcard-title">阿里 RL Data 实习一面：15 道题逐题复盘</span>
          <span className="ivc-updcard-sub">
            这场面试不问知不知道，只问遇到过没有：数据构建、质量归因、Rubric 与 Reward 设计的完整复盘，附一页速查版。更多面经在面试笔记页。
          </span>
          <span className="ivc-updcard-go">读完整面经 →</span>
        </Link>
        <div className="ivc-updcard">
          <span className="ivc-updcard-kicker">解析系列 · 持续更新</span>
          <ul className="ivc-updlist ivt-updlist">
            <li>
              <Link href="/interview/finetune-tk456">DeepSeek 的 GRPO 和 PPO 有什么区别？优劣是什么（真题解析）</Link>
            </li>
            <li>
              <Link href="/interview/tooluse-tk016">Agent 工具生态的未来发展方向（真题解析）</Link>
            </li>
            <li>
              <Link href="/interview/agent-interview-2026">Agent 岗面试都在考什么：一篇一万字的观察</Link>
            </li>
          </ul>
          <span className="ivc-updcard-foot">Agent 面试题解析系列，写完一篇上一题。</span>
        </div>
      </div>
    </section>
  )
}

export default function InterviewPage() {
  const allPosts = getAllInterview()
  const categories = getCategoriesWithPosts(false)

  return (
    <div className="ivc-page">
      <Hero />
      <QaPicks />
      <Chapters />
      <ExamMap />
      <ToolsSection />
      <Factories />
      <Updates />
      <div className="ivu-wide ivt-allentry">
        <div className="ivu-allentry">
          <p>
            站内已上线 <b>{allPosts.length}</b> 篇深度解析与真题解析，全部题目按分类分页浏览：
          </p>
          <div className="ivu-allentry-cats">
            {categories.map((c) => (
              <Link key={c.cat} href={`/interview/category/${c.cat}/all`}>
                {c.name}（{c.count}）
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
