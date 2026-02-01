/**
 * 快速链接管理 API
 * GET /api/admin/quicklinks - 获取所有快速链接
 * POST /api/admin/quicklinks - 创建新快速链接
 * PUT /api/admin/quicklinks - 更新快速链接
 * DELETE /api/admin/quicklinks - 删除快速链接
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取所有快速链接
export async function GET() {
  try {
    const quickLinks = await prisma.quickLink.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: quickLinks })
  } catch (error) {
    console.error('获取快速链接失败:', error)
    return NextResponse.json(
      { success: false, error: '获取快速链接失败' },
      { status: 500 }
    )
  }
}

// POST - 创建新快速链接
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, href, order, isVisible } = body

    const quickLink = await prisma.quickLink.create({
      data: {
        title,
        description,
        href,
        order: order || 0,
        isVisible: isVisible !== undefined ? isVisible : true,
      },
    })

    return NextResponse.json({ success: true, data: quickLink })
  } catch (error) {
    console.error('创建快速链接失败:', error)
    return NextResponse.json(
      { success: false, error: '创建快速链接失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新快速链接
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, title, description, href, order, isVisible } = body

    const quickLink = await prisma.quickLink.update({
      where: { id },
      data: {
        title,
        description,
        href,
        order,
        isVisible,
      },
    })

    return NextResponse.json({ success: true, data: quickLink })
  } catch (error) {
    console.error('更新快速链接失败:', error)
    return NextResponse.json(
      { success: false, error: '更新快速链接失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除快速链接
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

    await prisma.quickLink.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除快速链接失败:', error)
    return NextResponse.json(
      { success: false, error: '删除快速链接失败' },
      { status: 500 }
    )
  }
}
