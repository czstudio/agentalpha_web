/**
 * Public data API for the homepage.
 * GET /api/public/data
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  noStore()

  try {
    const [
      members,
      mentors,
      projects,
      papers,
      partners,
      news,
      socialPlatforms,
      quickLinks,
      resources,
      siteContents,
    ] = await Promise.all([
      prisma.communityMember.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.mentor.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.project.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.paper.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.partner.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.news.findMany({
        where: { isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.socialPlatform.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.quickLink.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.resource.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
      prisma.siteContent.findMany({
        orderBy: [{ section: 'asc' }, { order: 'asc' }],
      }),
    ])

    const universities = partners
      .filter((p) => p.type === 'university')
      .map((p) => ({ ...p, website: p.url }))

    const communities = partners
      .filter((p) => p.type === 'community')
      .map((p) => ({ ...p, website: p.url }))

    const content: Record<string, any> = {}
    siteContents.forEach((item) => {
      if (!content[item.section]) content[item.section] = {}

      // For non-text types, attempt to JSON-parse so arrays/booleans/numbers work.
      // Admin can still store plain text (type=text) to keep exact formatting.
      const shouldParse = item.type && item.type !== 'text'
      if (shouldParse) {
        try {
          content[item.section][item.key] = JSON.parse(item.value)
        } catch {
          content[item.section][item.key] = item.value
        }
      } else {
        content[item.section][item.key] = item.value
      }
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          members,
          mentors,
          projects,
          papers,
          universities,
          communities,
          news,
          socialPlatforms,
          quickLinks,
          resources,
          content,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Failed to load public data:', error)
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Failed to load public data' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  }
}
