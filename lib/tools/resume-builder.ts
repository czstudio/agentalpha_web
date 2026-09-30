/**
 * 简历生成器引擎(纯前端,深模块)。
 * 接口只有五个函数:emptyResume / parseResumeText / scoreBullets / buildLatex / buildWordHtml。
 * 实现里藏:启发式分段解析、LaTeX 转义与排版、Word 兼容 HTML 生成、逐条经历打分(复用 bullet-grader)。
 * 红线:不编造任何内容,改写骨架〔〕留空由用户填真实值;文本全程不出浏览器。
 */
import { gradeBullet } from "@/lib/tools/bullet-grader"

export interface ResumeEntry {
  org: string
  role: string
  time: string
  bullets: string[]
}

export interface ResumeData {
  name: string
  contact: string
  summary: string
  education: ResumeEntry[]
  experience: ResumeEntry[]
  projects: ResumeEntry[]
  skills: string[]
  extras: ResumeEntry[]
}

export interface ParseResult {
  data: ResumeData
  /** 未能归类的行:解析是启发式的,这些行交给用户自行安排 */
  loose: string[]
}

export interface BulletScore {
  text: string
  score: number
  worst: string
  rewrite: string
}

export function emptyResume(): ResumeData {
  return {
    name: "",
    contact: "",
    summary: "",
    education: [],
    experience: [],
    projects: [],
    skills: [],
    extras: [],
  }
}

const SECTION_RULES: Array<{ re: RegExp; key: "education" | "experience" | "projects" | "skills" | "extras" }> = [
  { re: /^(教育背景|教育经历|教育)\s*[:：]?$/, key: "education" },
  { re: /^(工作经历|实习经历|实习与工作|职业经历|工作与实习|经历)\s*[:：]?$/, key: "experience" },
  { re: /^(项目经历|项目经验|项目)\s*[:：]?$/, key: "projects" },
  { re: /^(专业技能|技能特长|技能清单|技能|技术栈)\s*[:：]?$/, key: "skills" },
  { re: /^(获奖经历|荣誉奖项|获奖|荣誉|证书|校园经历|社区与开源|开源贡献|自我评价|其他)\s*[:：]?$/, key: "extras" },
]

const TIME_RE = /((?:19|20)\d{2}\s*[年.\-/][^|]*?(?:至今|现在|(?:19|20)\d{2}\s*年?|(?:19|20)\d{2}))/
const BULLET_RE = /^\s*(?:[•·●▪]\s*|[-–—]\s+|\d+[.、)]\s+)/
const PHONE_RE = /1[3-9]\d{9}/
const CONTACT_RE = /(@|github\.com|gitee\.com|\.com|linkedin|像符)/i

type SectionKey = "education" | "experience" | "projects" | "skills" | "extras"

function isSectionHeader(line: string): SectionKey | null {
  for (const rule of SECTION_RULES) {
    if (rule.re.test(line)) return rule.key
  }
  return null
}

function splitEntry(line: string): ResumeEntry {
  const time = (line.match(TIME_RE) || [""])[0].trim()
  let rest = line.replace(TIME_RE, " ")
  const parts = rest.split(/[|｜]/).map((s) => s.trim()).filter(Boolean)
  return {
    org: parts[0] || "",
    role: parts[1] || "",
    time,
    bullets: [],
  }
}

/** 把任意粘贴文本(旧简历或一段话)启发式解析成结构化简历 */
export function parseResumeText(raw: string): ParseResult {
  const data = emptyResume()
  const loose: string[] = []
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  let section: "education" | "experience" | "projects" | "skills" | "extras" | null = null
  let nameTaken = false

  for (const line of lines) {
    const sec = isSectionHeader(line)
    if (sec) {
      section = sec
      continue
    }

    // 联系方式行:手机号 / 邮箱 / 主页链接
    if (PHONE_RE.test(line) || (line.includes("@") && !section) || /github\.com|gitee\.com|linkedin/i.test(line)) {
      data.contact = data.contact ? `${data.contact} · ${line}` : line
      continue
    }

    if (!section) {
      // 前置区:第一行短且无数字当姓名,其后合并成一句话简介
      if (!nameTaken && line.length <= 12 && !/\d/.test(line)) {
        data.name = line
        nameTaken = true
        continue
      }
      data.summary = data.summary ? `${data.summary}${line}` : line
      continue
    }

    if (section === "skills") {
      const cleaned = line.replace(/^[技能特长：:]+\s*/, "")
      for (const piece of cleaned.split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean)) {
        data.skills.push(piece)
      }
      continue
    }

    const entries =
      section === "education" ? data.education : section === "experience" ? data.experience : section === "projects" ? data.projects : data.extras

    if (BULLET_RE.test(line)) {
      const text = line.replace(BULLET_RE, "")
      if (entries.length) entries[entries.length - 1].bullets.push(text)
      else loose.push(line)
      continue
    }

    // 条目头:带时间段或分隔符;否则视作上一条目的补充
    if (TIME_RE.test(line) || line.includes("|") || line.includes("｜")) {
      entries.push(splitEntry(line))
      continue
    }
    if (entries.length) {
      entries[entries.length - 1].bullets.push(line)
    } else {
      loose.push(line)
    }
  }

  return { data, loose }
}

