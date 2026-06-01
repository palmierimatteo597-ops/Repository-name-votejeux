import { fetchGamesFromAirtable } from '@/lib/airtable'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST() {
  try {
    const games = await fetchGamesFromAirtable()

    const { error } = await supabase
      .from('games')
      .upsert(games, { onConflict: 'id' })

    if (error) throw error

    return Response.json({ success: true, count: games.length })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
export async function GET() {
  try {
    const games = await fetchGamesFromAirtable()

    const { error } = await supabase
      .from('games')
      .upsert(games, { onConflict: 'id' })

    if (error) throw error

    return Response.json({ success: true, count: games.length })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}