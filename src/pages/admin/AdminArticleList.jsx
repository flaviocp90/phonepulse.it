import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { editorialAction, filterArticles, statusLabels } from '../../lib/editorial'

const PAGE_SIZE = 10
const buttonClass = 'px-3 py-2 rounded-lg bg-gray-100 text-sm disabled:opacity-40'
const deliveryLabels = { pending: 'Da inviare', sending: 'Invio in corso', sent: 'Inviato', failed: 'Invio fallito', unknown: 'Da controllare sul canale' }
function SocialPanel({ article }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function load(platforms = []) {
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.functions.invoke('post-to-social', { body: { article_id: article.id, platforms } })
      if (error || !Array.isArray(data?.deliveries) || typeof data?.channels?.telegram !== 'boolean' || typeof data?.channels?.instagram !== 'boolean') throw new Error('Esito non disponibile. Aggiorna gli stati prima di riprovare.')
      setData(data)
    } catch (err) { setError(err.message || 'Stati social non disponibili.') }
    finally { setBusy(false) }
  }
  return <div className="w-full mt-2 text-sm">
    {!data ? <button className={buttonClass} disabled={busy} onClick={() => load()}>Distribuzione social</button> : <>
      <div className="flex flex-wrap gap-4">{[['telegram', 'Telegram'], ['instagram', 'Instagram']].map(([platform, name]) => {
        const delivery = data.deliveries.find(row => row.platform === platform)
        const status = delivery?.status || 'pending'
        return <div key={platform}><p>{name}: {deliveryLabels[status] || 'Stato non disponibile'}</p>
          {!data.channels[platform] && <p className="text-xs text-gray-500">Canale non disponibile.</p>}
          {['pending', 'failed'].includes(status) && <button className={`${buttonClass} mt-1`} disabled={busy || !!error || !data.channels[platform]} onClick={() => load([platform])}>{status === 'failed' ? 'Riprova' : 'Invia'} {name}</button>}
          {status === 'unknown' && <p className="text-xs text-amber-800 mt-1">Controlla il canale prima di qualsiasi nuovo invio.</p>}
          {delivery?.article_version && <p className="text-xs text-gray-500 mt-1">Versione del tentativo: {delivery.article_version}</p>}
        </div>
      })}</div>
      <button className={`${buttonClass} mt-2`} disabled={busy} onClick={() => load()}>Aggiorna stati social</button>
    </>}
    {busy && <p role="status" className="mt-2">Verifica distribuzione...</p>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>
}

