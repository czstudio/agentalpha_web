/**
 * 添加资源合集种子数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const resources = [
  {
    title: '学习地图',
    description: '从 Python、LLM 原理，到多模态与 Agent 评测的分层学习路径',
    icon: 'Compass',
    link: '#resources',
    order: 0,
  },
  {
    title: '工具包',
    description: '评测脚本、Prompt 模版、思维链/反思链示例、检索与工具调用最佳实践',
    icon: 'ShieldCheck',
    link: '#resources',
    order: 1,
  },
  {
    title: '案例库',
    description: '行业场景模版（客服、搜索、分析、运营自动化、具身智能预研）',
    icon: 'FileText',
    link: '#resources',
    order: 2,
  },
]

async function main() {
  console.log('📚 开始添加资源合集数据...')

  for (const resource of resources) {
    try {
      // 检查是否已存在
      const existing = await prisma.resource.findFirst({
        where: { title: resource.title },
      })

      if (existing) {
        console.log(`⏭️  ${resource.title} 已存在，跳过`)
        continue
      }

      await prisma.resource.create({ data: { ...resource, isVisible: true } })
      console.log(`✅ 已添加: ${resource.title}`)
    } catch (error) {
      console.error(`❌ 添加失败: ${resource.title}`, error)
    }
  }

  console.log('\n🎉 资源合集数据添加完成！')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
