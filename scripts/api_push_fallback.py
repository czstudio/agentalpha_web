#!/usr/bin/env python3
"""git push 被墙时的应急通道：走 GitHub REST API 直接建 blob/tree/commit 并更新分支。

git 的 443 端点（github.com）被墙但 api.github.com 可达时使用：
    python scripts/api_push_fallback.py --commit <本地提交> [--file 额外文件]...

流程：git credential fill 取本机存储的 GitHub 凭据（不打印、不落盘）→
按本地提交的改动文件逐个建 blob → 以远端分支当前 head 的 tree 为 base_tree 建 tree →
建 commit（parent=远端 head，等效 rebase 后 push）→ 快进更新分支 ref。
若远端 ref 在过程中又被推进，自动换 base 重试（最多 3 次）。
"""

import argparse
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = "czstudio/agentalpha_web"
BRANCH = "master"
API = "https://api.github.com"


def log(msg: str) -> None:
    print(msg, flush=True)


def get_token() -> str:
    import os
    inp = f"protocol=https\nhost=github.com\n\n".encode()
    env = dict(os.environ)
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GCM_INTERACTIVE"] = "never"
    out = subprocess.run(
        ["git", "credential", "fill"], input=inp, capture_output=True,
        timeout=60, env=env,
    )
    if out.returncode != 0:
        sys.exit(f"git credential fill 失败: {out.stderr.decode('utf-8', 'replace')[:200]}")
    for line in out.stdout.decode("utf-8", "replace").splitlines():
        if line.startswith("password="):
            return line[len("password="):].strip()
    sys.exit("git credential fill 未取到 github.com 凭据")


def api(token: str, method: str, path: str, payload: dict | None = None, ok=(200, 201, 204)):
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "agentalpha-content-sync",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            return r.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        if e.code in ok:
            return e.code, None
        raise RuntimeError(f"{method} {path} -> {e.code}: {detail}")


def changed_files(commit: str, extra: list[str]) -> list[str]:
    out = subprocess.run(
        ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit],
        capture_output=True, check=True,
    )
    files = out.stdout.decode("utf-8").splitlines()
    for f in extra:
        if f not in files:
            files.append(f)
    return [f for f in files if Path(f).is_file()]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", required=True, help="本地提交，取其改动文件清单")
    ap.add_argument("--file", action="append", default=[], help="额外包含的文件（可重复）")
    ap.add_argument("--message", default=None, help="覆盖提交信息")
    args = ap.parse_args()

    token = get_token()
    status, _ = api(token, "GET", f"/repos/{REPO}", ok=(200,))
    log(f"repo ok ({status})")

    files = changed_files(args.commit, args.file)
    log(f"待推送 {len(files)} 个文件")

    for attempt in range(1, 4):
        _, ref = api(token, "GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
        base_sha = ref["object"]["sha"]
        _, base_commit = api(token, "GET", f"/repos/{REPO}/git/commits/{base_sha}")
        base_tree = base_commit["tree"]["sha"]
        log(f"attempt {attempt}: base={base_sha[:7]} tree={base_tree[:7]}")

        entries = []
        for p in files:
            content = Path(p).read_bytes()
            _, blob = api(token, "POST", f"/repos/{REPO}/git/blobs", {
                "content": base64.b64encode(content).decode(),
                "encoding": "base64",
            })
            entries.append({"path": p.replace("\\", "/"), "mode": "100644", "type": "blob", "sha": blob["sha"]})
        log(f"blobs done ({len(entries)})")

        _, tree = api(token, "POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": entries})
        message = args.message or subprocess.run(
            ["git", "log", "-1", "--format=%B", args.commit], capture_output=True, check=True,
        ).stdout.decode("utf-8").strip()
        message += "\n\n(经 GitHub REST API 推送：git 443 不可达时的应急通道；已含与远端并行改动的合并结果)"
        _, commit = api(token, "POST", f"/repos/{REPO}/git/commits", {
            "message": message, "tree": tree["sha"], "parents": [base_sha],
        })
        try:
            api(token, "PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": commit["sha"], "force": False}, ok=(200,))
        except RuntimeError as e:
            log(f"ref 更新失败（远端又被推进？）：{e}")
            time.sleep(5)
            continue
        log(f"PUSHED via API: {commit['sha']}")
        return
    sys.exit("重试 3 次仍未更新 ref，需人工检查远端状态")


if __name__ == "__main__":
    main()
