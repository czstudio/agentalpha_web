import type { Metadata } from "next"
import { CommunityExperience } from "@/components/community/community-experience"
import { CommunityDocumentRenderer } from "@/components/community/community-document"
import { communityDocument } from "@/lib/community/content"
import "./community.css"

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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <CommunityExperience
        title={communityDocument.title}
        heroStatement={"AgentAlpha —— 立志打造 AI 界的黄埔军校，国内最具实战价值的大模型 Agent 高端实战社区。我们坚决区别于行业内“空谈理论、跟风热点、以卖课为核心”的社群，以「技术落地、人才培养、商业共创」为核心。\n\n我们不做玩具级 Demo 教学，一切以实战做出有影响力的项目为主。核心使命：以实战为核心，培养能解决真实问题、能落地、能产出的顶尖 AI 人才，打造 AI 领域的人才摇篮与实战生态。"}
        headings={communityDocument.headings.filter((item) => item.level === 1)}
      >
          <CommunityDocumentRenderer nodes={communityDocument.nodes} />
      </CommunityExperience>
    </>
  )
}
