import { checklist } from '../../lib/editorial'

const outcomeLabels = {
  passed: 'Controlli superati',
  needs_attention: 'Da verificare',
  discarded: 'Scartata',
}
const findingLabels = { pass: 'Superato', fail: 'Da correggere', uncertain: 'Da verificare', yes: 'Sì', no: 'No' }
const filters = { us_only: 'Solo mercato USA', discount: 'Sconti e offerte' }

function Findings({ labels, findings }) {
  return <dl className="mt-3 space-y-2">
    {Object.entries(labels).map(([key, label]) => <div key={key}>
      <dt className="font-medium">{label}</dt>
      <dd>{findingLabels[findings?.[key]?.status]} · {findings?.[key]?.reason}</dd>
    </div>)}
  </dl>
}

export default function AiDraftReview({ event, error }) {
  return <details className="bg-white border border-border rounded-2xl p-5 mb-5 text-sm break-words">
    <summary className="cursor-pointer font-semibold">
      Revisione GPT-6 Luna · {error ? 'Esito indisponibile' : outcomeLabels[event?.review?.outcome] || 'In attesa'}
    </summary>
    {event && <div className="mt-3">
      <p className="text-gray-500">Versione salvata {event.version} · {new Date(event.created_at).toLocaleString('it-IT')}</p>
      <Findings labels={filters} findings={event.review.filters} />
      <Findings labels={checklist} findings={event.review.checks} />
    </div>}
  </details>
}
