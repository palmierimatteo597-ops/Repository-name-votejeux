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
  const [filtres, setFiltres] = useState({
    plateforme: '', nombre_joueurs: '', session: '', genre: ''
  })
  const [plateformes, setPlateformes] = useState([])
  const [genres, setGenres] = useState([])

  useEffect(() => {
    chargerRoom()
    chargerFiltres()
  }, [])

  async function chargerRoom() {
    const { data } = await supabase
      .from('rooms').select('*').eq('code', code).single()
    setRoom(data)
    setLoading(false)
  }

  async function chargerFiltres() {
    const { data } = await supabase.from('games').select('plateforme, genres')
    if (!data) return
    const p = [...new Set(data.map(g => g.plateforme).filter(Boolean))].sort()
    const g = [...new Set(data.flatMap(g => g.genres || []).filter(Boolean))].sort()
    setPlateformes(p)
    setGenres(g)
  }

  async function syncJeux() {
    setSyncing(true)
    await fetch('/api/sync', { method: 'POST' })
    await chargerFiltres()
    setSyncing(false)
    alert('Jeux synchronisés !')
  }

  async function appliquerFiltres() {
    await supabase.from('rooms')
      .update({ filtres, statut: 'phase1' })
      .eq('code', code)
    router.push(`/vote/${code}?role=maitre`)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Chargement...</p>
    </div>
  )

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/joueur/${code}` : ''

  return (
    <main className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">🎮 Maître du jeu</h1>
          <p className="text-gray-400 mt-1">Room : <span className="text-purple-400 font-mono text-xl">{code}</span></p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center space-y-4">
          <p className="text-white font-semibold">QR Code pour rejoindre</p>
          <QRCode value={roomUrl} size={180} bgColor="#111827" fgColor="#ffffff" />
          <p className="text-gray-400 text-sm text-center">Ou partage le code : <span className="text-purple-400 font-mono font-bold">{code}</span></p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-semibold">Filtres</h2>
            <button onClick={syncJeux} disabled={syncing}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition">
              {syncing ? '⏳ Sync...' : '🔄 Sync jeux'}
            </button>
          </div>

          <select value={filtres.plateforme} onChange={e => setFiltres({...filtres, plateforme: e.target.value})}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none">
            <option value="">Toutes les plateformes</option>
            {plateformes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filtres.nombre_joueurs} onChange={e => setFiltres({...filtres, nombre_joueurs: e.target.value})}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none">
            <option value="">Nombre de joueurs</option>
            {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} joueurs</option>)}
          </select>

          <select value={filtres.session} onChange={e => setFiltres({...filtres, session: e.target.value})}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none">
            <option value="">Toutes les sessions</option>
            <option value="Court">Court</option>
            <option value="Moyen">Moyen</option>
            <option value="Long">Long</option>
          </select>

          <select value={filtres.genre} onChange={e => setFiltres({...filtres, genre: e.target.value})}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none">
            <option value="">Tous les genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <button onClick={appliquerFiltres}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition">
            🚀 Lancer la présélection
          </button>
        </div>
      </div>
    </main>
  )
}