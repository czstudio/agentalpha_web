import { chromium } from "playwright"
const url = "https://agentalpha.top/community"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const logs = []
page.on("console", (msg) => logs.push(msg.text()))
page.on("pageerror", (err) => logs.push(`ERROR: ${err.message}`))
await page.goto(url, { waitUntil: "networkidle" })
await page.waitForTimeout(5000)

const videoInfo = await page.evaluate(() => {
  const video = document.querySelector(".aa-logo-reel-video")
  if (!video) return { found: false }
  const rect = video.getBoundingClientRect()
  const style = window.getComputedStyle(video)
  return {
    found: true,
    readyState: video.readyState,
    currentTime: video.currentTime,
    paused: video.paused,
    ended: video.ended,
    error: video.error?.code,
    networkState: video.networkState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    src: video.currentSrc,
    poster: video.poster,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    style: { display: style.display, opacity: style.opacity, visibility: style.visibility },
    parentHTML: video.parentElement?.outerHTML?.slice(0, 500),
  }
})

console.log(JSON.stringify(videoInfo, null, 2))
console.log("--- console logs ---")
logs.forEach((l) => console.log(l))
await browser.close()
