/**
 * Single partner admin API
 * PUT    /api/admin/partners/[id]
 * DELETE /api/admin/partners/[id]
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
  order: z.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const result = partnerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: result.data.name,
        type: result.data.type,
        logo: result.data.logo,
        url: result.data.url || null,
        description: result.data.description || '',
        isVisible: result.data.isVisible ?? true,
        ...(result.data.order !== undefined ? { order: result.data.order } : {}),
      },
    })

    return NextResponse.json({ success: true, data: partner, message: '更新成功' })
  } catch (error) {
    console.error('Failed to update partner:', error)
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.partner.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete partner:', error)
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}

