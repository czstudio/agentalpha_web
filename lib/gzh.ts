import fs from "node:fs"
import path from "node:path"

/**
 * 公众号文章索引（content/gzh/articles.json）。
 * 文章本体在 mp.weixin.qq.com，这里只存标题、链接、日期与摘要，
 * 由补充 SOP 定期从公众号备份（articles.json）同步追加。
 */
export interface GzhArticle {
  title: string
  url: string
  /** 发布时间，格式不一（YYYY-MM-DD HH:mm 或空） */
  date: string
  digest: string
}

const dataFile = path.join(process.cwd(), "content", "gzh", "articles.json")

export function getGzhArticles(): GzhArticle[] {
  if (!fs.existsSync(dataFile)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf8")) as GzhArticle[]
    return raw
      .filter((a) => a && a.title && a.url)
      .sort((a, b) => {
        const da = a.date || "0000"
        const db = b.date || "0000"
        return da < db ? 1 : da > db ? -1 : 0
      })
  } catch {
    return []
  }
}
