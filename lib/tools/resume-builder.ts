/**
 * 简历生成器引擎 v2(纯前端,深模块)。数据模型与编辑器交互吸收自酥神 ASU 简历编辑器
 * (naomi78543/sushen-resume-maker 的 resume_template.html 与 normalizeData,渲染器在 resume-render.ts)。
 * 对外接口:emptyDoc / normalizeDoc / parseResumeText / docToMarkdown / docToLatex / docToWordHtml /
 * auditResume / matchJd / flattenBullets / applyRewrite / isEmptyDoc / migrateV1 / looksLikeResumeJson。
 * 红线:不编造任何内容,改写骨架〔〕留空由用户填真实值;解析与排版全程不出浏览器。
 */

/* ── 类型(采用酥神 ASU 数据模型,保证其导出的 JSON 可直接导入) ── */

export interface BulletObj {
  text: string
  /** 手动指定的重点词(自动检测的数字/指标在渲染时叠加,不存进数据) */
  highlights?: string[]
}

export interface EducationItem {
  institution: string
  program: string
  degree: string
  dates: string
  bullets: BulletObj[]
}

export interface ExpProject {
  name: string
  subtitle: string
  background: BulletObj[]
  impact: BulletObj[]
  responsibilities: BulletObj[]
}

export interface ExperienceLink {
  label: string
  url: string
}

export interface ExperienceItem {
  company: string
  team: string
  dates: string
  tags: string[]
  links: ExperienceLink[]
  /** 色条:留空按红/灰/蓝自动轮换;手动指定 red/blue/green/gray */
  tone: "" | "red" | "blue" | "green" | "gray"
  projects: ExpProject[]
}

export interface StandaloneProject {
  name: string
  role: string
  dates: string
  scope: string
  bullets: BulletObj[]
  url?: string
}

export interface CustomItem {
  title: string
  dates: string
  bullets: BulletObj[]
}

export interface CustomSection {
  title: string
  items: CustomItem[]
}

export interface ContactItem {
  label: string
  value: string
  url?: string
}

export interface ProfilePhoto {
  /** data:image/png|jpeg|webp;base64 格式,只存本机 */
  src: string
  crop: { x: number; y: number; zoom: number }
  confirmed: boolean
}

export interface PageSetup {
  marginTopMm: number
  marginBottomMm: number
  marginLeftMm: number
  marginRightMm: number
  headerText: string
  footerText: string
  showPageNumbers: boolean
  contentFontSize: string
  contentLineHeight: string
  /** 简历主色:ink 经典蓝墨(默认)/ clay 陶土暖 / olive 橄榄 / slate 石墨 */
  accent: "ink" | "clay" | "olive" | "slate"
  /** 排版模板:asu 高密度(默认)/ classic 经典正式(HR/ATS 友好)/ clean 极简留白 */
  template: "asu" | "classic" | "clean"
}

export interface SectionTitles {
  education?: string
  experience?: string
  open_source?: string
  projects?: string
  awards_skills?: string
}

export interface SectionLabels {
  background?: string
  impact?: string
  responsibilities?: string
}

export interface ResumeDoc {
  profile: {
    name: string
    headline: string
    location: string
    eyebrow: string
    summary: string
    contacts: ContactItem[]
    photo?: ProfilePhoto
  }
  education: EducationItem[]
  experience: ExperienceItem[]
  open_source: StandaloneProject[]
  projects: StandaloneProject[]
  awards: Array<{ name: string; date: string }>
  skills: string[]
  customs: CustomSection[]
  section_titles: SectionTitles
  labels: SectionLabels
  page_setup: PageSetup
}

/* ── 默认值与归一化 ── */

export const PAGE_SETUP_DEFAULTS: PageSetup = {
  marginTopMm: 12,
  marginBottomMm: 13,
  marginLeftMm: 13,
  marginRightMm: 13,
  headerText: "",
  footerText: "",
  showPageNumbers: true,
  contentFontSize: "",
  contentLineHeight: "",
  accent: "ink",
  template: "asu",
}

export const SECTION_TITLES_DEFAULTS: Required<SectionTitles> = {
  education: "教育经历",
  experience: "实习 / 工作经历",
  open_source: "开源贡献",
  projects: "技术项目与沉淀",
  awards_skills: "奖项与技能",
}

export const LABELS_DEFAULTS: Required<SectionLabels> = {
  background: "背景",
  impact: "指标与效果",
  responsibilities: "我的职责",
}

export function emptyDoc(): ResumeDoc {
  return {
    profile: { name: "", headline: "", location: "", eyebrow: "", summary: "", contacts: [] },
    education: [],
    experience: [],
    open_source: [],
    projects: [],
    awards: [],
    skills: [],
    customs: [],
    section_titles: { ...SECTION_TITLES_DEFAULTS },
    labels: { ...LABELS_DEFAULTS },
    page_setup: { ...PAGE_SETUP_DEFAULTS },
  }
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback)

function normBullet(v: unknown): BulletObj {
  if (typeof v === "string") return { text: v }
  if (v && typeof v === "object") {
    const obj = v as { text?: unknown; highlights?: unknown }
    const highlights = Array.isArray(obj.highlights)
      ? obj.highlights.filter((h): h is string => typeof h === "string" && h.trim().length > 0).map((h) => h.trim()).slice(0, 8)
      : undefined
    return { text: str(obj.text), ...(highlights && highlights.length ? { highlights } : {}) }
  }
  return { text: "" }
}

const normBullets = (v: unknown): BulletObj[] => (Array.isArray(v) ? v.map(normBullet).filter((b) => b.text.trim()) : [])
const normStrList = (v: unknown, max = 40): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()).slice(0, max) : []

/**
 * 归一化任意来源的简历 JSON(本工具导出的 / 酥神编辑器导出的):缺省补默认,类型修对,
 * 多余字段(如照片)丢弃。解析失败抛错,由调用方提示。
 */
