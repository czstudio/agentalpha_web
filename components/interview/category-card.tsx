import Link from "next/link"
import type { InterviewCategoryWithCount } from "@/lib/interview"

/**
 * 分类卡（列表页置顶 + 分类页「其他分类」共用）。
 * 左侧 3px 分类识别色条，右下进度条显示「已上线 / 规划篇数」的完成度——
 * 这是对标站没有的一层信息：读者一眼能看到每个分类的填充进度。
 */
export function CategoryCard({ category }: { category: InterviewCategoryWithCount }) {
  const progress = category.planned
    ? Math.min(100, Math.round((category.count / category.planned) * 100))
    : 0
  return (
    <Link
      href={`/interview/category/${category.cat}`}
      className="ivu-catcard"
      style={{ "--cc": `var(--cat-${category.cat})` } as React.CSSProperties}
    >
      <div className="ivu-catcard-top">
        <h3 className="ivu-catcard-name">{category.name}</h3>
        <span className="ivu-catcard-count">
          {category.count}
          <span style={{ color: "var(--ink-3)" }}>/{category.planned}</span>
        </span>
      </div>
      <p className="ivu-catcard-intro">{category.intro}</p>
      <div className="ivu-catcard-bar">
        <span className="ivu-catcard-track">
          <span className="ivu-catcard-fill" style={{ width: `${progress}%` }} />
        </span>
        <span>{progress}%</span>
      </div>
    </Link>
  )
}
