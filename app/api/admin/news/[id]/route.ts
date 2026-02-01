/**
 * Single news admin API
 * PUT    /api/admin/news/[id]
 * DELETE /api/admin/news/[id]
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
  order: z.coerce.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const result = newsSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const updated = await prisma.news.update({
      where: { id },
      data: {
        title: result.data.title,
        date: result.data.date,
        category: result.data.category,
        link: result.data.link || null,
        isVisible: result.data.isVisible ?? true,
        ...(result.data.order !== undefined ? { order: result.data.order } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated, message: '更新成功' })
  } catch (error) {
    console.error('Failed to update news:', error)
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.news.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete news:', error)
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}

