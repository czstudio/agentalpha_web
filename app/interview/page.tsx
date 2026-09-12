import type { Metadata } from "next"
import { getAllInterview, hasCover } from "@/lib/interview"
import { InterviewList } from "@/components/interview/interview-list"

export const metadata: Metadata = {
  title: "面试题库 · AgentAlpha 面试间",
  description:
    "15 道真实面试场上的 Agent 题：FunctionCall、RAG、MultiAgent、ReAct、Memory、规划与企业级落地，按面试官的问法拆给你看。",
  alternates: { canonical: "/interview" },
}

export default function InterviewPage() {
  const posts = getAllInterview()
  const covers = Object.fromEntries(posts.map((post) => [post.slug, hasCover(post.slug)]))
  return <InterviewList posts={posts} covers={covers} />
}
