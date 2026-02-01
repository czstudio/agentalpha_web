/**
 * Prisma 数据库种子脚本
 * 从 lib/data.ts 导入现有数据到数据库
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  universityPartners,
  communitiesPartners,
  communityMembers,
  communityNews,
  mentors,
  roadmapNodes,
  projects,
  papers,
  socialPlatforms,
} from '../lib/data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子数据填充...')

  // 1. 创建默认管理员账户
  console.log('\n👤 创建管理员账户...')
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456'
  const passwordHash = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
      email: 'admin@agentalpha.com',
    },
  })
  console.log(`✅ 管理员账户已创建: ${admin.username}`)

  // 2. 导入合作伙伴（高校 + 社区）
  console.log('\n🤝 导入合作伙伴...')
  const allPartners = [
    {
      name: "清华大学",
      logo: "/logos/tsinghua.svg",
      type: "university",
      url: "https://www.tsinghua.edu.cn",
    },
    {
      name: "北京大学",
      logo: "/logos/pku.svg",
      type: "university",
      url: "https://www.pku.edu.cn",
    },
    {
      name: "上海交通大学",
      logo: "/logos/sjtu.svg",
      type: "university",
      url: "https://www.sjtu.edu.cn",
    },
    {
      name: "复旦大学",
      logo: "/logos/fudan.svg",
      type: "university",
      url: "https://www.fudan.edu.cn",
    },
    {
      name: "上海财经大学",
      logo: "/logos/sufe.svg",
      type: "university",
      url: "https://www.sufe.edu.cn",
    },
    {
      name: "南方科技大学",
      logo: "/logos/sustech.svg",
      type: "university",
      url: "https://www.sustech.edu.cn",
    },
    ...communitiesPartners
  ]

  for (const [index, partner] of allPartners.entries()) {
    await prisma.partner.upsert({
        where: { id: (index + 1).toString() },
        update: {
            name: partner.name,
            logo: partner.logo,
            type: partner.type,
            url: partner.url,
            order: index,
        },
        create: {
            id: (index + 1).toString(),
            name: partner.name,
            logo: partner.logo,
            type: partner.type,
            url: partner.url,
            order: index,
        }
    })
  }
  console.log(`✅ 已导入 ${allPartners.length} 个合作伙伴`)

  // 3. 导入社区成员
  console.log('\n👥 导入社区成员...')
  for (const [index, member] of communityMembers.entries()) {
    await prisma.communityMember.create({
      data: {
        name: member.name,
        role: member.role,
        background: member.background,
        avatar: member.avatar,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${communityMembers.length} 个社区成员`)

  // 4. 导入导师
  console.log('\n🎓 导入导师信息...')
  for (const [index, mentor] of mentors.entries()) {
    await prisma.mentor.create({
      data: {
        name: mentor.name,
        title: mentor.title,
        company: mentor.company,
        expertise: JSON.stringify(mentor.expertise),
        skills: JSON.stringify(mentor.skills),
        avatar: mentor.avatar,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${mentors.length} 位导师`)

  // 5. 导入学习路径
  console.log('\n🗺️ 导入学习路径节点...')
  for (const [index, node] of roadmapNodes.entries()) {
    await prisma.roadmapNode.create({
      data: {
        title: node.title,
        description: node.description,
        link: node.link,
        level: node.level,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${roadmapNodes.length} 个学习路径节点`)

  // 6. 导入项目
  console.log('\n📚 导入项目列表...')
  for (const [index, project] of projects.entries()) {
    await prisma.project.create({
      data: {
        title: project.title,
        description: project.description,
        difficulty: project.difficulty,
        tags: JSON.stringify(project.tags),
        link: project.link,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${projects.length} 个项目`)

  // 7. 导入论文
  console.log('\n📄 导入论文列表...')
  for (const [index, paper] of papers.entries()) {
    await prisma.paper.create({
      data: {
        title: paper.title,
        category: paper.category,
        authors: paper.authors,
        venue: paper.venue,
        conference: paper.venue, // 使用 venue 作为 conference 显示
        year: paper.year,
        tags: '', // 初始化空标签，后台可编辑
        link: paper.link,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${papers.length} 篇论文`)

  // 7.5. 导入快速链接
  console.log('\n🔗 导入快速链接...')
  const quickLinks = [
    {
      title: '新人必逛',
      description: '入门路径 · 开源仓库 · 入门课 · 项目实操',
      href: '#onboard',
      order: 0,
    },
    {
      title: '高阶玩法',
      description: '论文合作 · 项目共创 · 工作内推',
      href: '#advanced',
      order: 1,
    },
    {
      title: 'Talk & 圆桌会',
      description: '顶会精读 · VisualQuality-R1 · 工具链拆解',
      href: '#talks',
      order: 2,
    },
    {
      title: '资源合集',
      description: '学习地图 · 工具包 · 模版与脚手架',
      href: '#resources',
      order: 3,
    },
    {
      title: '兄弟社区',
      description: 'QuantaAlpha · 青稞社区等伙伴生态',
      href: '#alliances',
      order: 4,
    },
  ]

  for (const link of quickLinks) {
    await prisma.quickLink.create({ data: link })
  }
  console.log(`✅ 已导入 ${quickLinks.length} 个快速链接`)

  // 8. 导入社区动态
  console.log('\n📰 导入社区动态...')
  for (const [index, newsItem] of communityNews.entries()) {
    await prisma.news.create({
      data: {
        title: newsItem.title,
        date: newsItem.date,
        category: newsItem.category,
        link: newsItem.link,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${communityNews.length} 条社区动态`)

  // 9. 导入社交媒体平台
  console.log('\n📱 导入社交媒体平台...')
  for (const [index, platform] of socialPlatforms.entries()) {
    await prisma.socialPlatform.create({
      data: {
        name: platform.name,
        icon: platform.icon,
        qrCode: platform.qrCode,
        description: platform.description,
        order: index,
      },
    })
  }
  console.log(`✅ 已导入 ${socialPlatforms.length} 个社交媒体平台`)

  // 10. 创建网站内容配置 (SiteContent) - 用于前端显示
  console.log('\n⚙️ 创建网站内容配置...')
  const siteContents = [
    // 统计数据 (Stats Section)
    {
      section: 'stats',
      key: 'stat1_label',
      value: '社群成员',
      type: 'text',
      description: '统计项1标题',
    },
    {
      section: 'stats',
      key: 'stat1_value',
      value: '5,000+',
      type: 'text',
      description: '统计项1数值',
    },
    {
      section: 'stats',
      key: 'stat1_note',
      value: '覆盖高校 / 大厂 / 创业者',
      type: 'text',
      description: '统计项1说明',
    },
    {
      section: 'stats',
      key: 'stat2_label',
      value: '技术 Talk',
      type: 'text',
      description: '统计项2标题',
    },
    {
      section: 'stats',
      key: 'stat2_value',
      value: '300+',
      type: 'text',
      description: '统计项2数值',
    },
    {
      section: 'stats',
      key: 'stat2_note',
      value: '深度分享与论文精读',
      type: 'text',
      description: '统计项2说明',
    },
    {
      section: 'stats',
      key: 'stat3_label',
      value: '项目共创',
      type: 'text',
      description: '统计项3标题',
    },
    {
      section: 'stats',
      key: 'stat3_value',
      value: '150+',
      type: 'text',
      description: '统计项3数值',
    },
    {
      section: 'stats',
      key: 'stat3_note',
      value: 'Agent 与多模态落地案例',
      type: 'text',
      description: '统计项3说明',
    },

    // 愿景 (Vision Section)
    {
      section: 'vision',
      key: 'vision_points',
      value: JSON.stringify([
        "真正的 AGI 还有十年，Agent 是必经之路，抓住浪潮才能不缺席。",
        "通过深度实践、知识共享与项目协作，拆解技术壁垒，转化为个人优势与实际价值。",
        "赋能每一人，决胜 Agent 十年。"
      ]),
      type: 'json',
      description: '愿景要点列表',
    },

    // 高阶玩法 (Advanced Section)
    {
      section: 'advanced',
      key: 'offerings',
      value: JSON.stringify([
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
      ]),
      type: 'json',
      description: '高阶玩法卡片内容',
    },

    // 训练营 (Training Section)
    {
      section: 'training',
      key: 'modules',
      value: JSON.stringify([
        { title: "基础掌握", desc: "LLM/多模态基石，代码能力强化与工程规范", icon: "BookOpen" },
        { title: "Agent 架构", desc: "规划/记忆/工具调用与评测，真实业务案例拆解", icon: "Brain" },
        { title: "项目共创", desc: "实战项目组队，导师答疑与代码评审", icon: "Cpu" },
        { title: "职业跃迁", desc: "作品集打磨、面试工作坊、导师推荐与内推", icon: "Rocket" },
      ]),
      type: 'json',
      description: '训练营模块介绍',
    },
  ]

  for (const content of siteContents) {
    // 使用 upsert 避免重复
    await prisma.siteContent.upsert({
      where: {
        section_key: {
          section: content.section,
          key: content.key
        }
      },
      update: content,
      create: content,
    })
  }
  console.log(`✅ 已创建 ${siteContents.length} 个网站内容配置`)

  // 11. 创建系统配置 (保留以备后用)

  console.log('\n✨ 数据库种子数据填充完成！\n')
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
