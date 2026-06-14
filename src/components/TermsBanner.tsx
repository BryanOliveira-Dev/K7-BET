'use client'

import { useEffect, useState } from 'react'

const TERMS_KEY = 'k7-copa-terms-accepted'

export default function TermsBanner() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem(TERMS_KEY)
    if (!accepted) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(TERMS_KEY, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-slate-300 text-sm flex-1 leading-snug">
            ⚽ Para participar, você precisa saber de algumas informações.{' '}
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer transition-colors"
            >
              {expanded ? 'Ocultar' : 'Clique aqui para ler'}
            </button>
          </p>

          <button
            onClick={accept}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Confirmar e continuar palpitando
          </button>
        </div>

        {expanded && (
          <div className="border-t border-slate-700 px-4 py-3 space-y-1.5 text-xs text-slate-400">
            <p><span className="text-emerald-400 font-semibold">1.</span> Ao final da Copa 2026, todos os participantes pagam <strong className="text-slate-200">R$ 50,00</strong> ao vencedor do bolão.</p>
            <p><span className="text-emerald-400 font-semibold">2.</span> Vencedor = quem tiver mais pontos nos palpites ao longo do campeonato.</p>
            <p><span className="text-emerald-400 font-semibold">3.</span> Em caso de empate, o prêmio é dividido igualmente.</p>
            <p><span className="text-emerald-400 font-semibold">4.</span> Pagamento em até 7 dias após o encerramento da competição.</p>
          </div>
        )}

      </div>
    </div>
  )
}
