/**
 * 简历 A4 渲染器:ResumeDoc → 自包含 HTML(模板 CSS 吸收自酥神 ASU resume_template.html,
 * 分页引擎移植其 v6 flow:内容展平成叶子按文档序填充 A4 页,放不下的整块去下一页,节标题不孤悬页尾)。
 * 预览 iframe 与「下载 HTML」共用同一份输出;打印/存 PDF 直接打印 iframe,走同一套 @page 规则。
 * 红线:所有用户文本经 esc 转义,链接仅放行 http/https/mailto。
 */
import { highlightRanges, LABELS_DEFAULTS, SECTION_TITLES_DEFAULTS, type BulletObj, type ResumeDoc } from "@/lib/tools/resume-builder"

const ACCENT_VARS: Record<string, string> = {
  ink: "--accent:#245579;--accent-grad:linear-gradient(90deg,#245579,rgba(36,85,121,.08));--accent-edu-bg:linear-gradient(90deg,#eef4f7 0%,rgba(238,244,247,.25) 82%,transparent 100%);",
  clay: "--accent:#a34a20;--accent-grad:linear-gradient(90deg,#a34a20,rgba(180,83,42,.08));--accent-edu-bg:linear-gradient(90deg,#f7efe7 0%,rgba(247,239,231,.25) 82%,transparent 100%);",
  olive: "--accent:#5c6e3d;--accent-grad:linear-gradient(90deg,#5c6e3d,rgba(120,140,93,.08));--accent-edu-bg:linear-gradient(90deg,#f0f3ea 0%,rgba(240,243,234,.25) 82%,transparent 100%);",
  slate: "--accent:#3d4348;--accent-grad:linear-gradient(90deg,#3d4348,rgba(61,67,72,.08));--accent-edu-bg:linear-gradient(90deg,#f0f1f2 0%,rgba(240,241,242,.25) 82%,transparent 100%);",
}

function esc(s: string): string {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c)
}

/** 清理 PDF/OCR 带进来的不可见字符(ZWSP/BOM/软连字符等,方法同酥神模板) */
function clean(s: string): string {
  // eslint-disable-next-line no-control-regex
  return String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\u3000\uFE00-\uFE0F\uFEFF\uFFF0-\uFFFF\uE000-\uF8FF]/g, "")
    .replace(/[\u00A0\u205F]/g, " ")
}

function safeUrl(value: string): string {
  const v = String(value || "").trim()
  return /^(https?:\/\/|mailto:)/i.test(v) ? v : ""
}

function escAttrUrl(value: string): string {
  const safe = safeUrl(value)
  return safe ? esc(safe) : ""
}

/** 富文本:合并手动重点词与自动重点词(数字/指标/技术域,日期掩掉),转 <strong> */
function richTextHtml(b: BulletObj): string {
  const text = clean(b.text)
  const ranges = highlightRanges(text, (b.highlights || []).map(clean))
  let out = ""
  let cursor = 0
  for (const r of ranges) {
    if (r.start > cursor) out += esc(text.slice(cursor, r.start))
    out += `<strong class="highlight">${esc(text.slice(r.start, r.end))}</strong>`
    cursor = r.end
  }
  if (cursor < text.length) out += esc(text.slice(cursor))
  return out
}

function bulletListHtml(items: BulletObj[]): string {
  const list = items.filter((b) => clean(b.text))
  if (!list.length) return ""
  return `<ul class="fact-list">${list.map((b) => `<li>${richTextHtml(b)}</li>`).join("")}</ul>`
}

/** 事实块:首行 = 标签 + 首条内容同行;后续条目缩进 bullet 列表(悬挂缩进由脚本量宽) */
function factBlockHtml(label: string, items: BulletObj[]): string {
  const list = items.filter((b) => clean(b.text))
  if (!list.length) return ""
  const lead = `<p class="fact-lead"><span class="fact-label">${esc(label)}：</span>${richTextHtml(list[0])}</p>`
  const rest = list.length > 1 ? `<ul class="fact-list">${list.slice(1).map((b) => `<li>${richTextHtml(b)}</li>`).join("")}</ul>` : ""
  return `<div class="fact-block"><div class="fact-content">${lead}${rest}</div></div>`
}

const EXPERIENCE_TONES = ["red", "gray", "blue"] as const

