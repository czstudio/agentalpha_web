import { chromium } from "playwright"
const url = "https://agentalpha.top/community"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(url, { waitUntil: "networkidle" })
// Wait for logo animation to reach a good frame
await page.waitForTimeout(3500)
await page.screenshot({ path: '/tmp/community-hero-delayed.png' })
console.log('captured hero at 3.5s')
await browser.close()
