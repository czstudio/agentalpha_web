import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import {
  ROADMAPS,
  getRoadmap,
  getRoadmapLead,
  roadmapChapters,
  roadmapCats,
  roadmapTerms,
  roadmapProjects,
  roadmapQaCount,
} from "@/lib/roadmap"
import { getCategories } from "@/lib/interview"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return ROADMAPS.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const r = getRoadmap(slug)
  if (!r) return {}
  const description = `${r.name}方向的学习路线：${r.tagline} 按章节顺序组织专栏、题库、术语与项目卡，面向${r.roles.join("、")}岗位。`
  return {
    title: `${r.name}学习路线（章节顺序 + 题目范围 + 岗位画像）`,
    description: description.slice(0, 160),
    keywords: [`${r.name} 学习路线`, ...r.roles, "大模型面试", "AI Agent 面试"],
    alternates: { canonical: `/roadmap/${r.slug}` },
    openGraph: { title: `${r.name}学习路线`, description: r.tagline },
  }
}

export default async function RoadmapDetailPage({ params }: PageProps) {
  const { slug } = await params
  const r = getRoadmap(slug)
  if (!r) notFound()
  const lead = getRoadmapLead(slug)
  const chapters = roadmapChapters(r)
  const cats = roadmapCats(r)
  const catNames = new Map(getCategories().map((c) => [c.cat, c.name]))
  const terms = roadmapTerms(r)
  const projects = roadmapProjects(r)
  const others = ROADMAPS.filter((x) => x.slug !== r.slug)

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "学习路线", item: `${SITE}/roadmap` },
      { "@type": "ListItem", position: 4, name: `${r.name}路线`, item: `${SITE}/roadmap/${r.slug}` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-measure">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <Link href="/roadmap">学习路线</Link>
          <span className="sep">/</span>
          <span className="cur">{r.name}</span>
        </nav>
      </div>

      <header className="ivu-measure ivu-head">
        <div className="ivu-meta">
          {r.roles.map((role) => (
            <span key={role} className="ivu-chip">
              {role}
            </span>
          ))}
          <span>{roadmapQaCount(r)} 道速答题在范围内</span>
        </div>
        <h1 className="ivu-h1">{r.name}学习路线</h1>
        <p className="ivq-road-tagline">{r.tagline}</p>
      </header>

      <div className="ivu-measure">
        <article className="ivu-prose">
          {lead ? <ReactMarkdown>{lead}</ReactMarkdown> : null}

          <section className="road-sec">
            <h2 className="road-sec-t">章节路线</h2>
            <ol className="road-steps">
              {chapters.map((c, i) => (
                <li key={c.no} className="road-step">
                  <span className="road-step-no">{String(i + 1).padStart(2, "0")}</span>
                  <div className="road-step-body">
                    <Link href={`/interview#${c.id}`} className="road-step-name">
                      第 {c.no} 章 · {c.name}
                    </Link>
                    <p className="road-step-intro">{c.intro}</p>
                    <p className="road-step-meta">
                      {c.count} 题 · 建议 {c.days}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="road-sec">
            <h2 className="road-sec-t">范围内的题库分类</h2>
            <div className="road-cats">
              {cats.map((c) => (
                <Link key={c.cat} href={`/interview/qa#${c.cat}`} className="road-cat">
                  {catNames.get(c.cat) || c.cat}
                  <span className="road-cat-count">{c.count} 题</span>
                </Link>
              ))}
            </div>
          </section>

          {terms.length > 0 ? (
            <section className="road-sec">
              <h2 className="road-sec-t">
                相关术语（
                <Link href="/interview/glossary">全部术语</Link>）
              </h2>
              <div className="road-cats">
                {terms.map((t) => (
                  <Link key={t.slug} href={`/interview/glossary/${t.slug}`} className="road-cat">
                    {t.term}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {projects.length > 0 ? (
            <section className="road-sec">
              <h2 className="road-sec-t">可以写进简历的项目方向</h2>
              <ul className="road-projects">
                {projects.map((p) => (
                  <li key={p.name}>
                    <span className="road-project-name">{p.name}</span>
                    <span className="road-project-output">产出：{p.output}</span>
                  </li>
                ))}
              </ul>
              <p className="road-project-note">
                项目怎么讲才能扛住追问，看
                <Link href="/interview/enterprise-rag-assistant">第一个项目面试包：企业知识库 RAG 助手</Link>。
              </p>
            </section>
          ) : null}

          <section className="road-sec">
            <h2 className="road-sec-t">其他方向</h2>
            <div className="road-cats">
              {others.map((x) => (
                <Link key={x.slug} href={`/roadmap/${x.slug}`} className="road-cat">
                  {x.name}
                </Link>
              ))}
            </div>
          </section>

          <div className="ivu-endmark">—— 路线完 ——</div>
        </article>
      </div>
    </main>
  )
}
