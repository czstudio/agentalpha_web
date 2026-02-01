/**
 * Projects admin API
 * GET  /api/admin/projects
 * POST /api/admin/projects
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

function toTagList(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean)
      }
    } catch {
      // fall back to split
    }
  }

  return trimmed
    .split(/[,，\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

const projectSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().min(1, '描述不能为空'),
  difficulty: z.coerce.number().int().min(1).max(5),
  tags: z.string().optional().or(z.literal('')),
  link: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isUrlOrSitePath(v), '链接必须是 URL 或以 / 开头的站内路径'),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = projectSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const maxOrder = await prisma.project.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const tagList = toTagList(result.data.tags || '')

    const project = await prisma.project.create({
      data: {
        title: result.data.title,
        description: result.data.description,
        difficulty: result.data.difficulty,
        tags: JSON.stringify(tagList),
        link: result.data.link || null,
        isVisible: result.data.isVisible ?? true,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, data: project, message: '创建成功' })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
  }
}

