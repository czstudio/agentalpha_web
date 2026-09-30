/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react"
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Check,
  Code2,
  Compass,
  Database,
  FileText,
  FolderGit2,
  Gauge,
  GraduationCap,
  Hammer,
  MessageCircle,
  PenTool,
  RefreshCcw,
  Route,
  Search,
  Ship,
  ShoppingCart,
  TrendingUp,
  Trophy,
  Users,
  Waypoints,
  X,
} from "lucide-react"
import type { CommunityNode } from "@/lib/community/types"

const COMMUNITY_INTRO_URL = "https://agentalpha.feishu.cn/docx/QtYQddrAFoLIb9xFe7PckJnmn1b"
const CAMP_URL = "https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb"
const EMBODIED_URL = "https://qingkelab.feishu.cn/wiki/EWlEwqyOIirxOEktJGgc86YnnMf"
const ILLUS = (name: string) => `/images/community/illus/${name}.webp`

/** 训练营 10 阶段：名称与顺序核对自《大模型 Agent 训练营》训练营文档（阶段 1–10 标题原文） */
const CAMP_STAGES: Array<{ no: string; name: string; full: string; icon: typeof BookOpen; hue: string }> = [
  { no: "01", name: "RAG", full: "阶段 1｜RAG：从理论到实践", icon: BookOpen, hue: "blue" },
  { no: "02", name: "记忆系统", full: "阶段 2｜记忆系统：赋予 Agent 长短期记忆", icon: Brain, hue: "blue" },
  { no: "03", name: "单 Agent", full: "阶段 3｜单 Agent 架构与强化（AutoGen）", icon: Bot, hue: "blue" },
  { no: "04", name: "多智能体", full: "阶段 4｜多智能体协作（AutoGen）", icon: Users, hue: "blue" },
  { no: "05", name: "DeepSearch", full: "阶段 5｜DeepSearch 路线（Search-o1）", icon: Search, hue: "teal" },
  { no: "06", name: "高效推理", full: "阶段 6｜Code Agent 准备：高效推理与大规模服务", icon: Gauge, hue: "teal" },
  { no: "07", name: "Code Agent", full: "阶段 7｜Code Agent：SWE-agent 等框架", icon: Code2, hue: "teal" },
  { no: "08", name: "自进化", full: "阶段 8｜AlphaEvolve 系列：自进化编码", icon: RefreshCcw, hue: "orange" },
  { no: "09", name: "Agentic RL", full: "阶段 9｜Agentic RL：Search-R1 强化学习", icon: TrendingUp, hue: "orange" },
  { no: "10", name: "综合项目", full: "阶段 10｜综合项目考核（1–2 周）", icon: Trophy, hue: "purple" },
]

const CAMP_GROUPS = [
  { name: "架构基础", range: "阶段 1–4", hue: "blue" },
  { name: "工程进阶", range: "阶段 5–7", hue: "teal" },
  { name: "前沿演进", range: "阶段 8–9", hue: "orange" },
  { name: "综合交付", range: "阶段 10", hue: "purple" },
]

/** 具身 VLA 实训营 8 阶段：名称核对自青科实验室《具身 VLA 实训营》课程大纲 */
const EMBODIED_STAGES = [
  "深度学习基础",
  "机器人学基础",
  "模仿学习",
  "强化学习",
  "VLA 仿真环境",
  "VLA 数据处理",
  "VLA 算法解析",
  "VLA 真机部署",
]

function children(nodes: CommunityNode[], key: string): ReactNode {
  return nodes.map((node, index) => renderNode(node, `${key}-${index}`))
}

function nodeText(node: CommunityNode): string {
  if (node.type === "text") return node.text
  if (node.type === "image") return ""
  return node.children.map(nodeText).join("")
}

function hasText(node: CommunityNode): boolean {
  if (node.type === "text") return node.text.trim().length > 0
  if (node.type === "image") return false
  return node.children.some(hasText)
}

