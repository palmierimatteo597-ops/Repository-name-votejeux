import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

async function searchYoutube(nom, plateforme) {
  const query = `${nom} ${plateforme || ''} gameplay`
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`)
  }

  const item = data.items?.[0]

  return {
    query,
    youtube_id: item?.id?.videoId || null,
    title: item?.snippet?.title || null
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit'))
      : null

    const dryRun = searchParams.get('dryRun') === 'true'

    let query = supabase
      .from('games')
      .select('id, nom, plateforme, youtube_id')
      .is('youtube_id', null)

    if (limit) {
      query = query.limit(limit)
    }

    const { data: jeux, error } = await query

    if (error) throw error

    if (!jeux || jeux.length === 0) {
      return Response.json({
        success: true,
        message: 'Tous les jeux ont déjà un youtube_id',
        total: 0,
        updated: 0,
        failed: 0,
        dryRun
      })
    }

    let updated = 0
    let failed = 0
    const results = []

    for (const jeu of jeux) {
      try {
        const result = await searchYoutube(jeu.nom, jeu.plateforme)

        if (result.youtube_id) {
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('games')
              .update({ youtube_id: result.youtube_id })
              .eq('id', jeu.id)

            if (updateError) throw updateError
          }

          updated++

          results.push({
            nom: jeu.nom,
            plateforme: jeu.plateforme,
            query: result.query,
            youtube_id: result.youtube_id,
            title: result.title,
            status: dryRun ? 'found_dry_run' : 'updated'
          })
        } else {
          failed++

          results.push({
            nom: jeu.nom,
            plateforme: jeu.plateforme,
            query: result.query,
            youtube_id: null,
            title: null,
            status: 'not_found'
          })
        }

        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        failed++

        results.push({
          nom: jeu.nom,
          plateforme: jeu.plateforme,
          youtube_id: null,
          title: null,
          status: 'error',
          error: err.message
        })
      }
    }

    return Response.json({
      success: true,
      dryRun,
      limit,
      total: jeux.length,
      updated,
      failed,
      results
    })
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err.message
      },
      { status: 500 }
    )
  }
}