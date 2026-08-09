import Image from "next/image"
import type { CSSProperties, ReactNode } from "react"
import type { CommunityNode } from "@/lib/community/types"

function children(nodes: CommunityNode[], key: string): ReactNode {
  return nodes.map((node, index) => renderNode(node, `${key}-${index}`))
}

function renderNode(node: CommunityNode, key: string): ReactNode {
  if (node.type === "text") return node.text
  if (node.type === "image") {
    return (
      <figure className="community-figure" key={key}>
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
  return <>{children(nodes, "community")}</>
}
