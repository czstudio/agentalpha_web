import { getAllQa } from "@/lib/qa"

export const dynamic = "force-static"

/** 分类 sitemap：速答题（一题一页 FAQ） */
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getAllQa()
  .map(
    (item) =>
      `  <url><loc>https://agentalpha.top/interview/qa/${item.slug}</loc>${
        item.updated ? `<lastmod>${item.updated}</lastmod>` : ""
      }<changefreq>monthly</changefreq><priority>0.75</priority></url>`,
  )
  .join("\n")}
</urlset>`
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
}
