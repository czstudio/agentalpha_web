# -*- coding: utf-8 -*-
"""
SEO/GEO 收录快照:可反复跑,对比搜索引擎收录与页面信号的变化。
用法:python scripts/seo/snapshot.py [--base https://agentalpha.top] [--out seo_snapshot.json]
检查项:
1) 页面信号:每工具页的 title/description 关键词、canonical、JSON-LD 类型
2) 站内结构:首页工具区卡片数、面经/QA 详情工具入口、llms.txt 与 llms-full.txt 工具覆盖
3) 搜索引擎收录:site: 查询(Bing/百度,HTML 粗解析;搜索引擎随时可能反爬,失败记录 manual_check)
4) AI 引擎可访问性:robots.txt 对主流 AI 爬虫的 Allow
结果写 JSON,两次快照 diff 即可看到变化。
"""
import argparse
import json
import re
import subprocess
import urllib.request
from datetime import datetime, timezone

TOOLS = {
    "resume-builder": ["免费在线简历生成器", "导出 PDF", "无需注册"],
    "jd-analyzer": ["JD 分析工具", "免费在线"],
    "resume": ["简历在线分析", "免费"],
    "gap-test": ["面试 Gap 自测"],
    "mock-interview": ["AI 模拟面试", "免费在线"],
    "interview-log": ["面试复盘模板"],
    "application-tracker": ["求职投递管理"],
    "bullet-grader": ["简历经历打分"],
    "offer-compare": ["Offer 对比器"],
    "project-matcher": ["AI 项目推荐"],
}


def curl(url: str) -> str:
    return subprocess.run(["curl", "-s", "-m", "20", url], capture_output=True).stdout.decode("utf-8", "ignore")


def page_signals(base: str) -> dict:
    out = {}
    for slug, kws in TOOLS.items():
        html = curl(f"{base}/tools/{slug}")
        m = re.search(r"<title>([^<]*)</title>", html)
        title = m.group(1) if m else ""
        canon = re.search(r'rel="canonical" href="([^"]*)"', html)
        ld = "SoftwareApplication" in html
        missing = [k for k in kws if k not in title]
        out[slug] = {
            "title": title,
            "title_keywords_ok": not missing,
            "missing_keywords": missing,
            "canonical": canon.group(1) if canon else None,
            "has_software_app_ld": ld,
        }
    return out


def structure_signals(base: str) -> dict:
    home = curl(f"{base}/")
    llms = curl(f"{base}/llms.txt")
    llms_full = curl(f"{base}/llms-full.txt")
    robots = curl(f"{base}/robots.txt")
    # 面经详情(取第一篇)
    mj_list = curl(f"{base}/mianjing")
    m = re.search(r'href="(/mianjing/[^"]+)"', mj_list)
    mj_entry = 0
    if m:
        detail = curl(base + m.group(1))
        mj_entry = 1 if "免费求职工具箱" in detail else 0
    ai_bots = {b: (f"User-Agent: {b}" in robots and "Allow: /" in robots) for b in
               ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Bytespider"]}
    # JD 样板页数量(首页 /jd 列出的拆解卡)+ 指南渲染
    jd_list = curl(f"{base}/jd")
    jd_count = len(set(re.findall(r'href="(/jd/[a-z0-9-]+/[a-z0-9-]+)"', jd_list)))
    guides = {}
    for slug in ("resume-builder", "jd-analyzer", "resume", "mock-interview"):
        th = curl(f"{base}/tools/{slug}")
        guides[slug] = "怎么用" in th
    return {
        "home_tools_cards": len(re.findall(r'class="aa-tool-card"', home)),
        "home_tools_keywords": all(k in home for k in ["免费", "无需注册", "导出 PDF"]),
        "llms_txt_tool_mentions": llms.count("工具"),
        "llms_full_toolbox_block": "免费求职工具箱" in llms_full,
        "llms_full_tool_count": llms_full.count("（免费在线工具）"),
        "mianjing_detail_tool_entry": mj_entry,
        "jd_page_count": jd_count,
        "tool_guides_rendered": guides,
        "robots_ai_bots_allowed": ai_bots,
    }


def search_engine_counts(base: str) -> dict:
    """site: 查询。搜索引擎反爬多变,失败即记 manual_check,不阻塞快照。"""
    out = {}
    headers = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    host = base.replace("https://", "").replace("http://", "")
    for engine, url in [
        ("bing", f"https://www.bing.com/search?q=site%3A{host}+%E7%AE%80%E5%8E%86%E7%94%9F%E6%88%90%E5%99%A8"),
        ("bing_tools", f"https://www.bing.com/search?q=site%3A{host}%2Ftools"),
    ]:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": headers})
            html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore")
            m = re.search(r"([0-9,]+)\s*(?:个结果|results)", html)
            out[engine] = {"hits": m.group(1) if m else "unknown", "manual_check": m is None}
        except Exception as e:
            out[engine] = {"error": str(e)[:80], "manual_check": True}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://agentalpha.top")
    ap.add_argument("--out", default="seo_snapshot.json")
    args = ap.parse_args()

    snap = {
        "taken_at": datetime.now(timezone.utc).isoformat(),
        "base": args.base,
        "pages": page_signals(args.base),
        "structure": structure_signals(args.base),
        "search_engines": search_engine_counts(args.base),
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1)
    # 摘要
    titles_ok = sum(1 for v in snap["pages"].values() if v["title_keywords_ok"])
    print(f"快照已写入 {args.out}")
    print(f"工具页 title 关键词: {titles_ok}/{len(snap['pages'])}")
    print(f"首页工具卡: {snap['structure']['home_tools_cards']} | llms-full 工具节: {snap['structure']['llms_full_tool_count']}")
    print(f"面经详情入口: {snap['structure']['mianjing_detail_tool_entry']}")
    print(f"JD 样板页: {snap['structure']['jd_page_count']} | 工具指南: {sum(1 for v in snap['structure']['tool_guides_rendered'].values() if v)}/4")
    print(f"AI 爬虫放行: {sum(1 for v in snap['structure']['robots_ai_bots_allowed'].values() if v)}/6")


if __name__ == "__main__":
    main()