export function normalizeDoc(value: unknown): ResumeDoc {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON 顶层必须是对象")
  const src = value as Record<string, unknown>
  const doc = emptyDoc()

  const profile = (src.profile && typeof src.profile === "object" ? src.profile : {}) as Record<string, unknown>
  doc.profile.name = str(profile.name)
  doc.profile.headline = str(profile.headline ?? profile.tagline)
  doc.profile.location = str(profile.location)
  doc.profile.eyebrow = str(profile.eyebrow)
  const summary = profile.summary
  doc.profile.summary = typeof summary === "object" && summary ? str((summary as Record<string, unknown>).text) : str(summary)
  if (Array.isArray(profile.contacts)) {
    doc.profile.contacts = (profile.contacts as unknown[])
      .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
      .map((c) => ({
        label: str(c.label),
        value: str(c.value),
        ...(str(c.url) ? { url: str(c.url) } : {}),
      }))
      .filter((c) => c.label || c.value)
      .slice(0, 8)
  }
  // 照片:只收本机 data URL(与酥神同字段结构)
  const photo = profile.photo && typeof profile.photo === "object" ? (profile.photo as Record<string, unknown>) : null
  if (photo && /^data:image\/(?:png|jpeg|webp);base64,/i.test(str(photo.src))) {
    const crop = (photo.crop && typeof photo.crop === "object" ? photo.crop : {}) as Record<string, unknown>
    const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)
    doc.profile.photo = {
      src: str(photo.src),
      crop: { x: Math.min(100, Math.max(0, num(crop.x, 50))), y: Math.min(100, Math.max(0, num(crop.y, 50))), zoom: Math.min(2, Math.max(1, num(crop.zoom, 1))) },
      confirmed: photo.confirmed === true,
    }
  }

  doc.education = (Array.isArray(src.education) ? src.education : []).filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object").map((e) => ({
    institution: str(e.institution ?? (e as { org?: unknown }).org),
    program: str(e.program),
    degree: str(e.degree),
    dates: str(e.dates),
    bullets: normBullets(e.bullets),
  }))

  doc.experience = (Array.isArray(src.experience) ? src.experience : []).filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object").map((e) => {
    const tone = str(e.tone ?? (e as { brand?: unknown }).brand)
    return {
      company: str(e.company ?? (e as { org?: unknown }).org),
      team: str(e.team ?? (e as { role?: unknown }).role),
      dates: str(e.dates),
      tags: normStrList(e.tags, 6),
      links: (() => {
        // 酥神旧格式:单数 link 对象,归一成 links 数组
        const raw = Array.isArray(e.links) && e.links.length ? e.links : Array.isArray(e.links) ? e.links : e.link && typeof e.link === "object" ? [e.link] : []
        return (raw as unknown[])
          .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null && str((l as Record<string, unknown>).url).length > 0)
          .map((l) => ({ label: str(l.label) || "链接", url: str(l.url) }))
          .slice(0, 3)
      })(),
      tone: (["red", "blue", "green", "gray"].includes(tone) ? tone : "") as ExperienceItem["tone"],
      projects: (Array.isArray(e.projects) ? e.projects : []).filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object").map((p) => ({
        name: str(p.name),
        subtitle: str(p.subtitle),
        background: normBullets(p.background),
        impact: normBullets(p.impact),
        responsibilities: normBullets([...(Array.isArray(p.responsibilities) ? p.responsibilities : []), ...(Array.isArray(p.actions) ? p.actions : [])]),
      })),
    }
  })

  const normCard = (c: Record<string, unknown>): StandaloneProject => ({
    name: str(c.name ?? c.project),
    role: str(c.role),
    dates: str(c.dates),
    scope: str(c.scope),
    bullets: normBullets(c.bullets),
    ...(str(c.url) ? { url: str(c.url) } : {}),
  })
  doc.open_source = (Array.isArray(src.open_source) ? src.open_source : []).filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object").map(normCard)
  doc.projects = (Array.isArray(src.projects) ? src.projects : []).filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object").map(normCard)

  doc.awards = (Array.isArray(src.awards) ? src.awards : [])
    .map((a) => {
      if (typeof a === "string") return { name: a, date: "" }
      if (a && typeof a === "object") return { name: str((a as Record<string, unknown>).name), date: str((a as Record<string, unknown>).date) }
      return { name: "", date: "" }
    })
    .filter((a) => a.name)
    .slice(0, 12)

  doc.skills = normStrList(src.skills, 30)

  // 自定义栏目:支持本工具 customs 与酥神 sections({title, items:[{title,dates,bullets}]})
  const rawSections = Array.isArray(src.customs) ? src.customs : Array.isArray(src.sections) ? src.sections : []
  doc.customs = rawSections
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
    .map((s) => ({
      title: str(s.title),
      items: (Array.isArray(s.items) ? s.items : []).filter((it): it is Record<string, unknown> => Boolean(it) && typeof it === "object").map((it) => ({
        title: str(it.title),
        dates: str(it.dates),
        bullets: normBullets(it.bullets),
      })),
    }))

  const titles = (src.section_titles && typeof src.section_titles === "object" ? src.section_titles : {}) as Record<string, unknown>
  for (const key of Object.keys(SECTION_TITLES_DEFAULTS)) {
    const v = str(titles[key])
    if (v) (doc.section_titles as Record<string, string>)[key] = v
  }
  const labels = (src.labels && typeof src.labels === "object" ? src.labels : {}) as Record<string, unknown>
  for (const key of Object.keys(LABELS_DEFAULTS)) {
    const v = str(labels[key])
    if (v) (doc.labels as Record<string, string>)[key] = v
  }

  const setup = (src.page_setup && typeof src.page_setup === "object" ? src.page_setup : {}) as Record<string, unknown>
  const clampMm = (v: unknown, d: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(60, Math.max(0, n)) : d
  }
  doc.page_setup = {
    marginTopMm: clampMm(setup.marginTopMm, PAGE_SETUP_DEFAULTS.marginTopMm),
    marginBottomMm: clampMm(setup.marginBottomMm, PAGE_SETUP_DEFAULTS.marginBottomMm),
    marginLeftMm: clampMm(setup.marginLeftMm, PAGE_SETUP_DEFAULTS.marginLeftMm),
    marginRightMm: clampMm(setup.marginRightMm, PAGE_SETUP_DEFAULTS.marginRightMm),
    headerText: str(setup.headerText),
    footerText: str(setup.footerText),
    showPageNumbers: setup.showPageNumbers !== false,
    contentFontSize: Number(setup.contentFontSize) > 0 ? String(Number(setup.contentFontSize)) : "",
    contentLineHeight: Number(setup.contentLineHeight) > 0 ? String(Number(setup.contentLineHeight)) : "",
    accent: (["ink", "clay", "olive", "slate"].includes(str(setup.accent)) ? str(setup.accent) : "ink") as PageSetup["accent"],
    template: (["asu", "classic", "clean"].includes(str(setup.template)) ? str(setup.template) : "asu") as PageSetup["template"],
  }
  return doc
}

/** 简历类 JSON 是否可被本工具读取(profile+experience 结构存在即算) */
export function looksLikeResumeJson(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const src = value as Record<string, unknown>
  return Boolean(src.profile) || Array.isArray(src.experience) || Array.isArray(src.education)
}

export function isEmptyDoc(doc: ResumeDoc): boolean {
  return (
    !doc.profile.name &&
    !doc.profile.headline &&
    !doc.profile.summary &&
    doc.profile.contacts.length === 0 &&
    doc.education.length === 0 &&
    doc.experience.length === 0 &&
    doc.open_source.length === 0 &&
    doc.projects.length === 0 &&
    doc.awards.length === 0 &&
    doc.skills.length === 0 &&
    doc.customs.length === 0
  )
}

/* ── 旧版 v1 数据({data: ResumeData, loose})迁移 ── */

