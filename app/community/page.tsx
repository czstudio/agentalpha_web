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
        description={communityDocument.description}
        headings={communityDocument.headings.filter((item) => item.level === 1)}
      >
          <CommunityDocumentRenderer nodes={communityDocument.nodes} />
      </CommunityExperience>
    </>
  )
}
