import { getCategoriesWithPosts } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"
import { getAllInterview } from "@/lib/interview"
import { ROADMAPS } from "@/lib/roadmap"
import { COMPANIES, getQaByCompany } from "@/lib/companies"

/**
 * 面试间侧边导航树（服务端生成，传给 SidebarShell 客户端组件）。
 * 按读者意图分五组，组名与全站命名表一致：主线课程 / 求职路线 / 刷题 / 按方向查题 / 字典与实战。
 */
export interface NavItem {
  label: string
  href: string
  badge?: string
  /** 额外视为 active 的路径前缀（如 roadmap 组） */
  matchPrefix?: string
}

export interface NavGroup {
  key: string
  title: string
  items: NavItem[]
  /** 默认展开 */
  open?: boolean
}

export function buildInterviewNav(): NavGroup[] {
  const categories = getCategoriesWithPosts(false)
  const qa = getAllQa()
  const qaCount = (cat: string) => qa.filter((item) => item.category === cat).length
  const deeps = getAllInterview()
  const tkCount = deeps.filter((p) => p.slug.includes("-tk")).length
  const packs = deeps.filter((p) => (p.tags || []).some((t) => t.includes("项目面试")))

  const companies = COMPANIES.map((c) => ({ c, n: getQaByCompany(c.slug).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)

  return [
    {
      key: "learn",
      title: "主线课程",
      open: true,
      items: [
        { label: "面试间总览", href: "/interview" },
        { label: "主线课程 12 章", href: "/interview#chapters" },
        { label: "抽题自测", href: "/interview/quiz" },
      ],
    },
    {
      key: "routes",
      title: "求职路线",
      items: ROADMAPS.map((r) => ({
        label: r.name,
        href: `/roadmap/${r.slug}`,
        matchPrefix: `/roadmap`,
      })),
    },
    {
      key: "bank",
      title: "刷题",
      open: true,
      items: [
        { label: `速答题库（${qa.length}）`, href: "/interview/qa" },
        { label: `真题解析（${tkCount}+）`, href: "/interview/tk" },
        { label: "五厂与公司真题", href: "/interview/jingchang" },
      ],
    },
    {
      key: "cats",
      title: "按方向查题",
      items: categories.map((c) => ({
        label: c.name,
        href: `/interview/category/${c.cat}`,
        badge: `${qaCount(c.cat) + c.count}`,
      })),
    },
    {
      key: "ref",
      title: "字典与实战",
      items: [
        { label: "术语表（含面试考法）", href: "/interview/glossary" },
        ...packs.map((p) => ({
          label: p.title.replace("项目面试包 · ", ""),
          href: `/interview/${p.slug}`,
        })),
        { label: "免费工具箱", href: "/tools" },
      ],
    },
  ]
}
