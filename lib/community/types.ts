export type CommunityNode =
  | { type: "text"; text: string }
  | { type: "image"; src: string; alt: string; width: number; height: number }
  | {
      type: "element"
      tag: string
      children: CommunityNode[]
      id?: string
      kind?: "callout" | "grid" | "column" | "button"
      emoji?: string
      href?: string
      ratio?: number
      colSpan?: number
      rowSpan?: number
    }

export interface CommunityDocument {
  schemaVersion: 1
  source: { provider: "Feishu"; token: string; url: string }
  sourceRevision: number
  contentHash: string
  syncedAt: string
  title: string
  description: string
  stats: { characters: number; images: number; uniqueImages: number; headings: number }
  headings: Array<{ level: 1 | 2; id: string; text: string }>
  nodes: CommunityNode[]
  plainText: string
}