function isEmpty(node: CommunityNode): boolean {
  if (node.type === "text") return node.text.trim().length === 0
  if (node.type === "image") return false
  if (node.tag === "hr" || node.tag === "col" || node.tag === "colgroup") return false
  return !node.children.some((child) => !isEmpty(child))
}

function collectImages(node: CommunityNode, out: CommunityNode[] = []): CommunityNode[] {
  if (node.type === "image") out.push(node)
  else if (node.type === "element") node.children.forEach((child) => collectImages(child, out))
  return out
}

function isMediaNode(node: CommunityNode): boolean {
  if (node.type === "image") return true
  if (node.type !== "element") return false
  return node.tag !== "table" && node.tag !== "hr" && !hasText(node) && collectImages(node).length > 0
}

function isHeading(node: CommunityNode, tag: "h1" | "h2") {
  return node.type === "element" && node.tag === tag
}

type ElementNode = Extract<CommunityNode, { type: "element" }>

function asElement(node: CommunityNode | null | undefined): ElementNode | null {
  return node && node.type === "element" ? node : null
}

function splitAt(nodes: CommunityNode[], tag: "h1" | "h2") {
  const groups: CommunityNode[][] = []
  for (const node of nodes) {
    if (isHeading(node, tag)) groups.push([node])
    else if (groups.length) groups.at(-1)!.push(node)
  }
  return groups
}

/* ── 图片 ──────────────────────────────── */

function shortAlt(alt: string): string | null {
  const text = alt.trim()
  if (!text || text.length > 20 || text.startsWith("图片") || text.startsWith("这是")) return null
  return text
}

function Media({ node }: { node: CommunityNode }) {
  if (node.type !== "image") return null
  return (
    <img
      className="community-img"
      src={node.src}
      alt={node.alt}
      width={node.width}
      height={node.height}
      loading="lazy"
      decoding="async"
    />
  )
}

