import type { Metadata } from "next"
import Link from "next/link"
import { getAllInterview, getCategoriesWithPosts, hasCover } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"
import { InterviewList } from "@/components/interview/interview-list"
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
    "12 章面试专栏：RAG、LLM 基础、Agent 架构、工具调用、评测、五厂真题。1500+ 题来自社区真实面经，附 2582 道真题的考点地图，按章复习、项目反推、公司追问三条路径使用。",
  alternates: { canonical: "/interview" },
}

function freqClass(freq: ColumnChapter["freq"]): string {
  return freq === "core" ? "ivc-freq-core" : freq === "high" ? "ivc-freq-high" : "ivc-freq-deep"
}

function Hero() {
  return (
    <header className="ivc-hero">
      <div className="ivc-hero-kicker">AGENTALPHA INTERVIEW ROOM · COLUMN</div>
      <h1 className="ivc-hero-title">Agent 岗面试学习路线</h1>
      <p className="ivc-hero-sub">
        12 章题库从 RAG 一路排到五厂真题，每章标好考点、题量和考频，你知道从哪儿开始，刷到哪儿算完。
        题干来自面试官原话，解法附论文原文，这里的每场面试都允许翻书。
      </p>
      <div className="ivc-hero-stats">
        <span><b>12</b> 章</span>
        <span><b>1500+</b> 题</span>
        <span><b>52</b> 个考点</span>
        <span><b>2582</b> 道真题图谱</span>
      </div>
    </header>
  )
}

function ReadMe() {
  return (
    <section className="ivc-read" aria-label="这个专栏讲什么">
      <div className="ivc-read-main">
        <h2 className="ivc-sec-title">这个专栏讲什么</h2>
        <p>
          这两年 Agent 岗的面试变了味。以前问你用过哪些框架，现在盯着你连问四层：基础功扎不扎实、
          怎么判断一个模型好不好、工程上能做到多深、对前沿跟得紧不紧。
          这个判断来自我们写过的一篇<a href="/interview/agent-interview-2026">一万多字的观察</a>，站内能翻到原文。
        </p>
        <p>
          题目不是编的。社区成员在面试桌上碰到的原题、牛客上的真实面经、CSDN 和掘金的汇总、
          Datawhale 的开源项目，还有公众号里自己写的解析，都收进来重编过。
          问过的公司包括字节、阿里、腾讯、DeepSeek、美团、京东、百度、蔚来。
        </p>
        <p>
          题干尽量留了面试官的原话，解法旁边贴着论文原文。你大可以翻书，我们不怕你查。
          适合备战校招或社招的大模型算法、AI 应用、Agent 工程候选人，也适合想给知识体系查漏补缺的在岗工程师。
        </p>
      </div>
      <div className="ivc-read-aside">
        <h3 className="ivc-read-aside-t">怎么用</h3>
        <ol className="ivc-paths">
          <li>
            <b>按章复习</b>
            从目录里挑一章，题目已经标好 P0、P1、P2，从易到难一刷到底。
          </li>
          <li>
            <b>项目反推</b>
            手里有项目就先看它。在项目类目里找到对应条目，看它能答上哪些面试题，反过来定自己的选题。
          </li>
          <li>
            <b>公司追问</b>
            按公司练五厂真题。先张口说结论，再往下补原理、方案怎么取舍、项目数据，还有踩过的坑。
          </li>
        </ol>
      </div>
    </section>
  )
}

