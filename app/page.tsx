import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarCheck,
  ChevronRight,
  Compass,
  Cpu,
  FileText,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  GraduationCap,
  Map,
  Lightbulb,
  Target,
  ExternalLink,
  Flame,
  Github,
  FileBadge,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"
export const revalidate = 0

// 图标映射表
const iconMap: Record<string, any> = {
  Compass,
  ShieldCheck,
  FileText,
  BookOpen,
  Map,
  Lightbulb,
  Rocket,
  Target,
}

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
    const content: Record<string, any> = {}
    siteContents.forEach((item) => {
      if (!content[item.section]) {
        content[item.section] = {}
      }
      // 如果是 JSON 类型，自动解析
      if (item.type === 'json') {
        try {
          content[item.section][item.key] = JSON.parse(item.value)
        } catch {
          content[item.section][item.key] = item.value
        }
      } else {
        content[item.section][item.key] = item.value
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
      content,
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
      content: {},
      qingkeTalks: [],
      qingkeVideos: [],
    }
  }
}

// 训练营模块图标映射
const trainingIconMap: Record<string, any> = {
  BookOpen,
  Brain,
  Cpu,
  Rocket,
}

export default async function Home() {
  const data = await getData()
  const c = data.content || {} // 简化内容访问

  // 辅助函数：确保值是数组
  const ensureArray = (value: any, defaultValue: any[] = []) => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : defaultValue
      } catch {
        return defaultValue
      }
    }
    return defaultValue
  }

  // 构建统计数据（从配置加载）
  const stats = c.stats ? [
    { label: c.stats.stat1_label || "社群成员", value: c.stats.stat1_value || "5,000+", note: c.stats.stat1_note || "覆盖高校 / 大厂 / 创业者" },
    { label: c.stats.stat2_label || "技术 Talk", value: c.stats.stat2_value || "300+", note: c.stats.stat2_note || "深度分享与论文精读" },
    { label: c.stats.stat3_label || "项目共创", value: c.stats.stat3_value || "150+", note: c.stats.stat3_note || "Agent 与多模态落地案例" },
  ] : [
    { label: "社群成员", value: "5,000+", note: "覆盖高校 / 大厂 / 创业者" },
    { label: "技术 Talk", value: "300+", note: "深度分享与论文精读" },
    { label: "项目共创", value: "150+", note: "Agent 与多模态落地案例" },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />

      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden premium-gradient pt-16 md:pt-20">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        {/* 背景装饰 - 移动端隐藏避免干扰 */}
        <div className="hidden md:block absolute -left-40 top-40 h-64 w-64 rounded-full blur-3xl bg-primary/15" />
        <div className="hidden md:block absolute -right-32 bottom-10 h-72 w-72 rounded-full blur-3xl bg-accent/15" />

        <div className="relative z-10 section-shell py-16 md:py-28 lg:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8 md:space-y-10 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-3 px-4 py-2 md:px-5 md:py-2.5 rounded-full glass-card neon-border">
              <Sparkles className="w-4 h-4 md:w-4 md:h-4 text-primary" />
              <span className="text-sm md:text-base font-medium text-foreground/80">{c.hero?.badge_text || "赋能每一人 · 决胜 Agent 十年"}</span>
            </div>

            <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-balance px-4 md:px-0">
              <span className="premium-text-gradient">{c.hero?.title_highlight || "AgentAlpha"}</span>
              <br />
              <span className="text-foreground">{c.hero?.title_normal || "链接顶尖研究者、工程师与创业者"}</span>
            </h1>

            <p className="text-base md:text-lg text-foreground/70 leading-relaxed max-w-3xl mx-auto px-4 md:px-0">
              {c.hero?.subtitle || "Agent 是通往 AGI 的必经之路。我们用深度实践、知识共享与项目协作，帮助你把握浪潮、积累作品、取得实绩。"}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4 md:px-0">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto group relative overflow-hidden bg-gradient-to-r from-primary via-primary to-accent hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 text-base md:text-lg px-8 md:px-10 py-6 md:py-7 border-0 shimmer"
              >
                <a href={c.hero?.cta_primary_link || "#join"}>
                  <span className="relative z-10 font-bold">{c.hero?.cta_primary_text || "加入训练营"}</span>
                  <ArrowRight className="relative z-10 ml-2 h-4 md:h-5 w-4 md:w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base md:text-lg px-8 md:px-10 py-6 md:py-7 glass-card hover:bg-primary/10 border-primary/30 neon-border font-semibold bg-transparent"
              >
                <a href={c.hero?.cta_secondary_link || "#contact"}>{c.hero?.cta_secondary_text || "商务/合作"}</a>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-8 md:pt-12 px-4 md:px-0">
              {stats.map((item) => (
                <div key={item.label} className="glass-card rounded-2xl p-5 md:p-6 text-left hover:scale-105 transition-transform duration-300">
                  <div className="text-xs md:text-sm text-foreground/60 mb-2 uppercase tracking-wider">{item.label}</div>
                  <div className="text-2xl md:text-3xl font-bold mt-2 mb-2 premium-text-gradient">{item.value}</div>
                  <div className="text-xs md:text-sm text-foreground/60 mt-2">{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="vision" className="relative py-24 md:py-40 lg:py-48 premium-gradient overflow-hidden">
        <div className="section-shell relative z-10">
          <div className="panel p-10 sm:p-12 md:p-16 lg:p-20">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <p className="tag-pill">{c.vision?.tag || "愿景与目标"}</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-10 leading-tight">{c.vision?.title || "Agent 时代的共赢社区"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12">
              <div className="space-y-5 md:space-y-6">
                {ensureArray(c.vision?.vision_points, [
                  "真正的 AGI 还有十年，Agent 是必经之路，抓住浪潮才能不缺席。",
                  "通过深度实践、知识共享与项目协作，拆解技术壁垒，转化为个人优势与实际价值。",
                  "赋能每一人，决胜 Agent 十年。"
                ]).map((point: string) => (
                  <div key={point} className="glass-card rounded-2xl p-6 md:p-7 flex gap-4 items-start hover:scale-[1.02] transition-transform duration-300">
                    <div className="w-2.5 h-2.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <p className="text-foreground/80 leading-relaxed text-base md:text-lg">{point}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-3xl p-8 md:p-10 space-y-5">
                <h3 className="text-2xl md:text-3xl font-semibold">{c.vision?.offerings_title || "我们提供"}</h3>
                <ul className="space-y-3 text-foreground/70 text-base md:text-lg leading-relaxed">
                  {ensureArray(c.vision?.offerings, [
                    "系统化学习路径与实践手册",
                    "技术导师与行业专家一对一指导",
                    "论文笔记、前沿 talk、案例共创",
                    "作品集打磨、简历与面试辅导、内推"
                  ]).map((item: string) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
                <div className="rounded-2xl bg-primary/10 border border-primary/30 p-6 text-base md:text-lg text-foreground/80 leading-relaxed">
                  {c.vision?.bottom_note || "我们通过「学习—实战—输出—共创」的飞轮，帮助成员将洞察转化为实绩。"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid-overlay" />
      </section>

      <section id="advanced" className="relative py-24 md:py-40 lg:py-48">
        <div className="section-shell space-y-16">
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-6 h-6 text-accent" />
            <p className="tag-pill">{c.advanced?.tag || "高阶玩法"}</p>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">{c.advanced?.title || "深度共创 · 论文/项目/求职全链路"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {ensureArray(c.advanced?.offerings, [
              {
                title: "如果你想入门大模型 Agent",
                bullets: ["学习路径与开源仓库推荐", "入门课 + 实战项目", "志同道合的交流社区"],
              },
              {
                title: "如果你想进一步合作 / 论文 / 求职",
                bullets: ["论文合作与实验共建", "产业落地项目合作", "大厂工作内推与面试辅导"],
              },
              {
                title: "如果你希望寻求合作",
                bullets: ["共建社区品牌", "联合宣传与活动", "AI 产品与培训辅导"],
              },
            ]).map((block: any) => (
              <div key={block.title} className="glass-card rounded-3xl p-8 md:p-10 space-y-6 hover:scale-[1.02] transition-all duration-300">
                <h3 className="text-lg md:text-xl font-semibold leading-tight">{block.title}</h3>
                <ul className="space-y-3 text-foreground/70 text-base md:text-lg leading-relaxed">
                  {block.bullets.map((item: string) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 资源合集 - 仅在有数据时显示 */}
      {data.resources && data.resources.length > 0 && (
        <section id="resources" className="relative py-20 md:py-28 lg:py-32 premium-gradient overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="section-shell relative z-10">
            {/* 标题区域 */}
            <div className="text-center mb-16 md:mb-20">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-6">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-base font-medium text-foreground/80">{c.resources?.tag || "资源合集"}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold premium-text-gradient mb-4">
                学习与探索
              </h2>
              <p className="text-foreground/60 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                精心整理的学习资源，助你快速掌握 Agent 核心技术
              </p>
            </div>

            {/* 两栏布局：左边资源卡片，右边社区项目 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
              {/* 左侧：进阶之路资源卡片 */}
              <div className="space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">进阶之路</h3>
                <div className="grid grid-cols-1 gap-6">
                  {data.resources.map((item: any) => {
                    const IconComponent = iconMap[item.icon] || BookOpen
                    return (
                      <a
                        key={item.id}
                        href={item.link || '#'}
                        target={item.link ? '_blank' : '_self'}
                        rel={item.link ? 'noopener noreferrer' : ''}
                        className="group relative glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 block"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base md:text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
                            <p className="text-foreground/60 text-sm leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* 右侧：社区项目/论文 */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">社区项目 / 论文</h3>
                </div>

                {/* Idea2Story 项目展示 */}
                <div className="group relative glass-card rounded-2xl p-6 md:p-8 overflow-hidden hover:-translate-y-1 transition-all duration-300">
                  {/* 背景光效 */}
                  <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-gradient-to-br from-orange-500/20 via-red-500/15 to-transparent blur-3xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-gradient-to-br from-primary/10 via-accent/10 to-transparent blur-3xl group-hover:scale-150 transition-transform duration-700" />

                  <div className="relative">
                    {/* 顶部标签与链接 */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 text-sm font-semibold border border-orange-500/20">
                        <Flame className="w-3.5 h-3.5" />
                        重磅发布
                      </span>
                      <span className="text-sm text-foreground/40">Hugging Face Papers · GitHub</span>
                    </div>

                    {/* 项目标题 */}
                    <h4 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                      Idea2Story
                    </h4>

                    {/* 项目描述 */}
                    <p className="text-foreground/70 leading-relaxed mb-6 text-sm md:text-base">
                      从 idea 自动生成顶会级别论文叙事的 Agent 框架。基于上万篇顶会论文及其 Review 数据训练，让 AI 学会 <span className="text-primary font-medium">"Scientific Storytelling"</span>。
                    </p>

                    {/* 核心特点 */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <FileBadge className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">万级论文数据</div>
                          <div className="text-xs text-foreground/50">收集并清洗上万篇顶会论文及 Review 数据</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
                        <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">自动叙事构建</div>
                          <div className="text-xs text-foreground/50">学习顶会套路，自动生成完整学术叙事</div>
                        </div>
                      </div>
                    </div>

                    {/* 社区贡献者 */}
                    <div className="flex items-center gap-2 text-xs text-foreground/60 mb-6 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
                      <Users className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>AgentAlpha 社区 <span className="text-primary font-semibold">BATman</span> 们的重磅开源成果</span>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://huggingface.co/papers/2601.20833"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                        查看论文
                      </a>
                      <a
                        href="https://github.com/AgentAlphaAGI/Idea2Paper"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-card border border-foreground/20 text-foreground font-medium text-sm hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <Github className="w-4 h-4" />
                        Star on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid-overlay opacity-50" />
        </section>
      )}

      {/* Talk & 圆桌会 - 独立section，始终显示 */}
      <section id="talks" className="relative py-20 md:py-28 lg:py-32 premium-gradient overflow-hidden">
        <div className="section-shell relative z-10 space-y-10">
          <div className="panel p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent" />
                <p className="tag-pill">{c.resources?.papers_tag || "Talk & 圆桌会 · 论文精读"}</p>
              </div>
              <a
                href="https://qingkeai.online/talk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                更多青稞Talk <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* 青稞Talk内容 - 前三行 */}
            {data.qingkeTalks && data.qingkeTalks.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 font-medium">来自青稞社区</span>
                  <span className="text-xs text-foreground/50">实时同步最新内容</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
                  {data.qingkeTalks.slice(0, 3).map((talk: any) => (
                    <a
                      key={talk.id}
                      href={talk.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative glass-card rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    >
                      {/* 封面图片 */}
                      <div className="relative h-40 md:h-44 overflow-hidden">
                        <img
                          src={talk.cover}
                          alt={talk.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                          {talk.tags?.slice(0, 2).map((tag: string, idx: number) => (
                            <span key={idx} className="text-sm px-3 py-1 rounded-full bg-primary/80 text-white">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* 内容 */}
                      <div className="p-5 space-y-2">
                        <h4 className="text-base md:text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {talk.title}
                        </h4>
                        <p className="text-foreground/60 text-sm line-clamp-2">{talk.excerpt}</p>
                        <div className="flex items-center gap-2 text-xs text-foreground/50">
                          <span>📍 {talk.author}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 视频直播轮播 - 来自青稞社区 */}
            {data.qingkeVideos && data.qingkeVideos.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      视频 & 直播
                    </span>
                    <span className="text-sm text-foreground/50">来自青稞社区</span>
                  </div>
                </div>
                <div className="relative overflow-hidden py-6">
                  <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-card to-transparent z-10" />
                  <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent z-10" />
                  <div className="flex gap-8 animate-scroll">
                    {[...data.qingkeVideos, ...data.qingkeVideos].map((video: any, index: number) => (
                      <a
                        key={`${video.id}-carousel-${index}`}
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex-shrink-0 w-80 sm:w-96 md:w-[28rem] glass-card rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                      >
                        {/* 封面图片 */}
                        <div className="relative h-52 md:h-56 overflow-hidden">
                          <img
                            src={video.cover}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          {/* 类型标签 */}
                          <div className="absolute top-3 left-3">
                            <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                              video.type === 'live'
                                ? 'bg-red-500/90 text-white'
                                : 'bg-blue-500/90 text-white'
                            }`}>
                              {video.type === 'live' ? '🔴 直播' : '▶️ 视频'}
                            </span>
                          </div>
                          {/* 底部标签 */}
                          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                            {video.tags?.slice(0, 2).map((tag: string, idx: number) => (
                              <span key={idx} className="text-sm px-3 py-1 rounded-full bg-primary/80 text-white">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* 内容 */}
                        <div className="p-6 space-y-3">
                          <h4 className="text-base md:text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-foreground/60 text-base line-clamp-2">{video.excerpt}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid-overlay" />
      </section>

      <section id="join" className="relative py-24 md:py-40 lg:py-48 premium-gradient overflow-hidden">
        <div className="section-shell relative z-10 space-y-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-8">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-base font-medium text-foreground/80">{c.training?.badge || "训练营 & 加入方式"}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold premium-text-gradient mb-6">加入我们</h2>
          </div>
          <div className="panel p-10 sm:p-12 md:p-16 lg:p-20 rounded-3xl space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {ensureArray(c.training?.modules, [
                { title: "基础掌握", desc: "LLM/多模态基石，代码能力强化与工程规范", icon: "BookOpen" },
                { title: "Agent 架构", desc: "规划/记忆/工具调用与评测，真实业务案例拆解", icon: "Brain" },
                { title: "项目共创", desc: "实战项目组队，导师答疑与代码评审", icon: "Cpu" },
                { title: "职业跃迁", desc: "作品集打磨、面试工作坊、导师推荐与内推", icon: "Rocket" },
              ]).map((module: any) => {
                const IconComponent = trainingIconMap[module.icon] || BookOpen
                return (
                  <div key={module.title} className="glass-card rounded-3xl p-8 space-y-4 hover:scale-[1.02] transition-transform duration-300">
                    <IconComponent className="w-7 h-7 text-primary" />
                    <h4 className="text-lg md:text-xl font-semibold">{module.title}</h4>
                    <p className="text-foreground/70 text-base md:text-lg leading-relaxed">{module.desc}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between pt-6">
              <div className="space-y-3">
                <h3 className="text-3xl md:text-4xl font-bold">{c.training?.headline || "深度实践 + 导师答疑 + 项目共创"}</h3>
                <p className="text-foreground/70 text-base md:text-lg leading-relaxed">
                  {c.training?.description || "作品集打磨、代码评审、周会复盘、内推推荐。每期控制人数，保证互动质量。"}
                </p>
              </div>
              <div className="flex gap-4">
                <Button size="lg" className="shimmer bg-gradient-to-r from-primary to-accent border-0 text-base md:text-lg px-8 py-6" asChild>
                  <a href={c.training?.primary_cta_href || "#join"}>{c.training?.primary_cta_label || "立即报名"}</a>
                </Button>
                <Button size="lg" variant="outline" className="glass-card border-primary/30 text-base md:text-lg px-8 py-6" asChild>
                  <a href={c.training?.secondary_cta_href || "#contact"}>{c.training?.secondary_cta_label || "咨询顾问"}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid-overlay" />
      </section>

      <section id="contact" className="relative py-24 md:py-40 lg:py-48">
        <div className="section-shell">
          <div className="panel p-10 sm:p-12 md:p-16 lg:p-20 rounded-3xl flex flex-col md:flex-row gap-16 items-start justify-between">
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-6 h-6 text-primary" />
                <p className="tag-pill">{c.contact?.tag || "合作 & 咨询"}</p>
              </div>
              <h3 className="text-4xl md:text-5xl font-bold">{c.contact?.title || "公众号 AgentAlpha"}</h3>
              <p className="text-foreground/70 leading-relaxed text-base md:text-lg">
                {c.contact?.description || "共建社区 / 宣传合作 / AI 产品 / 培训辅导，或需要论文、项目、求职支持，扫码关注公众号了解更多。"}
              </p>
              <div className="flex flex-wrap gap-3 text-base text-foreground/80">
                {ensureArray(c.contact?.tags, ["共建社区", "宣传工作", "AI 产品", "培训辅导"]).map((tag: string) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>
            {data.socialPlatforms && data.socialPlatforms.length > 0 && (
              <div className="w-full md:w-96 h-96 glass-card rounded-3xl flex items-center justify-center border-dashed border-2 border-primary/40 text-foreground/50 text-base text-center px-6">
                <div className="space-y-4 text-center">
                  <img
                    src={data.socialPlatforms[0].qrCode}
                    alt={data.socialPlatforms[0].name}
                    className="w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-2xl mx-auto soft-glow hover:scale-110 hover:shadow-3xl transition-all duration-500 cursor-pointer"
                    loading="lazy"
                  />
                  <div className="text-foreground/70 text-base font-medium">{data.socialPlatforms[0].name}</div>
                </div>
              </div>
            )}
          </div>
          {data.socialPlatforms && data.socialPlatforms.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {data.socialPlatforms.map((platform: any) => (
                <div key={platform.id} className="glass-card rounded-2xl p-8 flex items-center gap-5 hover:shadow-lg transition-all">
                  <img
                    src={platform.qrCode}
                    alt={platform.name}
                    className="w-28 h-28 object-cover rounded-xl border border-primary/30 hover:scale-110 transition-transform duration-500 cursor-pointer"
                    loading="lazy"
                  />
                  <div className="text-base">
                    <div className="font-semibold text-lg">{platform.name}</div>
                    <div className="text-foreground/60">{platform.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center py-12 text-foreground/60">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无联系方式</p>
              <p className="text-sm mt-2">请在后台管理系统中添加社交平台</p>
            </div>
          )}
        </div>
      </section>

      {/* 合作院校展示区域 */}
      <section id="universities" className="relative py-24 md:py-40 lg:py-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/5 to-background" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="section-shell relative z-10 space-y-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-card neon-border">
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="text-base font-medium">{c.universities?.tag || "合作院校"}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black premium-text-gradient">
              {c.universities?.title || "顶尖学府携手共建"}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              {c.universities?.description || "与国内外顶尖高校建立深度合作，汇聚学术资源，推动 AI 研究与产业落地"}
            </p>
          </div>

          {data.universities.length > 0 ? (
            <div className="relative overflow-hidden py-10">
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
              <div className="flex gap-10 animate-scroll">
                {[...data.universities, ...data.universities].map((university: any, index: number) => (
                  <a
                    key={`${university.id}-${index}`}
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-40 h-40 sm:w-48 sm:h-48 glass-card rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 hover:scale-110 transition-all group"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/90 dark:bg-white/80 p-3 sm:p-4 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-sm">
                      <img
                        src={university.logo}
                        alt={university.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-sm text-foreground/60 text-center font-medium">{university.name}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-foreground/60">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无合作院校信息</p>
              <p className="text-sm mt-2">请在后台管理系统中添加</p>
            </div>
          )}
        </div>
      </section>

      {/* 兄弟社区section已隐藏 - 仅在导航栏下拉菜单中显示 */}
    </main>
  )
}
