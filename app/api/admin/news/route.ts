/**
 * News admin API (社区动态)
 * GET  /api/admin/news
 * POST /api/admin/news
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

const newsSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  date: z.string().min(1, '日期不能为空（如 2025-01-15）'),
  category: z.string().min(1, '分类不能为空'),
  link: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isUrlOrSitePath(v), '链接必须是 URL 或以 / 开头的站内路径'),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  try {
    const news = await prisma.news.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ success: true, data: news })
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = newsSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const maxOrder = await prisma.news.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const newsItem = await prisma.news.create({
      data: {
        title: result.data.title,
        date: result.data.date,
        category: result.data.category,
        link: result.data.link || null,
        isVisible: result.data.isVisible ?? true,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, data: newsItem, message: '创建成功' })
  } catch (error) {
    console.error('Failed to create news:', error)
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}

