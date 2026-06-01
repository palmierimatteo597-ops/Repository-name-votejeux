'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JoueurPage() {
  const { code } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    chargerRoom()
    const channel = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `code=eq.${code}`
      }, payload => {
        setRoom(payload.new)
        if (payload.new.statut === 'phase1') {
          router.push(`/vote/${code}?role=joueur`)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function chargerRoom() {
    const { data } = await supabase
      .from('rooms').select('*').eq('code', code).single()
    if (!data) {
      alert('Room introuvable !')
      router.push('/')
      return
    }
    setRoom(data)
    if (data.statut === 'phase1') {
      router.push(`/vote/${code}?role=joueur`)
    }
    setLoading(false)
  }

  function rejoindre() {
    if (!nom.trim()) return
    const joueurId = Math.random().toString(36).substring(2)
    localStorage.setItem(`joueur_${code}`, joueurId)
    localStorage.setItem(`joueur_nom_${code}`, nom)
    setJoined(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">🎮 VoteJeux</h1>
          <p className="text-gray-400 mt-1">Room : <span className="text-purple-400 font-mono text-xl">{code}</span></p>
        </div>

        {!joined ? (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Comment tu t'appelles ?</h2>
            <input
              type="text"
              placeholder="Ton prénom"
              value={nom}
              onChange={e => setNom(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button onClick={rejoindre}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition">
              ✅ Rejoindre la room
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-4">
            <div className="text-5xl">⏳</div>
            <h2 className="text-white font-semibold text-xl">En attente du maître...</h2>
            <p className="text-gray-400 text-sm">Le maître du jeu va bientôt lancer la présélection.</p>
            <div className="flex justify-center gap-1 mt-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}