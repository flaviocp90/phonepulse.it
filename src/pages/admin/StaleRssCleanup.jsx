import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { editorialAction } from '../../lib/editorial'
import { cutoffIso, eligibleStaleRssDraft, STALE_RSS_MAX_BATCH } from '../../lib/staleRssCleanup'

export default function StaleRssCleanup({ onDone }) {
  const [candidates, setCandidates] = useState(null)
  const [cutoff, setCutoff] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function inspect() {
    setBusy(true); setError(''); setMessage(''); setCandidates(null)
    const date = cutoffIso()
    try {
      const { data, error: queryError } = await supabase.from('articles')
        .select('id,title,slug,version,status,origin,content_format,created_at')
        .eq('status', 'draft').eq('origin', 'rss').eq('content_format', 'news')
        .eq('version', 1).lt('created_at', date)
        .order('created_at', { ascending: true })
        .limit(STALE_RSS_MAX_BATCH + 1)
      if (queryError) throw queryError
      if ((data || []).length > STALE_RSS_MAX_BATCH)
        throw new Error('Più di 30 bozze idonee: restringere la selezione prima di procedere.')
      const rows = (data || []).filter(row => eligibleStaleRssDraft(row, date))
      if (rows.length !== (data || []).length) throw new Error('Selezione non coerente: ripetere l’analisi.')
      setCutoff(date)
      setCandidates(rows)
      setMessage(rows.length ? 'Verifica i titoli prima di procedere. La pulizia non è automatica.' : 'Nessuna bozza RSS vecchia da archiviare.')
    } catch (err) { setError(err.message || 'Analisi bozze non riuscita.') }
    finally { setBusy(false) }
  }

  async function archive() {
    if (!candidates?.length || busy) return
    const snapshot = [...candidates]
    if (!window.confirm(`Archiviare ${snapshot.length} bozze RSS create prima del ${new Date(cutoff).toLocaleDateString('it-IT')}? Rimarranno conservate e recuperabili, con evento di audit per ogni articolo. Nessuna pubblicazione o eliminazione definitiva.`)) return
    setBusy(true); setError(''); setMessage('')
    let completed = 0
    try {
      for (const row of snapshot) {
        if (!eligibleStaleRssDraft(row, cutoff)) throw new Error('Selezione modificata: interrompo la pulizia.')
        // Re-read before each action: do not discard rows changed after inspection.
        const { data: current, error: recheckError } = await supabase.from('articles')
          .select('id,version,status,origin,content_format,created_at')
          .eq('id', row.id).single()
        if (recheckError || !current || !eligibleStaleRssDraft(current, cutoff) ||
          current.version !== row.version)
          throw new Error('Una bozza è cambiata dopo la selezione: pulizia interrotta.')
        // Server RPC checks editor identity, expected version and records the event.
        await editorialAction('set_article_status', {
          p_id: row.id, p_expected_version: row.version, p_status: 'discarded',
        })
        completed++
      }
      setCandidates(null)
      setMessage(`Archiviate ${completed} bozze con audit editoriale. Coda aggiornata.`)
      onDone?.()
    } catch (err) {
      setCandidates(null)
      setError(`Archiviate ${completed} bozze prima dell'interruzione. ${err.message || 'Errore'} Rianalizza la coda prima di riprovare.`)
      if (completed) onDone?.()
    } finally { setBusy(false) }
  }

  return <section aria-label="Pulizia bozze RSS" className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
    <h2 className="font-heading text-lg font-bold">Pulizia bozze RSS vecchie</h2>
    <p className="text-sm text-gray-700">Solo bozze RSS formato news, versione 1, più vecchie di 14 giorni. Nessun articolo legacy, approvato o pubblicato. I record non vengono cancellati: l’editor autenticato registra lo scarto.</p>
    <button type="button" className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-sm disabled:opacity-50" disabled={busy} onClick={inspect}>Analizza bozze scadute</button>
    {candidates?.length > 0 && <div className="space-y-2">
      <p className="text-sm font-medium">{candidates.length} bozze idonee, prima del {new Date(cutoff).toLocaleDateString('it-IT')}:</p>
      <ul className="list-disc pl-6 max-h-48 overflow-auto text-sm">{candidates.map(row => <li key={row.id}>{row.title}</li>)}</ul>
      <button type="button" className="bg-amber-700 text-white px-3 py-2 rounded-lg disabled:opacity-50" onClick={archive} disabled={busy}>Archivia queste {candidates.length} bozze</button>
    </div>}
    {busy && <p role="status">Elaborazione in corso…</p>}
    {message && <p role="status" className="text-sm text-gray-800">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>
}
