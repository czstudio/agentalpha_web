/**
 * Single social platform admin API
 * PUT    /api/admin/social-platforms/[id]
 * DELETE /api/admin/social-platforms/[id]
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
  order: z.coerce.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const result = platformSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const updated = await prisma.socialPlatform.update({
      where: { id },
      data: {
        name: result.data.name,
        icon: result.data.icon,
        qrCode: result.data.qrCode,
        description: result.data.description,
        isVisible: result.data.isVisible ?? true,
        ...(result.data.order !== undefined ? { order: result.data.order } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated, message: '更新成功' })
  } catch (error) {
    console.error('Failed to update social platform:', error)
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.socialPlatform.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete social platform:', error)
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}

