/**
 * Site content admin API
 * GET    /api/admin/site-content?section=hero
 * POST   /api/admin/site-content
 * PUT    /api/admin/site-content (batch update values)
 * DELETE /api/admin/site-content?id=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  section: z.string().min(1, 'section 不能为空'),
  key: z.string().min(1, 'key 不能为空'),
  value: z.string().default(''),
  type: z.enum(['text', 'json', 'array', 'number', 'boolean']).default('text'),
  order: z.coerce.number().int().default(0),
  description: z.string().optional().or(z.literal('')),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')

    const where = section ? { section } : {}
    const contents = await prisma.siteContent.findMany({
      where,
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    })

    const grouped: Record<string, any[]> = {}
    contents.forEach((item) => {
      if (!grouped[item.section]) grouped[item.section] = []
      grouped[item.section].push(item)
    })

    return NextResponse.json({
      success: true,
      data: {
        contents,
        grouped,
      },
    })
  } catch (error) {
    console.error('Failed to fetch site content:', error)
    return NextResponse.json({ success: false, error: '获取内容失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = createSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const created = await prisma.siteContent.create({
      data: {
        section: result.data.section,
        key: result.data.key,
        value: result.data.value,
        type: result.data.type,
        order: result.data.order,
        description: result.data.description || null,
      },
    })

    return NextResponse.json({ success: true, data: created, message: '创建成功' })
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : ''
    const isUniqueViolation =
      message.includes('Unique constraint') ||
      message.includes('UNIQUE') ||
      message.includes('unique') ||
      message.includes('site_contents.section_key')

    if (isUniqueViolation) {
      return NextResponse.json({ success: false, error: '该 section/key 已存在' }, { status: 409 })
    }

    console.error('Failed to create site content:', error)
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const updates = body?.updates

    if (!Array.isArray(updates)) {
      return NextResponse.json({ success: false, error: '更新数据格式错误' }, { status: 400 })
    }

    await Promise.all(
      updates.map((item: any) =>
        prisma.siteContent.update({
          where: { id: String(item.id) },
          data: { value: String(item.value ?? '') },
        }),
      ),
    )

    return NextResponse.json({ success: true, message: `已更新 ${updates.length} 条内容` })
  } catch (error) {
    console.error('Failed to update site content:', error)
    return NextResponse.json({ success: false, error: '更新内容失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 })
    }

    await prisma.siteContent.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete site content:', error)
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}