/** 逐条经历打分:复用 Bullet 打分器引擎,给出最需要改的一条建议 */
export function scoreBullets(data: ResumeData): BulletScore[] {
  const out: BulletScore[] = []
  for (const group of [data.experience, data.projects]) {
    for (const entry of group) {
      for (const b of entry.bullets) {
        const v = gradeBullet(b)
        const worst = v.problems[0] || ""
        out.push({ text: b, score: v.score, worst, rewrite: v.rewrite })
      }
    }
  }
  return out.sort((a, b) => a.score - b.score)
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
}

function entryLinesLatex(entries: ResumeEntry[]): string {
  return entries
    .map((e) => {
      const head = [e.org, e.role].filter(Boolean).map(esc).join(" · ")
      const time = e.time ? `\\hfill ${esc(e.time)}` : ""
      const bullets = e.bullets.length
        ? `\n\\begin{itemize}\n${e.bullets.map((b) => `  \\item ${esc(b)}`).join("\n")}\n\\end{itemize}`
        : ""
      return `\\noindent\\textbf{${head}}${time}\n${bullets}\n\\vspace{2pt}`
    })
    .join("\n")
}

/** 生成可编译的 LaTeX 源码(中文用 ctexart,Overleaf 选 XeLaTeX 编译器) */
export function buildLatex(d: ResumeData): string {
  const skillsLine = d.skills.map(esc).join(" · ")
  const sec = (title: string, body: string) => (body.trim() ? `\r\n\\vspace{4pt}\r\n{\\large\\bfseries ${title}}\\par\\vspace{2pt}\\hrule\\vspace{8pt}\r\n${body}\r\n` : "")
  const parts: string[] = []
  parts.push("% !TeX program = xelatex")
  parts.push("\\documentclass[11pt]{ctexart}")
  parts.push("\\usepackage[a4paper,margin=1.7cm]{geometry}")
  parts.push("\\usepackage{enumitem}")
  parts.push("\\usepackage[hidelinks]{hyperref}")
  parts.push("\\pagestyle{empty}")
  parts.push("\\setlist[itemize]{leftmargin=1.2em,itemsep=2pt,topsep=2pt,parsep=0pt}")
  parts.push("\\begin{document}")
  parts.push("")
  const contact = d.contact ? `\\\\\\vspace{2pt}\\small ${esc(d.contact)}` : ""
  parts.push(`\\begin{center}{\\LARGE\\bfseries ${esc(d.name)}}${contact}\\end{center}`)
  if (d.summary.trim()) parts.push(`\\vspace{4pt}\\noindent ${esc(d.summary)}`)
  parts.push(sec("教育背景", entryLinesLatex(d.education)))
  parts.push(sec("实习与工作", entryLinesLatex(d.experience)))
  parts.push(sec("项目经历", entryLinesLatex(d.projects)))
  if (d.skills.length) parts.push(sec("专业技能", skillsLine))
  parts.push(sec("其他经历", entryLinesLatex(d.extras)))
  parts.push("\\end{document}")
  return parts.join("\r\n")
}

function entryHtmlWord(entries: ResumeEntry[]): string {
  return entries
    .map((e) => {
      const head = [e.org, e.role].filter(Boolean).join(" · ")
      const time = e.time ? `<span style="float:right;color:#555;">${e.time}</span>` : ""
      const bullets = e.bullets.map((b) => `<li style="margin:2pt 0;">${b}</li>`).join("")
      return `<p style="margin:8pt 0 2pt;"><b>${head}</b>${time}</p>${bullets ? `<ul style="margin:2pt 0 2pt 20pt;padding:0;">${bullets}</ul>` : ""}`
    })
    .join("")
}

/** 生成 Word 可直接打开的 HTML(.doc) */
export function buildWordHtml(d: ResumeData): string {
  const skillsLine = d.skills.join(" · ")
  const sec = (title: string, body: string) =>
    body.trim() ? `<h2 style="font-size:13pt;border-bottom:1px solid #333;padding-bottom:2pt;margin:14pt 0 6pt;">${title}</h2>${body}` : ""
  const contact = d.contact ? `<div style="text-align:center;color:#555;font-size:10pt;margin-top:4pt;">${d.contact}</div>` : ""
  return [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">',
    "<head><meta charset=\"utf-8\"><title>简历</title>",
    "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->",
    "<style>body{font-family:'宋体',SimSun,serif;font-size:11pt;color:#1a1a1a;line-height:1.5;} ul,li{list-style:disc;}</style>",
    "</head><body>",
    `<h1 style="text-align:center;font-size:20pt;margin:0 0 2pt;">${d.name}</h1>`,
    contact,
    d.summary ? `<p style="margin:8pt 0;">${d.summary}</p>` : "",
    sec("教育背景", entryHtmlWord(d.education)),
    sec("实习与工作", entryHtmlWord(d.experience)),
    sec("项目经历", entryHtmlWord(d.projects)),
    d.skills.length ? sec("专业技能", `<p style="margin:4pt 0;">${skillsLine}</p>`) : "",
    sec("其他经历", entryHtmlWord(d.extras)),
    "</body></html>",
  ].join("\r\n")
}