interface V1Entry { org: string; role: string; time: string; bullets: string[] }
interface V1Data {
  name?: string; contact?: string; summary?: string
  education?: V1Entry[]; experience?: V1Entry[]; projects?: V1Entry[]; skills?: string[]; extras?: V1Entry[]
}

function classifyContact(value: string): { label: string; url?: string } {
  if (/@/.test(value)) return { label: "邮箱", url: `mailto:${value}` }
  if (/^1[3-9]\d{9}$/.test(value)) return { label: "电话" }
  if (/github\.com|gitee\.com|linkedin/i.test(value)) return { label: "主页", url: /^https?:\/\//.test(value) ? value : `https://${value}` }
  return { label: "" }
}

/** v1 草稿(v1 JSON 或旧解析结果)转 v2 文档;转换不了返回 null */
export function migrateV1(saved: unknown): ResumeDoc | null {
  if (!saved || typeof saved !== "object") return null
  const src = saved as { data?: V1Data; loose?: unknown }
  const d = src.data
  if (!d || typeof d !== "object") return null
  if (Array.isArray((saved as Record<string, unknown>).experience)) return null // 已是 v2/ASU 结构
  const doc = emptyDoc()
  doc.profile.name = d.name || ""
  // 旧 contact 是一个拼接字符串,拆成联系方式 chip
  const contactParts = (d.contact || "").split(/\s*[|｜·;；]\s*/).filter(Boolean)
  doc.profile.contacts = contactParts.slice(0, 6).map((value) => {
    const c = classifyContact(value)
    return { label: c.label, value, ...(c.url ? { url: c.url } : {}) }
  })
  if (d.summary) doc.profile.headline = d.summary
  doc.education = (d.education || []).map((e) => ({
    institution: e.org, program: e.role, degree: "", dates: e.time,
    bullets: e.bullets.filter(Boolean).map((t) => ({ text: t })),
  }))
  doc.experience = (d.experience || []).map((e) => ({
    company: e.org, team: e.role, dates: e.time, tags: [], links: [], tone: "", projects: [
      { name: e.role || e.org || "工作内容", subtitle: "", background: [], impact: [], responsibilities: e.bullets.filter(Boolean).map((t) => ({ text: t })) },
    ],
  }))
  doc.projects = (d.projects || []).map((e) => ({
    name: e.org, role: e.role, dates: e.time, scope: "", bullets: e.bullets.filter(Boolean).map((t) => ({ text: t })),
  }))
  doc.skills = (d.skills || []).filter(Boolean)
  const extras = (d.extras || []).filter((e) => e.org || e.bullets.length)
  if (extras.length) {
    doc.customs = [{ title: "其他经历", items: extras.map((e) => ({ title: e.org, dates: e.time, bullets: e.bullets.filter(Boolean).map((t) => ({ text: t })) })) }]
  }
  return doc
}

/* ── 粘贴文本 → 结构化文档(启发式解析) ── */

export interface ParseResult {
  data: ResumeDoc
  /** 未能归类的行:解析是启发式的,这些行交给用户自行安排 */
  loose: string[]
}

const SECTION_RULES: Array<{ re: RegExp; key: "education" | "experience" | "projects" | "skills" | "extras" }> = [
  { re: /^(教育背景|教育经历|教育)\s*[:：]?$/, key: "education" },
  { re: /^(工作经历|实习经历|实习与工作|职业经历|工作与实习|经历)\s*[:：]?$/, key: "experience" },
  { re: /^(项目经历|项目经验|开源贡献|项目)\s*[:：]?$/, key: "projects" },
  { re: /^(专业技能|技能特长|技能清单|技能|技术栈)\s*[:：]?$/, key: "skills" },
  { re: /^(获奖经历|荣誉奖项|获奖|荣誉|证书|校园经历|社区与开源|自我评价|其他)\s*[:：]?$/, key: "extras" },
]

const TIME_RE = /(?:19|20)\d{2}(?:\s*[年.\-/]\s*\d{1,2})?(?:\s*(?:-|–|—|至|~)\s*(?:(?:19|20)\d{2}(?:\s*[年.\-/]\s*\d{1,2})?|至今|现在|present))?/i
const BULLET_RE = /^\s*(?:[•·●▪]\s*|[-–—]\s+|\d+[.、)]\s+)/
const PHONE_RE = /1[3-9]\d{9}/

/** 条目头判定:必须有真两位年份时间段或分隔符;「预计明年」这类相对时间不算 */
function looksLikeEntryHead(line: string): boolean {
  if (line.includes("|") || line.includes("｜")) return true
  return /(?:19|20)\d{2}(?:[.\-/]\d{1,2})?\s*(?:(?:-|–|—|至|~)\s*(?:(?:19|20)\d{2}(?:[.\-/]\d{1,2})?|至今|现在))?\s*。?\s*$/.test(line)
}

function isSectionHeader(line: string): SectionKey | null {
  for (const rule of SECTION_RULES) {
    if (rule.re.test(line)) return rule.key
  }
  return null
}

type SectionKey = "education" | "experience" | "projects" | "skills" | "extras"

interface FlatEntry { org: string; role: string; time: string; bullets: string[] }

function splitEntry(line: string): FlatEntry {
  const time = (line.match(TIME_RE) || [""])[0].trim()
  const rest = line.replace(TIME_RE, " ")
  const parts = rest.split(/[|｜]/).map((s) => s.trim()).filter(Boolean)
  return { org: parts[0] || "", role: parts[1] || "", time, bullets: [] }
}

const toBullets = (arr: string[]): BulletObj[] => arr.filter(Boolean).map((t) => ({ text: t }))

