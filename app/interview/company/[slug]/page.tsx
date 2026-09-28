import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { COMPANIES, getCompany, getQaByCompany } from "@/lib/companies"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  // 只静态化已有题目的公司页，避免空集合页被判薄页
  return COMPANIES.filter((c) => getQaByCompany(c.slug).length > 0).map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const company = getCompany(slug)
  if (!company) return {}
  const qa = getQaByCompany(slug)
  const description = `${company.name}大模型 Agent 方向面试高频题${qa.length > 0 ? ` ${qa.length} 道` : ""}：来自公开面经与岗位 JD 的高频归纳，覆盖 RAG、Agent、推理部署等方向，一题一页带答案与追问。`.slice(0, 160)
  return {
    title: `${company.name}大模型 Agent 面试题（公开面经高频归纳）· 公司题库`,
    description,
    keywords: [`${company.name} 面试题`, `${company.name} 面经`, ...company.aliases.map((a) => `${a} 面试题`), "大模型面试题", "Agent 面试题"],
    alternates: { canonical: `/interview/company/${company.slug}` },
    openGraph: { title: `${company.name}大模型 Agent 面试题`, description },
  }
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const company = getCompany(slug)
  if (!company) notFound()
  const qa = getQaByCompany(slug)

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${company.name}大模型 Agent 面试题`,
    numberOfItems: qa.length,
    itemListElement: qa.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.question,
      url: `${SITE}/interview/qa/${item.slug}`,
    })),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: `${company.name}面试题`, item: `${SITE}/interview/company/${company.slug}` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">{company.name}面试题</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">公司题库 · {company.name}</p>
        <h1 className="ivc-hero-title">{company.name}大模型 Agent 面试题</h1>
        <p className="ivc-hero-sub">{company.note}</p>
        <p className="ivq-hero-note">
          题目口径：来自 {company.aliases.join("、")} 等公开渠道的面经与岗位 JD 高频归纳，不是内部真题。
          按大家实际被问到的方向整理，每题一页带答案与追问。
        </p>
      </header>

      <div className="ivu-wide">
        {qa.length > 0 ? (
          <div className="ivq-rows">
            {qa.map((item) => (
              <div className="ivq-row" key={item.slug}>
                <Link className="ivq-row-main" href={`/interview/qa/${item.slug}`}>
                  <span className="ivq-row-q">Q · {item.question}</span>
                  <span className="ivq-row-a">{item.oneLine}</span>
                  <span className="ivq-row-go" aria-hidden>
                    查看答案 →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="ivq-empty">这个公司的题正在补充，先去<a href="/interview/qa">全部题库</a>按方向刷。</p>
        )}
      </div>

      <div className="ivu-wide">
        <aside className="ivq-cta">
          <div>
            <p className="ivq-cta-t">按公司刷之外，再按方向刷一遍</p>
            <p className="ivq-cta-d">
              公司面经反映侧重，方向题库保证覆盖面：14 个分类的速答题、深度解析和学习路线都在面试间。
            </p>
          </div>
          <div className="ivq-cta-links">
            <Link className="ivq-cta-btn" href="/interview/qa">
              全部题库
            </Link>
            <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/interview">
              深度解析
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
