/**
 * 检查数据库中的数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 检查数据库数据...\n')

  // 检查合作院校
  const universities = await prisma.partner.findMany({
    where: { type: 'university' },
  })
  console.log(`✅ 合作院校数量: ${universities.length}`)
  universities.forEach((uni) => {
    console.log(`  - ${uni.name}`)
    console.log(`    Logo: ${uni.logo}`)
    console.log(`    URL: ${uni.url}`)
    console.log(`    Visible: ${uni.isVisible}`)
  })

  // 检查兄弟社区
  const communities = await prisma.partner.findMany({
    where: { type: 'community' },
  })
  console.log(`\n✅ 兄弟社区数量: ${communities.length}`)
  communities.forEach((comm) => {
    console.log(`  - ${comm.name}`)
  })

  // 检查资源
  const resources = await prisma.resource.findMany()
  console.log(`\n✅ 资源数量: ${resources.length}`)
  resources.forEach((res) => {
    console.log(`  - ${res.title}`)
  })

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
