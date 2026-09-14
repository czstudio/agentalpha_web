import type { Metadata } from "next"
import { getAllInterview, getCategoriesWithPosts, hasCover } from "@/lib/interview"
import { InterviewList } from "@/components/interview/interview-list"

export const metadata: Metadata = {
  title: "面试题库 · AgentAlpha 面试间",
  description:
    "按 8 个主题分类组织的 Agent 面试题库：RAG、Agent 架构、工具调用、多智能体、记忆系统、评测、项目实战与五厂真题集。题干来自面试官原话，解法附论文原文。",
  alternates: { canonical: "/interview" },
}

export default function InterviewPage() {
  const posts = getAllInterview()
  const covers = Object.fromEntries(posts.map((post) => [post.slug, hasCover(post.slug)]))
  // includeEmpty=false：还没篇目的分类（如 jingchang）不显示空卡
  const categories = getCategoriesWithPosts(false)
  const totalPlanned = categories.reduce((sum, category) => sum + category.planned, 0)
  return (
    <InterviewList
      posts={posts}
      covers={covers}
      categories={categories}
      totalPlanned={totalPlanned}
    />
  )
}