export default function AdminArticleList({ review = false }) {
  const [filter, setFilter] = useState(review ? 'new' : 'all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [articles, setArticles] = useState([])
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const generation = useRef(0)
  useEffect(() => {
    const token = ++generation.current
    setLoading(true); setError(''); setCount(null)
    let query = filterArticles(supabase.from('articles').select('id, title, slug, excerpt, status, origin, version, content_format, created_at, published_at, categories(name)', { count: 'exact' }), filter)
    if (search.trim()) query = query.ilike('title', `%${search.trim().replace(/[\\%_]/g, value => `\\${value}`)}%`)
    query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1).then(({ data, count, error }) => {
      if (token !== generation.current) return
      if (error || count === null) throw error || new Error('Conteggio indisponibile')
      if (page > 0 && page * PAGE_SIZE >= count) { setPage(Math.max(0, Math.ceil(count / PAGE_SIZE) - 1)); return }
      setArticles(data || []); setCount(count); setLoading(false)
    }).catch(() => { if (token === generation.current) { setArticles([]); setError('Elenco indisponibile. Riprova.'); setLoading(false) } })
    // This ref is a request counter, not a DOM node; cleanup invalidates pending callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { generation.current++ }
  }, [filter, search, page, reload])

  async function changeStatus(article) {
    const restoring = article.status === 'discarded'
    if (!restoring && !window.confirm(article.status === 'published' ? 'Ritirare questo articolo? Passerà a Scartato: contenuto e data originaria restano conservati. Recuperarlo richiederà nuova approvazione.' : 'Scartare questo articolo senza cancellarlo?')) return
    setBusy(true); setError(''); setSuccess('')
    try {
      await editorialAction('set_article_status', { p_id: article.id, p_expected_version: article.version, p_status: restoring ? 'draft' : 'discarded' })
      setSuccess(restoring ? 'Recuperato come bozza.' : 'Scartato; dati conservati.')
      setReload(value => value + 1)
    } catch (err) { setError(err.message || 'Operazione non riuscita.') }
    finally { setBusy(false) }
  }
  const filters = review ? [['new', 'Nuove bozze'], ['legacy', 'Archivio legacy'], ['approved', 'Approvati'], ['published', 'Pubblicati'], ['discarded', 'Scartati']] : [['all', 'Tutti'], ['draft', 'Bozze'], ['approved', 'Approvati'], ['published', 'Pubblicati'], ['discarded', 'Scartati']]
  return <div className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6"><div><h1 className="text-2xl font-heading font-bold text-dark">{review ? 'Review bozze' : 'Articoli'}</h1><p className="text-sm text-gray-500 mt-1">{loading ? 'Caricamento...' : count === null ? 'Conteggio —' : `${count} articoli`}</p></div><Link to="/admin/articoli/nuovo" className="bg-primary text-white px-4 py-2.5 rounded-xl">Nuovo</Link></div>
    {review && <p className="text-sm text-gray-500 mb-4">Nuove bozze RSS/manuali e archivio storico sono separati. Apri la revisione completa per approvare o pubblicare. Dopo la pubblicazione puoi verificare e avviare separatamente i canali social.</p>}
    <div className="flex flex-wrap gap-2 mb-5">{filters.map(([value, label]) => <button key={value} aria-pressed={filter === value} disabled={busy} onClick={() => { setFilter(value); setPage(0); setSuccess('') }} className={`${buttonClass} ${filter === value ? 'bg-dark text-white' : 'text-gray-500'}`}>{label}</button>)}</div>
    <label className="block text-sm mb-5 max-w-md">Cerca titolo<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} className="block w-full border border-border rounded-xl px-3 py-2 mt-2" /></label>
    {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 mb-5">{error}<button onClick={() => setReload(value => value + 1)} className={`${buttonClass} ml-3`}>Riprova</button></div>}
    {success && <p role="status" className="bg-green-50 text-green-700 rounded-xl p-4 mb-5">{success}</p>}
    {loading ? <p role="status">Caricamento elenco...</p> : count !== null && <div className="bg-white border border-border rounded-2xl overflow-hidden">
      {articles.length === 0 ? <p className="p-8 text-gray-500">Nessun articolo trovato.</p> : articles.map(article => <div key={article.id} className="flex flex-col lg:flex-row lg:items-center flex-wrap gap-3 p-5 border-b border-border last:border-0">
        <div className="flex-1 min-w-0"><p className="font-body font-medium break-words">{article.title}</p><p className="text-xs text-gray-500 mt-1">{statusLabels[article.status]} · {article.origin} · versione {article.version} · {article.content_format || 'Formato da definire'}</p>{review && article.excerpt && <p className="text-sm text-gray-500 mt-2 break-words">{article.excerpt}</p>}</div>
        <div className="flex flex-wrap gap-2"><Link to={`/admin/articoli/${article.id}`} className={`${buttonClass} text-primary`}>{review ? 'Apri revisione' : 'Modifica'}</Link><button disabled={busy} onClick={() => changeStatus(article)} className={buttonClass}>{article.status === 'discarded' ? 'Recupera' : article.status === 'published' ? 'Ritira' : 'Scarta'}</button></div>
        {article.status === 'published' && <SocialPanel key={`${article.id}:${article.version}`} article={article} />}
      </div>)}
    </div>}
    <nav aria-label="Paginazione articoli" className="flex flex-wrap items-center gap-3 mt-5"><button disabled={busy || loading || page === 0} onClick={() => setPage(value => value - 1)} className={buttonClass}>Precedente</button><span className="text-sm">Pagina {page + 1}{count !== null ? ` di ${Math.max(1, Math.ceil(count / PAGE_SIZE))}` : ' · totale —'}</span><button disabled={busy || loading || count === null || (page + 1) * PAGE_SIZE >= count} onClick={() => setPage(value => value + 1)} className={buttonClass}>Successiva</button></nav>
  </div>
}