/** 把任意粘贴文本(旧简历或一段话)启发式解析成结构化简历文档 */
export function parseResumeText(raw: string): ParseResult {
  const doc = emptyDoc()
  const loose: string[] = []
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const buckets: Record<"education" | "experience" | "projects" | "extras", FlatEntry[]> = {
    education: [], experience: [], projects: [], extras: [],
  }
  const skills: string[] = []

  let section: SectionKey | null = null
  let nameTaken = false
  const contactLines: string[] = []
  const summaryLines: string[] = []

  for (const line of lines) {
    const sec = isSectionHeader(line)
    if (sec) {
      section = sec
      continue
    }

    if (PHONE_RE.test(line) || (line.includes("@") && !section) || /github\.com|gitee\.com|linkedin/i.test(line)) {
      contactLines.push(line)
      continue
    }

    if (!section) {
      const looksLikeName =
        !nameTaken &&
        line.length <= 12 &&
        !/\d/.test(line) &&
        /^[\u4e00-\u9fff·\s]{2,12}$/.test(line) &&
        !/(熟悉|掌握|了解|精通|负责|参与|使用|做过)/.test(line)
      if (looksLikeName) {
        doc.profile.name = line
        nameTaken = true
        continue
      }
      summaryLines.push(line)
      continue
    }

    if (section === "skills") {
      const cleaned = line.replace(/^[技能特长：:]+\s*/, "")
      if (cleaned.length > 40 || /[。.!?！?]/.test(cleaned.replace(/\.\d/g, ""))) {
        loose.push(line)
        continue
      }
      for (const piece of cleaned.split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean)) skills.push(piece)
      continue
    }

    const entries = buckets[section]
    if (BULLET_RE.test(line)) {
      const text = line.replace(BULLET_RE, "")
      if (entries.length) entries[entries.length - 1].bullets.push(text)
      else loose.push(line)
      continue
    }
    if (looksLikeEntryHead(line)) {
      entries.push(splitEntry(line))
      continue
    }
    if (entries.length) entries[entries.length - 1].bullets.push(line)
    else loose.push(line)
  }

  // 映射到 v2 文档(经历 bullets 自动分三层:背景/指标与效果/我的职责)
  doc.education = buckets.education.map((e) => ({ institution: e.org, program: e.role, degree: "", dates: e.time, bullets: toBullets(e.bullets) }))
  doc.experience = buckets.experience.map((e) => {
    const c = classifyBullets(toBullets(e.bullets))
    return {
      company: e.org,
      team: e.role,
      dates: e.time,
      tags: [],
      links: [],
      tone: "",
      projects: [{ name: e.role || e.org || "工作内容", subtitle: "", background: c.background, impact: c.impact, responsibilities: c.responsibilities }],
    }
  })
  doc.projects = buckets.projects.map((e) => ({ name: e.org, role: e.role, dates: e.time, scope: "", bullets: toBullets(e.bullets) }))
  doc.skills = skills
  if (buckets.extras.length) {
    doc.customs = [{ title: "其他经历", items: buckets.extras.map((e) => ({ title: e.org, dates: e.time, bullets: toBullets(e.bullets) })) }]
  }
  if (summaryLines.length) doc.profile.headline = summaryLines.join("；")
  for (const line of contactLines) {
    for (const part of line.split(/\s*[|｜·;；]\s*/).filter(Boolean)) {
      const c = classifyContact(part)
      doc.profile.contacts.push({ label: c.label, value: part, ...(c.url ? { url: c.url } : {}) })
    }
  }
  doc.profile.contacts = doc.profile.contacts.slice(0, 8)
  return { data: doc, loose }
}

/* ── 富文本:自动重点词(数字/指标/技术域),日期不算 ── */

const AUTO_TERM_RE = /\d+(?:\.\d+)?(?:%|\+|万\+?|亿|次|万次|家|人|个|天|月|小时|分钟|项|条|份|元|万元|倍|QPS|qps|ms|GB|TB|token|路|场)?|GMV|CTR|CVR|SQL|AI Agent|Agent|MCP|RAG|SFT|LoRA|RLHF|vLLM|LangChain|FAISS|Docker|Kubernetes|PyTorch|A\/B(?: Test(?:ing)?|测试)?|Prompt(?: Engineering)?|SOP/gi

/** 把日期段先掩掉再扫重点词,避免把 2022.09-2026.06 这类时间加粗 */
const DATE_MASK_RE = /(?:19|20)\d{2}(?:\s*[年.\-/]\s*\d{1,2})?(?:\s*(?:-|–|—|至|~)\s*(?:(?:19|20)\d{2}(?:\s*[年.\-/]\s*\d{1,2})?|至今|现在))?/g

export function autoHighlightTerms(text: string): string[] {
  const masked = text.replace(DATE_MASK_RE, (m) => "\u0001".repeat(m.length))
  const values = masked.match(AUTO_TERM_RE) || []
  const out: string[] = []
  for (const v of values) {
    const term = v.trim()
    if (term && !out.some((t) => t.toLowerCase() === term.toLowerCase())) out.push(term)
  }
  return out
}

export interface RichRange { start: number; end: number }

