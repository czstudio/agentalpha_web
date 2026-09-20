#!/usr/bin/env python3
"""IndexNow 提交脚本（零第三方依赖）。

用法：
    python scripts/submit_indexnow.py                # 提交 sitemap.xml 里全部 URL（分批 ≤100）
    python scripts/submit_indexnow.py <url1> <url2>  # 只提交指定 URL

说明：
- 密钥文件在 public/<32位hex>.txt，部署后可通过 https://agentalpha.top/<key>.txt 访问验证持有权。
- IndexNow 由 Bing / Yandex / Seznam / Naver 共享，提交后 Bing 抓取最快（必应中国亦在其索引体系内）。
- 建议每次部署（push 到 master）后跑一次；每周内容补充 SOP 的最后一步就是它。
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

SITE = "https://agentalpha.top"
ENDPOINT = "https://api.indexnow.org/indexnow"
BATCH = 100
KEY_RE = re.compile(r"^[0-9a-f]{32}$")


def find_key() -> str:
    for p in Path(__file__).resolve().parent.parent.joinpath("public").glob("*.txt"):
        if KEY_RE.match(p.stem):
            return p.stem
    sys.exit("未在 public/ 下找到 32 位 hex 的 IndexNow 密钥文件")


def sitemap_urls() -> list[str]:
    with urllib.request.urlopen(f"{SITE}/sitemap.xml", timeout=30) as res:
        body = res.read().decode("utf-8", "replace")
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", body)


def submit(key: str, urls: list[str]) -> None:
    for i in range(0, len(urls), BATCH):
        chunk = urls[i : i + BATCH]
        payload = json.dumps(
            {
                "host": "agentalpha.top",
                "key": key,
                "keyLocation": f"{SITE}/{key}.txt",
                "urlList": chunk,
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            ENDPOINT,
            data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                print(f"batch {i // BATCH + 1}: {len(chunk)} urls -> HTTP {res.status}")
        except Exception as exc:  # 网络失败不阻断，打印后继续
            print(f"batch {i // BATCH + 1}: FAILED ({exc})")


def main() -> None:
    key = find_key()
    args = [a for a in sys.argv[1:] if a.startswith("http")]
    urls = args or sitemap_urls()
    if not urls:
        sys.exit("没有可提交的 URL（sitemap 为空或网络不通）")
    print(f"submitting {len(urls)} urls with key {key[:8]}…")
    submit(key, urls)


if __name__ == "__main__":
    main()
