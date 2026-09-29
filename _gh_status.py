#!/usr/bin/env python
# 拉最近 N 个 commit 的 Vercel 回报状态（combined status），确认失败边界
import subprocess, sys, json, urllib.request

REPO = "czstudio/agentalpha_web"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 18

# 取 token（不打印不落盘）
tok = subprocess.run(
    ["git", "credential", "fill"],
    input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True
).stdout
token = [l.split("=", 1)[1] for l in tok.splitlines() if l.startswith("password=")][0]

# 最近 N 个 commit
out = subprocess.run(
    ["git", "-C", r"H:/myCODE/xhs-pic/_repos/agentalpha_web", "log", f"-{N}", "--pretty=%H %s"],
    capture_output=True, text=True, encoding="utf-8", errors="replace"
).stdout.splitlines()

for line in out:
    sha, subj = line.split(" ", 1)
    url = f"https://api.github.com/repos/{REPO}/commits/{sha}/status"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "diag",
    })
    try:
        data = json.load(urllib.request.urlopen(req))
    except Exception as e:
        print(f"{sha[:7]} ERR {e}")
        continue
    st = data.get("state", "?")
    # 取 vercel 上下文那条的 target_url
    tgt = ""
    for s in data.get("statuses", []):
        if "vercel" in s.get("context", "").lower() or "vercel" in s.get("target_url", "").lower():
            tgt = s.get("target_url", "")
            break
    print(f"{sha[:7]} {st:8} {subj[:46]}")
    if tgt:
        print(f"         -> {tgt}")
