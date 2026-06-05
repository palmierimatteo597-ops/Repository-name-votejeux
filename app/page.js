'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function creerRoom() {
    setLoading(true)
    const res = await fetch('/api/rooms', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      router.push(`/maitre/${data.room.code}`)
    } else {
      setError('Erreur lors de la création de la room')
      setLoading(false)
    }
  }

  async function rejoindreRoom() {
    if (!code.trim()) return
    router.push(`/joueur/${code.toUpperCase()}`)
  }

  return (
    <main className="gp-bg min-h-screen flex items-center justify-center p-5">
      <div className="gp-shell w-full max-w-7xl grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(168,85,247,.25)]">🎮</div>
            <div className="font-black leading-none text-xl">
              <p>GAME</p>
              <p className="text-purple-400">PICKER</p>
            </div>
          </div>

          <div className="space-y-5">
            <span className="gp-pill rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[.28em]">Party picker</span>
            <h1 className="gp-logo text-6xl sm:text-7xl lg:text-8xl font-black leading-[.9]">Game Picker</h1>
            <p className="max-w-2xl text-xl sm:text-2xl text-slate-200/90 leading-relaxed">
              Une room privée, une sélection propre, un vote rapide. Le jeu de la soirée se décide sans débat interminable.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl">
            {[
              ['01', 'Créer', '▣'],
              ['02', 'Voter', '☷'],
              ['03', 'Jouer', '✦']
            ].map(([n, label, icon]) => (
              <div key={n} className="gp-card-soft rounded-2xl p-5">
                <p className="text-cyan-300 text-lg">{icon}</p>
                <p className="text-white text-3xl font-black mt-2">{n}</p>
                <p className="text-slate-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="gp-card rounded-[2rem] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-cyan-300 uppercase tracking-[.25em] text-sm font-black">Nouvelle soirée</p>
            <h2 className="text-white text-3xl font-black mt-3">Lance une room 🎉</h2>
            <p className="text-slate-400 mt-2">Tu configures les filtres, tes amis rejoignent avec un code.</p>
          </div>

          <button
            onClick={creerRoom}
            disabled={loading}
            className="gp-btn-primary w-full rounded-2xl py-4 font-black text-lg transition active:scale-[.98]"
          >
            {loading ? 'Création...' : '+ Créer une room'}
          </button>

          <div className="relative py-1">
            <div className="h-px bg-white/10" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-4 text-slate-500 text-xs uppercase">ou</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-bold">Rejoindre une room</h3>
            <input
              type="text"
              placeholder="CODE"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="gp-input w-full rounded-2xl px-5 py-4 text-xl tracking-[.35em] uppercase placeholder:text-slate-600"
              maxLength={6}
            />
            <button
              onClick={rejoindreRoom}
              className="gp-btn-secondary w-full rounded-2xl py-4 font-black text-lg transition active:scale-[.98]"
            >
              Rejoindre la soirée
            </button>
          </div>

          {error && <p className="text-rose-400 text-center text-sm">{error}</p>}
        </section>
      </div>
    </main>
  )
}
