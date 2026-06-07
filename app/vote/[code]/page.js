'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Modale vidéo ────────────────────────────────────────────────────────────
function VideoModal({ youtubeId, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/60 hover:text-white text-sm flex items-center gap-1 transition">
          ✕ Fermer
        </button>
        <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}

// ─── Image avec lazy loading ──────────────────────────────────────────────────
function LazyImage({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { rootMargin: '200px' }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      {(!loaded || !inView) && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}

// ─── Modale fiche jeu ─────────────────────────────────────────────────────────
function GameModal({ jeu, phase, monVote1, mesVotesJeu2, votesRestants, onClose, onToggleVote1, onAjouter2, onRetirer2 }) {
  const [videoOpen, setVideoOpen] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          className="relative gp-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative flex-shrink-0">
            {jeu.gameplay_url ? (
              <img src={jeu.gameplay_url} alt={`${jeu.nom} gameplay`} className="w-full h-48 object-cover" />
            ) : jeu.jaquette_url ? (
              <img src={jeu.jaquette_url} alt={jeu.nom} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-slate-950/70 flex items-center justify-center">
                <span className="text-6xl">🎮</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition text-sm font-bold">✕</button>
            {jeu.jaquette_url && jeu.gameplay_url && (
              <div className="absolute bottom-3 left-4">
                <img src={jeu.jaquette_url} alt={jeu.nom} className="h-16 w-auto rounded-lg shadow-xl ring-2 ring-white/20" />
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            <div>
              <h2 className="text-white text-xl font-bold leading-tight">{jeu.nom}</h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {jeu.plateforme && <span className="text-xs bg-blue-900/70 text-blue-300 px-2.5 py-1 rounded-full">🖥 {jeu.plateforme}</span>}
                {jeu.session && <span className="text-xs bg-green-900/70 text-green-300 px-2.5 py-1 rounded-full">⏱ {jeu.session}</span>}
                {jeu.nombre_joueurs && <span className="text-xs bg-slate-800/80 text-gray-300 px-2.5 py-1 rounded-full">👥 {jeu.nombre_joueurs} joueurs</span>}
                {jeu.disponibilite && <span className="text-xs bg-purple-900/70 text-purple-300 px-2.5 py-1 rounded-full">{jeu.disponibilite}</span>}
              </div>
            </div>

            {jeu.genres?.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {jeu.genres.map(g => (
                    <span key={g} className="text-xs bg-slate-950/70 text-gray-300 px-2.5 py-1 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {jeu.description && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-gray-300 text-sm leading-relaxed">{jeu.description}</p>
              </div>
            )}

            <button
              onClick={() => jeu.youtube_id && setVideoOpen(true)}
              disabled={!jeu.youtube_id}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition
                ${jeu.youtube_id ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-950/70 text-gray-600 cursor-not-allowed'}`}
            >
              {jeu.youtube_id ? '▶ Voir le gameplay' : '▶ Gameplay bientôt disponible'}
            </button>
          </div>

          <div className="flex-shrink-0 p-4 border-t border-gray-800 gp-card">
            {phase === 'phase1' && (
              <button
                onClick={() => onToggleVote1(jeu.id)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition
                  ${monVote1 ? 'gp-btn-primary text-white' : 'bg-slate-800/80 hover:bg-gray-600 text-white'}`}
              >
                {monVote1 ? '✅ Sélectionné — retirer' : '👍 Je veux jouer à ça'}
              </button>
            )}
            {phase === 'phase2' && (
              <div className="flex items-center gap-4">
                <button onClick={() => onRetirer2(jeu.id)} disabled={mesVotesJeu2 <= 0} className="w-12 h-12 bg-slate-800/80 hover:bg-gray-600 disabled:opacity-30 text-white rounded-full text-xl font-bold transition flex-shrink-0">−</button>
                <div className="flex-1 text-center">
                  <p className="text-3xl font-bold text-cyan-300">{mesVotesJeu2}</p>
                  <p className="text-gray-500 text-xs">{votesRestants} restants</p>
                </div>
                <button onClick={() => onAjouter2(jeu.id)} disabled={votesRestants <= 0} className="w-12 h-12 gp-btn-primary disabled:opacity-30 text-white rounded-full text-xl font-bold transition flex-shrink-0">+</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {videoOpen && jeu.youtube_id && (
        <VideoModal youtubeId={jeu.youtube_id} onClose={() => setVideoOpen(false)} />
      )}
    </>
  )
}

// ─── Carte jeu ────────────────────────────────────────────────────────────────
function GameCard({ jeu, showGameplayCards, phase, monVote1, votesJeu1, mesVotesJeu2, votesJeu2, votesRestants, onOpenModal, onToggleVote1, onAjouter2, onRetirer2 }) {
  const jaquette = jeu.jaquette_url
  const gameplay = jeu.gameplay_url || jeu.jaquette_url

  return (
    <div className={`gp-card rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] ${phase === 'phase1' && monVote1 ? 'ring-2 ring-cyan-300' : ''}`}>
      <div className="cursor-pointer" onClick={() => onOpenModal(jeu)}>
        <div className="relative aspect-[3/4]">
          {!showGameplayCards ? (
            jaquette
              ? <LazyImage src={jaquette} alt={jeu.nom} className="absolute inset-0 w-full h-full" />
              : <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center"><span className="text-4xl">🎮</span></div>
          ) : (
            gameplay
              ? <LazyImage src={gameplay} alt={`${jeu.nom} gameplay`} className="absolute inset-0 w-full h-full" />
              : <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center"><span className="text-4xl">🕹️</span></div>
          )}

          {jeu.youtube_id && (
            <div className="absolute bottom-2 left-2 bg-red-600/90 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">▶</div>
          )}
          {phase === 'phase1' && votesJeu1 > 0 && (
            <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">{votesJeu1} ✓</div>
          )}
          {phase === 'phase2' && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">{votesJeu2} 🗳️</div>
          )}
        </div>

        <div className="px-3 pt-3 pb-1">
          <h3 className="text-white font-semibold text-sm leading-tight">{jeu.nom}</h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {jeu.plateforme && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{jeu.plateforme}</span>}
            {jeu.session && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">{jeu.session}</span>}
            {jeu.nombre_joueurs && <span className="text-xs bg-slate-800/80 text-gray-300 px-2 py-0.5 rounded-full">{jeu.nombre_joueurs}J</span>}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        {phase === 'phase1' && (
          <button
            onClick={e => { e.stopPropagation(); onToggleVote1(jeu.id) }}
            className={`w-full py-2 rounded-xl text-xs font-bold transition ${monVote1 ? 'gp-btn-primary text-white' : 'bg-slate-800/80 hover:bg-gray-600 text-gray-300'}`}
          >
            {monVote1 ? '✅ Sélectionné' : '👍 Je veux jouer'}
          </button>
        )}
        {phase === 'phase2' && (
          <div className="flex items-center justify-between">
            <button onClick={e => { e.stopPropagation(); onRetirer2(jeu.id) }} className="w-8 h-8 bg-slate-800/80 hover:bg-gray-600 text-white rounded-full font-bold transition">−</button>
            <span className="text-white font-bold">{mesVotesJeu2}</span>
            <button onClick={e => { e.stopPropagation(); onAjouter2(jeu.id) }} disabled={votesRestants <= 0} className="w-8 h-8 gp-btn-primary disabled:opacity-50 text-white rounded-full font-bold transition">+</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function VotePage() {
  const { code } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get('role') || 'joueur'

  const [room, setRoom] = useState(null)
  const [jeux, setJeux] = useState([])
  const [votes1, setVotes1] = useState({})
  const [mesVotes1, setMesVotes1] = useState({})
  const [votes2, setVotes2] = useState({})
  const [mesVotes2, setMesVotes2] = useState({})
  const [votesRestants, setVotesRestants] = useState(5)
  const [loading, setLoading] = useState(true)
  const [jeuModal, setJeuModal] = useState(null)
  const [showGameplayCards, setShowGameplayCards] = useState(false)

  const joueurId =
    typeof window !== 'undefined'
      ? localStorage.getItem(`joueur_${code}`) ||
        (() => {
          const id = Math.random().toString(36).substring(2)
          localStorage.setItem(`joueur_${code}`, id)
          return id
        })()
      : ''

  useEffect(() => {
    chargerTout()

    const channel = supabase
      .channel(`vote-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_phase1', filter: `room_code=eq.${code}` }, () => chargerVotes1())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_phase2', filter: `room_code=eq.${code}` }, () => chargerVotes2())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, payload => {
        setRoom(payload.new)
        if (payload.new.statut === 'resultats') router.push(`/resultats/${code}`)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function chargerTout() {
    const { data: roomData, error: roomError } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (roomError || !roomData) { setLoading(false); return }

    setRoom(roomData)
    if (roomData.statut === 'resultats') { router.push(`/resultats/${code}`); return }

    const filtres = roomData?.filtres || {}
    let query = supabase.from('games').select('*')

    if (filtres.plateforme) query = query.eq('plateforme', filtres.plateforme)
    if (filtres.nombre_joueurs) query = query.gte('nombre_joueurs', parseInt(filtres.nombre_joueurs))

    // Filtre session inclusif : Court = court seul, Moyen = court+moyen, Long = tout
    if (filtres.session) {
      if (filtres.session === 'Moyen') {
        query = query.in('session', ['Court', 'Moyen'])
      } else if (filtres.session === 'Long') {
        query = query.in('session', ['Court', 'Moyen', 'Long'])
      } else {
        query = query.eq('session', filtres.session)
      }
    }

    if (filtres.genre) query = query.contains('genres', [filtres.genre])

    const { data: jeuxData } = await query
    setJeux(jeuxData || [])
    await chargerVotes1()
    await chargerVotes2()
    setLoading(false)
  }

  async function chargerVotes1() {
    const { data } = await supabase.from('votes_phase1').select('game_id, joueur_id').eq('room_code', code)
    const counts = {}
    const mesCounts = {}
    data?.forEach(v => {
      counts[v.game_id] = (counts[v.game_id] || 0) + 1
      if (v.joueur_id === joueurId) mesCounts[v.game_id] = true
    })
    setVotes1(counts)
    setMesVotes1(mesCounts)
  }

  async function chargerVotes2() {
    const { data } = await supabase.from('votes_phase2').select('game_id, nombre').eq('room_code', code)
    const counts = {}
    data?.forEach(v => { counts[v.game_id] = (counts[v.game_id] || 0) + v.nombre })
    setVotes2(counts)

    const { data: mesData } = await supabase.from('votes_phase2').select('game_id, nombre').eq('room_code', code).eq('joueur_id', joueurId)
    const mesCounts = {}
    let total = 0
    mesData?.forEach(v => { mesCounts[v.game_id] = v.nombre; total += v.nombre })
    setMesVotes2(mesCounts)
    setVotesRestants(5 - total)
  }

  async function toggleVote1(gameId) {
    const dejaVote = !!mesVotes1[gameId]
    if (dejaVote) {
      setMesVotes1(prev => { const c = { ...prev }; delete c[gameId]; return c })
      setVotes1(prev => ({ ...prev, [gameId]: Math.max((prev[gameId] || 1) - 1, 0) }))
      await supabase.from('votes_phase1').delete().eq('room_code', code).eq('game_id', gameId).eq('joueur_id', joueurId)
    } else {
      setMesVotes1(prev => ({ ...prev, [gameId]: true }))
      setVotes1(prev => ({ ...prev, [gameId]: (prev[gameId] || 0) + 1 }))
      await supabase.from('votes_phase1').insert({ room_code: code, game_id: gameId, joueur_id: joueurId })
    }
    await chargerVotes1()
  }

  async function ajouterVote2(gameId) {
    if (votesRestants <= 0) return
    const actuel = mesVotes2[gameId] || 0
    await supabase.from('votes_phase2').upsert(
      { room_code: code, game_id: gameId, joueur_id: joueurId, nombre: actuel + 1 },
      { onConflict: 'room_code,game_id,joueur_id' }
    )
    await chargerVotes2()
  }

  async function retirerVote2(gameId) {
    const actuel = mesVotes2[gameId] || 0
    if (actuel <= 0) return
    if (actuel === 1) {
      await supabase.from('votes_phase2').delete().eq('room_code', code).eq('game_id', gameId).eq('joueur_id', joueurId)
    } else {
      await supabase.from('votes_phase2').upsert(
        { room_code: code, game_id: gameId, joueur_id: joueurId, nombre: actuel - 1 },
        { onConflict: 'room_code,game_id,joueur_id' }
      )
    }
    await chargerVotes2()
  }

  async function terminerPhase1() {
    await supabase.from('rooms').update({ statut: 'phase2' }).eq('code', code)
    setRoom(r => ({ ...r, statut: 'phase2' }))
  }

  async function terminerVote() {
    const jeuxPhase2 = jeux.filter(j => (votes1[j.id] || 0) > 0)
    const gagnant = [...jeuxPhase2].sort((a, b) => (votes2[b.id] || 0) - (votes2[a.id] || 0))[0]
    await supabase.from('historique').insert({
      room_code: code,
      jeu_gagnant: gagnant?.nom || '',
      resultats: jeuxPhase2.map(j => ({ nom: j.nom, votes: votes2[j.id] || 0 }))
    })
    await supabase.from('rooms').update({ statut: 'resultats' }).eq('code', code)
  }

  if (loading) {
    return (
      <div className="min-h-screen gp-bg flex items-center justify-center">
        <p className="text-white">Chargement des jeux...</p>
      </div>
    )
  }

  const phase = room?.statut
  const jeuxAffiches = phase === 'phase2' ? jeux.filter(j => (votes1[j.id] || 0) > 0) : jeux

  return (
    <main className="min-h-screen gp-bg p-4">
      <button
        onClick={() => setShowGameplayCards(prev => !prev)}
        className="fixed bottom-4 right-4 z-30 gp-btn-primary text-white font-bold px-4 py-3 rounded-full shadow-2xl transition active:scale-95"
      >
        {showGameplayCards ? '🃏 Voir jaquettes' : '🎮 Voir gameplay'}
      </button>

      <div className="gp-shell max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{phase === 'phase1' ? '👍 Présélection' : '🗳️ Vote final'}</h1>
            <p className="text-gray-400 text-sm">Room : <span className="text-cyan-300 font-mono">{code}</span></p>
            <p className="text-gray-500 text-xs">{jeuxAffiches.length} jeux</p>
          </div>
          {phase === 'phase2' && (
            <div className="gp-card rounded-xl px-4 py-2 text-center">
              <p className="text-gray-400 text-xs">Votes restants</p>
              <p className="text-2xl font-bold text-cyan-300">{votesRestants}</p>
            </div>
          )}
        </div>

        {role === 'maitre' && (
          <div className="mb-6">
            {phase === 'phase1' && (
              <button onClick={terminerPhase1} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-xl transition">
                ✅ Terminer la présélection ({jeuxAffiches.filter(j => (votes1[j.id] || 0) > 0).length} jeux sélectionnés)
              </button>
            )}
            {phase === 'phase2' && (
              <button onClick={terminerVote} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition">
                🏆 Terminer le vote et voir les résultats
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {jeuxAffiches.map(jeu => (
            <GameCard
              key={jeu.id}
              jeu={jeu}
              showGameplayCards={showGameplayCards}
              phase={phase}
              monVote1={!!mesVotes1[jeu.id]}
              votesJeu1={votes1[jeu.id] || 0}
              mesVotesJeu2={mesVotes2[jeu.id] || 0}
              votesJeu2={votes2[jeu.id] || 0}
              votesRestants={votesRestants}
              onOpenModal={setJeuModal}
              onToggleVote1={toggleVote1}
              onAjouter2={ajouterVote2}
              onRetirer2={retirerVote2}
            />
          ))}
        </div>

        {jeuxAffiches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-gray-400">Aucun jeu trouvé avec ces filtres</p>
          </div>
        )}
      </div>

      {jeuModal && (
        <GameModal
          jeu={jeuModal}
          phase={phase}
          monVote1={!!mesVotes1[jeuModal.id]}
          mesVotesJeu2={mesVotes2[jeuModal.id] || 0}
          votesRestants={votesRestants}
          onClose={() => setJeuModal(null)}
          onToggleVote1={toggleVote1}
          onAjouter2={ajouterVote2}
          onRetirer2={retirerVote2}
        />
      )}
    </main>
  )
}