function ExamMap() {
  return (
    <section className="ivc-sec-block" aria-label="考点地图">
      <div className="ivc-sec-head">
        <h2 className="ivc-sec-title">面试官在考什么</h2>
        <p className="ivc-sec-lede">
          2582 道真题按考点聚类，最后归出 52 个考点、8 个大类。哪块问得最多，图上一眼能看出来：
          RAG 压着 1094 道关联题，往后是 LLM 训练、Agent 架构、评测。
          这张图不是为了好看，是告诉你面试官的钱花在哪。
        </p>
      </div>
      <div className="ivc-mapgrid">
        {EXAM_MAP.map((row) => (
          <div key={row.name} className="ivc-mapcard">
            <div className="ivc-mapcard-head">
              <span className="ivc-mapcard-name">{row.name}</span>
              <span className="ivc-mapcard-nums">
                {row.points} 考点 · 关联 {row.related} 题
              </span>
            </div>
            <div className="ivc-mapcard-chips">
              {row.top.map((point) => (
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

      <div className="ivc-proj">
        <h3 className="ivc-proj-t">45 个项目类目，反推你的下一个项目</h3>
        <p className="ivc-proj-lede">
          真题图谱还从题目缺口聚出 45 个可执行项目类目，每个类目挂着关联题集和产出形态。
          面试要的项目深度，可以顺着这些类目做出来。挑了 16 个代表项：
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
      </div>
    </section>
  )
}

function ChapterRow({ chapter, siteTitles }: { chapter: ColumnChapter; siteTitles: Map<string, { slug: string; no: string; title: string }[]> }) {
  const sitePosts = siteTitles.get(chapter.id) || []
  return (
    <article className="ivc-ch" id={chapter.id}>
      <div className="ivc-ch-rail">
        <span className="ivc-ch-no">{String(chapter.no).padStart(2, "0")}</span>
        <span className="ivc-ch-count">{chapter.count} 题 · {chapter.days}</span>
      </div>
      <div className="ivc-ch-main">
        <div className="ivc-ch-head">
          <h3 className="ivc-ch-name">第 {chapter.no} 章 · {chapter.name}</h3>
          <span className={`ivc-ch-freq ${freqClass(chapter.freq)}`}>{FREQ_LABEL[chapter.freq]}</span>
          {chapter.badge ? <span className="ivc-ch-badge">{chapter.badge}</span> : null}
        </div>
        <p className="ivc-ch-intro">{chapter.intro}</p>
        <p className="ivc-ch-points">
          <span className="ivc-ch-points-label">考点地图</span>
          {chapter.points}
        </p>
        {sitePosts.length ? (
          <div className="ivc-ch-links">
            <span className="ivc-ch-links-label">站内详解</span>
            <div className="ivc-ch-links-list">
              {sitePosts.map((post) => (
                <Link key={post.slug} href={`/interview/${post.slug}`} className="ivc-ch-link">
                  <em>No.{post.no}</em> {post.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <div className="ivc-ch-links">
          <span className="ivc-ch-links-label">真题集 · 飞书</span>
          <div className="ivc-ch-links-list">
            {chapter.docs.map((doc) => (
              <a
                key={doc.label}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ivc-ch-link ivc-ch-link--ext"
              >
                {doc.label}
              </a>
            ))}
          </div>
        </div>
        <p className="ivc-ch-more">更多题目持续更新中……</p>
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
  return (
    <section className="ivc-sec-block" aria-label="章节目录">
      <div className="ivc-sec-head">
        <h2 className="ivc-sec-title">章节目录</h2>
        <p className="ivc-sec-lede">
          十二个章节，每章配了简介、考点地图、题量、建议时长和考频评级。拿不定主意就顺推荐路线走：
          {RECOMMENDED_ROUTE.slice(0, 5).map((no) => (
            <a key={no} href={`#ch${no}`} className="ivc-route-chip">
              Ch{no}
            </a>
          ))}
          ，其余按需补。
        </p>
      </div>
      <div className="ivc-chlist">
        {CHAPTERS.map((chapter) => (
          <ChapterRow key={chapter.id} chapter={chapter} siteTitles={byChapter} />
        ))}
      </div>
    </section>
  )
}

function Factories() {
  return (
    <section className="ivc-sec-block" aria-label="五厂真题">
      <div className="ivc-sec-head">
        <h2 className="ivc-sec-title">五厂真题</h2>
        <p className="ivc-sec-lede">
          第 12 章把真题按公司分成五堆，字节、阿里、腾讯、美团、百度各 100 题，每家的侧重都标在卡片上。
          别贪多，一天啃一家：先张口把结论说清楚，再往下补原理、方案怎么取舍、项目数据，还有失败的那几次。
        </p>
      </div>
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

/** 速答区精选的题目 slug，覆盖不同分类的高搜索量问题 */
const QA_FEATURED = [
  "mcp-vs-function-calling",
  "rag-vs-finetune",
  "what-is-agent",
  "what-is-react",
  "agent-memory-design",
  "what-is-multi-agent",
  "what-is-hallucination",
  "function-calling-accuracy",
]

function QaTeaser() {
  const all = getAllQa()
  const featured = QA_FEATURED.map((slug) => all.find((item) => item.slug === slug)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  )
  return (
    <section className="ivc-sec-block" aria-label="高频题速答">
      <div className="ivc-sec-head">
        <h2 className="ivc-sec-title">高频题速答</h2>
        <p className="ivc-sec-lede">
          {all.length} 道大家真实在搜的题，一题一页：先给一句能直接说出口的结论，再补追问点和常见的坑。面试前速刷用。
        </p>
      </div>
      <div className="ivq-grid">
        {featured.map((item) => (
          <Link key={item.slug} href={`/interview/qa/${item.slug}`} className="ivq-card">
            <span className="ivq-card-q">Q · {item.question}</span>
            <span className="ivq-card-a">{item.oneLine}</span>
            <span className="ivq-card-go">看答案 →</span>
          </Link>
        ))}
      </div>
      <p className="ivq-all">
        <Link href="/interview/qa">看全部 {all.length} 道：Agent 面试题大全 →</Link>
      </p>
    </section>
  )
}

function Updates() {
  return (
    <section className="ivc-sec-block" aria-label="更新动态">
      <div className="ivc-sec-head">
        <h2 className="ivc-sec-title">更新动态</h2>
        <p className="ivc-sec-lede">这一栏记的是活的。面经实录已经放上来了，新题会持续补，解析系列也还在往下写。</p>
      </div>
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
          <span className="ivc-updcard-kicker">解析系列 · 在写</span>
          <ul className="ivc-updlist">
            <li>面了 7 家大厂的 Agent 岗，发现 Memory 是唯一必考题</li>
            <li>「手写一个 ReAct 循环」——这道题刷掉了 80% 的候选人</li>
            <li>GRPO 正在取代 PPO：Agent RL 训练的知识更新</li>
            <li>MCP vs A2A vs Function Call vs Skills：概念区分题怎么答</li>
          </ul>
          <span className="ivc-updcard-foot">Agent 面试题解析系列，写完一篇上一题。</span>
        </div>
      </div>
    </section>
  )
}

export default function InterviewPage() {
  const posts = getAllInterview()
  const covers = Object.fromEntries(posts.map((post) => [post.slug, hasCover(post.slug)]))
  const categories = getCategoriesWithPosts(false)
  const totalPlanned = categories.reduce((sum, category) => sum + category.planned, 0)

  return (
    <div className="ivc-page">
      <Hero />
      <ReadMe />
      <ExamMap />
      <Chapters />
      <Factories />
      <QaTeaser />
      <Updates />
      <InterviewList
        posts={posts}
        covers={covers}
        categories={categories}
        totalPlanned={totalPlanned}
        variant="archive"
      />
    </div>
  )
}
