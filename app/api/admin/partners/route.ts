/**
 * Partners (Universities / Communities) admin API
 * GET  /api/admin/partners
 * POST /api/admin/partners
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

const partnerSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  type: z.enum(['university', 'community'], {
    errorMap: () => ({ message: '类型必须是 university 或 community' }),
  }),
  logo: z.string().min(1, 'Logo 不能为空').refine(isUrlOrSitePath, 'Logo 必须是 URL 或以 / 开头的站内路径'),
  url: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isValidUrl(v), '请输入有效的网址（https://...）'),
  description: z.string().optional().or(z.literal('')),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    console.error('Failed to fetch partners:', error)
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = partnerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const maxOrder = await prisma.partner.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const partner = await prisma.partner.create({
      data: {
        name: result.data.name,
        type: result.data.type,
        logo: result.data.logo,
        url: result.data.url || null,
        description: result.data.description || '',
        isVisible: result.data.isVisible ?? true,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, data: partner, message: '创建成功' })
  } catch (error) {
    console.error('Failed to create partner:', error)
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}
