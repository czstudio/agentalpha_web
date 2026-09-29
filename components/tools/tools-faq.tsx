import Link from "next/link"
import { getToolFaqs } from "@/lib/tools/faqs"

const SITE = "https://agentalpha.top"

/**
 * 工具页通用 FAQ 区:可见内容与 FAQPage JSON-LD 同源,
 * 另注入 SoftwareApplication(工具页富摘要)。内容口径见 lib/tools/faqs.ts 头注释。
 */
export function ToolsFaq({ slug }: { slug: string }) {
  const meta = getToolFaqs(slug)
  if (!meta) return null

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${meta.name} · AgentAlpha`,
    description: meta.description,
    url: `${SITE}/tools/${meta.slug}`,
    applicationCategory: meta.category,
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
    publisher: { "@type": "Organization", name: "AgentAlpha", url: SITE },
  }

  return (
    <section className="tk-block tk-faq" aria-label="常见问题">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <h3>常见问题</h3>
      <div className="tk-faq-list">
        {meta.faqs.map((f) => (
          <details key={f.q} className="tk-faq-item">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <p className="tk-hint">
        更多工具见<Link href="/tools">求职工具箱</Link>:JD 拆解、简历体检、Gap 自测、项目匹配、
        模拟面试、复盘本、投递看板、Offer 对比,全部免费本地运行。
      </p>
    </section>
  )
}
