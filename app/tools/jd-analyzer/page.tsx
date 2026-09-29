import type { Metadata } from "next"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { JdClient } from "@/components/tools/jd-client"
import { getAllJd } from "@/lib/jd"
import { getAllQa } from "@/lib/qa"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "JD 人话拆解器 · 免费在线解析招聘 JD",
  description:
    "粘贴目标岗位的 JD 原文，浏览器本地拆解：岗位画像识别、考察词分层、JD 没写但面试会问的隐藏考点、业务场景推断、匹配站内面试题。免费、无注册、不上传。",
  keywords: ["JD 解析", "JD 拆解", "岗位要求分析", "AI 岗位 JD", "面试准备工具"],
  alternates: { canonical: "/tools/jd-analyzer" },
}

export default function JdAnalyzerPage() {
  const qaList = getAllQa().map((q) => ({
    slug: q.slug,
    question: q.question,
    oneLine: q.oneLine,
    category: q.category,
    tags: q.tags,
  }))
  const jdSamples = getAllJd().slice(0, 6)

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: `${SITE}/tools` },
      { "@type": "ListItem", position: 3, name: "JD 人话拆解器", item: `${SITE}/tools/jd-analyzer` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker">免费工具 · JD ANALYZER</p>
          <h1>JD 人话拆解器</h1>
          <p className="tk-lede">
            把看不懂的招聘 JD 粘进来，拆成能执行的准备清单：这个 JD 偏哪个岗位画像、明确考什么、
            JD 没写但面试一定会问什么、先刷哪几道题。不注册、不上传，分析在你的浏览器本地完成。
          </p>
        </header>

        <JdClient qaList={qaList} jdSamples={jdSamples.map((d) => ({
          company: d.company,
          slug: d.slug,
          title: d.title,
          role: d.role,
        }))} />

        <section className="tk-block" style={{ marginTop: 24 }}>
          <h3>想看拆好的样例？</h3>
          <p className="tk-block-desc">大厂热门岗位的人工精拆版本，结构与这里的输出一致、内容更深：</p>
          <div className="tk-cta-grid">
            {jdSamples.map((d) => (
              <Link key={`${d.company}-${d.slug}`} href={`/jd/${d.company}/${d.slug}`}>
                <div className="t">{d.role}</div>
                <div className="d">{d.title}</div>
              </Link>
            ))}
          </div>
        </section>
              <ToolsFaq slug="jd-analyzer" />
      </main>
    </>
  )
}
