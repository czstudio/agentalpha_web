import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdmin() {
  try {
    const admins = await prisma.admin.findMany()
    console.log('管理员数量:', admins.length)
    admins.forEach(admin => {
      console.log('- 用户名:', admin.username)
      console.log('- 邮箱:', admin.email)
      console.log('- 创建时间:', admin.createdAt)
    })
  } catch (error) {
    console.error('错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmin()
