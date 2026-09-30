import { getAllInterview } from "@/lib/interview"

export const dynamic = "force-static"

/** 分类 sitemap：深度解析 + 真题解析 + 对比文（Article 页） */
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getAllInterview()
  .map(
    (post) =>
      `  <url><loc>https://agentalpha.top/interview/${post.slug}</loc>${
        post.updated ? `<lastmod>${post.updated}</lastmod>` : ""
      }<changefreq>monthly</changefreq><priority>0.7</priority></url>`,
  )
  .join("\n")}
</urlset>`
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
}