function renderBody(doc: ResumeDoc): string {
  const t = { ...SECTION_TITLES_DEFAULTS, ...doc.section_titles }
  const labels = { ...LABELS_DEFAULTS, ...doc.labels }
  const p = doc.profile
  const out: string[] = []

  // 头部:姓名 + 右侧眉标 + 联系方式 chips + 一句话定位(+ 证件照)
  const photo = p.photo && p.photo.confirmed && /^data:image\/(?:png|jpeg|webp);base64,/i.test(p.photo.src) ? p.photo : null
  out.push(`<header class="masthead${photo ? " has-photo" : ""}"><div class="identity">`)
  out.push('<div class="name-row">')
  out.push(`<h1 class="name">${esc(clean(p.name) || "姓名")}</h1>`)
  if (clean(p.eyebrow)) out.push(`<p class="masthead-eyebrow">${esc(clean(p.eyebrow))}</p>`)
  out.push("</div>")
  const chips: string[] = []
  if (clean(p.location)) chips.push(`<span class="contact-item">${esc(clean(p.location))}</span>`)
  for (const c of p.contacts) {
    const value = clean(c.value)
    if (!value && !clean(c.label)) continue
    const text = clean(c.label) ? `${clean(c.label)}：${value}` : value
    const url = c.url ? escAttrUrl(c.url) : ""
    chips.push(`<span class="contact-item">${url ? `<a href="${url}"${/^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(text)}</a>` : esc(text)}</span>`)
  }
  if (chips.length) out.push(`<div class="contact">${chips.join("")}</div>`)
  if (clean(p.headline)) out.push(`<p class="masthead-tagline">${esc(clean(p.headline))}</p>`)
  out.push("</div>")
  if (photo) {
    const crop = photo.crop
    out.push(`<div class="photo-frame"><img class="profile-photo" alt="${esc(clean(p.name) || "候选人")}照片" src="${esc(photo.src)}" style="object-position:${crop.x}% ${crop.y}%;transform:scale(${crop.zoom})" onerror="this.parentElement.remove()" /></div>`)
  }
  out.push("</header>")

  // 定位概述(绿条)
  if (clean(p.summary)) {
    out.push(`<section class="professional-summary"><div class="professional-summary-body"><p>${richTextHtml({ text: p.summary })}</p></div></section>`)
  }

  const section = (title: string, inner: string) =>
    inner ? `<section class="section"><h2 class="section-title">${esc(clean(title))}</h2>${inner}</section>` : ""

  if (doc.education.length) {
    const rows = doc.education
      .filter((e) => clean(e.institution) || e.bullets.length)
      .map((e) => {
        const headBits = [clean(e.program), clean(e.degree)].filter(Boolean).join("｜")
        const head = `<span class="education-school">${esc(clean(e.institution))}</span>${headBits ? `<span class="education-program">${esc(headBits)}</span>` : ""}`
        const bullets = bulletListHtml(e.bullets)
        return `<div class="education-row"><div class="education-main"><div>${head}</div>${bullets}</div><div class="dates">${esc(clean(e.dates))}</div></div>`
      })
      .join("")
    out.push(section(t.education, rows))
  }

  if (doc.experience.length) {
    const articles = doc.experience
      .filter((exp) => clean(exp.company) || exp.projects.length)
      .map((exp, i) => {
        const tone = exp.tone && ["red", "blue", "green", "gray"].includes(exp.tone) ? exp.tone : EXPERIENCE_TONES[i % EXPERIENCE_TONES.length]
        const left: string[] = []
        left.push(`<span class="company-name">${esc(clean(exp.company))}</span>`)
        if (clean(exp.team)) left.push(`<span class="company-team">｜${esc(clean(exp.team))}</span>`)
        for (const l of exp.links || []) {
          const url = escAttrUrl(l.url)
          if (url) left.push(`<a class="company-link" href="${url}"${/^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(clean(l.label) || "链接")}</a>`)
        }
        if ((exp.tags || []).length) left.push(`<span class="company-tags">｜${exp.tags.map(clean).filter(Boolean).map(esc).join(" · ")}</span>`)
        const projects = exp.projects
          .map((proj) => {
            const titleBits = `<span class="project-title">${esc(clean(proj.name))}</span>${clean(proj.subtitle) ? `<span class="project-subtitle">— ${esc(clean(proj.subtitle))}</span>` : ""}`
            return [
              `<div class="project"><div>${titleBits}</div>`,
              factBlockHtml(labels.background, proj.background),
              factBlockHtml(labels.impact, proj.impact),
              factBlockHtml(labels.responsibilities, proj.responsibilities),
              "</div>",
            ].join("")
          })
          .join("")
        return `<article class="experience tone-${tone}"><div class="company-bar brand-${tone}"><div class="company-left">${left.join("")}</div><div class="company-right"><span class="dates">${esc(clean(exp.dates))}</span></div></div>${projects}</article>`
      })
      .join("")
    out.push(section(t.experience, articles))
  }

  const cardsHtml = (items: typeof doc.projects) =>
    items
      .filter((c) => clean(c.name) || c.bullets.length)
      .map((c) => {
        const roleBits = clean(c.role) ? `<span class="card-role">｜${esc(clean(c.role))}</span>` : ""
        const scope = clean(c.scope) ? `<div class="card-scope">${esc(clean(c.scope))}</div>` : ""
        const url = c.url && escAttrUrl(c.url) ? `<a class="company-link" href="${escAttrUrl(c.url)}" target="_blank" rel="noopener noreferrer">证据 / 项目链接</a>` : ""
        return `<article class="card"><div><div><span class="card-title">${esc(clean(c.name))}</span>${roleBits}</div>${scope}${bulletListHtml(c.bullets)}</div>${url}</article>`
      })
      .join("")

  out.push(section(t.open_source, cardsHtml(doc.open_source) ? `<div class="cards">${cardsHtml(doc.open_source)}</div>` : ""))
  out.push(section(t.projects, cardsHtml(doc.projects) ? `<div class="cards">${cardsHtml(doc.projects)}</div>` : ""))

  for (const s of doc.customs) {
    const items = s.items
      .filter((it) => clean(it.title) || it.bullets.length)
      .map((it) => {
        const dates = clean(it.dates) ? `<span class="card-role">｜${esc(clean(it.dates))}</span>` : ""
        return `<article class="card"><div><div><span class="card-title">${esc(clean(it.title) || "未命名条目")}</span>${dates}</div>${bulletListHtml(it.bullets)}</div></article>`
      })
      .join("")
    if (clean(s.title) || items) out.push(section(clean(s.title) || "补充栏目", items ? `<div class="cards">${items}</div>` : '<div class="empty">（暂无条目）</div>'))
  }

  if (doc.awards.length || doc.skills.length) {
    const rows: string[] = []
    if (doc.awards.length) {
      rows.push(`<div class="compact-row"><div class="compact-label">奖项</div><div class="compact-values">${doc.awards
        .map((a) => `<span class="compact-value">${esc(clean(a.name))}${clean(a.date) ? `（${esc(clean(a.date))}）` : ""}</span>`)
        .join("")}</div></div>`)
    }
    if (doc.skills.length) {
      rows.push(`<div class="compact-row"><div class="compact-label">技能</div><div class="compact-values skill-list">${doc.skills
        .map((s) => `<span class="compact-value">${esc(clean(s))}</span>`)
        .join("")}</div></div>`)
    }
    out.push(section(t.awards_skills, `<div class="compact-grid">${rows.join("")}</div>`))
  }

  return out.join("")
}

