/**
 * 添加知名高校数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const universities = [
  {
    name: '清华大学',
    logo: 'https://www.tsinghua.edu.cn/__local/B/A7/E1/C293235DD4B6C89DFE016C5B804_C33FE360_1169D.png',
    website: 'https://www.tsinghua.edu.cn/',
    description: '中国顶尖学府，工程与科学研究领先',
  },
  {
    name: '北京大学',
    logo: 'https://www.pku.edu.cn/Uploads/Picture/2021/10/14/s616807c18e1cc.png',
    website: 'https://www.pku.edu.cn/',
    description: '中国最高学府，文理并重的综合性大学',
  },
  {
    name: '上海交通大学',
    logo: 'https://www.sjtu.edu.cn/images/logo.png',
    website: 'https://www.sjtu.edu.cn/',
    description: '工程技术研究重镇，AI 研究实力雄厚',
  },
  {
    name: '复旦大学',
    logo: 'https://www.fudan.edu.cn/_upload/tpl/00/0d/13/template13/images/logo.png',
    website: 'https://www.fudan.edu.cn/',
    description: '综合性研究型大学，文理医工全面发展',
  },
  {
    name: '浙江大学',
    logo: 'https://www.zju.edu.cn/_upload/tpl/05/c4/1476/template1476/images/logo.png',
    website: 'https://www.zju.edu.cn/',
    description: '研究型综合大学，计算机科学研究领先',
  },
  {
    name: '中国科学技术大学',
    logo: 'https://www.ustc.edu.cn/_upload/tpl/00/02/2/template2/images/logo.png',
    website: 'https://www.ustc.edu.cn/',
    description: '理工科研究重镇，量子信息与 AI 研究领先',
  },
  {
    name: '南京大学',
    logo: 'https://www.nju.edu.cn/_upload/tpl/00/08/8/template8/images/logo.png',
    website: 'https://www.nju.edu.cn/',
    description: '综合性大学，AI 与数据科学研究实力强',
  },
  {
    name: '哈尔滨工业大学',
    logo: 'https://www.hit.edu.cn/_upload/tpl/00/a2/162/template162/images/logo.png',
    website: 'https://www.hit.edu.cn/',
    description: '工程技术研究强校，机器人与自动化领先',
  },
]

async function main() {
  console.log('🎓 开始添加知名高校...')

  // 获取当前最大 order
  const maxOrderPartner = await prisma.partner.findFirst({
    where: { type: 'university' },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const startOrder = (maxOrderPartner?.order || 0) + 1

  for (const [index, university] of universities.entries()) {
    try {
      // 检查是否已存在
      const existing = await prisma.partner.findFirst({
        where: { name: university.name, type: 'university' },
      })

      if (existing) {
        console.log(`⏭️  ${university.name} 已存在，跳过`)
        continue
      }

      await prisma.partner.create({
        data: {
          name: university.name,
          logo: university.logo,
          type: 'university',
          url: university.website,
          description: university.description,
          order: startOrder + index,
          isVisible: true,
        },
      })

      console.log(`✅ 已添加: ${university.name}`)
    } catch (error) {
      console.error(`❌ 添加失败: ${university.name}`, error)
    }
  }

  console.log('\n🎉 高校数据添加完成！')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
