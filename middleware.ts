/**
 * Next.js middleware - route protection
 * Protects both:
 * - /admin/* UI routes (redirect to /admin/login)
 * - /api/admin/* API routes (401 JSON)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    if (isAdminApi) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    if (isAdminApi) {
      const response = NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      response.cookies.delete('auth-token')
      return response
    }

    const response = NextResponse.redirect(new URL('/admin/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }

  const headers = new Headers(request.headers)
  headers.set('x-user-id', payload.userId)
  headers.set('x-username', payload.username)

  return NextResponse.next({
    request: {
      headers,
    },
  })
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

