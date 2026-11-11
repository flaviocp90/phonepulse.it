import { claimReviewSummary, MAX_CLAIMS } from '../../lib/claimReview'

const fieldClass = 'w-full min-w-0 bg-gray-50 border border-border rounded-xl px-3 py-2 text-sm font-body text-dark focus:outline-none focus:border-primary/50'

export const EMPTY_CLAIM_REVIEW = {
  statement: '', source_url: '', evidence: '', rationale: '', decision: 'unknown',
}

export default function ClaimReviewPanel({ claims, sources, onChange, required = false }) {
  const { errors, complete } = claimReviewSummary(claims, sources)
  const available = (sources || []).filter(source => source && /^https:\/\//i.test(source.url || '') && source.retrieved_at)
  const update = (index, key, value) => onChange(claims.map((item, i) => i === index ? { ...item, [key]: value } : item))
  return (
    <section className="bg-white border border-border rounded-2xl p-5 space-y-4" aria-labelledby="claims-heading">
      <div>
        <h2 id="claims-heading" className="font-heading font-bold">Verifica guidata delle affermazioni</h2>
        <p className="text-xs text-gray-500 mt-1">
          Collega ogni fatto importante a una fonte consultata, trascrivi un breve passaggio e annota perché lo ritieni corretto.
          I dati vengono inclusi nel registro dell'approvazione, non nei metadati pubblici dell'articolo.
          I controlli qui sono manuali, non un fact-check automatico.
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Salva bozza per conservare anche le verifiche incomplete. Approvazione e correzione pubblicata registrano la revisione nel registro; cambiare contenuto o fonti conserva le note ma riporta gli esiti a Da verificare.
        </p>
      </div>
      {claims.map((claim, index) => (
        <div key={index} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-sm">Affermazione {index + 1}</h3>
            <button type="button" onClick={() => onChange(claims.filter((_, i) => i !== index))} className="text-xs text-red-700 hover:underline">Rimuovi</button>
          </div>
          <label className="block text-xs text-gray-600">Fatto da verificare
            <textarea className={fieldClass} maxLength={700} rows={2} value={claim.statement} onChange={e => update(index, 'statement', e.target.value)} placeholder="Es. Android 14 integra Health Connect nelle impostazioni di sistema." />
          </label>
          {!!claim.candidates?.length && <aside className="bg-gray-50 border border-border rounded-lg p-3 space-y-2" aria-label={`Evidenze importate affermazione ${index + 1}`}><p className="text-xs font-semibold">Estratti di ricerca non verificati</p><p className="text-xs text-gray-500">Apri la fonte e controlla contesto e data. Usare un passaggio non approva l’affermazione.</p>{claim.candidates.map((candidate, candidateIndex) => <div key={candidateIndex} className="space-y-1"><blockquote className="text-sm border-l-2 border-primary/30 pl-2">{candidate.excerpt}</blockquote><a className="block text-xs text-primary underline break-all" href={candidate.source_url} target="_blank" rel="noopener noreferrer">Apri fonte dell’estratto {candidateIndex + 1}</a><button type="button" className="text-xs underline" onClick={() => onChange(claims.map((item, i) => i === index ? { ...item, source_url: candidate.source_url, evidence: candidate.excerpt, decision: 'unknown' } : item))}>Usa passaggio {candidateIndex + 1}</button></div>)}</aside>}
          <label className="block text-xs text-gray-600">Fonte effettivamente consultata
            <select className={fieldClass} value={claim.source_url} onChange={e => update(index, 'source_url', e.target.value)}>
              <option value="">Seleziona una fonte</option>
              {available.map((source, i) => <option key={source.url + i} value={source.url}>{source.title || source.url}</option>)}
            </select>
          </label>
          <label className="block text-xs text-gray-600">Passaggio di supporto (massimo 240 caratteri)
            <textarea className={fieldClass} rows={2} maxLength={240} value={claim.evidence} onChange={e => update(index, 'evidence', e.target.value)} placeholder="Una citazione breve che renda verificabile l'affermazione." />
          </label>
          <label className="block text-xs text-gray-600">Motivazione della revisione
            <textarea className={fieldClass} rows={2} maxLength={500} value={claim.rationale} onChange={e => update(index, 'rationale', e.target.value)} placeholder="Contesto, versione, eventuali limiti e controllo svolto." />
          </label>
          <label className="block text-xs text-gray-600">Esito
            <select className={fieldClass} value={claim.decision} onChange={e => update(index, 'decision', e.target.value)}>
              <option value="unknown">Da verificare</option>
              <option value="supported">Supportata dalla fonte</option>
              <option value="conflicted">Contraddittoria / incerta</option>
            </select>
          </label>
        </div>
      ))}
      {claims.length < MAX_CLAIMS && <button type="button" className="px-4 py-2 rounded-xl bg-gray-100 text-sm hover:bg-gray-200" onClick={() => onChange([...claims, { ...EMPTY_CLAIM_REVIEW }])}>Aggiungi affermazione</button>}
      {!claims.length && <p className="text-sm text-gray-500">{required ? 'Aggiungi almeno un’affermazione supportata: le evidenze sono obbligatorie per questa bozza.' : 'Nessuna verifica dettagliata ancora compilata. La checklist generale rimane obbligatoria.'}</p>}
      {!!claims.length && <p role="status" className={complete ? 'text-sm text-green-700' : 'text-sm text-amber-700'}>
        {complete ? 'Tutte le affermazioni inserite risultano supportate secondo la tua verifica manuale.' : 'La verifica dettagliata non è completa: non attestare il supporto delle fonti.'}
      </p>}
      {errors.length > 0 && <ul className="list-disc pl-5 text-sm text-red-700">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
    </section>
  )
}
