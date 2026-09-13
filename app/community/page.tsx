import type { Metadata } from "next"
import { CommunityExperience } from "@/components/community/community-experience"
import { CommunityDocumentRenderer } from "@/components/community/community-document"
import { communityDocument } from "@/lib/community/content"
import "./community.css"

export const metadata: Metadata = {
  title: "AgentAlpha 社区介绍",
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
        heroStatement={"AgentAlpha 是一个大模型 Agent 实战社区：一起做项目、读论文、互相改简历。不卖焦虑，也不承诺结果——做得怎么样，看下面的项目和学员原话。\n\n我们不做玩具级 Demo。每个加入的人都会进一个真实项目，解决一个真实问题，最后拿出一个能展示的成果。"}
        headings={communityDocument.headings.filter((item) => item.level === 1)}
      >
          <CommunityDocumentRenderer nodes={communityDocument.nodes} />
      </CommunityExperience>
    </>
  )
}
