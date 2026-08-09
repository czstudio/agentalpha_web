import type { Metadata } from "next"
import Link from "next/link"
import { ArrowDown, ArrowUpRight } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { CommunityDocumentRenderer } from "@/components/community/community-document"
import { communityDocument } from "@/lib/community/content"

export const metadata: Metadata = {
  title: "社区介绍",
  description: communityDocument.description,
  alternates: { canonical: "/community" },
  openGraph: {
    type: "article",
    url: "/community",
    title: communityDocument.title,
    description: communityDocument.description,
    images: [{ url: "/logo.png", alt: "AgentAlpha 社区" }],
  },
}

export default function CommunityPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: communityDocument.title,
    description: communityDocument.description,
    url: "https://agentalpha.top/community",
    dateModified: communityDocument.syncedAt,
    mainEntity: { "@id": "https://agentalpha.top/#organization" },
  }

  return (
    <div className="community-site">
      <Navigation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="community-hero">
        <div className="community-hero-main">
          <span className="community-eyebrow">AGENTALPHA / COMMUNITY PROFILE</span>
          <h1>{communityDocument.title}</h1>
          <p>{communityDocument.description}</p>
          <div className="community-hero-actions">
            <a href="#1-agentalpha-是什么">开始了解 <ArrowDown size={17} /></a>
            <Link href="/#contact">加入或合作 <ArrowUpRight size={17} /></Link>
          </div>
        </div>
        <div className="community-hero-index" aria-label="页面概览">
          <span>内容来源</span><strong>飞书原文</strong>
          <span>当前版本</span><strong>r{communityDocument.sourceRevision}</strong>
          <span>原文图片</span><strong>{communityDocument.stats.images} 张</strong>
        </div>
      </header>

      <div className="community-layout">
        <aside className="community-toc">
          <strong>目录</strong>
          <nav>
            {communityDocument.headings.filter((item) => item.level === 1).map((item) => (
              <a href={`#${item.id}`} key={item.id}>{item.text}</a>
            ))}
          </nav>
          <small>同步自飞书 revision {communityDocument.sourceRevision}</small>
        </aside>
        <article className="community-article">
          <CommunityDocumentRenderer nodes={communityDocument.nodes} />
          <footer className="community-source-note">
            <strong>内容更新说明</strong>
            <p>本页正文以 AgentAlpha 飞书社区介绍为唯一内容源。飞书更新后运行同步命令，网站才会生成新的静态 revision。</p>
            <a href={communityDocument.source.url} target="_blank" rel="noreferrer">查看飞书原文 <ArrowUpRight size={16} /></a>
          </footer>
        </article>
      </div>
    </div>
  )
}
