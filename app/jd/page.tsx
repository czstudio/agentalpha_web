import type { Metadata } from "next"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { getAllJd } from "@/lib/jd"
import { COMPANIES } from "@/lib/companies"
import "./jd.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "大厂 JD 拆解库 · Agent / RAG / 大模型岗位人话翻译",
  description:
    "字节、阿里、腾讯、百度、美团、小红书等大厂 AI Agent 岗 JD 拆解：这个岗在招什么人、硬技能清单、JD 没写但面试会问、对应面试题与准备计划。也有粘贴 JD 自己拆的免费工具。",
  keywords: ["字节 Agent 岗", "大模型 JD 解析", "AI 岗位面试准备", "RAG 工程师要求", "Agent 开发岗位"],
  alternates: { canonical: "/jd" },
}

export default function JdIndexPage() {
  const docs = getAllJd()
  const byCompany = COMPANIES.map((co) => ({
    co,
    docs: docs.filter((d) => d.company === co.slug),
  })).filter((g) => g.docs.length > 0)

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "大厂 AI 岗位 JD 拆解库",
    itemListElement: docs.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/jd/${d.company}/${d.slug}`,
      name: d.title,
    })),
  }

  return (
    <div className="jd-root">
      <Navigation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <main className="jd-main">
        <nav className="jd-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <span>JD 拆解库</span>
        </nav>

        <header>
          <p className="jd-kicker">JD 拆解 · READ THE JD</p>
          <h1>大厂 AI 岗 JD 拆解库</h1>
          <p className="jd-summary">
            把招聘 JD 翻译成人话：这个岗真正在招什么人、硬技能清单、JD 没写但面试一定会问的东西、
            对应的面试题和准备计划。每页的题目链接全部指向站内真实题库。
          </p>
        </header>

        <section className="jd-tool-banner">
          <div>
            <p className="tb-t">没有你的目标公司？</p>
            <p className="tb-d">粘贴任意 JD 原文，免费拆出考察词、能力模型、匹配题目和简历缺口，浏览器本地完成。</p>
          </div>
          <Link href="/tools/jd-analyzer">上传你的 JD 自己拆</Link>
        </section>

        {byCompany.map(({ co, docs }) => (
          <section key={co.slug} className="jd-index-co">
            <div className="co-head">
              <span className="co-name">{co.name}</span>
              <span className="co-note">{co.note}</span>
            </div>
            <div className="co-items">
              {docs.map((d) => (
                <div key={`${d.company}-${d.slug}`} className="co-item">
                  <Link href={`/jd/${d.company}/${d.slug}`} className="jdl-item-link">
                    <div className="t">{d.role} · {d.level}</div>
                    <span className="s">{d.summary}</span>
                  </Link>
                  {d.sourceUrl ? (
                    <a className="jdl-src-link" href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
                      查看原 JD ↗{d.sourceName ? ` · ${d.sourceName}` : ""}
                    </a>
                  ) : (
                    <span className="jdl-src-pending">来源：公开 JD 与面经汇总 · 原文链接待补</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="jd-claim">
          口径说明：拆解页是该方向公开 JD 与公开面经的高频归纳，不对应某一篇特定 JD；
          业务场景为推断（页面内已标置信度）。招聘要求以官方发布为准。
          22 条样本中 21 条已附原文链接或官方招聘入口，卡片上的「查看原 JD」可直接跳转；腾讯混元 Agent 方向仍在核实。
          库在持续扩充，想第一时间看到你的目标公司，可以把 JD 发给我们。
        </p>
      </main>
    </div>
  )
}
