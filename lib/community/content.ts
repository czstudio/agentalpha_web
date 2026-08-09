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
    ...sections,
    "",
    communityDocument.plainText.replaceAll(/AgentAlpha 社区原.{1}图片/g, "项目成果配图"),
  ].join("\n")
}
