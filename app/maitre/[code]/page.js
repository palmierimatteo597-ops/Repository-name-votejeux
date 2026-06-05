'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QRCodeCanvas as QRCode } from 'qrcode.react'

export default function MaitrePage() {
  const { code } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingVideos, setSyncingVideos] = useState(false)

  const [filtres, setFiltres] = useState({
    plateforme: '',
    nombre_joueurs: '',
    session: '',
    genre: ''
  })

  const [plateformes, setPlateformes] = useState([])
  const [genres, setGenres] = useState([])

  useEffect(() => {
    chargerRoom()
    chargerFiltres()
  }, [])

  async function chargerRoom() {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    setRoom(data)
    setLoading(false)
  }

  async function chargerFiltres() {
    const { data } = await supabase
      .from('games')
      .select('plateforme, genres')

    if (!data) return

    const p = [...new Set(data.map(g => g.plateforme).filter(Boolean))].sort()
    const g = [...new Set(data.flatMap(g => g.genres || []).filter(Boolean))].sort()

    setPlateformes(p)
    setGenres(g)
  }

  async function syncJeux() {
    setSyncing(true)

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Erreur sync jeux')
      }

      await chargerFiltres()
      alert(`Jeux synchronisés ! (${data.count} jeux)`)
    } catch (err) {
      alert(`Erreur sync jeux : ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function syncVideos() {
    setSyncingVideos(true)

    try {
      const res = await fetch('/api/sync-youtube')
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Erreur sync vidéos')
      }

      alert(
        `Vidéos synchronisées !\n` +
        `Jeux traités : ${data.total}\n` +
        `Vidéos trouvées : ${data.updated}\n` +
        `Échecs : ${data.failed}`
      )
    } catch (err) {
      alert(`Erreur sync vidéos : ${err.message}`)
    } finally {
      setSyncingVideos(false)
    }
  }

  async function appliquerFiltres() {
    await supabase
      .from('rooms')
      .update({ filtres, statut: 'phase1' })
      .eq('code', code)

    router.push(`/vote/${code}?role=maitre`)
  }

  if (loading) {
    return (
      <div className="min-h-screen gp-bg flex items-center justify-center">
        <p className="text-white">Chargement...</p>
      </div>
    )
  }

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/joueur/${code}`
    : ''

  return (
    <main className="min-h-screen gp-bg p-4">
      <div className="gp-shell max-w-2xl mx-auto space-y-7">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">🎮 Maître du jeu</h1>
          <p className="text-gray-400 mt-1">
            Room : <span className="text-cyan-300 font-mono text-xl">{code}</span>
          </p>
        </div>

        <div className="gp-card rounded-[2rem] p-6 flex flex-col items-center space-y-4">
          <p className="text-white font-semibold">QR Code pour rejoindre</p>
          <QRCode value={roomUrl} size={180} bgColor="#070b18" fgColor="#ffffff" />
          <p className="text-gray-400 text-sm text-center">
            Ou partage le code : <span className="text-cyan-300 font-mono font-bold">{code}</span>
          </p>
        </div>

        <div className="gp-card rounded-[2rem] p-6 space-y-4">
          <div className="space-y-3">
            <h2 className="text-white font-semibold">Filtres</h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={syncJeux}
                disabled={syncing || syncingVideos}
                className="text-sm gp-btn-secondary disabled:opacity-50 text-white px-3 py-3 rounded-xl transition"
              >
                {syncing ? '⏳ Sync...' : '🔄 Sync jeux'}
              </button>

              <button
                onClick={syncVideos}
                disabled={syncing || syncingVideos}
                className="text-sm bg-pink-600/90 hover:bg-pink-500 disabled:opacity-50 text-white px-3 py-3 rounded-xl transition"
              >
                {syncingVideos ? '⏳ Vidéos...' : '🎬 Sync vidéos'}
              </button>
            </div>
          </div>

          <select
            value={filtres.plateforme}
            onChange={e => setFiltres({ ...filtres, plateforme: e.target.value })}
            className="w-full gp-select w-full rounded-2xl px-4 py-3"
          >
            <option value="">Toutes les plateformes</option>
            {plateformes.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={filtres.nombre_joueurs}
            onChange={e => setFiltres({ ...filtres, nombre_joueurs: e.target.value })}
            className="w-full gp-select w-full rounded-2xl px-4 py-3"
          >
            <option value="">Nombre de joueurs</option>
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n} joueurs</option>
            ))}
          </select>

          <select
            value={filtres.session}
            onChange={e => setFiltres({ ...filtres, session: e.target.value })}
            className="w-full gp-select w-full rounded-2xl px-4 py-3"
          >
            <option value="">Toutes les sessions</option>
            <option value="Court">Court</option>
            <option value="Moyen">Moyen</option>
            <option value="Long">Long</option>
          </select>

          <select
            value={filtres.genre}
            onChange={e => setFiltres({ ...filtres, genre: e.target.value })}
            className="w-full gp-select w-full rounded-2xl px-4 py-3"
          >
            <option value="">Tous les genres</option>
            {genres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <button
            onClick={appliquerFiltres}
            className="w-full gp-btn-primary text-white font-black py-4 rounded-2xl transition active:scale-[.98]"
          >
            🚀 Lancer la présélection
          </button>
        </div>
      </div>
    </main>
  )
}