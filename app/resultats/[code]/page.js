'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResultatsPage() {
  const { code } = useParams()
  const router = useRouter()
  const [resultats, setResultats] = useState([])
  const [gagnant, setGagnant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chargerResultats()
  }, [])

  async function chargerResultats() {
    const { data } = await supabase
      .from('historique')
      .select('*')
      .eq('room_code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      const sorted = [...(data.resultats || [])].sort((a, b) => b.votes - a.votes)
      setResultats(sorted)
      setGagnant(data.jeu_gagnant)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Chargement des résultats...</p>
    </div>
  )

  const medailles = ['🥇', '🥈', '🥉']

  return (
    <main className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">🏆 Résultats</h1>
          <p className="text-gray-400">Room : <span className="text-purple-400 font-mono">{code}</span></p>
        </div>

        {gagnant && (
          <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl p-6 text-center space-y-2 animate-pulse">
            <p className="text-yellow-300 text-sm font-semibold uppercase tracking-wider">Jeu gagnant</p>
            <p className="text-3xl">🥇</p>
            <h2 className="text-white text-2xl font-bold">{gagnant}</h2>
          </div>
        )}

        <div className="space-y-3">
          {resultats.map((r, i) => (
            <div key={r.nom}
              className={`bg-gray-900 rounded-2xl p-4 flex items-center justify-between ${i === 0 ? 'ring-2 ring-yellow-500' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{medailles[i] || `#${i + 1}`}</span>
                <span className="text-white font-semibold">{r.nom}</span>
              </div>
              <div className="text-right">
                <span className="text-purple-400 font-bold text-lg">{r.votes}</span>
                <span className="text-gray-500 text-sm ml-1">votes</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition">
          🏠 Retour à l'accueil
        </button>
      </div>
    </main>
  )
}