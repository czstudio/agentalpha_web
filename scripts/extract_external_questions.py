# -*- coding: utf-8 -*-
"""从 5 个开源题库仓库抽取公司维度题目 → lib/company-external-questions.ts"""
import json, re

out = {}  # slug -> {"questions": [{q, src}], "process": str}

def add(slug, q, src):
    out.setdefault(slug, {"questions": [], "process": ""})
    qs = out[slug]["questions"]
    if len(qs) < 14 and not any(x["q"] == q for x in qs):
        qs.append({"q": q, "src": src})

# ── 1) agentguide（中文面经案例：美团×2 / 字节 / DeepSeek）──
g = open("_ext_repos/agentguide.md", encoding="utf-8").read()
CASE_MAP = [
    (r"^案例3:美团北斗", "meituan", "美团北斗校招"),
    (r"^案例8:美团大模型应用算法", "meituan", "美团应用算法"),
    (r"^案例4:字节跳动多模态", "bytedance", "字节多模态"),
    (r"^案例10:DeepSeek", "deepseek", "DeepSeek 专项"),
]
for case in re.split(r"\n## ", g)[1:]:
    head = case.split("\n", 1)[0]
    for pat, slug, label in CASE_MAP:
        if re.match(pat, head):
            for q in re.findall(r"^\d+[.、]\s*(.+)$", case, re.M):
                add(slug, f"[{label}] {q.strip()}", "agentguide")

# ── 2) pallavi（英文题 + Asked at 公司锚，Apache-2.0）──
p = open("_ext_repos/pallavi.md", encoding="utf-8").read()
ANCHORS = {"deepseek": "DeepSeek", "moonshot": "Moonshot AI", "zhipu": "Zhipu AI",
           "alibaba": "Alibaba", "openai": "OpenAI", "google": "Google"}
cur_q = None
for line in p.split("\n"):
    s = line.strip()
    if s.startswith("- ") and not s.startswith("- Asked at"):
        q = s[2:].strip()
        cur_q = q if 10 < len(q) < 300 and not q.startswith("[") else None
        continue
    if s.startswith("- Asked at") and cur_q:
        for slug, anchor in ANCHORS.items():
            if f"[{anchor}]" in s:
                add(slug, cur_q, "pallavi")
        cur_q = None

# ── 3) ombharatiya（面试流程叙述）──
o = open("_ext_repos/ombharatiya.md", encoding="utf-8").read()
PROC_MAP = {"Google DeepMind": "google"}
for sec in re.split(r"\n## ", o):
    m = re.match(r"(Google DeepMind)\s*\n", sec)
    if m:
        pm = re.search(r"> \*\*Process\*\*:(.+?)(?:\n\n|\n#|\Z)", sec, re.S)
        if pm:
            slug = PROC_MAP[m.group(1)]
            out.setdefault(slug, {"questions": [], "process": ""})
            out[slug]["process"] = re.sub(r"\s+", " ", pm.group(1)).strip()[:500]

for slug in list(out.keys()):
    if not out[slug]["questions"] and not out[slug]["process"]:
        del out[slug]

json.dump(out, open("_ext_repos/extracted.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print({k: len(v["questions"]) for k, v in out.items()})
