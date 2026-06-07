import { fetchGamesFromAirtable } from '@/lib/airtable'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function sync() {
  const games = await fetchGamesFromAirtable()

  if (!games || games.length === 0) {
    throw new Error('Airtable a retourné 0 jeux — sync annulée pour éviter de tout effacer.')
  }

  // 1. Récupère les IDs actuellement dans Supabase
  const { data: existants } = await supabase
    .from('games')
    .select('id')

  const idsSupabase = new Set((existants || []).map(g => g.id))
  const idsAirtable = new Set(games.map(g => g.id))

  // 2. Supprime les zombies (dans Supabase mais plus dans Airtable)
  const idsASupprimer = [...idsSupabase].filter(id => !idsAirtable.has(id))

  if (idsASupprimer.length > 0) {
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .in('id', idsASupprimer)

    if (deleteError) throw deleteError
  }

  // 3. Upsert des jeux Airtable.
  //    On utilise ignoreDuplicates: false (comportement par défaut) pour bien mettre à jour.
  //    youtube_id est absent de l'objet games (voir airtable.js) donc Supabase ne le touche pas
  //    uniquement si on fait un INSERT ... ON CONFLICT DO UPDATE avec les colonnes explicites.
  //    Avec le client Supabase JS, upsert écrase toutes les colonnes présentes dans l'objet.
  //    → On récupère les youtube_id existants pour les réinjecter et ne pas les perdre.
  const { data: existantsYoutube } = await supabase
    .from('games')
    .select('id, youtube_id')

  const youtubeMap = {}
  for (const g of existantsYoutube || []) {
    if (g.youtube_id) youtubeMap[g.id] = g.youtube_id
  }

  const gamesAvecYoutube = games.map(g => ({
    ...g,
    youtube_id: youtubeMap[g.id] || null
  }))

  const { error } = await supabase
    .from('games')
    .upsert(gamesAvecYoutube, { onConflict: 'id' })

  if (error) throw error

  return { count: games.length, deleted: idsASupprimer.length, deletedIds: idsASupprimer }
}

export async function POST() {
  try {
    const result = await sync()
    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await sync()
    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}