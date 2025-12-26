/**
 * 管理员密码重置 API（仅用于紧急恢复）
 * GET /api/admin/reset-password?secret=RESET_SECRET&username=admin&newPassword=NewPassword123
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/hash'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const username = searchParams.get('username')
    const newPassword = searchParams.get('newPassword')

    // 安全检查
    const expectedSecret = process.env.RESET_PASSWORD_SECRET || 'reset-agentalpha-emergency-2024'

    if (secret !== expectedSecret) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized - Invalid secret' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    if (!username || !newPassword) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing username or newPassword parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // 查找管理员
    const admin = await prisma.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return new NextResponse(
        JSON.stringify({ error: `Admin user "${username}" not found` }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // 生成新密码哈希
    const passwordHash = await hashPassword(newPassword)

    // 更新密码
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: `Password for user "${username}" has been reset successfully!`,
        hint: 'Please login with the new password and change it again through the admin panel.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  } catch (error: any) {
    console.error('Password reset failed:', error)
    return new NextResponse(
      JSON.stringify({
        error: 'Password reset failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}
