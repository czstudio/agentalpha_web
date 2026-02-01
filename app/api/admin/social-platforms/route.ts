/**
 * Social platforms admin API (contact QR codes)
 * GET  /api/admin/social-platforms
 * POST /api/admin/social-platforms
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

const platformSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  icon: z.string().min(1, '图标不能为空'),
  qrCode: z.string().min(1, '二维码不能为空').refine(isUrlOrSitePath, '二维码必须是 URL 或以 / 开头的站内路径'),
  description: z.string().min(1, '描述不能为空'),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  try {
    const platforms = await prisma.socialPlatform.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: platforms })
  } catch (error) {
    console.error('Failed to fetch social platforms:', error)
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = platformSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const maxOrder = await prisma.socialPlatform.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const created = await prisma.socialPlatform.create({
      data: {
        name: result.data.name,
        icon: result.data.icon,
        qrCode: result.data.qrCode,
        description: result.data.description,
        isVisible: result.data.isVisible ?? true,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, data: created, message: '创建成功' })
  } catch (error) {
    console.error('Failed to create social platform:', error)
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}

