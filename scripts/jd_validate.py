# -*- coding: utf-8 -*-
"""JD 批次独立校验:qaSlugs 存在且 cat 匹配、company 合法、章节齐全、禁词、内链 slug 有效。"""
import io
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(REPO, os.environ.get("JD_BATCH", "_jd_batch4"))
QA_DIR = os.path.join(REPO, "content", "qa")

qa_cat = {}
for f in os.listdir(QA_DIR):
    if not f.endswith(".md"):
        continue
    slug = f[:-3]
    text = io.open(os.path.join(QA_DIR, f), encoding="utf-8").read(400)
    m = re.search(r"^category: (\w+)", text, re.M)
    qa_cat[slug] = m.group(1) if m else None

companies = set(re.findall(r'slug: "([a-z0-9-]+)"',
                 io.open(os.path.join(REPO, "lib", "companies.ts"), encoding="utf-8").read()))

REQUIRED_SECTIONS = ["这条 JD 在招什么人", "业务场景推测", "硬技能：必须会什么", "加分项：什么能拉开差距",
                     "JD 没写但面试会问", "能力模型", "简历怎么改", "项目建议", "准备计划"]
BANNED = ["内部真题", "包过", "保证拿", "TODO", "[待补]", "本文由", "薪资范围", "年薪", "全链路"]
VALID_CATS = {"agent", "rag", "tooluse", "memory", "finetune", "inference", "eval", "safety", "basics"}

errors = []
warns = []
files = sorted(f for f in os.listdir(BATCH) if f.endswith(".md"))
print(f"批次文件: {len(files)}")
for fname in files:
    text = io.open(os.path.join(BATCH, fname), encoding="utf-8").read()
    tag = fname

    fm = text.split("---")[1]
    fields = dict(re.findall(r"^(\w+): (.+)$", fm, re.M))
    for req in ["slug", "company", "title", "role", "family", "level", "summary", "cats", "qaSlugs", "keywords", "updated"]:
        if req not in fields:
            errors.append(f"{tag}: frontmatter 缺 {req}")
    if fields.get("company") not in companies:
        errors.append(f"{tag}: company 不在词表 {fields.get('company')}")

    cats = [c.strip() for c in fields.get("cats", "[]").strip("[]").split(",") if c.strip()]
    for c in cats:
        if c not in VALID_CATS:
            errors.append(f"{tag}: 非法 cat {c}")

    slugs = [x.strip().strip('"') for x in fields.get("qaSlugs", "[]").strip("[]").split(",") if x.strip()]
    if not (6 <= len(slugs) <= 12):
        warns.append(f"{tag}: qaSlugs 数量 {len(slugs)}")
    for s in slugs:
        if s not in qa_cat:
            errors.append(f"{tag}: qaSlug 不存在 {s}")
        elif qa_cat[s] not in cats:
            errors.append(f"{tag}: qaSlug {s} 的 cat={qa_cat[s]} 不在 cats={cats}")

    for sec in REQUIRED_SECTIONS:
        if sec not in text:
            errors.append(f"{tag}: 缺章节「{sec}」")

    for b in BANNED:
        if b in text:
            errors.append(f"{tag}: 禁词「{b}」")

    for s in set(re.findall(r"/interview/qa/([a-z0-9-]+)", text)):
        if s not in qa_cat:
            errors.append(f"{tag}: 正文死链 /interview/qa/{s}")

    body = text.split("---", 2)[2]
    for m in re.finditer(r"[\u4e00-\u9fff]\s*[,;:]\s*[\u4e00-\u9fff]", body):
        warns.append(f"{tag}: 疑似半角标点 …{body[max(0,m.start()-6):m.end()+6]}…".replace("\n", " "))
        break

    if "sourceUrl" not in fm:
        errors.append(f"{tag}: 缺 sourceUrl")

print(f"\nERRORS: {len(errors)}")
for e in errors:
    print(" ✗", e)
print(f"WARNINGS: {len(warns)}")
for w in warns:
    print(" ?", w)
sys.exit(1 if errors else 0)
