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
    // Restaure le nom si le joueur avait déjà rejoint CETTE room spécifique
    // mais ne passe en "joined" que si l'ID ET le nom existent pour ce code précis
    const existingId = localStorage.getItem(`joueur_${code}`)
    const existingNom = localStorage.getItem(`joueur_nom_${code}`)
    if (existingId && existingNom) {
      setNom(existingNom)
      setJoined(true)
    }

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
    // Génère un nouvel ID seulement s'il n'en existe pas déjà un pour cette room
    let joueurId = localStorage.getItem(`joueur_${code}`)
    if (!joueurId) {
      joueurId = Math.random().toString(36).substring(2)
      localStorage.setItem(`joueur_${code}`, joueurId)
    }
    localStorage.setItem(`joueur_nom_${code}`, nom)
    setJoined(true)
  }

  if (loading) return (
    <div className="gp-bg min-h-screen flex items-center justify-center">
      <p className="text-white">Chargement...</p>
    </div>
  )

  return (
    <main className="gp-bg min-h-screen flex items-center justify-center p-5">
      <div className="gp-shell w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(168,85,247,.25)]">🎮</div>
          <h1 className="gp-logo text-4xl font-black">Game Picker</h1>
          <p className="text-slate-400">Room : <span className="text-cyan-300 font-mono text-xl font-black">{code}</span></p>
        </div>

        {!joined ? (
          <div className="gp-card rounded-[2rem] p-6 space-y-4">
            <p className="text-cyan-300 uppercase tracking-[.25em] text-xs font-black">Profil joueur</p>
            <h2 className="text-white font-black text-2xl">Comment tu t'appelles ?</h2>
            <input
              type="text"
              placeholder="Ton prénom"
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && rejoindre()}
              className="gp-input w-full rounded-2xl px-5 py-4 placeholder:text-slate-600"
            />
            <button onClick={rejoindre}
              className="gp-btn-primary w-full font-black py-4 rounded-2xl transition active:scale-[.98]">
              Rejoindre la room
            </button>
          </div>
        ) : (
          <div className="gp-card rounded-[2rem] p-7 text-center space-y-4">
            <div className="text-5xl">⏳</div>
            <h2 className="text-white font-black text-2xl">En attente du maître...</h2>
            <p className="text-slate-400 text-sm">La présélection va bientôt commencer.</p>
            <div className="flex justify-center gap-1 mt-4">
              <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}