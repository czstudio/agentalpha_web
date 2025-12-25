/**
 * 资源合集管理 API
 * GET /api/admin/resources - 获取所有资源
 * POST /api/admin/resources - 创建新资源
 * PUT /api/admin/resources - 更新资源
 * DELETE /api/admin/resources - 删除资源
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取所有资源
export async function GET() {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: resources })
  } catch (error) {
    console.error('获取资源失败:', error)
    return NextResponse.json(
      { success: false, error: '获取资源失败' },
      { status: 500 }
    )
  }
}

// POST - 创建新资源
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, icon, link, order, isVisible } = body

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        icon,
        link: link || null,
        order: order || 0,
        isVisible: isVisible !== undefined ? isVisible : true,
      },
    })

    return NextResponse.json({ success: true, data: resource })
  } catch (error) {
    console.error('创建资源失败:', error)
    return NextResponse.json(
      { success: false, error: '创建资源失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新资源
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, title, description, icon, link, order, isVisible } = body

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        title,
        description,
        icon,
        link,
        order,
        isVisible,
      },
    })

    return NextResponse.json({ success: true, data: resource })
  } catch (error) {
    console.error('更新资源失败:', error)
    return NextResponse.json(
      { success: false, error: '更新资源失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除资源
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 ID 参数' },
        { status: 400 }
      )
    }

    await prisma.resource.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除资源失败:', error)
    return NextResponse.json(
      { success: false, error: '删除资源失败' },
      { status: 500 }
    )
  }
}
