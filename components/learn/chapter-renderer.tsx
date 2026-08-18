import Image from "next/image"
import { CopyCodeButton } from "./reading-tools"
import type { ContentBlock } from "@/lib/learn/types"

function renderBlock(block: ContentBlock, key: string): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const Tag = block.level === 2 ? "h2" : "h3"
      return <Tag id={block.id} key={key}>{block.text}</Tag>
    }
    case "paragraph": return <p key={key}>{block.text}</p>
    case "code": return (
      <figure key={key} className="learn-code">
        <div><span>{block.language || "text"}</span><CopyCodeButton code={block.code} /></div>
        <pre><code>{block.code}</code></pre>
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    )
    case "image": return (
      <figure key={key} className="learn-figure">
        <a href={block.src} target="_blank" rel="noreferrer">
          <Image src={block.src} alt={block.alt} width={1200} height={720} sizes="(max-width: 900px) 100vw, 760px" />
        </a>
        <figcaption>{block.caption} <span>来源：{block.sourceUrl ? <a href={block.sourceUrl}>{block.sourceLabel}</a> : block.sourceLabel}</span></figcaption>
      </figure>
    )
    case "callout": return (
      <aside key={key} className={`learn-callout learn-callout-${block.tone}`}>
        <strong>{block.title}</strong>
        {block.blocks.map((child, index) => renderBlock(child, `${key}-${index}`))}
      </aside>
    )
    case "grid": return (
      <div key={key} className="learn-grid">
        {block.columns.map((column, index) => <section key={`${key}-${index}`}>
          {column.title && <h3>{column.title}</h3>}
          {column.blocks.map((child, childIndex) => renderBlock(child, `${key}-${index}-${childIndex}`))}
        </section>)}
      </div>
    )
    case "table": return (
      <figure key={key} className="learn-table-wrap">
        <table><thead><tr>{block.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{block.rows.map((row, rowIndex) => <tr key={`${key}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${key}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
        </table>
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    )
    case "list": {
      const Tag = block.ordered ? "ol" : "ul"
      return <Tag key={key}>{block.items.map((item) => <li key={item}>{item}</li>)}</Tag>
    }
    case "quote": return <blockquote key={key}>{block.text}{block.citation && <cite>{block.citation}</cite>}</blockquote>
    default: {
      const exhaustive: never = block
      throw new Error(`Unknown content block: ${JSON.stringify(exhaustive)}`)
    }
  }
}

export function ChapterRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return <>{blocks.map((block, index) => renderBlock(block, String(index)))}</>
}
