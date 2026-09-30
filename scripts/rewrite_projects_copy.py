# -*- coding: utf-8 -*-
"""Gemini 重写 /projects 落地页文案（oil-tone 平实风，事实数字全锁）。
用法：python scripts/rewrite_projects_copy.py  （写回 index.html 前 diff 预览）"""
import json, re, ssl, sys, time, urllib.request

API_BASE = "https://sogenport.com"
API_KEY = "sk-xQn9hoPlugqUeYQ0vrALe2dTySGnCowfr8equxfJTb2HcQ9F"
MODEL = "gemini-3.1-pro-preview"
HTML = "public/projects/index.html"

# ── 1. 提取文案块（id → 当前文字）────────────────────
h = open(HTML, encoding="utf-8").read()

def grab(pattern, gid):
    m = re.search(pattern, h, re.S)
    if not m:
        print("MISS", gid); return None
    return m

BLOCKS = {}
PAT = {
    "hero_st":      r'<div class="st" data-r style="--i:2"><p>(.*?)</p></div>',
    "sub01":        r'<p class="blk-sub" data-r style="--i:1">每个项目页含(.*?)</p>',
    "sub02":        r'<p class="blk-sub" data-r style="--i:1">与市面课程的差别不在话术，在证据：每个数字可溯源。</p>',
    "spec_jd":      r'（蚂蚁国际 DeepResearch、字节 Seed、美团 LongCat、网易 Agent Memory 专家岗等），项目能力逐条映射 JD 原文。',
    "spec_run":     r'DeepSearch <b>1207 秒全链路日志</b>、GRPO <b>400 步训练曲线</b>、RAG Dense Recall@10 <b>0.991</b>。实测数字带仓库路径可复查，示意数据明确标注，两者从不混写。',
    "spec_bench":   r'SWE-bench Verified、HotpotQA、MMLU。与快手 KAT、美团 LongCat 同一套汇报语言，你的分数放得住坐标系。</p>',
    "spec_prod":    r'每个项目有界面、指标面板、可演示的运行过程。面试官三分钟看懂你做了什么，每章教程再配五道深挖题与答题要点。',
    "sub03":        r'<p class="blk-sub" data-r style="--i:1">十章 = 十个模块，篇号即模块号。三条主攻路线，也可以按 1 到 10 顺序完整学。</p>',
    "route1":       r'<span>第 1 到 5 章打地基，第 10 章选题一收尾</span>',
    "route2":       r'<span>第 6 章为主轴，第 9 章看 rollout 引擎视角</span>',
    "route3":       r'<span>第 9 章主攻，第 5 章做 prompt 对照线</span>',
    "faq1":         r'<details open><summary>零基础能学吗？</summary><p>(.*?)</p></details>',
    "faq2":         r'<summary>项目能直接写简历吗？</summary><p>(.*?)</p></details>',
    "faq3":         r'<summary>算力怎么解决？</summary><p>(.*?)</p></details>',
    "faq4":         r'<summary>和同行课程最大的区别？</summary><p>(.*?)</p></details>',
    "cta_h2":       r'<div class="copy">\s*<h2>(.*?)</h2>',
    "cta_p":        r'面试深挖预演，每个项目一页全览。咨询报名请加微信，备注「训练营」。',
    "footer":       r'<div>AgentAlpha · 大模型 Agent 训练营，项目源于团队研究与开源基座的深度实战</div>',
}
for gid, pat in PAT.items():
    m = re.search(pat, h)
    BLOCKS[gid] = m.group(0) if m else None
missing = [k for k, v in BLOCKS.items() if v is None]
print("blocks:", len(BLOCKS), "missing:", missing)

# ── 2. 组 prompt（oil-tone 规则 + 事实锁）──────────
RULES = """你是「AgentAlpha」官网落地页的文案编辑。下面给出一个落地页的多段文案（带编号），请逐段重写。

文风硬规则（oil-tone 平实版，违反即返工）：
1. 平铺直叙：直接说明对象、事实、过程、判断；一句一件事，主语清楚。
2. 禁止口号、宣传黑话、新奇比喻、意象包装（如「赋能、闭环、抓手、护城河、武装、打造」一律不用）。
3. 禁止模板领起语和总结语：「核心问题是」「关键在于」「原因很简单」「综上所述」「值得注意的是」一律不写。
4. 「不是……而是……」全篇最多出现一次；三段式排比、对仗句不堆叠。
5. 小标题只作内容标签，不加转折或对仗的后半句。
6. 删除不影响原意的语气词和形容词堆叠；每段比原文更短或相当。
7. 面向读者用「你」时只用于说明读者能做什么，不替读者表态。
8. 事实边界（最高优先级）：所有数字、产品名、机构名、课程结构、承诺边界必须与原文完全一致，一个都不能改、不能加、不能删。原文的诚实边界句（如「示意数据」「不构成承诺」类表述）必须保留意思。
9. 输出 JSON：{"blocks": {"<编号>": "<重写后的纯文字>"}}，不要 markdown 代码框，不要解释。纯文字里不要出现 HTML 标签（<b> 等强调标签保留原文对应位置的关键词即可，我会自行处理）——因此你在 JSON 里写到原文含 <b> 的段落时，用与原文相同的 <b>…</b> 标出同样位置的同样关键词。"""

payload_blocks = {k: v for k, v in BLOCKS.items() if v}
prompt = RULES + "\n\n【原文文案块】\n" + json.dumps(payload_blocks, ensure_ascii=False, indent=1)

def call(model):
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
    }).encode("utf-8")
    req = urllib.request.Request(API_BASE + "/v1/chat/completions", data=body, headers={
        "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"}, method="POST")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=300, context=ctx) as r:
            data = json.load(r)
    except ssl.SSLCertVerificationError:
        ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
        req2 = urllib.request.Request(API_BASE + "/v1/chat/completions", data=body, headers={
            "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req2, timeout=300, context=ctx) as r:
            data = json.load(r)
    return data["choices"][0]["message"]["content"]

text = None
for model in (MODEL, "gemini-3.5-flash", "gemini-2.5-pro"):
    for attempt in range(2):
        try:
            raw = call(model)
            m = re.search(r"\{[\s\S]*\}", raw)
            data = json.loads(m.group(0))
            text = data["blocks"]
            print("model:", model, "| blocks returned:", len(text))
            break
        except Exception as e:
            print("RETRY", model, attempt, str(e)[:100]); time.sleep(5)
    if text: break
if not text:
    sys.exit("all models failed")

json.dump({"blocks": BLOCKS, "rewritten": text}, open("scripts/_rewrite_out.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved scripts/_rewrite_out.json")
