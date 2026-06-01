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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🎮 VoteJeux</h1>
          <p className="text-gray-400">Choisissez votre jeu du soir</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">Créer une soirée</h2>
          <p className="text-gray-400 text-sm">Tu es le maître du jeu, tu choisis les filtres.</p>
          <button
            onClick={creerRoom}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading ? 'Création...' : '🚀 Créer une room'}
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">Rejoindre une soirée</h2>
          <p className="text-gray-400 text-sm">Entre le code donné par le maître du jeu.</p>
          <input
            type="text"
            placeholder="Ex: ABC123"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={6}
          />
          <button
            onClick={rejoindreRoom}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition"
          >
            🎯 Rejoindre
          </button>
        </div>

        {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      </div>
    </main>
  )
}