const TEMPLATE_CSS = `
:root {
  --ivory: #ffffff; --slate: #141413; --clay: #d97757; --oat: #e3dacc; --olive: #788c5d;
  --gray-100: #f0eee6; --gray-300: #d1cfc5; --gray-500: #87867f; --gray-700: #3d3d3a;
  --link-blue: #366f96; --paper: #ffffff; --red-bar: #fbefef; --blue-bar: #eaf4fb;
  --green-bar: #eaf1e5; --gray-bar: #f2f2f0;
  --serif: Georgia, "Songti SC", STSong, "Noto Serif CJK SC", "SimSun", serif;
  --sans: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, -apple-system, sans-serif;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
* { box-sizing: border-box; }
html { background: var(--gray-100); }
body { margin: 0; color: var(--slate); background: var(--gray-100); font-family: var(--sans); font-size: 11px; line-height: 1.48; -webkit-font-smoothing: antialiased; }
a { color: var(--link-blue); text-decoration: none; border-bottom: 1px solid rgba(54,111,150,.28); }
a:hover { border-bottom-color: currentColor; }
#resume { width: 210mm; min-height: 297mm; margin: 14mm auto; padding: 12mm 13mm 13mm; background: var(--paper); box-shadow: 0 12px 36px rgba(20,20,19,.12); }
/* 多页 A4 分页(引擎启用后):单页样式换成 sheet 流 */
#resume.sushen-paged { display: block; margin: 0 auto; padding: 0; width: fit-content; min-height: 0; background: transparent; box-shadow: none; }
#resume.sushen-paged > .sushen-sheet { display: block; width: 210mm; height: 297mm; box-sizing: border-box; margin: 0 auto 10mm; padding: 0; background: var(--paper); box-shadow: 0 12px 36px rgba(20,20,19,.12); overflow: hidden; }
.sushen-frame { box-sizing: border-box; width: 100%; height: 100%; padding: var(--sheet-pt, 12mm) var(--sheet-pr, 13mm) var(--sheet-pb, 13mm) var(--sheet-pl, 13mm); display: flex; flex-direction: column; }
.sushen-head { flex: 0 0 auto; margin-bottom: 1.5mm; color: var(--gray-500); font-size: 8.2px; letter-spacing: .05em; }
.sushen-head:empty { display: none; }
.sushen-content { flex: 1 1 auto; min-height: 0; overflow: hidden; }
.sushen-foot { flex: 0 0 auto; margin-top: 1.5mm; color: var(--gray-500); font-size: 8.2px; display: flex; justify-content: space-between; align-items: center; }
.sushen-content > :first-child { margin-top: 0 !important; }
.sushen-content .fact-list li, .sushen-content > li, .sushen-content .fact-lead, .sushen-content .fact-line { font-size: var(--content-fs, inherit); line-height: var(--content-lh, inherit); }
.sushen-content .section-title { margin-top: 5mm; }
.sushen-content .card + .card { margin-top: 2.4mm; }
.sushen-content .compact-row + .compact-row { margin-top: 1.2mm; }
.sushen-content.sushen-compact .section-title { margin-top: 3mm; margin-bottom: 1.6mm; }
.sushen-content.sushen-compact .education-row { padding: 1.4mm 3mm; }
.sushen-content.sushen-compact .education-row + .education-row { margin-top: 1.1mm; }
.sushen-content.sushen-compact .experience { margin-bottom: 2.4mm; }
.sushen-content.sushen-compact .company-bar { padding: 1.1mm 3mm; min-height: 7mm; }
.sushen-content.sushen-compact .project + .project { margin-top: 1.6mm; padding-top: 1.8mm; }
.sushen-content.sushen-compact .fact-block { margin-top: .7mm; }
.sushen-content.sushen-compact .fact-list li { margin-bottom: .4mm; }
.sushen-content.sushen-compact .card + .card { margin-top: 1.5mm; }
.sushen-content.sushen-compact .compact-row + .compact-row { margin-top: .8mm; }
.masthead { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6mm 8mm; align-items: center; margin-bottom: 4.5mm; }
.masthead.has-photo { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
.photo-frame { width: 26mm; height: 30mm; overflow: hidden; border: 1px solid var(--gray-300); border-radius: 2px; background: var(--gray-100); }
.profile-photo { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }
.name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 3mm 5mm; min-height: 8.5mm; }
.masthead-eyebrow { margin: 0 0 0 auto; color: #475467; font-size: 9.5px; font-weight: 800; letter-spacing: .18em; line-height: 1.3; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
.name { margin: 0; font-size: 30px; line-height: 1.1; font-weight: 800; letter-spacing: .01em; }
.identity { display: flex; flex-direction: column; min-width: 0; }
.masthead-tagline { margin: 2.2mm 0 0; color: #667085; font-size: 13px; font-weight: 600; line-height: 1.45; letter-spacing: .01em; }
.contact { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 2mm 2.4mm; margin-top: 2.4mm; color: #1f2937; font-size: 9.6px; }
.contact-item { white-space: nowrap; display: inline-flex; align-items: center; background: #f8fafc; border: 1px solid #dbe2ea; border-radius: 4px; min-height: 6.4mm; padding: .9mm 2.2mm; }
.contact-item a { color: inherit; text-decoration: none; border-bottom: 0; }
.professional-summary { margin-top: 3.2mm; padding: 2.2mm 3mm; border-left: 3px solid var(--olive); background: linear-gradient(90deg, var(--green-bar), rgba(234,241,229,.18)); break-inside: avoid; }
.professional-summary-body { color: var(--gray-700); }
.professional-summary-body p { margin: 0; }
.section { margin-top: 5mm; }
.section-title { display: flex; align-items: center; gap: 3mm; margin: 0 0 2.5mm; color: var(--accent); font-family: var(--serif); font-size: 15px; font-weight: 800; line-height: 1.15; letter-spacing: .035em; }
.section-title::after { content: ""; flex: 1; height: 1px; background: var(--accent-grad); }
.education-row { display: grid; grid-template-columns: 1fr auto; gap: 4mm; padding: 2.2mm 3mm; border-left: 3px solid var(--accent); background: var(--accent-edu-bg); break-inside: avoid; }
.education-row + .education-row { margin-top: 2mm; }
.education-main { min-width: 0; }
.education-school { color: var(--accent); font-family: var(--serif); font-size: 12px; font-weight: 800; }
.education-program { margin-left: 2mm; font-weight: 650; }
.dates { white-space: nowrap; color: var(--gray-700); font-family: var(--mono); font-size: 9.5px; }
.experience { --experience-accent: #d77b84; --experience-rule: #ebc6ca; margin-bottom: 4mm; }
.experience.tone-gray { --experience-accent: #858d94; --experience-rule: #d8d9d7; }
.experience.tone-blue { --experience-accent: #4b9bc2; --experience-rule: #c6dfed; }
.experience.tone-green { --experience-accent: #788c5d; --experience-rule: #d1dfc7; }
.company-bar { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 4mm; min-height: 8.2mm; padding: 1.6mm 3mm; border-left: 4px solid var(--experience-accent); background: var(--red-bar); break-after: avoid; }
.company-bar.brand-blue { background: var(--blue-bar); }
.company-bar.brand-green { background: var(--green-bar); }
.company-bar.brand-gray { background: var(--gray-bar); }
.company-left { display: flex; align-items: center; min-width: 0; flex-wrap: wrap; gap: 1mm 2mm; }
.company-name { color: var(--accent); font-family: var(--serif); font-size: 12.3px; font-weight: 850; }
.company-team { font-weight: 650; }
.company-tags { color: var(--gray-700); font-size: 9.2px; }
.company-right { display: flex; align-items: center; gap: 3mm; }
.company-link { font-size: 8.8px; white-space: nowrap; }
.project { padding: 2.2mm 2mm 0 3.4mm; border-left: 1px solid var(--experience-rule); margin-left: 1.7mm; break-inside: avoid-page; }
.project + .project { margin-top: 2.5mm; padding-top: 2.7mm; border-top: 1px dotted var(--gray-300); }
.project-title { font-family: var(--serif); font-size: 12px; font-weight: 850; color: #1f4d70; }
.project-subtitle { margin-left: 2mm; color: var(--gray-700); font-weight: 650; }
.fact-block { margin-top: 1.1mm; }
.fact-block:first-child { margin-top: 0; }
.fact-content { min-width: 0; }
.fact-lead { margin: 0 0 .4mm; }
.fact-lead .fact-label { color: var(--accent); font-weight: 800; white-space: nowrap; }
.fact-block .fact-list { margin: .4mm 0 0; padding-left: 3.6mm; }
.fact-block .fact-list li { margin: 0 0 .4mm; padding-left: .4mm; }
.fact-list { margin: 0; padding-left: 3.2mm; }
.fact-list li { margin: 0 0 .55mm; padding-left: .5mm; }
.fact-list li::marker { color: var(--gray-500); }
.highlight { color: #101820; font-weight: 850; }
.cards { display: grid; grid-template-columns: 1fr; gap: 2.4mm; }
.card { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 3mm; padding: 2.4mm 3mm; background: rgba(240,238,230,.48); border-left: 3px solid var(--oat); break-inside: avoid; }
.card-title { font-family: var(--serif); color: var(--accent); font-size: 11.5px; font-weight: 800; }
.card-role { margin-left: 1.5mm; color: var(--gray-700); font-weight: 650; }
.card-scope { margin-top: .7mm; color: var(--gray-700); }
.card .fact-list { margin-top: 1mm; }
.compact-grid { display: grid; grid-template-columns: 1fr; gap: 1.2mm; }
.compact-row { display: grid; grid-template-columns: 16mm minmax(0,1fr); gap: 2mm; padding: .8mm 0; break-inside: avoid; }
.compact-label { color: var(--accent); font-weight: 850; white-space: nowrap; }
.compact-values { min-width: 0; color: var(--gray-700); line-height: 1.55; }
.compact-value + .compact-value::before { content: " / "; color: var(--gray-300); }
.skill-list { font-family: var(--mono); font-size: 8.9px; }
.empty { color: var(--gray-500); font-style: italic; }
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: white; }
  body { font-size: 10.4px; }
  #resume { width: 210mm; min-height: 297mm; margin: 0; padding: 12mm 13mm 13mm; box-shadow: none; background: white; }
  #resume.sushen-paged { background: white; }
  #resume.sushen-paged > .sushen-sheet { margin: 0; box-shadow: none; page-break-after: always; }
  #resume.sushen-paged > .sushen-sheet:last-child { page-break-after: auto; }
  a { color: inherit; border-bottom: 0; }
  .company-bar, .education-row, .card, .project, .compact-row, .professional-summary { print-color-adjust: exact; -webkit-print-color-adjust: exact; break-inside: avoid-page; }
  .section-title, .company-bar, .project-title { break-after: avoid-page; }
}
@media (max-width: 760px) {
  #resume { width: 100%; min-height: 0; margin: 0; padding: 20px 16px; }
  .masthead.has-photo { grid-template-columns: 1fr; }
  .company-bar { grid-template-columns: 1fr; }
  .compact-row { grid-template-columns: 1fr; gap: .8mm; }
}
/* ── 模板:classic 经典正式(HR/ATS 友好:黑白灰、无衬线、去装饰) ── */
#resume[data-template="classic"] .section-title { color: #111; font-family: var(--sans); letter-spacing: .12em; font-size: 13.5px; }
#resume[data-template="classic"] .section-title::after { background: linear-gradient(90deg, #9a9a94, rgba(153,153,153,.05)); }
#resume[data-template="classic"] .education-row { border-left: 3px solid #55524c; background: #f7f7f5; }
#resume[data-template="classic"] .education-school { color: #111; font-family: var(--sans); }
#resume[data-template="classic"] .company-bar { background: #f7f7f5; border-left: 4px solid #55524c; }
#resume[data-template="classic"] .company-name { color: #111; font-family: var(--sans); }
#resume[data-template="classic"] .project-title { color: #111; font-family: var(--sans); }
#resume[data-template="classic"] .fact-lead .fact-label { color: #111; }
#resume[data-template="classic"] .card { border-left: 3px solid #c4c1b8; background: #fafaf8; }
#resume[data-template="classic"] .card-title { color: #111; font-family: var(--sans); }
#resume[data-template="classic"] .compact-label { color: #111; }
#resume[data-template="classic"] .professional-summary { border-left: 3px solid #55524c; background: #f7f7f5; }
#resume[data-template="classic"] .masthead-eyebrow { color: #55524c; }
#resume[data-template="classic"] .contact-item { background: #fff; border-color: #d6d3cb; }
#resume[data-template="classic"] .highlight { color: #000; }
/* ── 模板:clean 极简留白(无底色无边框,靠间距与字重分层) ── */
#resume[data-template="clean"] .section-title { color: #111; font-family: var(--sans); letter-spacing: .22em; font-size: 12.5px; }
#resume[data-template="clean"] .section-title::after { background: transparent; }
#resume[data-template="clean"] .education-row { border-left: 0; background: transparent; padding: 1.4mm 0; }
#resume[data-template="clean"] .company-bar { background: transparent; border-left: 0; padding: 1mm 0; min-height: 0; border-bottom: 1px solid #e2e0da; }
#resume[data-template="clean"] .company-name { color: #111; font-family: var(--sans); }
#resume[data-template="clean"] .project { border-left: 0; margin-left: 0; padding-left: 0; }
#resume[data-template="clean"] .project + .project { border-top: 0; margin-top: 3.2mm; padding-top: 0; }
#resume[data-template="clean"] .project-title { color: #111; font-family: var(--sans); }
#resume[data-template="clean"] .fact-lead .fact-label { color: #55524c; font-weight: 700; }
#resume[data-template="clean"] .card { border-left: 0; background: transparent; padding: 1.2mm 0; }
#resume[data-template="clean"] .card-title { color: #111; font-family: var(--sans); }
#resume[data-template="clean"] .professional-summary { border-left: 0; background: transparent; padding: 0 0 1mm; }
#resume[data-template="clean"] .contact-item { background: transparent; border: 0; padding: 0; min-height: 0; }
#resume[data-template="clean"] .masthead { margin-bottom: 6mm; }
#resume[data-template="clean"] .compact-row { padding: 1mm 0; }
#resume[data-template="clean"] .highlight { color: #000; }
`

