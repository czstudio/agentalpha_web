import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { OfferClient } from "@/components/tools/offer-client"
import "../tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "Offer 对比器 · 多个 offer 怎么选",
  description:
    "六个维度（总包/城市/业务/成长/稳定性/强度）打分 + 权重可调，算出加权对比和一句人话结论，附带薪资谈判的实用常识。纯本地计算，offer 信息不出浏览器。",
  keywords: ["offer 怎么选", "offer 对比", "薪资谈判", "求职决策"],
  alternates: { canonical: "/tools/offer-compare" },
}

export default function OfferComparePage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: SITE + "/tools" },
      { "@type": "ListItem", position: 3, name: "Offer 对比器", item: SITE + "/tools/offer-compare" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker">免费工具 · OFFER COMPARE</p>
          <h1>Offer 对比器</h1>
          <p className="tk-lede">
            多个 offer 纠结的本质是维度没摊开。给每个 offer 的六个维度打分、给「对你真正重要的」加权，
            算出对比和一句直话。工具不替你做决定——它把你自己的直觉变成看得见的数字。
            纯本地计算，offer 信息不出浏览器。
          </p>
        </header>

        <OfferClient />
      </main>
    </>
  )
}
