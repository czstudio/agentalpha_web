import { Navigation } from "@/components/navigation"
import { HomeContent } from "@/components/home-content"
import { prisma } from "@/lib/prisma"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"
export const revalidate = 0

// 获取数据的服务端函数 - 直接使用 Prisma
async function getData() {
  noStore()
  try {
    // 并行获取所有数据
    const [members, mentors, projects, papers, partners, news, socialPlatforms, quickLinks, resources, siteContents] = await Promise.all([
      prisma.communityMember.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.mentor.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.project.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.paper.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.partner.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.news.findMany({
        where: { isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.socialPlatform.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.quickLink.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.resource.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.siteContent.findMany({
        orderBy: [{ section: 'asc' }, { order: 'asc' }],
      }),
    ])

    // 获取青稞Talk数据
    let qingkeTalks: any[] = []
    try {
      const qingkeRes = await fetch('https://qingkeai.online/apis/api.content.halo.run/v1alpha1/posts?page=1&size=3&categoryName=talk', {
        next: { revalidate: 3600 }
      })
      if (qingkeRes.ok) {
        const qingkeData = await qingkeRes.json()
        qingkeTalks = qingkeData.items?.map((item: any) => ({
          id: item.metadata?.name || '',
          title: item.spec?.title || '',
          cover: item.spec?.cover?.startsWith('http')
            ? item.spec.cover
            : `https://qingkeai.online${item.spec?.cover || ''}`,
          excerpt: item.status?.excerpt || '',
          link: `https://qingkeai.online${item.status?.permalink || ''}`,
          tags: item.tags?.map((t: any) => t.spec?.displayName).filter(Boolean) || [],
          author: item.owner?.displayName || '青稞社区',
        })) || []
      }
    } catch (e) {
      console.error('获取青稞Talk失败:', e)
      // 使用静态备用数据
      qingkeTalks = [
        {
          id: '1',
          title: '大模型强化学习算法PPO、GRPO、DAPO、GSPO、SAPO的演进与对比',
          cover: 'https://pic2.zhimg.com/v2-5c8f403cb75921278da158d4f970db9d_1440w.jpg',
          excerpt: '本文面向已了解强化学习中策略梯度、优势函数等概念的读者，重点对大模型强化学习算法进行对比。',
          link: 'https://qingkeai.online/archives/PPO-GRPO-DAPO-GSPO-SAPO',
          tags: ['RL', '强化学习'],
          author: '青稞社区',
        },
        {
          id: '2',
          title: '小米大模型团队提出BTL-UI：基于直觉-思考-关联的GUI Agent推理',
          cover: 'https://qingkeai.online/upload/640%20(2).png',
          excerpt: '本文作者来自小米大模型 Plus 团队，提出了一种新的GUI Agent推理框架。',
          link: 'https://qingkeai.online/archives/BTL-UI',
          tags: ['AI Agent'],
          author: '青稞社区',
        },
        {
          id: '3',
          title: '在看完近50篇VLA+RL工作之后......',
          cover: 'https://qingkeai.online/upload/unnamed%20(1)-KKeY.png',
          excerpt: '视觉-语言-动作 + 强化学习：VLA+RL 最新研究全景。',
          link: 'https://qingkeai.online/archives/VLA-RL',
          tags: ['VLA', 'RL'],
          author: '青稞社区',
        }
      ]
    }

    // 视频直播数据 - 从青稞社区获取
    const qingkeVideos = [
      {
        id: 'video-1',
        title: '深度对话！2025 "青稞" AI 嘉年华，与 20+ 位青年科学家一起探讨AI 技术瞬间',
        cover: 'https://qingkeai.online/upload/%E7%94%BB%E6%9D%BF%201%20%E5%89%AF%E6%9C%AC-100.jpg',
        excerpt: '本次活动专为青年科学家打造，旨在搭建一场 AI 技术的深度对话，来自学术和工业界的 20+ 青年科学家，将与大家一起回顾 2025，展望 2026！',
        link: 'https://qingkeai.online/archives/2025-AI-Meetup',
        tags: ['直播', 'AI嘉年华'],
        type: 'live',
      },
      {
        id: 'video-2',
        title: 'TRPO重生：大模型时代的信任域策略优化',
        cover: 'https://qingkeai.online/upload/Canvas%20%E2%80%93%20902.png',
        excerpt: '在大型语言模型的强化学习阶段，特别是RLHF中，我们追求策略的持续优化。本次分享深入探讨TRPO在LLM时代的应用。',
        link: 'https://qingkeai.online/archives/TRPO',
        tags: ['RL', 'TRPO'],
        type: 'video',
      },
      {
        id: 'video-3',
        title: '从 π_0 到 π_RL：面向流匹配 VLA 的强化学习后训练框架',
        cover: 'https://qingkeai.online/upload/Canvas%20%E2%80%93%20894.png',
        excerpt: '深入解析流匹配VLA的强化学习后训练框架π_RL，探索具身智能的前沿技术。',
        link: 'https://qingkeai.online/archives/%CF%80_RL',
        tags: ['VLA', 'π_RL'],
        type: 'video',
      },
      {
        id: 'video-4',
        title: 'RLinf：面向具身智能的"渲训推一体化"开源强化训练框架',
        cover: 'https://qingkeai.online/upload/Canvas%20%E2%80%93%20885.png',
        excerpt: '开源强化训练框架RLinf，实现渲染、训练、推理一体化，加速具身智能研发。',
        link: 'https://qingkeai.online/archives/RLinf',
        tags: ['具身智能', 'RLinf'],
        type: 'video',
      },
      {
        id: 'video-5',
        title: 'RLinf-VLA 实践：从零上手 VLA（OpenVLA）强化学习',
        cover: 'https://qingkeai.online/upload/Canvas%20%E2%80%93%20890.png',
        excerpt: '手把手教你使用RLinf-VLA框架进行OpenVLA强化学习实践，入门具身智能开发。',
        link: 'https://qingkeai.online/archives/RLinf-VLA',
        tags: ['VLA', '实践'],
        type: 'video',
      },
    ]

    // 将数据分组并映射字段
    const universities = partners
      .filter(p => p.type === 'university')
      .map(p => ({ ...p, website: p.url }))

    const communities = partners
      .filter(p => p.type === 'community')
      .map(p => ({ ...p, website: p.url }))

    // 将网站内容按 section 分组并转换为易用格式
    const siteContent: Record<string, any> = {}
    siteContents.forEach((item) => {
      if (!siteContent[item.section]) {
        siteContent[item.section] = {}
      }
      // 如果是 JSON 类型，自动解析
      if (item.type === 'json') {
        try {
          siteContent[item.section][item.key] = JSON.parse(item.value)
        } catch {
          siteContent[item.section][item.key] = item.value
        }
      } else {
        siteContent[item.section][item.key] = item.value
      }
    })

    return {
      members,
      mentors,
      projects,
      papers,
      universities,
      communities,
      news,
      socialPlatforms,
      quickLinks,
      resources,
      siteContent,
      qingkeTalks,
      qingkeVideos,
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    // 返回空数据
    return {
      members: [],
      mentors: [],
      projects: [],
      papers: [],
      universities: [],
      communities: [],
      news: [],
      socialPlatforms: [],
      quickLinks: [],
      resources: [],
      siteContent: {},
      qingkeTalks: [],
      qingkeVideos: [],
    }
  }
}

export default async function Home() {
  const data = await getData()

  return (
    <>
      <Navigation />
      <HomeContent data={data} />
    </>
  )
}
