import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST() {
  try {
    const code = nanoid(6).toUpperCase()
    const id = nanoid()

    const { data, error } = await supabase
      .from('rooms')
      .insert({ id, code, statut: 'waiting' })
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, room: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}