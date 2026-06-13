import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get('k7_session')?.value

  // Rotas públicas
  if (pathname === '/' || pathname.startsWith('/api/auth') || pathname === '/api/admin/debug' || pathname === '/api/admin/fix-orphan-bets' || pathname === '/api/admin/diagnose') {
    return NextResponse.next()
  }

  // Sem sessão: redireciona para login
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
