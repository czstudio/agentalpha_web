# import 路径大小写核对 v2：只查 (a) ./ ../ 相对导入 (b) @/ 别名（Next 标配 -> 项目根）
# 其余（npm 包、node:、react/next 系列）全跳过。工作区即目标树。
import os, re, sys

REPO = r"H:/myCODE/xhs-pic/_repos/agentalpha_web"
ROOT = REPO

imp_re = re.compile(
    r"""(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)"""
)
EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", "/index.ts", "/index.tsx", "/index.js"]

def resolve_case_exact(base, rel):
    cur = base
    for seg in rel.split("/")[:-1]:
        if not seg or seg in (".", ".."):
            cur = os.path.normpath(os.path.join(cur, seg)) if seg == ".." else cur
            continue
        try:
            entries = os.listdir(cur)
        except OSError:
            return (False, f"listdir fail {cur}")
        hit = [e for e in entries if e.lower() == seg.lower()]
        if not hit:
            return (False, f"NO dir '{seg}' in {cur.replace(ROOT, '')}")
        if hit[0] != seg:
            return (False, f"DIR CASE '{seg}' vs '{hit[0]}'")
        cur = os.path.join(cur, hit[0])
    last = rel.split("/")[-1]
    if not last or last == ".":
        return (True, "")
    stem, ext = os.path.splitext(last)
    try:
        entries = os.listdir(cur)
    except OSError:
        return (False, f"listdir fail {cur}")
    cands = [last] if ext else [stem + e for e in EXTS] + [last]
    for c in cands:
        hit = [e for e in entries if e.lower() == c.lower()]
        if hit:
            if hit[0] != c:
                return (False, f"FILE CASE '{c}' vs '{hit[0]}'")
            return (True, "")
    return (False, f"NO file '{last}' in {cur.replace(ROOT, '')}")

problems, checked = [], 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules", ".next", "public"}]
    for f in filenames:
        if not f.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs")):
            continue
        p = os.path.join(dirpath, f)
        relfile = os.path.relpath(p, ROOT).replace("\\", "/")
        try:
            text = open(p, encoding="utf-8", errors="replace").read()
        except Exception:
            continue
        for m in imp_re.finditer(text):
            spec = m.group(1) or m.group(2) or m.group(3)
            if not spec:
                continue
            if spec.startswith(("./", "../")):
                base, rel = os.path.dirname(p), spec
            elif spec.startswith("@/"):
                base, rel = ROOT, spec[2:]
            else:
                continue  # npm 包 / node: / 其他别名，跳过
            checked += 1
            ok, detail = resolve_case_exact(base, rel)
            if not ok:
                problems.append((relfile, spec, detail))

print(f"checked local imports: {checked}, problems: {len(problems)}")
for relfile, spec, detail in problems:
    print(f"[{detail}] {relfile} -> {spec}")
