/**
 * 单个论文操作 API
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const result = paperSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const paper = await prisma.paper.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json({ success: true, data: paper, message: '更新成功' })
  } catch (error) {
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.paper.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}
