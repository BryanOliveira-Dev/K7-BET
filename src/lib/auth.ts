import { cookies } from 'next/headers'
import { createServerClient } from './supabase'
import type { Session } from './types'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'k7_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('users')
    .select('id, name, is_admin')
    .eq('session_token', token)
    .single()

  if (!data) return null

  return { userId: data.id, name: data.name, isAdmin: data.is_admin }
}

export async function loginUser(name: string, isAdmin: boolean): Promise<void> {
  const token = randomUUID()
  const supabase = createServerClient()

  await supabase.from('users').upsert(
    { name, session_token: token, is_admin: isAdmin },
    { onConflict: 'name', ignoreDuplicates: false }
  )

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function logout(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
