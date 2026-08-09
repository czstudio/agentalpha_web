import { chromium } from "playwright"

const url = process.env.COMMUNITY_URL || "http://localhost:3000/community"
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 820, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]
const forbidden = ["内容来源", "飞书原文", "当前版本", "r853", "原文图片", "59 张"]
const browser = await chromium.launch({ channel: "chrome", headless: true })

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport })
    await page.goto(url, { waitUntil: "networkidle" })
    await page.waitForTimeout(3200)

    const result = await page.evaluate((terms) => {
      const bodyText = document.body.innerText
      const proof = [...document.querySelectorAll(".community-chapter")]
        .find((chapter) => chapter.querySelector("h2")?.textContent?.includes("真实结果"))
      return {
        h1: document.querySelectorAll("h1").length,
        chapters: document.querySelectorAll(".community-chapter").length,
        overflow: document.body.scrollWidth > window.innerWidth,
        collapsedFigures: [...(proof?.querySelectorAll("figure") || [])]
          .filter((figure) => figure.getBoundingClientRect().width < 100).length,
        forbidden: terms.filter((term) => bodyText.includes(term)),
      }
    }, forbidden)

    const failures = []
    if (result.h1 !== 1) failures.push(`H1=${result.h1}`)
    if (result.chapters !== 8) failures.push(`chapters=${result.chapters}`)
    if (result.overflow) failures.push("horizontal-overflow")
    if (result.collapsedFigures) failures.push(`collapsed-figures=${result.collapsedFigures}`)
    if (result.forbidden.length) failures.push(`forbidden=${result.forbidden.join(",")}`)
    if (failures.length) throw new Error(`${viewport.name}: ${failures.join("; ")}`)
    console.log(`COMMUNITY_PAGE_OK ${viewport.name}`)
    await page.close()
  }
} finally {
  await browser.close()
}