/** 合并手动重点词与自动重点词,返回不重叠的加粗区间(按出现序) */
export function highlightRanges(text: string, manual: string[] = []): RichRange[] {
  const terms = [...manual.map((t) => t.trim()).filter(Boolean), ...autoHighlightTerms(text)]
  const lowerText = text.toLowerCase()
  const ranges: RichRange[] = []
  for (const term of terms) {
    const lowerTerm = term.toLowerCase()
    if (!lowerTerm) continue
    let offset = 0
    while (offset < text.length) {
      const idx = lowerText.indexOf(lowerTerm, offset)
      if (idx < 0) break
      ranges.push({ start: idx, end: idx + term.length })
      offset = idx + term.length
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const accepted: RichRange[] = []
  for (const r of ranges) {
    if (!accepted.some((x) => r.start < x.end && r.end > x.start)) accepted.push(r)
  }
  return accepted.sort((a, b) => a.start - b.start)
}

/* ── 遍历与改写写回 ── */

export type BulletPath =
  | { kind: "education"; ei: number; bi: number }
  | { kind: "exp"; ei: number; pi: number; field: "background" | "impact" | "responsibilities"; bi: number }
  | { kind: "projects" | "open_source"; si: number; bi: number }
  | { kind: "custom"; si: number; ii: number; bi: number }

export function flattenBullets(doc: ResumeDoc): Array<{ path: BulletPath; text: string }> {
  const out: Array<{ path: BulletPath; text: string }> = []
  doc.education.forEach((e, ei) => e.bullets.forEach((b, bi) => out.push({ path: { kind: "education", ei, bi }, text: b.text })))
  doc.experience.forEach((exp, ei) =>
    exp.projects.forEach((p, pi) =>
      (["background", "impact", "responsibilities"] as const).forEach((field) =>
        p[field].forEach((b, bi) => out.push({ path: { kind: "exp", ei, pi, field, bi }, text: b.text })),
      ),
    ),
  )
  doc.projects.forEach((p, si) => p.bullets.forEach((b, bi) => out.push({ path: { kind: "projects", si, bi }, text: b.text })))
  doc.open_source.forEach((p, si) => p.bullets.forEach((b, bi) => out.push({ path: { kind: "open_source", si, bi }, text: b.text })))
  doc.customs.forEach((s, si) =>
    s.items.forEach((it, ii) => it.bullets.forEach((b, bi) => out.push({ path: { kind: "custom", si, ii, bi }, text: b.text }))),
  )
  return out
}

/** AI 改写写回:按原文全等匹配第一条命中,替换文本并清掉手动重点词;返回是否成功 */
export function applyRewrite(doc: ResumeDoc, original: string, rewritten: string): boolean {
  const target = original.trim()
  if (!target) return false
  const tryReplace = (arr: BulletObj[]): boolean => {
    for (const b of arr) {
      if (b.text.trim() === target) {
        b.text = rewritten
        delete b.highlights
        return true
      }
    }
    return false
  }
  for (const e of doc.education) if (tryReplace(e.bullets)) return true
  for (const exp of doc.experience) {
    for (const p of exp.projects) {
      for (const field of ["background", "impact", "responsibilities"] as const) {
        if (tryReplace(p[field])) return true
      }
    }
  }
  for (const p of doc.projects) if (tryReplace(p.bullets)) return true
  for (const p of doc.open_source) if (tryReplace(p.bullets)) return true
  for (const s of doc.customs) for (const it of s.items) if (tryReplace(it.bullets)) return true
  return false
}

/* ── bullets 三层自动分类(规则移植自酥神 transform.js classifyFacts:背景/指标与效果/我的职责) ── */

const OUTCOME_RE = /(?:由|从).{0,18}(?:提升|增长|降低|缩短|下降)(?:至|到)?\s*\d|(?:提升|增长|降低|缩短|下降)(?:至|到|约|为)\s*\d|(?:累计|最高|覆盖|支撑|服务).{0,18}\d|上线|交付|落地|沉淀|产出/i
const CONTEXT_RE = /^(?:项目)?(?:背景|目标|问题|痛点|需求)|^(?:面向|围绕|针对|为了解决)|业务(?:背景|场景)|^为什么/i
const METRIC_LABEL_RE = /^(?:指标(?:体系)?|数据(?:监控|分析)?|结果|效果|成绩)[：:]/
const METRIC_SYSTEM_RE = /指标体系|数据监控|监测口径|数据漏斗|转化漏斗|持续跟踪|追踪.{0,30}(?:率|指标)|QPS|DAU|UV|CTR|CVR|GMV|AUC|延迟/i

/** 文本里的量化数字(排除年份日期) */
export function metricsInText(text: string): string[] {
  const masked = text.replace(DATE_MASK_RE, (m) => "\u0001".repeat(m.length))
  return (masked.match(/\d+(?:\.\d+)?(?:%|\+|万\+?|亿|倍|QPS|qps|ms|GB|TB|token|条|次|万次|人|家|个|场|路|份)?/g) || []).filter(
    (t) => !/^[.:]*\u0001/.test(t) && /\d/.test(t),
  )
}

export interface ClassifiedBullets {
  background: BulletObj[]
  impact: BulletObj[]
  responsibilities: BulletObj[]
}

/** 规则分类:背景 = 讲为什么/痛点且无硬结果;指标与效果 = 有结果数字或已交付;其余 = 职责 */
export function classifyBullets(bullets: BulletObj[]): ClassifiedBullets {
  const result: ClassifiedBullets = { background: [], impact: [], responsibilities: [] }
  const cleaned = bullets.filter((b) => b.text.trim())
  for (const item of cleaned) {
    const text = item.text
    const hasOutcome = OUTCOME_RE.test(text)
    const hasHardOutcome = hasOutcome && (metricsInText(text).length > 0 || /上线|交付|落地|沉淀|产出/i.test(text))
    if (CONTEXT_RE.test(text) && !hasHardOutcome) result.background.push(item)
    else if (hasHardOutcome || (METRIC_LABEL_RE.test(text) && METRIC_SYSTEM_RE.test(text))) result.impact.push(item)
    else result.responsibilities.push(item)
  }
  // 背景空且有多个职责:首条职责提为背景(酥神同款兜底)
  if (!result.background.length && result.responsibilities.length > 1) {
    result.background.push(result.responsibilities.shift() as BulletObj)
  }
  return result
}

/** 就地把一个经历内项目重排成三层(编辑区「一键分层」用) */
export function classifyProjectInPlace(project: ExpProject): void {
  const merged = [...project.background, ...project.impact, ...project.responsibilities]
  if (!merged.length) return
  const c = classifyBullets(merged)
  project.background = c.background
  project.impact = c.impact
  project.responsibilities = c.responsibilities
}

/** 项目级缺指标提示(吸收自酥神 missingMetrics):整块没有任何数字才提示 */
export function projectMetricHints(doc: ResumeDoc): Array<{ where: string; hint: string }> {
  const out: Array<{ where: string; hint: string }> = []
  const hint = "整块没有任何数字:补规模、效率、效果任一真实数据(没做过测量就先去测,别编)"
  for (const exp of doc.experience) {
    for (const p of exp.projects) {
      const texts = [...p.background, ...p.impact, ...p.responsibilities].map((b) => b.text).join(" ")
      if (texts.trim() && metricsInText(texts).length === 0) {
        out.push({ where: `${exp.company || "未命名经历"} · ${p.name || "未命名项目"}`, hint })
      }
    }
  }
  for (const p of [...doc.projects, ...doc.open_source]) {
    const texts = p.bullets.map((b) => b.text).join(" ")
    if (texts.trim() && metricsInText(texts).length === 0) {
      out.push({ where: `${p.name || "未命名项目"}${p.role ? `（${p.role}）` : ""}`, hint })
    }
  }
  return out
}

/* ── 面试承接(方法论吸收自 GodSu-Resume claim-to-knowledge-map:强表达要配面试准备) ── */

const QA_CATEGORY_MAP: Array<{ re: RegExp; cat: string; name: string }> = [
  { re: /rag|检索|embedding|向量|召回|重排|rerank|分块|知识库/i, cat: "rag", name: "RAG 检索增强" },
  { re: /agent|智能体|多步|规划|反思|react|编排/i, cat: "agent", name: "Agent 架构" },
  { re: /工具调用|function\s*call|tool\s*use|mcp/i, cat: "tooluse", name: "工具调用" },
  { re: /多智能体|multi-?agent|swarm|协作agent/i, cat: "multiagent", name: "多智能体" },
  { re: /记忆|memory|长期记忆|压缩上下文/i, cat: "memory", name: "记忆系统" },
  { re: /评测|评估|benchmark|badcase|基线|评测集/i, cat: "eval", name: "评测与可观测" },
  { re: /微调|lora|sft|rlhf|训练|全参/i, cat: "finetune", name: "训练与微调" },
  { re: /推理|部署|vllm|量化|延迟|qps|吞吐|gpu/i, cat: "inference", name: "推理与部署" },
  { re: /多模态|vlm|图像|语音|视频理解/i, cat: "multimodal", name: "多模态" },
  { re: /prompt|提示词|上下文工程|few-?shot/i, cat: "prompt", name: "提示工程" },
  { re: /transformer|token|注意力|采样|moe|温度|top-?p/i, cat: "basics", name: "LLM 基础概念" },
]

/** 按 bullet 文本给出站内真题分类页链接(最多 2 个) */
export function qaLinksFor(text: string): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = []
  for (const m of QA_CATEGORY_MAP) {
    if (m.re.test(text)) {
      out.push({ label: `${m.name}真题`, href: `/interview/category/${m.cat}` })
      if (out.length >= 2) break
    }
  }
  return out
}

/* ── 证据审计(方法论吸收自 ASu-resume-audit-skill:时态边界/最高级比较全集/指标口径/团队指标归因/角色强度) ── */

export type AuditLevel = "risk" | "evidence"

export interface AuditFlag {
  level: AuditLevel
  kind: string
  note: string
}

export interface AuditItem {
  path: BulletPath
  text: string
  flags: AuditFlag[]
}

const AUDIT_RULES: Array<{ kind: string; level: AuditLevel; re: RegExp; note: string; absent?: RegExp }> = [
  {
    kind: "时态边界",
    level: "risk",
    re: /(正在|计划|规划|探索中|预计|将于|未来将|明年|下季度|后续将)/,
    absent: /(已(上线|交付|完成|发布|落地)|上线了|交付了|完成了|落地了|发布了)/,
    note: "规划中的方向不能写成已交付的收益:要么改成「规划中/在推进」,要么等真的落地再写结果",
  },
  {
    kind: "最高级比较全集",
    level: "risk",
    re: /(首个|第一次|第一人|最年轻|最大|最早|顶尖|行业第一)/,
    note: "「首个/第一/最」类表述要能报出比较全集(和谁比、范围多大),面试官一定会问",
  },
  {
    kind: "指标缺口径",
    level: "evidence",
    re: /(%|AUC|准确率|召回|延迟|QPS|转化率|命中率)/,
    absent: /(评测集|分母|时间窗|口径|badcase|基线|对比|样本)/,
    note: "百分比/延迟类指标要备好口径:评测集、分母、时间窗,答不出会被当成拍脑袋",
  },
  {
    kind: "团队指标个人归因",
    level: "risk",
    re: /(团队|公司|业务|产品)(整体)?[^。；;]{0,6}(用户|收入|DAU|GMV|增长|营收)|(用户数|DAU|GMV)(突破|破|达)/,
    absent: /(我负责|独立|我的部分|名下|模块)/,
    note: "团队/公司指标不会自动变成个人成果:圈出你名下的那部分,写你直接负责的模块",
  },
  {
    kind: "0→1 缺说明",
    level: "evidence",
    re: /(0→1|0到1|从零|从 0)/,
    absent: /(新服务|新链路|新策略|搭建|初始化|立项)/,
    note: "写 0→1 要说明「0」指什么:新服务、新链路还是新策略节点",
  },
]

/** 逐条审计:返回带风险标记的条目(只含有标记的) */
export function auditResume(doc: ResumeDoc): AuditItem[] {
  const out: AuditItem[] = []
  for (const { path, text } of flattenBullets(doc)) {
    const clean = text.trim()
    if (!clean) continue
    const flags: AuditFlag[] = []
    for (const rule of AUDIT_RULES) {
      if (rule.re.test(clean) && !(rule.absent && rule.absent.test(clean))) {
        flags.push({ level: rule.level, kind: rule.kind, note: rule.note })
      }
    }
    if (flags.length) out.push({ path, text: clean, flags })
  }
  return out
}

/* ── JD 对齐(规则版:英文技术词 + 站内能力词表,不做语义匹配) ── */

const JD_STOP = new Set([
  "the", "and", "for", "with", "will", "are", "you", "our", "your", "or", "to", "of", "in", "on", "is", "be",
  "as", "by", "an", "at", "we", "us", "it", "its", "have", "has", "can", "do", "not", "from", "that", "this",
  "a", "b", "c", "d", "e", "etc", "job", "role", "work", "works", "working", "year", "years", "plus", "strong",
  "good", "great", "best", "more", "than", "who", "what", "how", "all", "any", "per", "via", "using", "use", "used",
])

/** JD 里提到的技术点 vs 简历里真实出现的:给覆盖率与缺失清单,不做语义匹配、不建议编造 */
export function matchJd(doc: ResumeDoc, jd: string): { hits: string[]; missing: string[]; total: number } {
  const resumeText = JSON.stringify(doc).toLowerCase()
  // 保留 JD 原词形展示(大小写对用户有意义:Kubernetes vs k8s),匹配用小写
  const tokens = new Map<string, string>()
  for (const t of jd.match(/[A-Za-z][A-Za-z0-9.+#-]{1,24}/g) || []) {
    const low = t.toLowerCase()
    if (low.length >= 2 && !JD_STOP.has(low) && !/^\d/.test(low) && !tokens.has(low)) tokens.set(low, t)
  }
  const hits: string[] = []
  const missing: string[] = []
  for (const [low, orig] of tokens) {
    if (resumeText.includes(low)) hits.push(orig)
    else missing.push(orig)
  }
  return { hits, missing: missing.slice(0, 12), total: hits.length + missing.length }
}

/* ── 导出:Markdown ── */

export function docToMarkdown(doc: ResumeDoc): string {
  const t = { ...SECTION_TITLES_DEFAULTS, ...doc.section_titles }
  const bulletMd = (bs: BulletObj[]) => bs.filter((b) => b.text.trim()).map((b) => `- ${b.text}`).join("\n")
  const parts: string[] = [doc.profile.name || "简历"]
  if (doc.profile.contacts.length) parts.push(doc.profile.contacts.map((c) => (c.label ? `${c.label}:${c.value}` : c.value)).join(" | "))
  if (doc.profile.headline) parts.push(`> ${doc.profile.headline}`)
  if (doc.profile.summary) parts.push(`> ${doc.profile.summary}`)
  if (doc.education.length) {
    parts.push(`## ${t.education}\n\n` + doc.education.map((e) => {
      const head = ["**" + [e.institution, e.program, e.degree].filter(Boolean).join(" · ") + "**", e.dates].filter(Boolean).join("  ")
      return `${head}\n${bulletMd(e.bullets)}`
    }).join("\n\n"))
  }
  if (doc.experience.length) {
    parts.push(`## ${t.experience}\n\n` + doc.experience.map((exp) => {
      const head = `**${[exp.company, exp.team].filter(Boolean).join(" · ")}**${exp.dates ? "  " + exp.dates : ""}`
      const projects = exp.projects.map((p) => {
        const lines = [`【${p.name}${p.subtitle ? "—" + p.subtitle : ""}】`]
        if (p.background.length) lines.push(`背景:${p.background.map((b) => b.text).join(" ")}`)
        if (p.impact.length) lines.push(`指标与效果:${p.impact.map((b) => b.text).join(" ")}`)
        if (p.responsibilities.length) lines.push(bulletMd(p.responsibilities))
        return lines.join("\n")
      })
      return `${head}\n${projects.join("\n\n")}`
    }).join("\n\n"))
  }
  const cards = (title: string, items: StandaloneProject[]) => {
    if (!items.length) return ""
    return `## ${title}\n\n` + items.map((p) => {
      const head = `**${[p.name, p.role].filter(Boolean).join(" · ")}**${p.dates ? "  " + p.dates : ""}`
      const scope = p.scope ? `\n${p.scope}` : ""
      return `${head}${scope}\n${bulletMd(p.bullets)}`
    }).join("\n\n")
  }
  const customs = doc.customs.filter((s) => s.title || s.items.length)
  if (customs.length) {
    parts.push(customs.map((s) => `## ${s.title}\n\n` + s.items.map((it) => {
      const head = `**${it.title}**${it.dates ? "  " + it.dates : ""}`
      return `${head}\n${bulletMd(it.bullets)}`
    }).join("\n\n")).join("\n\n"))
  }
  const awardsSkills: string[] = []
  if (doc.awards.length) awardsSkills.push(`奖项:${doc.awards.map((a) => a.name + (a.date ? `（${a.date}）` : "")).join("、")}`)
  if (doc.skills.length) awardsSkills.push(`技能:${doc.skills.join(" · ")}`)
  if (awardsSkills.length) parts.push(`## ${t.awards_skills}\n\n${awardsSkills.join("\n\n")}`)
  return parts.filter((p) => p.trim()).join("\n\n")
}

/* ── 导出:LaTeX(ctexart,XeLaTeX 编译) ── */

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
}

export function docToLatex(doc: ResumeDoc): string {
  const t = { ...SECTION_TITLES_DEFAULTS, ...doc.section_titles }
  const labels = { ...LABELS_DEFAULTS, ...doc.labels }
  const parts: string[] = []
  parts.push("% !TeX program = xelatex")
  parts.push("\\documentclass[11pt]{ctexart}")
  parts.push("\\usepackage[a4paper,margin=1.7cm]{geometry}")
  parts.push("\\usepackage{enumitem}")
  parts.push("\\usepackage[hidelinks]{hyperref}")
  parts.push("\\pagestyle{empty}")
  parts.push("\\setlist[itemize]{leftmargin=1.2em,itemsep=2pt,topsep=2pt,parsep=0pt}")
  parts.push("\\begin{document}\n")
  const contact = doc.profile.contacts.length
    ? `\\\\\\vspace{2pt}\\small ${esc(doc.profile.contacts.map((c) => (c.label ? `${c.label}:${c.value}` : c.value)).join(" | "))}`
    : ""
  parts.push(`\\begin{center}{\\LARGE\\bfseries ${esc(doc.profile.name)}}${contact}\\end{center}`)
  if (doc.profile.headline) parts.push(`\\vspace{2pt}\\noindent {\\bfseries ${esc(doc.profile.headline)}}`)
  if (doc.profile.summary) parts.push(`\\vspace{2pt}\\noindent ${esc(doc.profile.summary)}`)

  const sec = (title: string, body: string) =>
    body.trim() ? `\n\\vspace{4pt}\n{\\large\\bfseries ${esc(title)}}\\par\\vspace{2pt}\\hrule\\vspace{8pt}\n${body}\n` : ""

  if (doc.education.length) {
    const body = doc.education.map((e) => {
      const head = [e.institution, [e.program, e.degree].filter(Boolean).join("｜")].filter(Boolean).map(esc).join(" · ")
      const time = e.dates ? `\\hfill ${esc(e.dates)}` : ""
      const bullets = e.bullets.length ? `\n\\begin{itemize}\n${e.bullets.map((b) => `  \\item ${esc(b.text)}`).join("\n")}\n\\end{itemize}` : ""
      return `\\noindent\\textbf{${head}}${time}\n${bullets}\n\\vspace{2pt}`
    }).join("\n")
    parts.push(sec(t.education, body))
  }

  if (doc.experience.length) {
    const body = doc.experience.map((exp) => {
      const head = [exp.company, exp.team].filter(Boolean).map(esc).join(" · ")
      const time = exp.dates ? `\\hfill ${esc(exp.dates)}` : ""
      const projects = exp.projects.map((p) => {
        const all = [
          ...(p.background.length ? [`${labels.background}:${p.background.map((b) => b.text).join(" ")}`] : []),
          ...(p.impact.length ? [`${labels.impact}:${p.impact.map((b) => b.text).join(" ")}`] : []),
          ...p.responsibilities.map((b) => b.text),
        ]
        if (!all.length && !p.name) return ""
        const headLine = `\\noindent\\textbf{${esc(p.name)}}`
        if (!all.length) return headLine
        return `${headLine}\n\\begin{itemize}\n${all.map((b) => `  \\item ${esc(b)}`).join("\n")}\n\\end{itemize}`
      }).filter(Boolean).join("\n\\vspace{2pt}\n")
      return `\\noindent\\textbf{${head}}${time}\n${projects}\n\\vspace{2pt}`
    }).join("\n")
    parts.push(sec(t.experience, body))
  }

  const cards = (items: StandaloneProject[]) =>
    items.map((p) => {
      const head = [p.name, p.role].filter(Boolean).map(esc).join(" · ")
      const time = p.dates ? `\\hfill ${esc(p.dates)}` : ""
      const bullets = p.bullets.length ? `\n\\begin{itemize}\n${p.bullets.map((b) => `  \\item ${esc(b.text)}`).join("\n")}\n\\end{itemize}` : ""
      const scope = p.scope ? `\n${esc(p.scope)}` : ""
      return `\\noindent\\textbf{${head}}${time}${scope}\n${bullets}\n\\vspace{2pt}`
    }).join("\n")
  if (doc.open_source.length) parts.push(sec(t.open_source, cards(doc.open_source)))
  if (doc.projects.length) parts.push(sec(t.projects, cards(doc.projects)))
  for (const s of doc.customs) {
    if (!s.items.length) continue
    const body = s.items.map((it) => {
      const head = esc(it.title)
      const time = it.dates ? `\\hfill ${esc(it.dates)}` : ""
      const bullets = it.bullets.length ? `\n\\begin{itemize}\n${it.bullets.map((b) => `  \\item ${esc(b.text)}`).join("\n")}\n\\end{itemize}` : ""
      return `\\noindent\\textbf{${head}}${time}\n${bullets}\n\\vspace{2pt}`
    }).join("\n")
    parts.push(sec(s.title, body))
  }
  if (doc.awards.length || doc.skills.length) {
    const rows: string[] = []
    if (doc.awards.length) rows.push(`\\noindent\\textbf{奖项}\\quad ${esc(doc.awards.map((a) => a.name + (a.date ? `（${a.date}）` : "")).join("、"))}`)
    if (doc.skills.length) rows.push(`\\noindent\\textbf{技能}\\quad ${esc(doc.skills.join(" · "))}`)
    parts.push(sec(t.awards_skills, rows.join("\n\\vspace{2pt}\n")))
  }
  parts.push("\\end{document}")
  return parts.join("\r\n")
}

/* ── 导出:Word 兼容 HTML(.doc,带颜色与加粗) ── */

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c)
}

