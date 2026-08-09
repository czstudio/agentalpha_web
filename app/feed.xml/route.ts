import { communityDocument } from "@/lib/community/content"

export const dynamic = "force-static"

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")
}

export function GET() {
  const item = `<entry><title>${escapeXml(communityDocument.title)}</title><id>https://agentalpha.top/community</id><link href="https://agentalpha.top/community"/><updated>${communityDocument.syncedAt}</updated><summary>${escapeXml(communityDocument.description)}</summary></entry>`
  const xml = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>AgentAlpha 社区</title><id>https://agentalpha.top</id><link href="https://agentalpha.top/feed.xml" rel="self"/><link href="https://agentalpha.top/community"/><updated>${communityDocument.syncedAt}</updated>${item}</feed>`
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } })
}
