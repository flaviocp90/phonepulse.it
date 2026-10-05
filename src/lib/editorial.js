import { supabase } from './supabase'

export const statusLabels = { draft: 'Bozza', approved: 'Approvato', published: 'Pubblicato', discarded: 'Scartato' }
export const checklist = {
  title_matches_content: 'Titolo e formato coerenti con il contenuto',
  claims_sourced: 'Affermazioni supportate dalle fonti',
  dates_checked: 'Date, versioni e disponibilità controllate',
  experience_documented: 'Esperienza documentata o nessuna prova personale rivendicata',
  reader_value: 'Valore concreto per il lettore',
  cover_checked: 'Cover: pertinenza, accessibilità e diritti di utilizzo controllati',
  metadata_checked: 'Autore, fonti, metadata, link e anteprima mobile controllati',
}

export function filterArticles(query, filter) {
  if (filter === 'new') return query.eq('status', 'draft').in('origin', ['rss', 'manual'])
  if (filter === 'legacy') return query.eq('status', 'draft').eq('origin', 'legacy')
  return filter === 'all' ? query : query.eq('status', filter)
}

export async function articleCount(filter = 'all') {
  const { count, error } = await filterArticles(supabase.from('articles').select('id', { count: 'exact', head: true }), filter)
  if (error || count === null) throw error || new Error('Conteggio indisponibile')
  return count
}

export async function editorialAction(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.code === '40001' ? 'Conflitto di versione: il testo locale è conservato. Ricarica esplicitamente la versione server prima di riprovare.' : error.message)
  if (!data?.id || !Number.isSafeInteger(data.version) || !statusLabels[data.status] || (name === 'publish_article' && typeof data.changed !== 'boolean')) throw new Error('Risposta server non valida: ricarica la versione server per verificare l’esito.')
  window.dispatchEvent(new Event('editorial-updated'))
  return data
}
