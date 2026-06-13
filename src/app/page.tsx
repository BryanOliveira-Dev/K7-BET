'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push('/jogos')
  }

  return (
    <main className="min-h-screen text-slate-100 relative flex items-center justify-center px-4"
      style={{ backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            K7 <span className="text-emerald-400">BET</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Copa do Mundo 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Como quer aparecer no ranking"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha do grupo</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-emerald-400 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