/** 分页引擎(移植酥神 v6 flow,含事实块悬挂缩进测量;渲染完自动把页数写到 html[data-page-count]) */
const ENGINE_JS = `
(function () {
  "use strict";
  var rawEl = document.getElementById("resume-data");
  if (!rawEl) return;
  var data = null;
  try { data = JSON.parse(rawEl.textContent); } catch (e) { return; }
  var setup = (data && data.page_setup) || {};
  var num = function (v, d) { v = Number(v); return isFinite(v) ? Math.min(60, Math.max(0, v)) : d; };
  var conf = {
    marginTopMm: num(setup.marginTopMm, 12), marginBottomMm: num(setup.marginBottomMm, 13),
    marginLeftMm: num(setup.marginLeftMm, 13), marginRightMm: num(setup.marginRightMm, 13),
    headerText: setup.headerText || "", footerText: setup.footerText || "",
    showPageNumbers: setup.showPageNumbers !== false, smart: setup.smartPacking === true
  };
  var contentFs = Number(setup.contentFontSize);
  var contentLh = Number(setup.contentLineHeight);
  var contentRules = "";
  if (isFinite(contentFs) && contentFs > 0) contentRules += "--content-fs:" + contentFs + "px;";
  if (isFinite(contentLh) && contentLh > 0) contentRules += "--content-lh:" + contentLh + ";";
  if (contentRules) {
    var st = document.createElement("style");
    st.textContent = "#resume {" + contentRules + "}";
    document.head.appendChild(st);
  }
  var fc = document.querySelectorAll("#resume .fact-lead .fact-label");
  for (var i = 0; i < fc.length; i++) {
    var lbl = fc[i];
    var ce = lbl.closest ? lbl.closest(".fact-content") : null;
    if (!ce || ce.dataset.hung) continue;
    ce.dataset.hung = "1";
    var w = lbl.getBoundingClientRect().width || 0;
    if (w < 1) continue;
    var hg = w + 2;
    ce.style.paddingLeft = hg + "px";
    ce.style.textIndent = "-" + hg + "px";
  }
  var host = document.getElementById("resume");
  if (!host || !host.firstElementChild) return;
  var leafUnits = [];
  function flattenNode(node) {
    if (!node) return;
    var cls = " " + (node.className || "") + " ";
    if (node.children && node.children.length && /(^|\\s)(section|cards|compact-grid)(\\s|$)/.test(cls)) {
      Array.prototype.slice.call(node.children).forEach(function (child) { flattenNode(child); });
      return;
    }
    leafUnits.push(node);
  }
  Array.prototype.slice.call(host.children).forEach(flattenNode);
  if (!leafUnits.length) return;
  function mm(v) { return Number(v || 0) + "mm"; }
  function buildSheet() {
    var sheet = document.createElement("main");
    sheet.className = "sushen-sheet";
    sheet.style.setProperty("--sheet-pt", mm(conf.marginTopMm));
    sheet.style.setProperty("--sheet-pr", mm(conf.marginRightMm));
    sheet.style.setProperty("--sheet-pb", mm(conf.marginBottomMm));
    sheet.style.setProperty("--sheet-pl", mm(conf.marginLeftMm));
    var frame = document.createElement("div"); frame.className = "sushen-frame";
    var head = document.createElement("header"); head.className = "sushen-head";
    if (conf.headerText) head.textContent = conf.headerText;
    var content = document.createElement("div"); content.className = "sushen-content";
    var foot = document.createElement("footer"); foot.className = "sushen-foot";
    var ft = document.createElement("span"); ft.className = "sushen-foot-text";
    if (conf.footerText) ft.textContent = conf.footerText;
    var pg = document.createElement("span"); pg.className = "sushen-pager";
    foot.append(ft, pg);
    frame.append(head, content, foot);
    sheet.append(frame);
    return { sheet: sheet, content: content, pg: pg };
  }
  host.classList.add("sushen-paged");
  host.removeAttribute("style");
  var page = buildSheet();
  host.append(page.sheet);
  function newPage() { page = buildSheet(); host.append(page.sheet); }
  function leafFits(leaf) {
    var contentRect = page.content.getBoundingClientRect();
    var rect = leaf.getBoundingClientRect();
    return rect.bottom - contentRect.top <= contentRect.height + 4;
  }
  var pendingTitle = null;
  leafUnits.forEach(function (leaf) {
    var cls = " " + (leaf.className || "") + " ";
    if (/(^|\\s)section-title(\\s|$)/.test(cls)) {
      page.content.append(leaf);
      if (!leafFits(leaf)) {
        page.content.removeChild(leaf);
        newPage();
        page.content.append(leaf);
      }
      pendingTitle = leaf;
      return;
    }
    page.content.append(leaf);
    if (leafFits(leaf)) { pendingTitle = null; return; }
    page.content.removeChild(leaf);
    if (conf.smart && !page.content.classList.contains("sushen-compact")) {
      page.content.classList.add("sushen-compact");
      page.content.append(leaf);
      if (leafFits(leaf)) { pendingTitle = null; return; }
      page.content.removeChild(leaf);
    }
    var titleMoved = null;
    var last = page.content.lastElementChild;
    if (pendingTitle && last === pendingTitle) {
      page.content.removeChild(pendingTitle);
      titleMoved = pendingTitle;
    }
    newPage();
    if (titleMoved) page.content.append(titleMoved);
    page.content.append(leaf);
    if (!leafFits(leaf)) {
      page.content.removeChild(leaf);
      page.content.append(leaf);
      page.sheet.classList.add("sushen-overflow");
    }
    pendingTitle = null;
  });
  Array.prototype.slice.call(host.children).forEach(function (child) {
    var cls = child.className || "";
    if (cls.indexOf("sushen-sheet") === -1) child.remove();
  });
  var sheets = Array.prototype.slice.call(host.querySelectorAll(":scope > .sushen-sheet"));
  var total = sheets.length;
  sheets.forEach(function (sh, idx) {
    var pager = sh.querySelector(".sushen-pager");
    if (pager && conf.showPageNumbers) pager.textContent = "第 " + (idx + 1) + " 页 · 共 " + total + " 页";
    var foot = sh.querySelector(".sushen-foot");
    var ftEl = sh.querySelector(".sushen-foot-text");
    if (foot && !conf.showPageNumbers && !(ftEl && ftEl.textContent)) foot.style.display = "none";
  });
  document.documentElement.dataset.pageCount = String(total);
})();
`

