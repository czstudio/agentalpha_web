import { chromium } from "playwright"
const url = "https://agentalpha.top/community"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(url, { waitUntil: "networkidle" })
await page.waitForTimeout(5000)

const video = await page.$('.aa-logo-reel-video')
if (video) {
  await video.screenshot({ path: '/tmp/logo-video-screenshot.png' })
  console.log('captured video element')
} else {
  console.log('video not found')
}

const stage = await page.$('.aa-logo-reel-stage')
if (stage) {
  await stage.screenshot({ path: '/tmp/logo-stage-screenshot.png' })
  console.log('captured stage element')
}

await browser.close()
