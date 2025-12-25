/**
 * Single mentor admin API
 * PUT    /api/admin/mentors/[id]
 * DELETE /api/admin/mentors/[id]
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

function parseExpertise(value: string) {
  return value
    .split(/[,，\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

const mentorSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  title: z.string().min(1, '头衔不能为空'),
  company: z.string().min(1, '单位/公司不能为空'),
  avatar: z.string().min(1, '头像不能为空').refine(isUrlOrSitePath, '头像必须是 URL 或以 / 开头的站内路径'),
  expertise: z.string().optional().or(z.literal('')),
  engineering: z.coerce.number().min(0).max(100),
  theory: z.coerce.number().min(0).max(100),
  nlp: z.coerce.number().min(0).max(100),
  rl: z.coerce.number().min(0).max(100),
  multimodal: z.coerce.number().min(0).max(100),
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
    const result = mentorSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 })
    }

    const expertise = parseExpertise(result.data.expertise || '')
    const skills = {
      engineering: result.data.engineering,
      theory: result.data.theory,
      nlp: result.data.nlp,
      rl: result.data.rl,
      multimodal: result.data.multimodal,
    }

    const mentor = await prisma.mentor.update({
      where: { id },
      data: {
        name: result.data.name,
        title: result.data.title,
        company: result.data.company,
        avatar: result.data.avatar,
        expertise: JSON.stringify(expertise),
        skills: JSON.stringify(skills),
        isVisible: result.data.isVisible ?? true,
        ...(result.data.order !== undefined ? { order: result.data.order } : {}),
      },
    })

    return NextResponse.json({ success: true, data: mentor, message: '更新成功' })
  } catch (error) {
    console.error('Failed to update mentor:', error)
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.mentor.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete mentor:', error)
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 })
  }
}