function MediaFigure({ node }: { node: CommunityNode }) {
  const caption = node.type === "image" ? shortAlt(node.alt) : null
  return (
    <figure className="community-media">
      <Media node={node} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

/** 品牌插画（unikeyx 生成，DeepSeek 女生人设）：装饰位，alt 固定，CSS 控制展示尺寸 */
function Illus({ name, className }: { name: string; className?: string }) {
  return (
    <img
      className={`community-illus${className ? ` ${className}` : ""}`}
      src={ILLUS(name)}
      alt="AgentAlpha 插画"
      width={1024}
      height={1024}
      loading="lazy"
      decoding="async"
    />
  )
}

/* ── 章节图标 ───────────────────────────── */

const CHAPTER_TAGS: Record<string, { icon: typeof Compass; label: string }> = {
  identity: { icon: Compass, label: "社区定位" },
  projects: { icon: FolderGit2, label: "代表项目" },
  curriculum: { icon: Route, label: "课程体系" },
  people: { icon: Users, label: "导师与成员" },
  method: { icon: Hammer, label: "方法论" },
  paths: { icon: Waypoints, label: "成长方向" },
  proof: { icon: BadgeCheck, label: "真实结果" },
  cta: { icon: MessageCircle, label: "联系我们" },
}

/* ── 项目卡头部：图标 + 指标（指标口径来自社区文档与站内品牌口径，未新增数字） ── */

function projectMeta(id: string): { icon: typeof FileText; stats: string[]; illus?: string } {
  if (id.includes("idea2paper")) return { icon: FileText, stats: ["1.4k Star", "HF 论文日榜第一"], illus: "proj-idea2paper" }
  if (id.includes("inkos")) return { icon: PenTool, stats: ["7.8k Star", "150+ 部签约"], illus: "proj-inkos" }
  if (id.includes("潜艇")) return { icon: Ship, stats: ["30 天用户破万"] }
  if (id.includes("sell")) return { icon: ShoppingCart, stats: ["企业定制"] }
  if (id === "5") return { icon: Database, stats: ["专业数据 API"] }
  return { icon: GraduationCap, stats: [] }
}

function ProjectHeading({ node }: { node: CommunityNode }) {
  if (node.type !== "element") return null
  const meta = projectMeta(node.id ?? "")
  const Icon = meta.icon
  return (
    <h3 id={node.id}>
      {meta.illus ? (
        <span className="community-proj-illus" aria-hidden="true">
          <Illus name={meta.illus} />
        </span>
      ) : null}
      <span className="community-proj-ico" aria-hidden="true">
        <Icon size={17} />
      </span>
      <span className="community-proj-title">{nodeText(node).trim()}</span>
      {meta.stats.length > 0 ? (
        <span className="community-proj-stats">
          {meta.stats.map((stat) => (
            <b key={stat}>{stat}</b>
          ))}
        </span>
      ) : null}
    </h3>
  )
}

/* ── 训练营 10 阶段路线图（蛇形：上排 1–5，下排 6–10） ── */

const RM_XS = [70, 205, 340, 475, 610]
const RM_ROW_Y = [92, 256]

function Roadmap() {
  const pos = CAMP_STAGES.map((_, index) => {
    const row = index < 5 ? 0 : 1
    return { x: RM_XS[row === 0 ? index : 9 - index], y: RM_ROW_Y[row] }
  })
  const segs: ReactNode[] = []
  for (let i = 0; i < 9; i += 1) {
    const a = pos[i]
    const b = pos[i + 1]
    const d = i === 4
      ? `M ${a.x} ${a.y} C ${a.x + 52} ${a.y}, ${b.x + 52} ${b.y}, ${b.x} ${b.y}`
      : `M ${a.x} ${a.y} H ${b.x}`
    segs.push(<path key={`seg-${i}`} className="rm-seg" d={d} />)
  }
  const nodes: ReactNode[] = CAMP_STAGES.map((stage, index) => {
    const { x, y } = pos[index]
    return (
      <g key={stage.no} className="rm-node" data-hue={stage.hue}>
        <title>{stage.full}</title>
        <circle cx={x} cy={y} r={19} />
        <text className="rm-no" x={x} y={y + 4} textAnchor="middle">{stage.no}</text>
        <text className="rm-name" x={x} y={y + 40} textAnchor="middle">{stage.name}</text>
      </g>
    )
  })
  const pills: ReactNode[] = [
    { x: RM_XS[0], y: RM_ROW_Y[0] - 40, text: "架构基础", hue: "blue" },
    { x: RM_XS[4], y: RM_ROW_Y[0] - 40, text: "工程进阶", hue: "teal" },
    { x: RM_XS[2], y: RM_ROW_Y[1] - 40, text: "前沿演进", hue: "orange" },
    { x: RM_XS[0], y: RM_ROW_Y[1] - 40, text: "综合交付", hue: "purple" },
  ].map((pill) => (
    <g key={pill.text} className="rm-pill" data-hue={pill.hue}>
      <rect x={pill.x - 41} y={pill.y - 13} width={82} height={22} rx={11} />
      <text x={pill.x} y={pill.y + 3} textAnchor="middle">{pill.text}</text>
    </g>
  ))
  return (
    <div className="community-roadmap-wrap">
      <svg
        className="community-roadmap"
        viewBox="0 0 680 320"
        role="img"
        aria-label="大模型 Agent 训练营 10 个阶段学习路线图：RAG、记忆系统、单 Agent、多智能体、DeepSearch、高效推理、Code Agent、自进化、Agentic RL、综合项目"
      >
        {segs}
        {pills}
        {nodes}
      </svg>
      <div className="community-roadmap-legend">
        {CAMP_GROUPS.map((group) => (
          <span key={group.name} data-hue={group.hue}>
            {group.name} · {group.range}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── 课程体系：训练营主卡 + 具身实训营卡 ── */

function CampCard({ mindmap }: { mindmap: CommunityNode | null }) {
  return (
    <div className="community-camp">
      <div className="community-camp-head">
        <span className="community-camp-badge">
          <Route size={13} aria-hidden="true" /> Agent 系列课 · 10 个阶段
        </span>
        <h3>大模型 Agent 训练营</h3>
        <p className="community-camp-eq">
          「Agent 系列课」和「大模型 Agent 训练营」是同一套内容：10 个阶段从 RAG 一路做到综合项目，跟真实项目走完整个周期。
        </p>
      </div>
      <Roadmap />
      {mindmap ? (
        <figure className="community-media is-mindmap">
          <Media node={mindmap} />
          <figcaption>训练营 10 阶段全景：每个阶段的掌握内容、实战任务与考核</figcaption>
        </figure>
      ) : null}
      <div className="community-camp-actions">
        <a className="community-button" href={CAMP_URL} target="_blank" rel="noopener noreferrer">
          查看训练营完整大纲 <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}

function EmbodiedCard() {
  return (
    <div className="community-camp is-embodied">
      <div className="community-camp-head">
        <span className="community-camp-badge">
          <Bot size={13} aria-hidden="true" /> 青科实验室 · 联办
        </span>
        <h3>具身 VLA 实训营</h3>
        <p className="community-camp-eq">
          具身智能 = 机器人 + AI。8 个阶段从深度学习基础走到 VLA 真机部署，覆盖模仿学习、强化学习与主流 VLA 算法。
        </p>
      </div>
      <ol className="community-embodied-stages">
        {EMBODIED_STAGES.map((stage, index) => (
          <li key={stage}>
            <i>{String(index + 1).padStart(2, "0")}</i>
            {stage}
          </li>
        ))}
      </ol>
      <div className="community-camp-actions">
        <a className="community-button is-embodied" href={EMBODIED_URL} target="_blank" rel="noopener noreferrer">
          查看具身实训营介绍 <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}

/**
 * 课程体系章节：把平铺 callout 重组为「基础课卡 → 分级卡组 → 训练营主卡（10 阶段路线图）
 * → 具身 VLA 实训营卡」。训练营主卡合并原「Agent 系列课」芯片云与文末训练营链接——两者是同一套内容。
 */
function curriculumFlow(nodes: CommunityNode[], key: string): ReactNode {
  const plan = {
    intro: [] as string[],
    foundation: null as CommunityNode | null,
    groupLabel: null as CommunityNode | null,
    tiers: null as CommunityNode | null,
    basicImg: null as CommunityNode | null,
    mindmap: null as CommunityNode | null,
    extras: [] as CommunityNode[],
  }
  nodes.forEach((node) => {
    if (node.type === "image") {
      if (!plan.basicImg) plan.basicImg = node
      else if (!plan.mindmap) plan.mindmap = node
      else plan.extras.push(node)
      return
    }
    if (node.type === "text") {
      if (node.text.trim()) plan.intro.push(node.text.trim())
      return
    }
    if (node.type === "element" && node.tag === "aside") {
      const text = nodeText(node)
      if (text.includes("学习路线分三层")) {
        node.children.forEach((child) => {
          if (child.type === "element" && child.tag === "p") plan.intro.push(nodeText(child).trim())
        })
        return
      }
      if (text.includes("基础课")) {
        plan.foundation = node
        return
      }
      if (text.includes("大模型专项课")) {
        plan.groupLabel = node
        return
      }
      if (node.children.some((child) => child.type === "element" && child.tag === "ol")) {
        plan.tiers = node
        return
      }
      if (text.includes("Agent系列课") || text.includes("Agent 系列课")) return // 被训练营主卡吸收
    }
    if (node.type === "element" && nodeText(node).includes("大模型 Agent 训练营") && nodeText(node).length < 30) return // 已被主卡 CTA 吸收
    if (!isEmpty(node)) plan.extras.push(node)
  })

  const foundationEl = asElement(plan.foundation)
  const groupLabelEl = asElement(plan.groupLabel)
  const tiersOl = asElement(plan.tiers)?.children.find((child) => child.type === "element" && child.tag === "ol")

  return (
    <>
      {plan.intro.length > 0 ? <p className="community-curriculum-intro">{plan.intro.join(" ")}</p> : null}
      {foundationEl ? (
        <div className="community-course-foundation">
          <div className="community-course-head">
            <span className="community-course-ico" aria-hidden="true">
              <BookOpen size={17} />
            </span>
            <div>{children(foundationEl.children, `${key}-foundation`)}</div>
          </div>
          {plan.basicImg ? (
            <figure className="community-media">
              <Media node={plan.basicImg} />
              <figcaption>大模型基础课大纲：8 大模块并入 Agent 训练营路线</figcaption>
            </figure>
          ) : null}
        </div>
      ) : null}
      {groupLabelEl ? <p className="community-course-grouplabel">{nodeText(groupLabelEl).trim()}</p> : null}
      {tiersOl?.type === "element" ? (
        <div className="community-tiers">
          {tiersOl.children.map((li, liIndex) =>
            li.type === "element" ? (
              <div className="community-tier" key={liIndex}>
                {children(li.children, `${key}-tier-${liIndex}`)}
              </div>
            ) : null,
          )}
        </div>
      ) : null}
      <CampCard mindmap={plan.mindmap} />
      <EmbodiedCard />
      {plan.extras.map((node, index) => renderNode(node, `${key}-extra-${index}`))}
    </>
  )
}

/* ── 表格智能变形：按表头语义分流 ── */

function tableHeadAndRows(table: CommunityNode): { head: string[]; rows: string[][] } {
  const head: string[] = []
  const rows: string[][] = []
  const parts = table.type === "element" ? table.children : []
  parts.forEach((part) => {
    if (part.type !== "element") return
    if (part.tag === "thead") {
      part.children.forEach((tr) => {
        if (tr.type === "element") tr.children.forEach((th) => head.push(nodeText(th).trim()))
      })
    }
    if (part.tag === "tbody") {
      part.children.forEach((tr) => {
        if (tr.type !== "element") return
        rows.push(tr.children.map((td) => nodeText(td).trim()))
      })
    }
  })
  return { head, rows }
}

function ShotGroup({ table }: { table: CommunityNode }) {
  const head: string[] = []
  const images: CommunityNode[] = []
  const parts = table.type === "element" ? table.children : []
  parts.forEach((part) => {
    if (part.type !== "element") return
    if (part.tag === "thead") {
      part.children.forEach((tr) => {
        if (tr.type === "element") tr.children.forEach((th) => head.push(nodeText(th).trim()))
      })
    }
    if (part.tag === "tbody") collectImages(part, images)
  })
  return (
    <div className="community-shotgroup">
      {head[0] ? <p className="community-shotgroup-label">{head[0]}</p> : null}
      <div className="community-gallery">
        {images.map((image, index) => (
          <MediaFigure node={image} key={index} />
        ))}
      </div>
    </div>
  )
}

function MethodRows({ table }: { table: CommunityNode }) {
  const { rows } = tableHeadAndRows(table)
  return (
    <div className="community-method">
      {rows.map((row) => (
        <div className="community-method-row" key={row[0]}>
          <span className="community-method-name">{row[0]}</span>
          <div className="community-method-vs">
            <p className="is-no">
              <X size={14} aria-hidden="true" />
              {row[1]}
            </p>
            <p className="is-yes">
              <Check size={14} aria-hidden="true" />
              {row[2]}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

const PATH_ICONS: Record<string, typeof Briefcase> = {
  职场实战: Briefcase,
  学术科研: GraduationCap,
  产业落地: Building2,
}

const PATH_ILLUS: Record<string, string> = {
  职场实战: "path-career",
  学术科研: "path-academy",
  产业落地: "path-industry",
}

function PathCards({ table }: { table: CommunityNode }) {
  const { head, rows } = tableHeadAndRows(table)
  return (
    <div className="community-paths">
      {rows.map((row) => {
        const Icon = PATH_ICONS[row[0]] ?? Waypoints
        const illus = PATH_ILLUS[row[0]]
        return (
          <div className="community-path" key={row[0]}>
            {illus ? (
              <span className="community-path-illus" aria-hidden="true">
                <Illus name={illus} />
              </span>
            ) : null}
            <div className="community-path-head">
              <span className="community-path-ico" aria-hidden="true">
                <Icon size={17} />
              </span>
              <strong>{row[0]}</strong>
            </div>
            {row.slice(1).map((cell, index) => (
              <p key={head[index + 1] ?? index}>
                <span>{head[index + 1]}</span>
                {cell}
              </p>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function StepCards({ table }: { table: CommunityNode }) {
  const { head, rows } = tableHeadAndRows(table)
  return (
    <div className="community-steps">
      {rows.map((row, index) => (
        <div className="community-step" key={row[0]}>
          <span className="community-step-no">{String(index + 1).padStart(2, "0")}</span>
          <strong>{row[0]}</strong>
          <p>
            <span>{head[1]}</span>
            {row[1]}
          </p>
          <p>
            <span>{head[2]}</span>
            {row[2]}
          </p>
        </div>
      ))}
    </div>
  )
}

function MetricList({ table }: { table: CommunityNode }) {
  const { rows } = tableHeadAndRows(table)
  return (
    <dl className="community-metrics">
      {rows.map((row) => (
        <div key={row[0]}>
          <dt>{row[0]}</dt>
          <dd>{row[1]}</dd>
        </div>
      ))}
    </dl>
  )
}

function TableBlock({ node }: { node: CommunityNode }) {
  if (node.type !== "element") return null
  const { head } = tableHeadAndRows(node)
  if (collectImages(node).length > 0) return <ShotGroup table={node} />
  if (head[0] === "价值观") return <MethodRows table={node} />
  if (head[0] === "方向") return <PathCards table={node} />
  if (head[0] === "参与深度") return <StepCards table={node} />
  if (head[0] === "指标") return <MetricList table={node} />
  return (
    <div className="community-table-wrap">
      <table>{children(node.children, "table")}</table>
    </div>
  )
}

/* ── 基础节点渲染 ── */

function layoutFor(title: string) {
  if (title.includes("AgentAlpha")) return "identity"
  if (title.includes("项目")) return "projects"
  if (title.includes("课程")) return "curriculum"
  if (title.includes("导师") || title.includes("成员")) return "people"
  if (title.includes("方法")) return "method"
  if (title.includes("成长方向")) return "paths"
  if (title.includes("结果") || title.includes("案例")) return "proof"
  if (title.includes("进一步了解")) return "cta"
  return "standard"
}

function renderNode(node: CommunityNode, key: string): ReactNode {
  if (node.type === "text") return node.text
  if (node.type === "image") return <Media node={node} key={key} />

  if (node.tag === "hr") return <hr key={key} />
  if (node.tag === "col") return <col key={key} />
  if (node.tag === "colgroup") return <colgroup key={key}>{children(node.children, key)}</colgroup>
  if (isEmpty(node)) return null

  const content = children(node.children, key)
  switch (node.tag) {
    case "p": return <p key={key}>{content}</p>
    case "strong": return <strong key={key}>{content}</strong>
    case "em": return <em key={key}>{content}</em>
    case "span": return <span key={key}>{content}</span>
    case "h1": return <h2 id={node.id} key={key}>{content}</h2>
    case "h2": return <h3 id={node.id} key={key}>{content}</h3>
    case "h3": return <h4 id={node.id} key={key}>{content}</h4>
    case "h4": return <h5 id={node.id} key={key}>{content}</h5>
    case "aside": return <aside className="community-callout" key={key}><span aria-hidden="true">{node.emoji}</span><div>{content}</div></aside>
    case "div": return <div className="community-grid" key={key}>{content}</div>
    case "section": return <section className="community-column" style={{ "--column-ratio": node.ratio ?? 1 } as CSSProperties} key={key}>{content}</section>
    case "ul": return <ul key={key}>{content}</ul>
    case "ol": return <ol key={key}>{content}</ol>
    case "li": return <li key={key}>{content}</li>
    case "blockquote": return <blockquote key={key}>{content}</blockquote>
    case "a": return <a className={node.kind === "button" ? "community-button" : undefined} href={node.href} target="_blank" rel="noreferrer" key={key}>{content}</a>
    case "table": return <TableBlock node={node} key={key} />
    case "thead": return <thead key={key}>{content}</thead>
    case "tbody": return <tbody key={key}>{content}</tbody>
    case "tr": return <tr key={key}>{content}</tr>
    case "th": return <th colSpan={node.colSpan} rowSpan={node.rowSpan} key={key}>{content}</th>
    case "td": return <td colSpan={node.colSpan} rowSpan={node.rowSpan} key={key}>{content}</td>
    default: throw new Error(`Unsupported community node tag: ${node.tag}`)
  }
}

/* ── 通用流：证据卡吸收配图，连续图片合并画廊 ── */

function flow(nodes: CommunityNode[], key: string, evidenceMode = false): ReactNode {
  const rendered: ReactNode[] = []
  let index = 0

  while (index < nodes.length) {
    const node = nodes[index]

    // 飞书文档里免责声明常以「裸文本 + 同文段落」存了两份，证据区只渲染一份
    if (evidenceMode && node.type === "text" && node.text.trim()) {
      const next = nodes.slice(index + 1, index + 3).find((n) => n.type === "element" && n.tag === "p")
      if (next && nodeText(next).trim() === node.text.trim()) {
        index += 1
        continue
      }
    }

    if (evidenceMode && node.type === "element" && node.tag === "p" && hasText(node)) {
      const media: CommunityNode[] = []
      let cursor = index + 1
      while (cursor < nodes.length && isMediaNode(nodes[cursor])) {
        collectImages(nodes[cursor], media)
        cursor += 1
      }
      rendered.push(
        <article className="community-evidence-card" key={`${key}-evidence-${index}`}>
          {renderNode(node, `${key}-${index}`)}
          {media.length > 0 ? (
            <div className="community-evidence-media">
              {media.map((image, imageIndex) => (
                <Media node={image} key={imageIndex} />
              ))}
            </div>
          ) : null}
        </article>,
      )
      index = cursor
      continue
    }

    if (isMediaNode(node)) {
      const media: CommunityNode[] = []
      let cursor = index
      while (cursor < nodes.length && isMediaNode(nodes[cursor])) {
        collectImages(nodes[cursor], media)
        cursor += 1
      }
      rendered.push(
        <div className="community-gallery" key={`${key}-gallery-${index}`}>
          {media.map((image, imageIndex) => (
            <MediaFigure node={image} key={imageIndex} />
          ))}
        </div>,
      )
      index = cursor
      continue
    }

    const item = renderNode(node, `${key}-${index}`)
    if (item) rendered.push(item)
    index += 1
  }

  return rendered
}

const PROOF_SUB_ICONS: Array<{ match: string; icon: typeof Briefcase }> = [
  { match: "大厂 Offer", icon: Briefcase },
  { match: "论文录用", icon: GraduationCap },
  { match: "部分案例", icon: Users },
  { match: "参与方式", icon: Waypoints },
]

function ProofSubHeading({ node }: { node: CommunityNode }) {
  if (node.type !== "element") return null
  const title = nodeText(node).trim().replace(/^\s*\d+\.\s*/, "")
  const Icon = PROOF_SUB_ICONS.find((item) => title.includes(item.match))?.icon ?? Waypoints
  return (
    <h3 id={node.id} className="community-proof-head">
      <span className="community-proof-ico" aria-hidden="true">
        <Icon size={16} />
      </span>
      {title}
    </h3>
  )
}

function IntroBanner() {
  return (
    <a className="community-doc-banner" href={COMMUNITY_INTRO_URL} target="_blank" rel="noopener noreferrer">
      <span className="community-doc-banner-copy">
        <strong>完整社区介绍</strong>
        <em>最新内容以飞书文档为准</em>
      </span>
      <span className="community-doc-banner-arrow" aria-hidden="true">↗</span>
    </a>
  )
}

/** 08 CTA 收尾：女生招手插画 + 行动按钮 */
function CtaActions() {
  return (
    <div className="community-cta-finale">
      <Illus name="cta" className="community-cta-illus" />
      <div className="community-cta-actions">
        <a className="community-button" href="/#contact">加入社区</a>
        <a className="community-button is-secondary" href={COMMUNITY_INTRO_URL} target="_blank" rel="noopener noreferrer">阅读社区介绍 ↗</a>
      </div>
    </div>
  )
}

/** 01 是什么：两句定位 + 品牌插画主视觉（其余细节交给后面的章节讲） */
function identityFlow(nodes: CommunityNode[], key: string): ReactNode {
  const callouts: string[] = []
  const extras: CommunityNode[] = []
  nodes.forEach((node) => {
    if (node.type === "element" && node.tag === "aside" && callouts.length < 2) {
      callouts.push(nodeText(node).trim())
      return
    }
    if (!isEmpty(node)) extras.push(node)
  })
  return (
    <div className="community-identity">
      <div className="community-identity-copy">
        {callouts.map((text, index) => (
          <p className="community-identity-line" key={index}>{text}</p>
        ))}
      </div>
      <Illus name="what" className="community-identity-illus" />
    </div>
  )
}

export function CommunityDocumentRenderer({ nodes }: { nodes: CommunityNode[] }) {
  const chapters = splitAt(nodes, "h1")
  return (
    <>
      <IntroBanner />
      {chapters.map((chapter, chapterIndex) => {
        const heading = chapter[0]
        if (heading.type !== "element") return null
        const title = nodeText(heading).trim()
        const body = chapter.slice(1)
        const subchapters = splitAt(body, "h2")
        const firstSubchapterIndex = body.findIndex((node) => isHeading(node, "h2"))
        const lead = firstSubchapterIndex === -1 ? body : body.slice(0, firstSubchapterIndex)
        const layout = layoutFor(title)
        const tag = CHAPTER_TAGS[layout]

        return (
          <section className={`community-chapter layout-${layout}`} id={heading.id} key={heading.id ?? chapterIndex}>
            <header className="community-chapter-head">
              <div className="community-chapter-tag" aria-hidden="true">
                {tag ? (
                  <>
                    <tag.icon size={15} />
                    <em>{tag.label}</em>
                  </>
                ) : (
                  <em>{String(chapterIndex + 1).padStart(2, "0")}</em>
                )}
              </div>
              <h2>{title.replace(/^\s*\d+\.\s*/, "")}</h2>
            </header>
            <div className="community-chapter-body">
              {layout === "curriculum"
                ? curriculumFlow(lead, `chapter-${chapterIndex}-lead`)
                : layout === "identity"
                  ? identityFlow(lead, `chapter-${chapterIndex}-lead`)
                  : flow(lead, `chapter-${chapterIndex}-lead`)}
              {subchapters.map((subchapter, subIndex) => {
                const subheading = subchapter[0]
                if (subheading.type !== "element") return null
                const subBody = flow(subchapter.slice(1), `chapter-${chapterIndex}-sub-${subIndex}`, layout === "proof")
                if (!subBody || (Array.isArray(subBody) && subBody.length === 0)) return null
                return (
                  <section className="community-subchapter" key={subheading.id ?? subIndex}>
                    {layout === "projects"
                      ? <ProjectHeading node={subheading} />
                      : layout === "proof"
                        ? <ProofSubHeading node={subheading} />
                        : renderNode(subheading, `chapter-${chapterIndex}-sub-${subIndex}-heading`)}
                    <div className="community-subchapter-body">{subBody}</div>
                  </section>
                )
              })}
              {layout === "cta" ? <CtaActions /> : null}
            </div>
          </section>
        )
      })}
    </>
  )
}
