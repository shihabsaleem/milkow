import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// These are the pages that DON'T need a login
const publicPages = ['/login', '/manifest.webmanifest', '/icons']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Check if the user is trying to access a public page
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))
  
  // 2. Check if the user has a session cookie (we'll set this on login)
  const session = request.cookies.get('milkow_session')

  // 3. If they are NOT logged in and it's NOT a public page, send them to login
  if (!session && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. If they ARE logged in and try to go to login page, send them to dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Only run middleware on pages, not on API or static files
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
