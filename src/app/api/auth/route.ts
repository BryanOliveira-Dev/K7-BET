import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { loginUser, logout } from '@/lib/auth'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function POST(req: NextRequest) {
  const { name, password } = await req.json()

  // Validate name first (no info leak about password validity)
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
  }

  const groupPassword = process.env.GROUP_PASSWORD ?? ''
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''

  const isAdmin = safeCompare(password, adminPassword)
  const isGroup = safeCompare(password, groupPassword)

  if (!isAdmin && !isGroup) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  await loginUser(name.trim(), isAdmin)

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await logout()
  return NextResponse.json({ ok: true })
}
