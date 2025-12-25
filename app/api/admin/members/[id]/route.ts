/**
 * Single community member admin API
 * PUT    /api/admin/members/[id]
 * DELETE /api/admin/members/[id]
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
  order: z.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const result = memberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const member = await prisma.communityMember.update({
      where: { id },
      data: {
        name: result.data.name,
        role: result.data.role,
        background: result.data.background || '',
        avatar: result.data.avatar || null,
        isVisible: result.data.isVisible ?? true,
        ...(result.data.order !== undefined ? { order: result.data.order } : {}),
      },
    })

    return NextResponse.json({ success: true, data: member, message: '更新成功' })
  } catch (error) {
    console.error('Failed to update member:', error)
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.communityMember.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete member:', error)
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}

