import { getAllGlossary } from "@/lib/glossary"

export const dynamic = "force-static"

/** 分类 sitemap：术语定义页（DefinedTerm） */
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getAllGlossary()
  .map(
    (item) =>
      `  <url><loc>https://agentalpha.top/interview/glossary/${item.slug}</loc>${
        item.updated ? `<lastmod>${item.updated}</lastmod>` : ""
      }<changefreq>monthly</changefreq><priority>0.65</priority></url>`,
  )
  .join("\n")}
</urlset>`
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
}
