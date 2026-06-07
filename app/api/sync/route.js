import { fetchGamesFromAirtable } from '@/lib/airtable'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Télécharge une image depuis une URL et l'uploade dans Supabase Storage.
// Retourne l'URL publique Supabase, ou null en cas d'échec.
async function uploadImage(url, storagePath) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    const { error } = await supabase.storage
      .from('games')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true // écrase si déjà présent
      })

    if (error) {
      console.error(`Storage upload error (${storagePath}):`, error.message)
      return null
    }

    const { data } = supabase.storage
      .from('games')
      .getPublicUrl(storagePath)

    return data.publicUrl
  } catch (err) {
    console.error(`uploadImage failed (${storagePath}):`, err.message)
    return null
  }
}

// Extrait une extension propre depuis une URL (jpg, png, webp...)
function getExtension(url) {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop().split('?')[0].toLowerCase()
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  } catch {
    return 'jpg'
  }
}

async function sync() {
  const games = await fetchGamesFromAirtable()

  if (!games || games.length === 0) {
    throw new Error('Airtable a retourné 0 jeux — sync annulée pour éviter de tout effacer.')
  }

  // Récupère les données existantes dans Supabase pour comparer
  const { data: existants } = await supabase
    .from('games')
    .select('id, youtube_id, jaquette_url, gameplay_url')

  const existantsMap = {}
  for (const g of existants || []) {
    existantsMap[g.id] = g
  }

  // Supprime les zombies
  const idsSupabase = new Set(Object.keys(existantsMap))
  const idsAirtable = new Set(games.map(g => g.id))
  const idsASupprimer = [...idsSupabase].filter(id => !idsAirtable.has(id))

  if (idsASupprimer.length > 0) {
    await supabase.from('games').delete().in('id', idsASupprimer)
  }

  // Traite chaque jeu : upload images si nécessaire
  let imagesUploaded = 0
  const gamesFinaux = []

  for (const game of games) {
    const existant = existantsMap[game.id]
    const existantUrl = existant?.jaquette_url || ''
    const existantGameplayUrl = existant?.gameplay_url || ''

    // Jaquette : on uploade seulement si l'URL Supabase n'existe pas encore
    // (les URLs Supabase Storage contiennent le nom du projet, les URLs Airtable contiennent "airtable")
    let jaquetteUrl = game.jaquette_url
    if (game.jaquette_url && !existantUrl.includes('supabase')) {
      const ext = getExtension(game.jaquette_url)
      const path = `jaquettes/${game.id}.${ext}`
      const uploaded = await uploadImage(game.jaquette_url, path)
      if (uploaded) {
        jaquetteUrl = uploaded
        imagesUploaded++
      }
    } else if (existantUrl.includes('supabase')) {
      // Garde l'URL Supabase existante
      jaquetteUrl = existantUrl
    }

    // Gameplay : même logique
    let gameplayUrl = game.gameplay_url
    if (game.gameplay_url && !existantGameplayUrl.includes('supabase')) {
      const ext = getExtension(game.gameplay_url)
      const path = `gameplay/${game.id}.${ext}`
      const uploaded = await uploadImage(game.gameplay_url, path)
      if (uploaded) {
        gameplayUrl = uploaded
        imagesUploaded++
      }
    } else if (existantGameplayUrl.includes('supabase')) {
      gameplayUrl = existantGameplayUrl
    }

    gamesFinaux.push({
      ...game,
      jaquette_url: jaquetteUrl,
      gameplay_url: gameplayUrl,
      youtube_id: existant?.youtube_id || null
    })
  }

  // Upsert final
  const { error } = await supabase
    .from('games')
    .upsert(gamesFinaux, { onConflict: 'id' })

  if (error) throw error

  return {
    count: games.length,
    deleted: idsASupprimer.length,
    imagesUploaded
  }
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