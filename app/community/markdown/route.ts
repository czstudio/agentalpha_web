import { communityMarkdown } from "@/lib/community/content"

export const dynamic = "force-static"

export function GET() {
  return new Response(communityMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
