/**
 * 初始化网站内容配置
 * 将所有前端硬编码文本迁移到数据库
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 网站内容配置数据
const siteContents = [
  // ========== Hero 区块 ==========
  {
    section: 'hero',
    key: 'badge_text',
    value: '赋能每一人 · 决胜 Agent 十年',
    type: 'text',
    description: 'Hero 区域顶部标签文案',
    order: 1,
  },
  {
    section: 'hero',
    key: 'title_highlight',
    value: 'AgentAlpha',
    type: 'text',
    description: 'Hero 标题高亮文字',
    order: 2,
  },
  {
    section: 'hero',
    key: 'title_normal',
    value: '链接顶尖研究者、工程师与创业者',
    type: 'text',
    description: 'Hero 标题普通文字',
    order: 3,
  },
  {
    section: 'hero',
    key: 'subtitle',
    value: 'Agent 是通往 AGI 的必经之路。我们用深度实践、知识共享与项目协作，帮助你把握浪潮、积累作品、取得实绩。',
    type: 'text',
    description: 'Hero 副标题',
    order: 4,
  },
  {
    section: 'hero',
    key: 'cta_primary_text',
    value: '加入训练营',
    type: 'text',
    description: '主要按钮文字',
    order: 5,
  },
  {
    section: 'hero',
    key: 'cta_primary_link',
    value: '#join',
    type: 'text',
    description: '主要按钮链接',
    order: 6,
  },
  {
    section: 'hero',
    key: 'cta_secondary_text',
    value: '商务/合作',
    type: 'text',
    description: '次要按钮文字',
    order: 7,
  },
  {
    section: 'hero',
    key: 'cta_secondary_link',
    value: '#contact',
    type: 'text',
    description: '次要按钮链接',
    order: 8,
  },

  // ========== Stats 统计数据 ==========
  {
    section: 'stats',
    key: 'stat1_label',
    value: '社群成员',
    type: 'text',
    description: '统计项1标签',
    order: 1,
  },
  {
    section: 'stats',
    key: 'stat1_value',
    value: '5,000+',
    type: 'text',
    description: '统计项1数值',
    order: 2,
  },
  {
    section: 'stats',
    key: 'stat1_note',
    value: '覆盖高校 / 大厂 / 创业者',
    type: 'text',
    description: '统计项1说明',
    order: 3,
  },
  {
    section: 'stats',
    key: 'stat2_label',
    value: '技术 Talk',
    type: 'text',
    description: '统计项2标签',
    order: 4,
  },
  {
    section: 'stats',
    key: 'stat2_value',
    value: '300+',
    type: 'text',
    description: '统计项2数值',
    order: 5,
  },
  {
    section: 'stats',
    key: 'stat2_note',
    value: '深度分享与论文精读',
    type: 'text',
    description: '统计项2说明',
    order: 6,
  },
  {
    section: 'stats',
    key: 'stat3_label',
    value: '项目共创',
    type: 'text',
    description: '统计项3标签',
    order: 7,
  },
  {
    section: 'stats',
    key: 'stat3_value',
    value: '150+',
    type: 'text',
    description: '统计项3数值',
    order: 8,
  },
  {
    section: 'stats',
    key: 'stat3_note',
    value: 'Agent 与多模态落地案例',
    type: 'text',
    description: '统计项3说明',
    order: 9,
  },

  // ========== Vision 愿景区块 ==========
  {
    section: 'vision',
    key: 'title',
    value: 'Agent 时代的共赢社区',
    type: 'text',
    description: '愿景区块标题',
    order: 1,
  },
  {
    section: 'vision',
    key: 'tag',
    value: '愿景与目标',
    type: 'text',
    description: '愿景区块标签',
    order: 2,
  },
  {
    section: 'vision',
    key: 'vision_points',
    value: JSON.stringify([
      '真正的 AGI 还有十年，Agent 是必经之路，抓住浪潮才能不缺席。',
      '通过深度实践、知识共享与项目协作，拆解技术壁垒，转化为个人优势与实际价值。',
      '赋能每一人，决胜 Agent 十年。',
    ]),
    type: 'json',
    description: '愿景要点（JSON数组）',
    order: 3,
  },
  {
    section: 'vision',
    key: 'offerings_title',
    value: '我们提供',
    type: 'text',
    description: '提供内容标题',
    order: 4,
  },
  {
    section: 'vision',
    key: 'offerings',
    value: JSON.stringify([
      '系统化学习路径与实践手册',
      '技术导师与行业专家一对一指导',
      '论文笔记、前沿 talk、案例共创',
      '作品集打磨、简历与面试辅导、内推',
    ]),
    type: 'json',
    description: '提供内容列表',
    order: 5,
  },
  {
    section: 'vision',
    key: 'bottom_note',
    value: '我们通过"学习—实战—输出—共创"的飞轮，帮助成员将洞察转化为实绩。',
    type: 'text',
    description: '底部说明',
    order: 6,
  },

  // ========== Advanced 高阶玩法 ==========
  {
    section: 'advanced',
    key: 'tag',
    value: '高阶玩法',
    type: 'text',
    description: '高阶玩法标签',
    order: 1,
  },
  {
    section: 'advanced',
    key: 'title',
    value: '深度共创 · 论文/项目/求职全链路',
    type: 'text',
    description: '高阶玩法标题',
    order: 2,
  },
  {
    section: 'advanced',
    key: 'offerings',
    value: JSON.stringify([
      {
        title: '如果你想入门大模型 Agent',
        bullets: ['学习路径与开源仓库推荐', '入门课 + 实战项目', '志同道合的交流社区'],
      },
      {
        title: '如果你想进一步合作 / 论文 / 求职',
        bullets: ['论文合作与实验共建', '产业落地项目合作', '大厂工作内推与面试辅导'],
      },
      {
        title: '如果你希望寻求合作',
        bullets: ['共建社区品牌', '联合宣传与活动', 'AI 产品与培训辅导'],
      },
    ]),
    type: 'json',
    description: '高阶玩法内容（JSON数组）',
    order: 3,
  },

  // ========== Resources 资源合集 ==========
  {
    section: 'resources',
    key: 'tag',
    value: '资源合集',
    type: 'text',
    description: '资源合集标签',
    order: 1,
  },
  {
    section: 'resources',
    key: 'papers_tag',
    value: 'Talk & 圆桌会 · 论文精读',
    type: 'text',
    description: '论文部分标签',
    order: 2,
  },

  // ========== Training 训练营 ==========
  {
    section: 'training',
    key: 'tag',
    value: '训练营 & 加入方式',
    type: 'text',
    description: '训练营标签',
    order: 1,
  },
  {
    section: 'training',
    key: 'modules',
    value: JSON.stringify([
      { title: '基础掌握', desc: 'LLM/多模态基石，代码能力强化与工程规范', icon: 'BookOpen' },
      { title: 'Agent 架构', desc: '规划/记忆/工具调用与评测，真实业务案例拆解', icon: 'Brain' },
      { title: '项目共创', desc: '实战项目组队，导师答疑与代码评审', icon: 'Cpu' },
      { title: '职业跃迁', desc: '作品集打磨、面试工作坊、导师推荐与内推', icon: 'Rocket' },
    ]),
    type: 'json',
    description: '训练营模块（JSON数组）',
    order: 2,
  },
  {
    section: 'training',
    key: 'main_title',
    value: '深度实践 + 导师答疑 + 项目共创',
    type: 'text',
    description: '主标题',
    order: 3,
  },
  {
    section: 'training',
    key: 'main_description',
    value: '作品集打磨、代码评审、周会复盘、内推推荐。每期控制人数，保证互动质量。',
    type: 'text',
    description: '主描述',
    order: 4,
  },
  {
    section: 'training',
    key: 'cta_primary_text',
    value: '立即报名',
    type: 'text',
    description: '主按钮文字',
    order: 5,
  },
  {
    section: 'training',
    key: 'cta_secondary_text',
    value: '咨询顾问',
    type: 'text',
    description: '次按钮文字',
    order: 6,
  },
  {
    section: 'training',
    key: 'cta_secondary_link',
    value: '#contact',
    type: 'text',
    description: '次按钮链接',
    order: 7,
  },

  // ========== Contact 联系方式 ==========
  {
    section: 'contact',
    key: 'tag',
    value: '合作 & 咨询',
    type: 'text',
    description: '联系方式标签',
    order: 1,
  },
  {
    section: 'contact',
    key: 'title',
    value: '公众号 AgentAlpha',
    type: 'text',
    description: '联系方式标题',
    order: 2,
  },
  {
    section: 'contact',
    key: 'description',
    value: '共建社区 / 宣传合作 / AI 产品 / 培训辅导，或需要论文、项目、求职支持，扫码关注公众号了解更多。',
    type: 'text',
    description: '联系方式描述',
    order: 3,
  },
  {
    section: 'contact',
    key: 'tags',
    value: JSON.stringify(['共建社区', '宣传工作', 'AI 产品', '培训辅导']),
    type: 'json',
    description: '联系方式标签列表',
    order: 4,
  },

  // ========== Universities 合作院校 ==========
  {
    section: 'universities',
    key: 'tag',
    value: '合作院校',
    type: 'text',
    description: '合作院校标签',
    order: 1,
  },
  {
    section: 'universities',
    key: 'title',
    value: '顶尖学府携手共建',
    type: 'text',
    description: '合作院校标题',
    order: 2,
  },
  {
    section: 'universities',
    key: 'description',
    value: '与国内外顶尖高校建立深度合作，汇聚学术资源，推动 AI 研究与产业落地',
    type: 'text',
    description: '合作院校描述',
    order: 3,
  },
]

async function main() {
  console.log('🎨 开始初始化网站内容配置...\n')

  let created = 0
  let skipped = 0

  for (const content of siteContents) {
    try {
      const existing = await prisma.siteContent.findUnique({
        where: {
          section_key: {
            section: content.section,
            key: content.key,
          },
        },
      })

      if (existing) {
        console.log(`⏭️  已存在: ${content.section}.${content.key}`)
        skipped++
        continue
      }

      await prisma.siteContent.create({ data: content })
      console.log(`✅ 已创建: ${content.section}.${content.key} - ${content.description}`)
      created++
    } catch (error) {
      console.error(`❌ 创建失败: ${content.section}.${content.key}`, error)
    }
  }

  console.log(`\n🎉 网站内容配置初始化完成！`)
  console.log(`   ✅ 新创建: ${created} 条`)
  console.log(`   ⏭️  已跳过: ${skipped} 条`)
  console.log(`   📊 总计: ${siteContents.length} 条\n`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
