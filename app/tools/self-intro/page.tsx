import type { Metadata } from "next"
import { Mic } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsFaq } from "@/components/tools/tools-faq"
import { IntroClient } from "@/components/tools/intro-client"
import "../tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "自我介绍生成器 · 60 秒与 3 分钟两版",
  description:
    "输入方向、阶段和两三条亮点经历，生成 60 秒逐句稿与 3 分钟五段骨架，附通病检查（背诵腔、无数字、慎用精通）和面试官追问预演。指标位留空由你填真实值，本地运行不注册。",
  keywords: ["面试自我介绍", "自我介绍模板", "60 秒自我介绍", "AI 岗面试开场"],
  alternates: { canonical: "/tools/self-intro" },
}

export default function SelfIntroPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: SITE + "/tools" },
      { "@type": "ListItem", position: 3, name: "自我介绍生成器", item: SITE + "/tools/self-intro" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker"><Mic size={13} strokeWidth={2} aria-hidden /> 免费工具 · SELF INTRO</p>
          <h1>自我介绍生成器</h1>
          <p className="tk-lede">
            面试的第一个问题几乎一定是「先做个自我介绍」。填方向、阶段和两三条亮点经历，拿 60 秒逐句稿和 3 分钟五段骨架，再看你的稿子踩没踩通病（无数字、慎用精通、亮点和 JD 零重合）。
            〔〕里填你的真实数字，工具不替你编。本地运行，不注册、不上传。
          </p>
        </header>

        <IntroClient />

        <ToolsFaq slug="self-intro" />
      </main>
    </>
  )
}
