import type { CSSProperties, ReactNode } from "react"
import type { CommunityNode } from "@/lib/community/types"

const COMMUNITY_INTRO_URL = "https://agentalpha.feishu.cn/docx/QtYQddrAFoLIb9xFe7PckJnmn1b"

function children(nodes: CommunityNode[], key: string): ReactNode {
  return nodes.map((node, index) => renderNode(node, `${key}-${index}`))
}

function hasVisibleContent(node: CommunityNode): boolean {
  if (node.type === "text") return node.text.trim().length > 0
  if (node.type === "image") return false
  if (node.tag === "hr" || node.tag === "col" || node.tag === "colgroup") return true
  return node.children.some(hasVisibleContent)
}

function isImageOnly(node: CommunityNode): boolean {
  if (node.type === "image") return true
  return node.type === "element" && node.tag !== "hr" && !hasVisibleContent(node)
}

function evidenceCard(node: CommunityNode, index: number, key: string): ReactNode {
  if (!hasVisibleContent(node)) return null
  return (
    <article className="community-evidence-card" key={`${key}-evidence-${index}`}>
      {renderNode(node, `${key}-${index}`)}
    </article>
  )
}

function flow(nodes: CommunityNode[], key: string, evidenceMode = false): ReactNode {
  const rendered: ReactNode[] = []
  let index = 0

  while (index < nodes.length) {
    const node = nodes[index]

    if (node?.type === "image" || (node && isImageOnly(node))) {
      index += 1
      continue
    }

    if (evidenceMode && node?.type === "element" && node.tag === "p" && hasVisibleContent(node)) {
      const card = evidenceCard(node, index, key)
      if (card) rendered.push(card)
      index += 1
      while (nodes[index] && isImageOnly(nodes[index])) index += 1
      continue
    }

    const item = renderNode(node, `${key}-${index}`)
    if (item) rendered.push(item)
    index += 1
  }

  return rendered
}

function nodeText(node: CommunityNode): string {
  if (node.type === "text") return node.text
  if (node.type === "image") return ""
  return node.children.map(nodeText).join("")
}

function isHeading(node: CommunityNode, tag: "h1" | "h2") {
  return node.type === "element" && node.tag === tag
}

function splitAt(nodes: CommunityNode[], tag: "h1" | "h2") {
  const groups: CommunityNode[][] = []
  for (const node of nodes) {
    if (isHeading(node, tag)) groups.push([node])
    else if (groups.length) groups.at(-1)!.push(node)
  }
  return groups
}

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
  if (node.type === "image") return null

  if (node.tag === "hr") return <hr key={key} />
  if (node.tag === "col") return <col key={key} />
  if (node.tag === "colgroup") return <colgroup key={key}>{children(node.children, key)}</colgroup>
  if (!hasVisibleContent(node)) return null

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
    case "table": return <div className="community-table-wrap" key={key}><table>{content}</table></div>
    case "thead": return <thead key={key}>{content}</thead>
    case "tbody": return <tbody key={key}>{content}</tbody>
    case "tr": return <tr key={key}>{content}</tr>
    case "th": return <th colSpan={node.colSpan} rowSpan={node.rowSpan} key={key}>{content}</th>
    case "td": return <td colSpan={node.colSpan} rowSpan={node.rowSpan} key={key}>{content}</td>
    default: throw new Error(`Unsupported community node tag: ${node.tag}`)
  }
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

function CtaActions() {
  return (
    <div className="community-cta-actions">
      <a className="community-button" href="/#contact">加入社区</a>
      <a className="community-button is-secondary" href={COMMUNITY_INTRO_URL} target="_blank" rel="noopener noreferrer">查看社区介绍 ↗</a>
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

        return (
          <section className={`community-chapter layout-${layout}`} id={heading.id} key={heading.id ?? chapterIndex}>
            <header className="community-chapter-head">
              <span>{String(chapterIndex + 1).padStart(2, "0")}</span>
              <h2>{title.replace(/^\s*\d+\.\s*/, "")}</h2>
            </header>
            <div className="community-chapter-body">
              {flow(lead, `chapter-${chapterIndex}-lead`)}
              {subchapters.map((subchapter, subIndex) => {
                const subheading = subchapter[0]
                if (subheading.type !== "element") return null
                const subBody = flow(subchapter.slice(1), `chapter-${chapterIndex}-sub-${subIndex}`, layout === "proof")
                if (!subBody || (Array.isArray(subBody) && subBody.length === 0)) return null
                return (
                  <section className="community-subchapter" key={subheading.id ?? subIndex}>
                    {renderNode(subheading, `chapter-${chapterIndex}-sub-${subIndex}-heading`)}
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
