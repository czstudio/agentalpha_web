import communityJson from "@/content/community/community.json"
import type { CommunityDocument } from "./types"

export const communityDocument = communityJson as CommunityDocument

export function communityMarkdown() {
  const sections = communityDocument.nodes.flatMap((node) => {
    if (node.type !== "element" || !node.id || !/^h[1-4]$/.test(node.tag)) return []
    const heading = communityDocument.headings.find((item) => item.id === node.id)
    return heading ? [`${"#".repeat(Math.min(heading.level + 1, 3))} ${heading.text}`] : []
  })
  return [
    `# ${communityDocument.title}`,
    "",
    communityDocument.description,
    "",
    `> 内容源：AgentAlpha 飞书社区介绍，revision ${communityDocument.sourceRevision}`,
    "",
    ...sections,
    "",
    communityDocument.plainText,
  ].join("\n")
}
