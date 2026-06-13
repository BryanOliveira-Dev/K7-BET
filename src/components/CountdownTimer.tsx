'use client'

import { useEffect, useState } from 'react'

interface Props { kickoffAt: string }

export default function CountdownTimer({ kickoffAt }: Props) {
  const [text, setText] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(kickoffAt).getTime() - Date.now()
      if (diff <= 0) { setText('Em breve'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setText(h > 0 ? `${h}h ${m}m` : `${m} min`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [kickoffAt])

  return <span className="text-yellow-400 text-xs font-mono">{text}</span>
}
