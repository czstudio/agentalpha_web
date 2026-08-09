import { communityDocument } from "@/lib/community/content"

export const dynamic = "force-static"

export function GET() {
  const body = [
    "# AgentAlpha",
    "",
    `> ${communityDocument.description}`,
    "",
    "## Community",
    "",
    `- [${communityDocument.title}](https://agentalpha.top/community): ${communityDocument.description}`,
    `- [Markdown version](https://agentalpha.top/community.md)`,
    `- Source revision: ${communityDocument.sourceRevision}`,
  ].join("\n")
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
