/**
 * Community members admin API
 * GET  /api/admin/members
 * POST /api/admin/members
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function isUrlOrSitePath(value: string) {
  if (value.startsWith('/')) return true
  return isValidUrl(value)
}

const memberSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  role: z.string().min(1, '角色/职位不能为空'),
  background: z.string().optional().or(z.literal('')),
  avatar: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isUrlOrSitePath(v), '头像必须是 URL 或以 / 开头的站内路径'),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  try {
    const members = await prisma.communityMember.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: members })
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = memberSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const maxOrder = await prisma.communityMember.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const member = await prisma.communityMember.create({
      data: {
        name: result.data.name,
        role: result.data.role,
        background: result.data.background || '',
        avatar: result.data.avatar || null,
        isVisible: result.data.isVisible ?? true,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, data: member, message: '创建成功' })
  } catch (error) {
    console.error('Failed to create member:', error)
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}