/** 带加粗重点词的富文本 HTML(Word/通用导出用;A4 渲染器另有同逻辑的排版版) */
export function richTextHtml(b: BulletObj): string {
  const text = b.text
  const manual = b.highlights || []
  const ranges = highlightRanges(text, manual)
  let out = ""
  let cursor = 0
  for (const r of ranges) {
    if (r.start > cursor) out += escHtml(text.slice(cursor, r.start))
    out += `<b>${escHtml(text.slice(r.start, r.end))}</b>`
    cursor = r.end
  }
  if (cursor < text.length) out += escHtml(text.slice(cursor))
  return out
}

export function docToWordHtml(doc: ResumeDoc): string {
  const t = { ...SECTION_TITLES_DEFAULTS, ...doc.section_titles }
  const labels = { ...LABELS_DEFAULTS, ...doc.labels }
  const accent = doc.page_setup.accent === "clay" ? "#8f3f1e" : doc.page_setup.accent === "olive" ? "#4a5d23" : doc.page_setup.accent === "slate" ? "#33383d" : "#245579"
  const sec = (title: string, body: string) =>
    body.trim()
      ? `<h2 style="font-size:13pt;color:${accent};border-bottom:1px solid ${accent};padding-bottom:2pt;margin:14pt 0 6pt;">${escHtml(title)}</h2>${body}`
      : ""
  const factLine = (label: string, bs: BulletObj[]) =>
    bs.length
      ? `<p style="margin:2pt 0;"><b style="color:${accent};">${escHtml(label)}:</b>${richTextHtml(bs[0])}${bs.length > 1 ? `<ul style="margin:2pt 0 2pt 20pt;padding:0;">${bs.slice(1).map((b) => `<li style="margin:2pt 0;">${richTextHtml(b)}</li>`).join("")}</ul>` : ""}</p>`
      : ""
  const bulletsUl = (bs: BulletObj[]) =>
    bs.length ? `<ul style="margin:2pt 0 2pt 20pt;padding:0;">${bs.map((b) => `<li style="margin:2pt 0;">${richTextHtml(b)}</li>`).join("")}</ul>` : ""

  const parts: string[] = []
  parts.push('<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">')
  parts.push('<head><meta charset="utf-8"><title>简历</title>')
  parts.push('<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->')
  parts.push("<style>body{font-family:'微软雅黑','Microsoft YaHei',sans-serif;font-size:10.5pt;color:#1a1a1a;line-height:1.5;} ul,li{list-style:disc;}</style>")
  parts.push("</head><body>")
  parts.push(`<h1 style="font-size:20pt;margin:0 0 2pt;">${escHtml(doc.profile.name)}</h1>`)
  if (doc.profile.eyebrow) parts.push(`<p style="margin:0;color:${accent};font-weight:bold;letter-spacing:2pt;">${escHtml(doc.profile.eyebrow)}</p>`)
  if (doc.profile.contacts.length) {
    parts.push(`<p style="margin:4pt 0;color:#444;font-size:10pt;">${doc.profile.contacts.map((c) => escHtml(c.label ? `${c.label}:${c.value}` : c.value)).join(" | ")}</p>`)
  }
  if (doc.profile.headline) parts.push(`<p style="margin:6pt 0;font-weight:bold;">${escHtml(doc.profile.headline)}</p>`)
  if (doc.profile.summary) parts.push(`<p style="margin:4pt 0;border-left:3pt solid ${accent};padding-left:8pt;color:#444;">${escHtml(doc.profile.summary)}</p>`)

  if (doc.education.length) {
    parts.push(sec(t.education, doc.education.map((e) => {
      const head = [e.institution, [e.program, e.degree].filter(Boolean).join("｜")].filter(Boolean).join(" · ")
      const time = e.dates ? `<span style="float:right;color:#555;">${escHtml(e.dates)}</span>` : ""
      return `<p style="margin:8pt 0 2pt;"><b style="color:${accent};">${escHtml(head)}</b>${time}</p>${bulletsUl(e.bullets)}`
    }).join("")))
  }
  if (doc.experience.length) {
    const body = doc.experience.map((exp) => {
      const head = [exp.company, exp.team].filter(Boolean).join("｜")
      const time = exp.dates ? `<span style="float:right;color:#555;">${escHtml(exp.dates)}</span>` : ""
      const projects = exp.projects.map((p) =>
        [
          `<p style="margin:8pt 0 2pt;"><b>${escHtml(p.name)}${p.subtitle ? ` — ${escHtml(p.subtitle)}` : ""}</b></p>`,
          factLine(labels.background, p.background),
          factLine(labels.impact, p.impact),
          factLine(labels.responsibilities, p.responsibilities),
        ].join(""),
      ).join("")
      return `<p style="margin:10pt 0 2pt;background:#f5f5f2;border-left:4pt solid ${accent};padding:3pt 6pt;"><b style="color:${accent};">${escHtml(head)}</b>${time}</p>${projects}`
    }).join("")
    parts.push(sec(t.experience, body))
  }
  const cardsWord = (items: StandaloneProject[]) =>
    items.map((p) => {
      const head = [p.name, p.role].filter(Boolean).join(" · ")
      const time = p.dates ? `<span style="float:right;color:#555;">${escHtml(p.dates)}</span>` : ""
      const scope = p.scope ? `<p style="margin:2pt 0;color:#555;">${escHtml(p.scope)}</p>` : ""
      const url = p.url ? `<p style="margin:2pt 0;font-size:9pt;"><a href="${escHtml(p.url)}">${escHtml(p.url)}</a></p>` : ""
      return `<p style="margin:8pt 0 2pt;"><b style="color:${accent};">${escHtml(head)}</b>${time}</p>${scope}${bulletsUl(p.bullets)}${url}`
    }).join("")
  if (doc.open_source.length) parts.push(sec(t.open_source, cardsWord(doc.open_source)))
  if (doc.projects.length) parts.push(sec(t.projects, cardsWord(doc.projects)))
  for (const s of doc.customs) {
    if (!s.items.length) continue
    const body = s.items.map((it) => {
      const time = it.dates ? `<span style="float:right;color:#555;">${escHtml(it.dates)}</span>` : ""
      return `<p style="margin:8pt 0 2pt;"><b style="color:${accent};">${escHtml(it.title)}</b>${time}</p>${bulletsUl(it.bullets)}`
    }).join("")
    parts.push(sec(s.title, body))
  }
  if (doc.awards.length || doc.skills.length) {
    const rows: string[] = []
    if (doc.awards.length) rows.push(`<p style="margin:4pt 0;"><b style="color:${accent};">奖项:</b>${escHtml(doc.awards.map((a) => a.name + (a.date ? `（${a.date}）` : "")).join("、"))}</p>`)
    if (doc.skills.length) rows.push(`<p style="margin:4pt 0;"><b style="color:${accent};">技能:</b>${escHtml(doc.skills.join(" · "))}</p>`)
    parts.push(sec(t.awards_skills, rows.join("")))
  }
  parts.push("</body></html>")
  return parts.join("\r\n")
}
