import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [memberCount, projectCount, paperCount, partnerCount] = await Promise.all([
      prisma.communityMember.count(),
      prisma.project.count(),
      prisma.paper.count(),
      prisma.partner.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        memberCount,
        projectCount,
        paperCount,
        partnerCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
