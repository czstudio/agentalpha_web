import Image from "next/image"
import type { CSSProperties, ReactNode } from "react"
import type { CommunityNode } from "@/lib/community/types"

function children(nodes: CommunityNode[], key: string): ReactNode {
  return nodes.map((node, index) => renderNode(node, `${key}-${index}`))
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
  if (node.type === "image") {
    const orientation = node.width > node.height * 1.25 ? "is-wide" : node.height > node.width * 1.2 ? "is-portrait" : "is-square"
    return (
      <figure className={`community-figure ${orientation}`} key={key}>
        <a href={node.src} target="_blank" rel="noreferrer">
          <Image
            src={node.src}
            alt={node.alt}
            width={node.width}
            height={node.height}
            sizes="(max-width: 760px) 94vw, (max-width: 1200px) 78vw, 860px"
          />
        </a>
      </figure>
    )
  }

  const content = children(node.children, key)
  switch (node.tag) {
    case "p": return node.children.length ? <p key={key}>{content}</p> : null
    case "strong": return <strong key={key}>{content}</strong>
    case "em": return <em key={key}>{content}</em>
    case "span": return <span key={key}>{content}</span>
    case "h1": return <h2 id={node.id} key={key}>{content}</h2>
    case "h2": return <h3 id={node.id} key={key}>{content}</h3>
    case "h3": return <h4 id={node.id} key={key}>{content}</h4>
    case "h4": return <h5 id={node.id} key={key}>{content}</h5>
    case "hr": return <hr key={key} />
    case "aside": return <aside className="community-callout" key={key}><span aria-hidden="true">{node.emoji}</span><div>{content}</div></aside>
    case "div": return <div className="community-grid" key={key}>{content}</div>
    case "section": return <section className="community-column" style={{ "--column-ratio": node.ratio ?? 1 } as CSSProperties} key={key}>{content}</section>
    case "ul": return <ul key={key}>{content}</ul>
    case "ol": return <ol key={key}>{content}</ol>
    case "li": return <li key={key}>{content}</li>
    case "blockquote": return <blockquote key={key}>{content}</blockquote>
    case "a": return <a className={node.kind === "button" ? "community-button" : undefined} href={node.href} target="_blank" rel="noreferrer" key={key}>{content}</a>
    case "table": return <div className="community-table-wrap" key={key}><table>{content}</table></div>
    case "colgroup": return <colgroup key={key}>{content}</colgroup>
    case "col": return <col key={key} />
    case "thead": return <thead key={key}>{content}</thead>
    case "tbody": return <tbody key={key}>{content}</tbody>
    case "tr": return <tr key={key}>{content}</tr>
    case "th": return <th colSpan={node.colSpan} rowSpan={node.rowSpan} key={key}>{content}</th>
    case "td": return <td colSpan={node.colSpan} rowSpan={node.rowSpan} key={key}>{content}</td>
    default: throw new Error(`Unsupported community node tag: ${node.tag}`)
  }
}

export function CommunityDocumentRenderer({ nodes }: { nodes: CommunityNode[] }) {
  const chapters = splitAt(nodes, "h1")
  return <>{chapters.map((chapter, chapterIndex) => {
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
          {children(lead, `chapter-${chapterIndex}-lead`)}
          {subchapters.map((subchapter, subIndex) => {
            const subheading = subchapter[0]
            if (subheading.type !== "element") return null
            return (
              <section className="community-subchapter" key={subheading.id ?? subIndex}>
                {renderNode(subheading, `chapter-${chapterIndex}-sub-${subIndex}-heading`)}
                <div className="community-subchapter-body">
                  {children(subchapter.slice(1), `chapter-${chapterIndex}-sub-${subIndex}`)}
                </div>
              </section>
            )
          })}
        </div>
      </section>
    )
  })}</>
}
