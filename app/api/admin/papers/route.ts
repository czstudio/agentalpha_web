/**
 * 论文 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const paperSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  authors: z.string().min(1, '作者不能为空'),
  category: z.string().min(1, '分类不能为空'),
  venue: z.string().min(1, '期刊/会议名称不能为空'),
  conference: z.string().optional(),
  year: z.number().int().min(1900).max(2100),
  tags: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  try {
    const papers = await prisma.paper.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: papers })
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = paperSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.paper.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const paper = await prisma.paper.create({
      data: {
        ...result.data,
        order: (maxOrder?.order || 0) + 1,
        isVisible: result.data.isVisible ?? true,
      },
    })

    return NextResponse.json({ success: true, data: paper, message: '创建成功' })
  } catch (error) {
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}
