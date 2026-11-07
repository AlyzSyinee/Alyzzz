import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE, verifyToken } from '@/lib/session'

export async function middleware(req: NextRequest) {
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value)
  const { pathname } = req.nextUrl

  if (pathname === '/login') {
    return ok ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next()
  }
  if (!ok) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/', '/login', '/api/upload/:path*'] }
