import { getCategoriesWithPosts } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"
import { getAllInterview } from "@/lib/interview"
import { ROADMAPS } from "@/lib/roadmap"
import { COMPANIES, getQaByCompany } from "@/lib/companies"

/**
 * 面试间侧边导航树（服务端生成，传给 SidebarShell 客户端组件）。
 * 结构对齐文档站习惯：分组（可折叠）→ 条目（badge 计数 + active 匹配）。
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
  const packs = deeps.filter((p) => (p.tags || []).some((t) => t.includes("项目面试")))

  const companies = COMPANIES.map((c) => ({ c, n: getQaByCompany(c.slug).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)

  return [
    {
      key: "start",
      title: "开始",
      open: true,
      items: [
        { label: "面试间首页", href: "/interview" },
        { label: "模拟面试 · 抽题自测", href: "/interview/quiz" },
        { label: "简历体检", href: "/tools/resume" },
      ],
    },
    {
      key: "learn",
      title: "系统学习",
      open: true,
      items: categories.map((c) => ({
        label: c.name,
        href: `/interview/category/${c.cat}`,
        badge: `${qaCount(c.cat) + c.count}`,
      })),
    },
    {
      key: "bank",
      title: "题库与工具",
      open: true,
      items: [
        { label: "速答题库", href: "/interview/qa" },
        { label: "术语表", href: "/interview/glossary" },
        { label: "五厂真题集", href: "/interview/jingchang" },
      ],
    },
    {
      key: "roadmap",
      title: "学习路线",
      items: ROADMAPS.map((r) => ({
        label: r.name,
        href: `/roadmap/${r.slug}`,
        matchPrefix: `/roadmap/${r.slug}`,
      })),
    },
    {
      key: "company",
      title: "按公司刷",
      items: companies.map(({ c, n }) => ({
        label: c.name,
        href: `/interview/company/${c.slug}`,
        badge: String(n),
      })),
    },
    ...(packs.length
      ? [
          {
            key: "packs",
            title: "项目面试包",
            items: packs.map((p) => ({
              label: p.title.replace("项目面试包 · ", ""),
              href: `/interview/${p.slug}`,
            })),
          } as NavGroup,
        ]
      : []),
  ]
}
