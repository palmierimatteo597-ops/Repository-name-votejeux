'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function GameCover({ game, className = '' }) {
  const image = game?.jaquette_url || game?.gameplay_url

  if (!image) {
    return (
      <div className={`bg-white/5 flex items-center justify-center ${className}`}>
        <span className="text-3xl">🎮</span>
      </div>
    )
  }

  return (
    <img
      src={image}
      alt={game?.nom || 'Jeu'}
      className={`object-cover ${className}`}
    />
  )
}

function Medal({ rank }) {
  const styles = {
    1: 'from-yellow-300 to-amber-600 text-black shadow-[0_0_30px_rgba(245,158,11,0.45)]',
    2: 'from-slate-100 to-slate-500 text-slate-950',
    3: 'from-orange-300 to-orange-700 text-orange-950'
  }

  return (
    <div className={`h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br ${styles[rank] || 'from-violet-400 to-fuchsia-700 text-white'} flex items-center justify-center font-black text-xl ring-1 ring-white/25`}>
      {rank}
    </div>
  )
}

export default function ResultatsPage() {
  const { code } = useParams()
  const router = useRouter()
  const [resultats, setResultats] = useState([])
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
      let sorted = [...(data.resultats || [])]
        .sort((a, b) => (b.votes || 0) - (a.votes || 0))

      // Sécurité : les anciennes soirées n'ont pas forcément les images dans historique.
      // On les récupère depuis Supabase si besoin.
      const missingImages = sorted.some(r => !r.jaquette_url && !r.gameplay_url)

      if (missingImages && sorted.length > 0) {
        const noms = sorted.map(r => r.nom).filter(Boolean)
        const { data: games } = await supabase
          .from('games')
          .select('id, nom, jaquette_url, gameplay_url, plateforme, session, nombre_joueurs')
          .in('nom', noms)

        sorted = sorted.map(r => {
          const game = games?.find(g => g.nom === r.nom)
          return {
            ...r,
            id: r.id || game?.id,
            jaquette_url: r.jaquette_url || game?.jaquette_url || '',
            gameplay_url: r.gameplay_url || game?.gameplay_url || '',
            plateforme: r.plateforme || game?.plateforme || '',
            session: r.session || game?.session || '',
            nombre_joueurs: r.nombre_joueurs || game?.nombre_joueurs || null
          }
        })
      }

      setResultats(sorted)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <p className="text-white/80">Chargement des résultats...</p>
      </div>
    )
  }

  const gagnant = resultats[0]
  const backgroundImage = gagnant?.gameplay_url || gagnant?.jaquette_url

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] px-4 py-8 text-white">
      {/* Fond dynamique : il reprend visuellement les couleurs de la jaquette / image du gagnant */}
      {backgroundImage && (
        <div className="absolute inset-0 opacity-45">
          <img
            src={backgroundImage}
            alt=""
            className="h-full w-full object-cover blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-[#050816]/70" />
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/15 text-2xl shadow-[0_0_30px_rgba(168,85,247,0.25)]">
              🎮
            </div>
            <div className="leading-none">
              <p className="text-lg font-black uppercase tracking-tight">Game</p>
              <p className="text-lg font-black uppercase tracking-tight text-violet-400">Picker</p>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">🏆 Résultats</h1>
            <p className="mt-2 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 backdrop-blur-xl">
              Room : <span className="ml-1 font-mono font-bold text-violet-400">{code}</span>
            </p>
          </div>
        </header>

        {gagnant ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/70 bg-black/35 shadow-[0_0_55px_rgba(245,158,11,0.24)] backdrop-blur-2xl">
            {(gagnant.gameplay_url || gagnant.jaquette_url) && (
              <img
                src={gagnant.gameplay_url || gagnant.jaquette_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-45 blur-sm scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/65 to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            <div className="relative grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:p-7">
              <GameCover
                game={gagnant}
                className="h-64 w-full rounded-[1.5rem] shadow-2xl ring-1 ring-white/20 sm:h-full"
              />

              <div className="flex min-h-64 flex-col justify-center gap-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">Jeu gagnant</p>
                    <div className="mt-3 h-1 w-16 rounded-full bg-amber-300" />
                  </div>
                  <Medal rank={1} />
                </div>

                <div>
                  <h2 className="text-4xl font-black leading-tight sm:text-6xl">
                    {gagnant.nom}
                  </h2>
                  <p className="mt-4 text-3xl font-black text-violet-400">
                    {gagnant.votes || 0} <span className="text-xl font-semibold text-white/65">vote{(gagnant.votes || 0) > 1 ? 's' : ''}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
            Aucun résultat trouvé.
          </div>
        )}

        <section className="space-y-4">
          {resultats.slice(1).map((r, i) => {
            const rank = i + 2
            return (
              <div
                key={`${r.nom}-${rank}`}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-violet-400/40"
              >
                {(r.gameplay_url || r.jaquette_url) && (
                  <img
                    src={r.gameplay_url || r.jaquette_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-0 blur-2xl scale-110 transition group-hover:opacity-20"
                  />
                )}
                <div className="relative flex items-center gap-4">
                  <Medal rank={rank} />
                  <GameCover game={r} className="h-20 w-20 shrink-0 rounded-2xl ring-1 ring-white/15" />

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-black">{r.nom}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                      {r.nombre_joueurs && <span>👥 {r.nombre_joueurs} joueur{r.nombre_joueurs > 1 ? 's' : ''}</span>}
                      {r.session && <span>⏱ {r.session}</span>}
                      {r.plateforme && <span>🖥 {r.plateforme}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-black text-violet-400">{r.votes || 0}</p>
                    <p className="text-sm text-white/45">vote{(r.votes || 0) > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <button
          onClick={() => router.push('/')}
          className="group flex w-full items-center justify-center gap-4 rounded-3xl border border-violet-400/50 bg-violet-500/10 px-6 py-5 text-lg font-bold shadow-[0_0_40px_rgba(168,85,247,0.18)] backdrop-blur-xl transition hover:bg-violet-500/20 active:scale-[0.99]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-2xl transition group-hover:scale-110">⌂</span>
          Retour à l'accueil
        </button>

        <p className="pb-4 text-center text-sm text-white/35">
          Merci d'avoir utilisé <span className="font-bold text-violet-400">Game Picker</span> ! 🎮
        </p>
      </div>
    </main>
  )
}
