const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = process.env.AIRTABLE_BASE_ID
const TABLE_ID = process.env.AIRTABLE_TABLE_ID

export async function fetchGamesFromAirtable() {
  const games = []
  let offset = null

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`)
    url.searchParams.set('pageSize', '100')

    if (offset) {
      url.searchParams.set('offset', offset)
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    })

    const data = await res.json()

    if (!data.records) {
      throw new Error(`Airtable error: ${JSON.stringify(data)}`)
    }

    for (const record of data.records) {
      const f = record.fields

      const jaquette = f['Jackette']
      const jaquetteUrl = jaquette?.[0]?.url || null

      games.push({
        id: record.id,
        nom: f['Nom'] || '',
        plateforme: f['Plateforme'] || '',
        disponibilite: f['Disponibilité'] || '',
        emulateur: f['Emulateur'] || '',
        support: f['Support'] || '',
        nombre_joueurs: f['Nombre de joueurs'] || null,
        genres: [
          f['Genre 1'],
          f['Genre 2'],
          f['Genre 3'],
          f['Genre 4'],
          f['Genre 5'],
          f['Genre 6']
        ].filter(Boolean),
        session: f['Session'] || '',
        jaquette_url: jaquetteUrl,
        gameplay_url: f['gameplay']?.[0]?.url || null,
      })
    }

    offset = data.offset || null

  } while (offset)

  return games
}
