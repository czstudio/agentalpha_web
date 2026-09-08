import { chromium } from "playwright"
const url = "https://agentalpha.top/community"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(url, { waitUntil: "networkidle" })
await page.waitForTimeout(3500)

const shots = [
  { name: "hero", y: 0 },
  { name: "ch02", selector: ".community-chapter:nth-of-type(2)" },
  { name: "ch03", selector: ".community-chapter:nth-of-type(3)" },
  { name: "ch04", selector: ".community-chapter:nth-of-type(4)" },
  { name: "ch08", selector: ".community-chapter:nth-of-type(8)" },
]

for (const shot of shots) {
  if (shot.selector) {
    const el = await page.$(shot.selector)
    if (el) await el.scrollIntoViewIfNeeded()
  } else {
    await page.evaluate((y) => window.scrollTo(0, y), shot.y)
  }
  await page.waitForTimeout(800)
  await page.screenshot({ path: `/tmp/community-${shot.name}.png`, fullPage: false })
  console.log(`captured ${shot.name}`)
}

const transforms = await page.evaluate(() => {
  return [...document.querySelectorAll(".community-chapter")].map((ch, i) => {
    const style = window.getComputedStyle(ch)
    return { index: i + 1, transform: style.transform, opacity: style.opacity }
  })
})
console.log(JSON.stringify(transforms, null, 2))

await browser.close()