export interface RenderOptions {
  /** 注入分页引擎(预览与导出 HTML 都要;传 false 得到单页裸版) */
  paged?: boolean
}

/** 生成自包含 A4 简历 HTML */
export function buildResumeHtml(doc: ResumeDoc, opts: RenderOptions = {}): string {
  const paged = opts.paged !== false
  const name = clean(doc.profile.name) || "简历"
  const headline = clean(doc.profile.headline)
  const title = headline ? `${name}｜${headline}` : name
  const accent = ACCENT_VARS[doc.page_setup.accent] || ACCENT_VARS.ink
  // script 原文元素不做 HTML 解码:只把 < 转成 \u003c,既保 JSON 可解析又防 </script> 逃逸
  const setupJson = JSON.stringify({ page_setup: doc.page_setup }).replace(/</g, "\\u003c")
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(title)}</title>`,
    `<style>${TEMPLATE_CSS}\n#resume[data-accent]{${accent}}</style>`,
    "</head>",
    "<body>",
    `<main id="resume" class="page" data-accent="${esc(doc.page_setup.accent || "ink")}" data-template="${esc(doc.page_setup.template || "asu")}">`,
    renderBody(doc),
    "</main>",
    paged ? `<script id="resume-data" type="application/json">${setupJson}</script>` : "",
    paged ? `<script>${ENGINE_JS}</script>` : "",
    "</body>",
    "</html>",
  ].filter(Boolean).join("\n")
}
