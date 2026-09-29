# 实验后恢复：把 master 树恢复到 8412ed1（483 题全量内容）
# 用法：python _restore_content.py
import subprocess, sys

REPO = r"H:/myCODE/xhs-pic/_repos/agentalpha_web"

def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", **kw)
    print("$", " ".join(cmd))
    print(r.stdout[-800:] if r.stdout else "", r.stderr[-400:] if r.stderr else "")
    return r

# 1) 树恢复到 8412ed1（含 vercel.json 的 headers 版？不——8412ed1 是去掉 headers 的）
#    恢复内容但保留 headers 移除：直接用 8412ed1 的树
run(["git", "read-tree", "-u", "--reset", "8412ed1"])
r = run(["git", "commit", "-m", "restore: full content back to 8412ed1 tree (483 qa + learn opt)"])
if r.returncode != 0:
    print("COMMIT FAILED", file=sys.stderr)
    sys.exit(1)
run(["git", "-c", "http.proxy=", "-c", "https.proxy=", "push", "origin", "master"])
run(["git", "-c", "http.proxy=", "-c", "https.proxy=", "ls-remote", "origin", "master"])
