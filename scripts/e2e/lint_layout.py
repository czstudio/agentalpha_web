# -*- coding: utf-8 -*-
"""程序化视觉验收:横向溢出 / 关键区块缺失 / console 错误 / 明显未渲染残留。"""
import json
import os
from playwright.sync_api import sync_playwright

PAGES = [
    "https://agentalpha.top/tools",
    "https://agentalpha.top/tools/mock-interview",
    "https://agentalpha.top/tools/gap-test",
    "https://agentalpha.top/tools/jd-analyzer",
    "https://agentalpha.top/tools/interview-log",
    "https://agentalpha.top/tools/application-tracker",
    "https://agentalpha.top/tools/offer-compare",
    "https://agentalpha.top/tools/resume",
    "https://agentalpha.top/jd",
    "https://agentalpha.top/jd/bytedance/agent-application",
]

AUDIT_JS = """
() => {
  const doc = document.documentElement
  const issues = []
  // 1) 横向溢出
  if (doc.scrollWidth > window.innerWidth + 2) {
    issues.push(`h-overflow: scrollWidth ${doc.scrollWidth} > viewport ${window.innerWidth}`)
    // 找出最宽的溢出元素
    let widest = null
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > window.innerWidth + 2 && r.width > 40) {
        if (!widest || r.right > widest.getBoundingClientRect().right) widest = el
      }
    }
    if (widest) issues.push('  widest: ' + widest.tagName + '.' + String(widest.className).slice(0, 60) + ' right=' + Math.round(widest.getBoundingClientRect().right))
  }
  // 2) 关键区块存在
  const probes = ['.tk-main', 'h1']
  for (const sel of probes) {
    if (!document.querySelector(sel)) issues.push('missing: ' + sel)
  }
  // 3) 明显未渲染残留:正文区出现成对 ## 或 []( 开头的裸 markdown 链接语法
  const main = document.querySelector('main') || document.body
  const text = main.innerText || ''
  for (const pat of [/\\]\\(\\/tools\\//, /\\]\\(\\/interview\\//, /^## /m]) {
    if (pat.test(text)) { issues.push('raw-markdown: ' + pat.source.slice(0, 30)); break }
  }
  // 4) 文字互相重叠的粗检:两个可见块级元素矩形交叠超过阈值(跳过嵌套关系)
  return issues
}
"""

def main():
    findings = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for url in PAGES:
            for label, vw in [("desktop", 1280), ("mobile", 390)]:
                page = browser.new_page(viewport={"width": vw, "height": 900 if label == "desktop" else 844})
                errors = []
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
                page.on("pageerror", lambda e: errors.append(str(e)[:120]))
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=40000)
                    page.wait_for_timeout(1500)
                    issues = page.evaluate(AUDIT_JS)
                    key = f"{url} [{label}]"
                    findings[key] = {"issues": issues, "console_errors": errors[:3]}
                except Exception as e:
                    findings[f"{url} [{label}]"] = {"issues": [f"LOAD-FAIL {str(e)[:80]}"], "console_errors": []}
                page.close()
        browser.close()

    bad = 0
    for key, v in findings.items():
        if v["issues"] or v["console_errors"]:
            bad += 1
            print("PROBLEM", key)
            for i in v["issues"]:
                print("   -", i)
            for c in v["console_errors"]:
                print("   ! console:", c[:120])
        else:
            print("PASS   ", key)
    print(f"\n{len(findings) - bad}/{len(findings)} passed")

if __name__ == "__main__":
    main()
