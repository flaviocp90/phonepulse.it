import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { supabase } from '../../lib/supabase'
import { checklist, editorialAction, statusLabels } from '../../lib/editorial'

marked.setOptions({ breaks: true, gfm: true })
const EMPTY_FORM = { title: '', slug: '', category_id: '', excerpt: '', content: '', cover_image_url: '', score: '', seo_title: '', seo_description: '', affiliate_links: '', author: '', image_source: '', content_format: '', sources: [] }
const inputClass = 'w-full min-w-0 bg-gray-50 border border-border rounded-xl px-3.5 py-2.5 text-sm font-body text-dark focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
const buttonClass = 'px-4 py-2.5 rounded-xl bg-gray-100 text-dark text-sm font-body disabled:opacity-40 hover:bg-gray-200'
const panelClass = 'bg-white border border-border rounded-2xl p-5 space-y-4'
const snapshot = (form, tags) => JSON.stringify([form, [...tags].sort()])
function slugify(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') }
function localDate(iso) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function sourceText(value) { return typeof value === 'string' ? value : '' }
function dateLabel(value) { return value ? new Date(value).toLocaleString('it-IT') : 'Non disponibile' }
function Field({ label, children }) { return <label className="block space-y-1.5"><span className="block text-xs font-body font-medium text-gray-500">{label}</span>{children}</label> }

export default function AdminArticleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuovo'
  const [form, setForm] = useState(EMPTY_FORM)
  const [record, setRecord] = useState(null)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [baseline, setBaseline] = useState(snapshot(EMPTY_FORM, []))
  const [review, setReview] = useState({})
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState(false)
  const [slugManual, setSlugManual] = useState(!isNew)
  const [reload, setReload] = useState(0)
  const [coverError, setCoverError] = useState(false)
  const [metadataWarning, setMetadataWarning] = useState('')
  const [optionsReady, setOptionsReady] = useState(false)
  const dirty = snapshot(form, selectedTags) !== baseline
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const routeGeneration = useRef(0)
  const routeRef = useRef(id)
  routeRef.current = id
  const status = record?.status || 'draft'
  const completeReview = Object.keys(checklist).every(key => review[key] === true)

  useEffect(() => {
    let active = true
    Promise.all([supabase.from('categories').select('id, name').order('name'), supabase.from('tags').select('id, name').order('name')]).then(([cats, tgs]) => {
      if (!active) return
      if (cats.error || tgs.error) { setError('Categorie o tag indisponibili. Ricarica prima di salvare.'); return }
      setCategories(cats.data || [])
      setTags(tgs.data || []); setOptionsReady(true)
    }).catch(() => { if (active) setError('Categorie o tag indisponibili. Ricarica prima di salvare.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    routeGeneration.current++
    setSaving(false); setMetadataWarning('')
    setError(''); setSuccess(''); setReview({}); setPreview(false)
    if (isNew) {
      setForm(EMPTY_FORM); setRecord(null); setSelectedTags([]); setBaseline(snapshot(EMPTY_FORM, [])); setSlugManual(false); setLoading(false)
      return () => { active = false }
    }
    setLoading(true)
    supabase.from('articles').select('*, article_tags(tag_id)').eq('id', id).single().then(({ data, error }) => {
      if (!active) return
      if (error || !data) throw error || new Error('Articolo non trovato')
      const next = Object.fromEntries(Object.keys(EMPTY_FORM).map(key => [key, data[key] ?? EMPTY_FORM[key]]))
      next.score = data.score == null ? '' : String(data.score)
      next.affiliate_links = data.affiliate_links != null ? JSON.stringify(data.affiliate_links, null, 2) : ''
      const ids = (data.article_tags || []).map(tag => tag.tag_id)
      setForm(next); setRecord(data); setSelectedTags(ids); setBaseline(snapshot(next, ids)); setSlugManual(true); setCoverError(false)
      setLoading(false)
    }).catch(() => { if (active) { setError('Articolo indisponibile. Riprova il caricamento.'); setRecord(null); setLoading(false) } })
    return () => { active = false }
  }, [id, isNew, reload])

  useEffect(() => {
    function beforeUnload(event) { if (dirtyRef.current) { event.preventDefault(); event.returnValue = '' } }
    function internalNavigation(event) {
      const link = event.target.closest('a[href]')
      if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const url = new URL(link.href, location.href)
      if (dirtyRef.current && url.origin === location.origin && url.pathname !== location.pathname && !window.confirm('Perdere le modifiche non salvate e uscire dall’editor?')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', internalNavigation, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', internalNavigation, true) }
  }, [])

  function change(field, value) { setForm(previous => ({ ...previous, [field]: value })); setReview({}); setSuccess(''); if (field === 'cover_image_url') setCoverError(false) }
  function changeSource(index, field, value) { change('sources', form.sources.map((source, i) => i === index ? { ...source, [field]: value } : source)) }
  function reviewProblem() {
    if (!form.author.trim() || !form.content.trim() || !form.content_format) return 'Completa autore, contenuto e formato prima della revisione.'
    if (!form.sources.length) return 'Aggiungi almeno una fonte e la consultazione effettiva.'
    for (const source of form.sources) {
      if (!source || typeof source !== 'object' || Array.isArray(source) || ['url', 'title', 'publisher'].some(key => typeof source[key] !== 'string')) return 'Fonte incompleta o non valida: correggi i campi prima di approvare.'
      const existingHttp = record?.sources?.some(old => old?.url === source.url)
      if (!/^https:\/\//i.test(source.url) && !(existingHttp && /^http:\/\//i.test(source.url))) return 'Le nuove fonti richiedono un URL HTTPS.'
      if (!source.title?.trim() || !source.publisher?.trim() || !source.retrieved_at) return 'Completa titolo, editore e data di consultazione di ogni fonte.'
      for (const stamp of [source.published_at, source.retrieved_at].filter(Boolean)) if (typeof stamp !== 'string' || !Number.isFinite(Date.parse(stamp)) || Date.parse(stamp) > Date.now()) return 'Controlla le date: devono essere valide e non future.'
    }
    if (form.content_format === 'news') {
      const published = form.sources[0].published_at
      if (!published) return 'La news richiede la data nota della fonte principale.'
      if (status !== 'published' && Date.now() - Date.parse(published) > 72 * 3600000) return 'Fonte principale oltre 72 ore: aggiorna i fatti e la fonte per una nuova approvazione. Non cambiare una data storica.'
    }
    return ''
  }
  const problem = reviewProblem()

  async function action(kind) {
    setError(''); setSuccess(''); setSaving(true)
    const currentId = id
    const generation = routeGeneration.current
    const current = () => routeRef.current === currentId && routeGeneration.current === generation
    try {
      let name, args, message
      if (kind === 'save') {
        if (!optionsReady) throw new Error('Categorie o tag indisponibili. Ricarica prima di salvare.')
        const affiliateUnchanged = !isNew && form.affiliate_links === JSON.parse(baseline)[0].affiliate_links
        let affiliate = []
        if (!affiliateUnchanged) {
          try { affiliate = form.affiliate_links.trim() ? JSON.parse(form.affiliate_links) : [] } catch { throw new Error('Affiliate links: JSON non valido.') }
          if (!Array.isArray(affiliate)) throw new Error('Affiliate links deve essere un array JSON.')
        }
        if (form.score !== '' && (!Number.isInteger(Number(form.score)) || Number(form.score) < 0 || Number(form.score) > 100)) throw new Error('Il voto deve essere un intero da 0 a 100.')
        if (status === 'published' && (problem || !completeReview)) throw new Error(problem || 'Completa la checklist per correggere il contenuto pubblicato.')
        const payload = { ...form, affiliate_links: affiliate, score: form.score === '' ? null : Number(form.score), category_id: form.category_id || null, content_format: form.content_format || null }
        if (!isNew) {
          payload.id = id
          // Preserve nullable stored values when their controls have not changed.
          for (const key of ['excerpt', 'content', 'cover_image_url', 'author', 'seo_title', 'seo_description', 'image_source']) if (form[key] === (record[key] ?? '')) payload[key] = record[key] ?? null
          if (affiliateUnchanged) delete payload.affiliate_links
        }
        name = 'save_article'
        args = { p_article: payload, p_tag_ids: selectedTags, p_expected_version: isNew ? null : record.version, p_publish_correction: status === 'published', p_review: status === 'published' ? review : null }
        message = status === 'published' ? 'Correzione pubblicata e verifica registrata.' : 'Bozza salvata.'
      } else if (kind === 'approve') {
        if (dirty || isNew || problem || !completeReview) throw new Error('Salva la bozza e completa la revisione prima di approvare.')
        name = 'approve_article'; args = { p_id: id, p_expected_version: record.version, p_review: review }; message = 'Versione approvata.'
      } else if (kind === 'publish') {
        if (dirty || status !== 'approved' || problem) throw new Error('Pubblica soltanto una versione approvata, invariata e ancora valida.')
        name = 'publish_article'; args = { p_id: id, p_expected_version: record.version }; message = 'Articolo pubblicato.'
      } else {
        if (dirty && !window.confirm('Questa azione perderà le modifiche locali non salvate. Continuare?')) return
        if (kind === 'discard' && !window.confirm(status === 'published' ? 'Ritirare l’articolo pubblico? Sarà scartato; data e contenuto restano conservati. Il recupero richiederà una nuova approvazione.' : 'Scartare questa bozza senza cancellarla?')) return
        name = 'set_article_status'; args = { p_id: id, p_expected_version: record.version, p_status: kind === 'restore' ? 'draft' : 'discarded' }; message = kind === 'restore' ? 'Articolo recuperato come bozza.' : 'Articolo scartato; dati conservati.'
      }
      const result = await editorialAction(name, args)
      if (!current()) return
      setRecord(previous => ({ ...previous, ...(kind === 'save' ? args.p_article : {}), ...result, ...(result.status === 'draft' || result.status === 'discarded' ? { approved_version: null, approved_at: null, approved_by: null, last_verified_at: null } : {}) }))
      if (kind === 'save') { dirtyRef.current = false; setBaseline(snapshot(form, selectedTags)) }
      setReview({}); setSuccess(kind === 'save' && result.status === 'approved' ? 'Versione approvata invariata.' : message)
      if (isNew) { setSaving(false); navigate(`/admin/articoli/${result.id}`, { replace: true }); return }
      if (kind === 'discard' || kind === 'restore') { dirtyRef.current = false; setReload(value => value + 1); return }
      // Enrich server-owned metadata without overwriting local content.
      try {
        const { data, error } = await supabase.from('articles').select('id, version, status, origin, approved_version, approved_at, approved_by, last_verified_at, published_at').eq('id', id).single()
        if (!current()) return
        if (error || !data || data.version !== result.version || data.status !== result.status) setMetadataWarning('Operazione confermata. Metadata aggiornati indisponibili: ricarica la versione server per verificarli.')
        else { setRecord(previous => ({ ...previous, ...data })); setMetadataWarning('') }
      } catch { if (current()) setMetadataWarning('Operazione confermata. Metadata aggiornati indisponibili: ricarica la versione server per verificarli.') }

    } catch (err) { if (current()) setError(err.message || 'Operazione non riuscita. Il testo locale è conservato.') }
    finally { if (current()) setSaving(false) }
  }

  function reloadServer() { if (!dirty || window.confirm('Ricaricare la versione server e perdere tutte le modifiche locali non salvate?')) setReload(value => value + 1) }
  if (loading) return <p role="status" className="py-20 text-center">Caricamento articolo...</p>
  if (!isNew && !record) return <div><p role="alert">{error}</p><button onClick={reloadServer} className={buttonClass}>Riprova</button></div>

  return <div className="max-w-4xl mx-auto min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div><Link to="/admin/articoli" className="text-xs text-primary">Articoli</Link><h1 className="text-2xl font-heading font-bold text-dark">{isNew ? 'Nuovo articolo' : 'Revisione articolo'}</h1></div>
      <button onClick={() => setPreview(value => !value)} className={buttonClass}>{preview ? 'Editor' : 'Preview'}</button>
    </div>
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 break-words">{error}</p>}
    {metadataWarning && <p className="text-amber-700 text-sm mb-4">{metadataWarning}</p>}
    {success && <p role="status" className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4">{success}</p>}
    <div className={`${panelClass} mb-5 text-sm break-words`}>
      <p>Stato: {statusLabels[status]}</p><p>Versione: {record?.version ?? 'Da salvare'} · Origine: {record?.origin ?? 'manual (alla creazione)'}</p>
      <p>Approvazione: versione {record?.approved_version ?? '—'} · {dateLabel(record?.approved_at)} · Revisore: {record?.approved_by ?? '—'}</p>
      <p>Ultima verifica: {dateLabel(record?.last_verified_at)} · Pubblicazione originaria: {dateLabel(record?.published_at)}</p>
      {dirty && <p className="text-amber-700">Modifiche non salvate: salva prima di approvare o pubblicare. La checklist va ripetuta dopo il salvataggio.</p>}
      {!isNew && <button onClick={reloadServer} disabled={saving} className={buttonClass}>Ricarica versione server</button>}
    </div>
    <fieldset disabled={saving} className="min-w-0">
    {preview ? <div className={`${panelClass} break-words`}>
      <h2 className="text-3xl font-heading font-bold">{form.title}</h2><p>{form.excerpt}</p>
      {form.cover_image_url && <img src={form.cover_image_url} alt="Cover da verificare" className="w-full max-h-80 object-cover rounded-xl" onError={() => setCoverError(true)} />}
      {coverError && <p role="alert">Cover non caricabile: controlla URL e diritti prima di attestare la verifica.</p>}
      <p>Autore: {form.author || 'Mancante'} · Formato: {form.content_format || 'Mancante'}</p>
      <div className="article-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(form.content || '_Nessun contenuto._')) }} />
      <h3 className="font-bold">Fonti</h3>
      {form.sources.map((rawSource, index) => { const source = rawSource || {}; return <div key={index} className="break-words"><p>{index === 0 ? 'Principale: ' : ''}{/^https?:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{sourceText(source.title) || sourceText(source.url)}</a> : sourceText(source.title)}</p><p>{sourceText(source.publisher)} · Pubblicazione: {dateLabel(source.published_at)} · Consultazione: {dateLabel(source.retrieved_at)}</p></div> })}
    </div> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-w-0 space-y-5">
        <div className={panelClass}>
          <Field label="Titolo"><input className={inputClass} value={form.title} onChange={e => { change('title', e.target.value); if (!slugManual) setForm(previous => ({ ...previous, slug: slugify(e.target.value) })) }} required /></Field>
          <Field label="Slug"><input className={inputClass} value={form.slug} onChange={e => { setSlugManual(true); change('slug', e.target.value) }} required /></Field>
          <Field label="Autore"><input className={inputClass} value={form.author} onChange={e => change('author', e.target.value)} /></Field>
          <Field label="Excerpt"><textarea className={inputClass} rows={3} value={form.excerpt} onChange={e => change('excerpt', e.target.value)} /></Field>
        </div>
        <div className={panelClass}><Field label="Contenuto (Markdown)"><textarea className={`${inputClass} font-mono resize-y`} rows={20} value={form.content} onChange={e => change('content', e.target.value)} /></Field></div>
        <div className={panelClass}>
          <h2 className="font-heading font-bold">Fonti</h2><p className="text-xs text-gray-500">La prima fonte è principale. Date e consultazione effettiva in fuso locale ({Intl.DateTimeFormat().resolvedOptions().timeZone}); salvate come ISO con timezone. Data ignota resta vuota. Nuovi URL HTTPS.</p>
          {form.sources.map((rawSource, index) => { const source = rawSource || {}; return <div key={index} className="space-y-3 border border-border rounded-xl p-3">
            <p className="text-sm font-semibold">Fonte {index + 1}{index === 0 ? ' (principale)' : ''}</p>
            {['url', 'title', 'publisher'].map((field, i) => <Field key={field} label={`${['URL', 'Titolo fonte', 'Editore fonte'][i]} ${index + 1}`}><input type={field === 'url' ? 'url' : 'text'} className={inputClass} value={sourceText(source[field])} onChange={e => changeSource(index, field, e.target.value)} /></Field>)}
            {['published_at', 'retrieved_at'].map((field, i) => <Field key={field} label={`${['Pubblicazione fonte (se nota)', 'Consultazione effettiva'][i]} ${index + 1}`}><input type="datetime-local" className={inputClass} value={localDate(source[field])} onChange={e => changeSource(index, field, e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>)}
            <div className="flex flex-wrap gap-2">{index > 0 && <button onClick={() => change('sources', [source, ...form.sources.filter((_, i) => i !== index)])} className={buttonClass}>Rendi principale {index + 1}</button>}<button onClick={() => change('sources', form.sources.filter((_, i) => i !== index))} className={buttonClass}>Rimuovi fonte {index + 1}</button></div>
          </div> })}
          <button onClick={() => change('sources', [...form.sources, { url: '', title: '', publisher: '', published_at: null, retrieved_at: null }])} className={buttonClass}>Aggiungi fonte</button>
        </div>
        <div className={panelClass}>
          <Field label="SEO Title"><input className={inputClass} value={form.seo_title} onChange={e => change('seo_title', e.target.value)} /></Field>
          <Field label="SEO Description"><textarea className={inputClass} rows={3} value={form.seo_description} onChange={e => change('seo_description', e.target.value)} /></Field>
          <Field label="Affiliate links (JSON)"><textarea className={`${inputClass} font-mono`} rows={4} value={form.affiliate_links} onChange={e => change('affiliate_links', e.target.value)} /></Field>
        </div>
      </div>
      <div className="space-y-5 min-w-0">
        <div className={panelClass}>
          <Field label="Formato editoriale"><select className={inputClass} value={form.content_format} onChange={e => change('content_format', e.target.value)}><option value="">Seleziona formato</option><option value="news">News</option><option value="guide">Guida</option><option value="comparison">Comparativo</option><option value="review">Recensione</option></select></Field>
          <Field label="Categoria"><select className={inputClass} value={form.category_id} onChange={e => change('category_id', e.target.value)}><option value="">Seleziona categoria</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></Field>
          <Field label="Voto (0–100)"><input className={inputClass} type="number" min="0" max="100" step="1" value={form.score} onChange={e => change('score', e.target.value)} /></Field>
        </div>
        <div className={panelClass}>
          <Field label="Cover Image URL"><input className={inputClass} type="url" value={form.cover_image_url} onChange={e => change('cover_image_url', e.target.value)} /></Field>
          {form.cover_image_url && <img src={form.cover_image_url} alt="Cover da verificare" className="w-full h-40 object-cover rounded-xl" onError={() => setCoverError(true)} />}
          {coverError && <p role="alert" className="text-red-700 text-sm">Cover non caricabile: controlla URL e diritti prima di attestare la verifica.</p>}
          <Field label="Provenienza cover"><input className={inputClass} value={form.image_source} onChange={e => change('image_source', e.target.value)} /></Field>
        </div>
        <div className={panelClass}><h2 className="font-semibold text-sm">Tag</h2><div className="flex flex-wrap gap-2">{tags.map(tag => <button key={tag.id} aria-pressed={selectedTags.includes(tag.id)} onClick={() => { setSelectedTags(previous => previous.includes(tag.id) ? previous.filter(id => id !== tag.id) : [...previous, tag.id]); setReview({}); setSuccess('') }} className={`text-xs px-3 py-1.5 rounded-full border ${selectedTags.includes(tag.id) ? 'bg-primary text-white border-primary' : 'border-border'}`}>{tag.name}</button>)}</div></div>
      </div>
    </div>}
    <div className={`${panelClass} mt-6`}>
      <h2 className="font-heading font-bold">Revisione umana della versione</h2><p className="text-xs text-gray-500">Leggi il contenuto completo, controlla fonti e preview. Le attestazioni non sono un fact-check automatico.</p>
      {Object.entries(checklist).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm"><input type="checkbox" checked={review[key] === true} onChange={e => setReview(previous => ({ ...previous, [key]: e.target.checked }))} className="mt-1" /><span>{label}</span></label>)}
      {problem && <p className="text-amber-700 text-sm">{problem}</p>}
      {status === 'discarded' && <p className="text-sm">Recupera prima come bozza. Una news storica richiede fatti e fonte aggiornati entro 72 ore per essere approvata di nuovo; la pubblicazione originaria resta conservata.</p>}
      <div className="flex flex-wrap gap-3">
        {status !== 'discarded' && <button disabled={saving || !optionsReady || !form.title.trim() || !form.slug.trim() || (status === 'published' && (!completeReview || !!problem))} onClick={() => action('save')} className={buttonClass}>{status === 'published' ? 'Salva correzione pubblicata' : 'Salva bozza'}</button>}
        {status === 'draft' && <button disabled={saving || dirty || isNew || !completeReview || !!problem} onClick={() => action('approve')} className={buttonClass}>Approva</button>}
        {status === 'approved' && <button disabled={saving || dirty || !!problem} onClick={() => action('publish')} className="px-4 py-2.5 rounded-xl bg-primary text-white disabled:opacity-40">Pubblica</button>}
        {!isNew && (status === 'discarded' ? <button onClick={() => action('restore')} className={buttonClass}>Recupera come bozza</button> : <button onClick={() => action('discard')} className={buttonClass}>{status === 'published' ? 'Ritira' : 'Scarta'}</button>)}
      </div>
    </div>
    </fieldset>
  </div>
}
