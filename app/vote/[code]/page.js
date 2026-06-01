'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function VotePage() {
  const { code } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get('role') || 'joueur'
  const [room, setRoom] = useState(null)
  const [jeux, setJeux] = useState([])
  const [votes1, setVotes1] = useState({})
  const [votes2, setVotes2] = useState({})
  const [mesVotes2, setMesVotes2] = useState({})
  const [votesRestants, setVotesRestants] = useState(5)
  const [loading, setLoading] = useState(true)
  const joueurId = typeof window !== 'undefined'
    ? localStorage.getItem(`joueur_${code}`) || (() => {
        const id = Math.random().toString(36).substring(2)
        localStorage.setItem(`joueur_${code}`, id)
        return id
      })() : ''

  useEffect(() => {
    chargerTout()
    const channel = supabase.channel(`vote-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_phase1', filter: `room_code=eq.${code}` },
        () => chargerVotes1())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_phase2', filter: `room_code=eq.${code}` },
        () => chargerVotes2())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        payload => {
          setRoom(payload.new)
          if (payload.new.statut === 'resultats') router.push(`/resultats/${code}`)
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function chargerTout() {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms').select('*').eq('code', code).single()

    if (roomError || !roomData) {
      console.error('Room introuvable', roomError)
      setLoading(false)
      return
    }

    setRoom(roomData)
    if (roomData.statut === 'resultats') { router.push(`/resultats/${code}`); return }

    const filtres = roomData?.filtres || {}
    console.log('Filtres:', filtres)

    let query = supabase.from('games').select('*')

    if (filtres.plateforme && filtres.plateforme !== '') {
      query = query.eq('plateforme', filtres.plateforme)
    }
    if (filtres.nombre_joueurs && filtres.nombre_joueurs !== '') {
      query = query.gte('nombre_joueurs', parseInt(filtres.nombre_joueurs))
    }
    if (filtres.session && filtres.session !== '') {
      query = query.eq('session', filtres.session)
    }
    if (filtres.genre && filtres.genre !== '') {
      query = query.contains('genres', [filtres.genre])
    }

    const { data: jeuxData, error: jeuxError } = await query
    console.log('Jeux chargés:', jeuxData?.length, jeuxError)

    setJeux(jeuxData || [])
    await chargerVotes1()
    await chargerVotes2()
    setLoading(false)
  }

  async function chargerVotes1() {
    const { data } = await supabase.from('votes_phase1').select('game_id').eq('room_code', code)
    const counts = {}
    data?.forEach(v => { counts[v.game_id] = (counts[v.game_id] || 0) + 1 })
    setVotes1(counts)
  }

  async function chargerVotes2() {
    const { data } = await supabase.from('votes_phase2').select('game_id, nombre').eq('room_code', code)
    const counts = {}
    data?.forEach(v => { counts[v.game_id] = (counts[v.game_id] || 0) + v.nombre })
    setVotes2(counts)
    const { data: mesData } = await supabase.from('votes_phase2').select('game_id, nombre')
      .eq('room_code', code).eq('joueur_id', joueurId)
    const mesCounts = {}
    let total = 0
    mesData?.forEach(v => { mesCounts[v.game_id] = v.nombre; total += v.nombre })
    setMesVotes2(mesCounts)
    setVotesRestants(5 - total)
  }

  async function toggleVote1(gameId) {
    const { data: existing } = await supabase.from('votes_phase1').select('id')
      .eq('room_code', code).eq('game_id', gameId).eq('joueur_id', joueurId)
    if (existing?.length > 0) {
      await supabase.from('votes_phase1').delete()
        .eq('room_code', code).eq('game_id', gameId).eq('joueur_id', joueurId)
    } else {
      await supabase.from('votes_phase1').insert({ room_code: code, game_id: gameId, joueur_id: joueurId })
    }
  }

  async function ajouterVote2(gameId) {
    if (votesRestants <= 0) return
    const actuel = mesVotes2[gameId] || 0
    await supabase.from('votes_phase2').upsert(
      { room_code: code, game_id: gameId, joueur_id: joueurId, nombre: actuel + 1 },
      { onConflict: 'room_code,game_id,joueur_id' }
    )
  }

  async function retirerVote2(gameId) {
    const actuel = mesVotes2[gameId] || 0
    if (actuel <= 0) return
    if (actuel === 1) {
      await supabase.from('votes_phase2').delete()
        .eq('room_code', code).eq('game_id', gameId).eq('joueur_id', joueurId)
    } else {
      await supabase.from('votes_phase2').upsert(
        { room_code: code, game_id: gameId, joueur_id: joueurId, nombre: actuel - 1 },
        { onConflict: 'room_code,game_id,joueur_id' }
      )
    }
  }

  async function terminerPhase1() {
    await supabase.from('rooms').update({ statut: 'phase2' }).eq('code', code)
    setRoom(r => ({ ...r, statut: 'phase2' }))
  }

  async function terminerVote() {
    const jeuxPhase2 = jeux.filter(j => (votes1[j.id] || 0) > 0)
    const gagnant = jeuxPhase2.sort((a, b) => (votes2[b.id] || 0) - (votes2[a.id] || 0))[0]
    await supabase.from('historique').insert({
      room_code: code,
      jeu_gagnant: gagnant?.nom || '',
      resultats: jeuxPhase2.map(j => ({ nom: j.nom, votes: votes2[j.id] || 0 }))
    })
    await supabase.from('rooms').update({ statut: 'resultats' }).eq('code', code)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Chargement des jeux...</p>
    </div>
  )

  const phase = room?.statut
  const jeuxAffiches = phase === 'phase2' ? jeux.filter(j => (votes1[j.id] || 0) > 0) : jeux

  return (
    <main className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {phase === 'phase1' ? '👍 Présélection' : '🗳️ Vote final'}
            </h1>
            <p className="text-gray-400 text-sm">Room : <span className="text-purple-400 font-mono">{code}</span></p>
            <p className="text-gray-500 text-xs">{jeuxAffiches.length} jeux</p>
          </div>
          {phase === 'phase2' && (
            <div className="bg-gray-900 rounded-xl px-4 py-2 text-center">
              <p className="text-gray-400 text-xs">Votes restants</p>
              <p className="text-2xl font-bold text-purple-400">{votesRestants}</p>
            </div>
          )}
        </div>

        {role === 'maitre' && (
          <div className="mb-6">
            {phase === 'phase1' && (
              <button onClick={terminerPhase1}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-xl transition">
                ✅ Terminer la présélection ({jeuxAffiches.filter(j => (votes1[j.id] || 0) > 0).length} jeux sélectionnés)
              </button>
            )}
            {phase === 'phase2' && (
              <button onClick={terminerVote}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition">
                🏆 Terminer le vote et voir les résultats
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {jeuxAffiches.map(jeu => {
            const votesJeu1 = votes1[jeu.id] || 0
            const votesJeu2 = votes2[jeu.id] || 0
            const mesVotesJeu2 = mesVotes2[jeu.id] || 0
            return (
              <div key={jeu.id}
                className={`bg-gray-900 rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-105 ${phase === 'phase1' && votesJeu1 > 0 ? 'ring-2 ring-purple-500' : ''}`}
                onClick={phase === 'phase1' ? () => toggleVote1(jeu.id) : undefined}
              >
                <div className="relative">
                  {jeu.jaquette_url ? (
                    <img src={jeu.jaquette_url} alt={jeu.nom}
                      className="w-full aspect-[3/4] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-gray-800 flex items-center justify-center">
                      <span className="text-4xl">🎮</span>
                    </div>
                  )}
                  {phase === 'phase1' && votesJeu1 > 0 && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {votesJeu1} ✓
                    </div>
                  )}
                  {phase === 'phase2' && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                      {votesJeu2} 🗳️
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <h3 className="text-white font-semibold text-sm leading-tight">{jeu.nom}</h3>
                  <div className="flex flex-wrap gap-1">
                    {jeu.plateforme && (
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{jeu.plateforme}</span>
                    )}
                    {jeu.session && (
                      <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">{jeu.session}</span>
                    )}
                    {jeu.nombre_joueurs && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{jeu.nombre_joueurs}J</span>
                    )}
                  </div>
                  {phase === 'phase2' && (
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={e => { e.stopPropagation(); retirerVote2(jeu.id) }}
                        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-bold transition">
                        -
                      </button>
                      <span className="text-white font-bold">{mesVotesJeu2}</span>
                      <button onClick={e => { e.stopPropagation(); ajouterVote2(jeu.id) }}
                        disabled={votesRestants <= 0}
                        className="w-8 h-8 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-full font-bold transition">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {jeuxAffiches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-gray-400">Aucun jeu trouvé avec ces filtres</p>
          </div>
        )}
      </div>
    </main>
  )
}