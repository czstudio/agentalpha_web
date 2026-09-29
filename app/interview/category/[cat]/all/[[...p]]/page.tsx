import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getCategoriesWithPosts, getCategory } from "@/lib/interview"

const SITE = "https://agentalpha.top"
const PAGE_SIZE = 48

interface PageProps {
  params: Promise<{ cat: string; p?: string[] }>
}

function parsePage(segments: string[] | undefined): number {
  if (!segments || segments.length === 0) return 1
  const n = Number.parseInt(segments[0], 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function generateStaticParams() {
  // 每个分类 1..N 页（只有一页的分类也生成 /all 首页）
  const all = getCategoriesWithPosts(true)
  const params: { cat: string; p: string[] }[] = []
  for (const c of all) {
    const pages = Math.max(1, Math.ceil(c.count / PAGE_SIZE))
    for (let i = 1; i <= pages; i++) {
      params.push({ cat: c.cat, p: i === 1 ? [] : [String(i)] })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cat, p } = await params
  const category = getCategory(cat)
  if (!category) return {}
  const page = parsePage(p)
  return {
    title: `${category.name}全部题目（第 ${page} 页）· Agent 面试题库`,
    description: `${category.intro}全部题目列表第 ${page} 页。`,
    alternates: { canonical: page === 1 ? `/interview/category/${cat}/all` : `/interview/category/${cat}/all/${page}` },
  }
}

export default async function CategoryAllPage({ params }: PageProps) {
  const { cat, p } = await params
  const category = getCategory(cat)
  if (!category) notFound()
  const self = getCategoriesWithPosts(true).find((item) => item.cat === cat)
  if (!self) notFound()

  const page = parsePage(p)
  const posts = self.posts
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  if (page > pages) notFound()

  const slice = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const base = `/interview/category/${cat}/all`

  const pagination = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) {
      pagination.push(i)
    } else if (pagination[pagination.length - 1] !== -1) {
      pagination.push(-1)
    }
  }

  return (
    <main>
      <div className="ivu-wide" style={{ "--cc": `var(--cat-${cat})` } as React.CSSProperties}>
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <Link href={`/interview/category/${cat}`}>{category.name}</Link>
          <span className="sep">/</span>
          <span className="cur">全部题目</span>
        </nav>

        <header className="ivu-cathead">
          <div className="ivu-cathead-kicker">{category.cat.toUpperCase()} · ALL</div>
          <h1 className="ivu-cathead-title">{category.name} · 全部题目</h1>
          <p className="ivu-cathead-intro">
            共 {posts.length} 篇，本页第 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, posts.length)} 篇。
            <Link href={`/interview/category/${cat}`}>← 回到学习路径视图</Link>
          </p>
        </header>

        <div className="ivu-catlist">
          {slice.map((post) => (
            <Link key={post.slug} href={`/interview/${post.slug}`} className="ivu-rowitem">
              <span className="ivu-rowitem-no">No.{post.no}</span>
              <span className="ivu-rowitem-main">
                <span className="ivu-rowitem-title">{post.title}</span>
                <span className="ivu-rowitem-q">{post.excerpt.slice(0, 60)}…</span>
              </span>
              <span className="ivu-rowitem-go">→</span>
            </Link>
          ))}
        </div>

        {pages > 1 ? (
          <nav className="ivu-pager" aria-label="分页">
            {page > 1 ? (
              <Link className="ivu-pager-btn" href={page - 1 === 1 ? base : `${base}/${page - 1}`}>
                ← 上一页
              </Link>
            ) : null}
            {pagination.map((i) =>
              i === -1 ? (
                <span key={`gap-${i}-${Math.random()}`} className="ivu-pager-gap">…</span>
              ) : (
                <Link
                  key={i}
                  className={`ivu-pager-btn${i === page ? " is-cur" : ""}`}
                  href={i === 1 ? base : `${base}/${i}`}
                >
                  {i}
                </Link>
              ),
            )}
            {page < pages ? (
              <Link className="ivu-pager-btn" href={`${base}/${page + 1}`}>
                下一页 →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </main>
  )
}
