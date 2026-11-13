import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { supabase } from '../../lib/supabase'
import { checklist, editorialAction, statusLabels } from '../../lib/editorial'
import { claimReviewAudit, claimReviewSummary, readClaimDraft } from '../../lib/claimReview'
import ClaimReviewPanel from './ClaimReviewPanel'
import PhotoInsert from './PhotoInsert'
import DraftRecovery from './DraftRecovery'
import { mediaPath } from '../../lib/privateMedia'
import { usePrivateMedia } from '../../lib/usePrivateMedia'
import { templates, contentTools, readResearchImport, hasRawHtml, articlePhotos, movePhoto } from '../../lib/guidedEditor'

const VisualEditor = lazy(() => import('./VisualEditor'))

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
  const [claimReviews, setClaimReviews] = useState([])
  const [claimBaseline, setClaimBaseline] = useState('[]')
  const [claimsReady, setClaimsReady] = useState(isNew)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState(false)
  const [previewMobile, setPreviewMobile] = useState(false)
  const [contentMode, setContentMode] = useState(isNew ? 'visual' : 'markdown')
  const [editorId, setEditorId] = useState(null)
  const recoveryRef = useRef(null)
  const [related, setRelated] = useState(null)
  const visualRef = useRef(null)
  const [tagSearch, setTagSearch] = useState('')
  const [importProvenance, setImportProvenance] = useState(null)
  const contentRef = useRef(null)
  const [slugManual, setSlugManual] = useState(!isNew)
  const [reload, setReload] = useState(0)
  const [coverError, setCoverError] = useState(false)
  const [metadataWarning, setMetadataWarning] = useState('')
  const [optionsReady, setOptionsReady] = useState(false)
  const dirty = snapshot(form, selectedTags) !== baseline
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty || JSON.stringify(claimReviews) !== claimBaseline
  const routeGeneration = useRef(0)
  const routeRef = useRef(id)
  routeRef.current = id
  const status = record?.status || 'draft'
  const claimSummary = claimReviewSummary(claimReviews, form.sources)
  const photos = articlePhotos(form.content)
  const { urls: privateUrls, error: photoWarning } = usePrivateMedia(form.content, form.cover_image_url)
  const completeReview = Object.keys(checklist).every(key => review[key] === true)

  useEffect(() => {
    let active = true
    Promise.all([supabase.from('categories').select('id, name').order('name'), supabase.from('tags').select('id, name').order('name'), supabase.auth.getUser()]).then(([cats, tgs, auth]) => {
      if (!active) return
      if (auth.error || !auth.data.user) { setError('Accesso editor indisponibile. Riprova prima di salvare.'); return }
      setEditorId(auth.data.user.id)
      if (cats.error || tgs.error) { setError('Categorie o tag indisponibili. Ricarica prima di salvare.'); return }
      setCategories(cats.data || [])
      setTags(tgs.data || []); setOptionsReady(true)
    }).catch(() => { if (active) setError('Categorie o tag indisponibili. Ricarica prima di salvare.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    routeGeneration.current++
    setContentMode(isNew ? 'visual' : 'markdown'); setSaving(false); setMetadataWarning(''); setImportProvenance(null); setClaimsReady(isNew)
    setError(''); setSuccess(''); setReview({}); setClaimReviews([]); setClaimBaseline('[]'); setPreview(false)
    if (isNew) {
      setForm(EMPTY_FORM); setRecord(null); setSelectedTags([]); setBaseline(snapshot(EMPTY_FORM, [])); setSlugManual(false); setLoading(false)
      return () => { active = false }
    }
    setLoading(true)
    supabase.from('articles').select('*, article_tags(tag_id)').eq('id', id).single().then(async ({ data, error }) => {
      if (!active) return
      if (error || !data) throw error || new Error('Articolo non trovato')
      const next = Object.fromEntries(Object.keys(EMPTY_FORM).map(key => [key, data[key] ?? EMPTY_FORM[key]]))
      next.score = data.score == null ? '' : String(data.score)
      next.affiliate_links = data.affiliate_links != null ? JSON.stringify(data.affiliate_links, null, 2) : ''
      const ids = (data.article_tags || []).map(tag => tag.tag_id)
      setForm(next); setRecord(data); setSelectedTags(ids); setBaseline(snapshot(next, ids)); setSlugManual(true); setCoverError(false)
      try {
        const { data: draft, error: draftError } = await supabase.from('article_review_drafts').select('version, claims').eq('article_id', id).maybeSingle()
        if (!active) return
        if (draftError) throw draftError
        if (draft?.version === data.version && data.status === 'draft') { const claims = readClaimDraft(draft.claims); setClaimReviews(claims); setClaimBaseline(JSON.stringify(claims)) }
        setClaimsReady(true)
      } catch { if (active) setMetadataWarning('Verifiche salvate indisponibili. Ricarica se vuoi recuperarle.') }
      if (active) setLoading(false)
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

  useEffect(() => {
    if (!form.category_id) return
    let active = true
    supabase.from('articles').select('id, title, slug').eq('is_published', true).eq('category_id', form.category_id).order('published_at', { ascending: false }).limit(4)
      .then(({ data, error }) => { if (active && !error && Array.isArray(data)) setRelated({ category: form.category_id, items: data.filter(row => row.id !== id && /^[a-z0-9][a-z0-9-]{0,180}$/.test(row.slug)) }) }).catch(() => {})
    return () => { active = false }
  }, [form.category_id, id])

  function previewSrc(url) { return privateUrls[url] || (mediaPath(url) ? undefined : url) }
  function previewHtml() {
    const document = new window.DOMParser().parseFromString(DOMPurify.sanitize(marked.parse(form.content || '_Nessun contenuto._')), 'text/html')
    document.querySelectorAll('img').forEach(img => { const url = previewSrc(img.getAttribute('src')); if (url) img.setAttribute('src', url); else img.removeAttribute('src') })
    return DOMPurify.sanitize(document.body.innerHTML)
  }
  function change(field, value) { setForm(previous => ({ ...previous, [field]: value })); setReview({}); if (field === 'content' || field === 'sources') setClaimReviews(previous => previous.map(claim => ({ ...claim, decision: 'unknown', ...(field === 'sources' && !value.some(source => source?.url === claim.source_url) ? { source_url: '' } : {}) }))); setSuccess(''); if (field === 'cover_image_url') setCoverError(false) }
  function insertContent(before, after = '') {
    if (contentMode === 'visual' && !hasRawHtml(form.content) && visualRef.current) { visualRef.current.insertMarkdown(before + after); return }
    const input = contentRef.current
    const start = input?.selectionStart ?? form.content.length
    const end = input?.selectionEnd ?? start
    change('content', form.content.slice(0, start) + before + form.content.slice(start, end) + after + form.content.slice(end))
    window.requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + before.length, end + before.length) })
  }
  async function importResearch(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const generation = routeGeneration.current
    try {
      if (file.size > 100000) throw new Error('Il file di ricerca supera 100 KB.')
      const raw = JSON.parse(await file.text())
      const imported = readResearchImport(raw)
      const claims = readClaimDraft(raw.claims).map(claim => ({ ...claim, decision: 'unknown', evidence: '', rationale: '' }))
      if (generation !== routeGeneration.current) return
      if (dirtyRef.current && !window.confirm('Sostituire la bozza locale con la ricerca importata?')) return
      setForm({ ...EMPTY_FORM, ...imported.article, slug: slugify(imported.article.title) }); setSelectedTags([])
      setClaimReviews(claims); setReview({}); setImportProvenance(imported.provenance); setSlugManual(false)
      setSuccess('Ricerca importata come bozza locale. Completa autore e revisione delle fonti prima di approvare.'); setError('')
    } catch (err) { if (generation === routeGeneration.current) setError(err.message || 'Importazione non riuscita.') }
  }
  function applyTemplate() {
    if (!templates[form.content_format]) return
    if (form.content.trim() && !window.confirm('Sostituire il contenuto attuale con il template?')) return
    change('content', templates[form.content_format])
  }
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
      const claimEvidence = claimSummary.complete && (kind === 'approve' || (kind === 'save' && status === 'published')) ? claimReviewAudit(claimReviews, form.sources) : null
      const reviewPayload = claimEvidence ? { ...review, claim_evidence: claimEvidence } : review
      if (kind === 'save') {
        if (status !== 'published' && !claimsReady) throw new Error('Note salvate indisponibili. Ricarica per conservarle nella bozza.')
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
        args = { p_article: payload, p_tag_ids: selectedTags, p_expected_version: isNew ? null : record.version, p_publish_correction: status === 'published', p_review: status === 'published' ? reviewPayload : { claim_draft: claimReviews, ...(importProvenance ? { import_provenance: importProvenance } : {}) } }
        message = status === 'published' ? 'Correzione pubblicata e verifica registrata.' : 'Bozza salvata.'
      } else if (kind === 'approve') {
        if (dirty || isNew || problem || !completeReview) throw new Error('Salva la bozza e completa la revisione prima di approvare.')
        name = 'approve_article'; args = { p_id: id, p_expected_version: record.version, p_review: reviewPayload }; message = 'Versione approvata.'
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
      recoveryRef.current?.clear()
      setRecord(previous => ({ ...previous, ...(kind === 'save' ? args.p_article : {}), ...result, ...(result.status === 'draft' || result.status === 'discarded' ? { approved_version: null, approved_at: null, approved_by: null, last_verified_at: null } : {}) }))
      if (kind === 'save') { dirtyRef.current = false; setBaseline(snapshot(form, selectedTags)) }
      if (kind === 'save' && status !== 'published') setClaimBaseline(JSON.stringify(claimReviews))
      else { setClaimReviews([]); setClaimBaseline('[]') }
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

  function reloadServer() { if (!dirtyRef.current || window.confirm('Ricaricare la versione server e perdere tutte le modifiche locali non salvate?')) setReload(value => value + 1) }
  if (loading) return <p role="status" className="py-20 text-center">Caricamento articolo...</p>
  if (!isNew && !record) return <div><p role="alert">{error}</p><button onClick={reloadServer} className={buttonClass}>Riprova</button></div>

  return <div className="max-w-4xl mx-auto min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div><Link to="/admin/articoli" className="text-xs text-primary">Articoli</Link><h1 className="text-2xl font-heading font-bold text-dark">{isNew ? 'Nuovo articolo' : 'Revisione articolo'}</h1></div>
      <button onClick={() => setPreview(value => !value)} className={buttonClass}>{preview ? 'Editor' : 'Preview'}</button>
    </div>
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 break-words">{error}</p>}
    {editorId && ((isNew && !record) || record?.id === id) && <DraftRecovery ref={recoveryRef} key={`${editorId}:${id || 'nuovo'}:${reload}`} userId={editorId} articleId={id || 'nuovo'} version={record?.version ?? null} dirty={dirtyRef.current} value={{ form, tags: selectedTags, claims: claimReviews, provenance: importProvenance }} onRestore={copy => { setForm(copy.form); setSelectedTags(copy.tags); setClaimReviews(copy.claims); setImportProvenance(copy.provenance); setReview({}); setSuccess('Copia ripristinata. Verifica il contenuto e salva la bozza sul server.') }} />}
    {importProvenance?.source_checks && <aside className="border border-border rounded-xl p-4 mb-4 text-sm"><p>Indipendenza delle fonti da verificare manualmente.</p>{importProvenance.source_checks.duplicate_content?.length > 0 && <p className="text-amber-700">Rilevati testi identici tra fonti: {JSON.stringify(importProvenance.source_checks.duplicate_content)}. Non considerarli conferme indipendenti.</p>}{importProvenance.source_checks.same_host?.length > 0 && <p>Fonti dello stesso sito: {JSON.stringify(importProvenance.source_checks.same_host)}.</p>}</aside>}
    {photoWarning && <p role="alert" className="text-amber-700 text-sm mb-4">{photoWarning}</p>}
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
    {isNew && <div className={`${panelClass} mb-5`}><label className="block text-sm font-semibold">Importa ricerca multi-fonte<input type="file" accept="application/json,.json" onChange={importResearch} className="block w-full text-xs mt-2" /></label><p className="text-xs text-gray-500">Importa un file di ricerca PhonePulse (massimo 100 KB). Nessun articolo viene salvato o approvato automaticamente; le affermazioni richiedono una nuova revisione.</p></div>}
    {preview ? <div>
      <div className="flex flex-wrap gap-2 mb-4"><button onClick={() => setPreviewMobile(false)} aria-pressed={!previewMobile} className={buttonClass}>Desktop</button><button onClick={() => setPreviewMobile(true)} aria-pressed={previewMobile} className={buttonClass}>Mobile</button></div>
      <div className={`${panelClass} break-words mx-auto ${previewMobile ? 'max-w-[375px]' : 'max-w-3xl'}`}>
      <h2 className="text-3xl font-heading font-bold">{form.title}</h2><p>{form.excerpt}</p>
      {form.cover_image_url && <img src={previewSrc(form.cover_image_url)} alt="Cover da verificare" className="w-full max-h-80 object-cover rounded-xl" onError={() => setCoverError(true)} />}
      {coverError && <p role="alert">Cover non caricabile: controlla URL e diritti prima di attestare la verifica.</p>}
      <p>Autore: {form.author || 'Mancante'} · Formato: {form.content_format || 'Mancante'}</p>
      <div className="article-content" dangerouslySetInnerHTML={{ __html: previewHtml() }} />
      <h3 className="font-bold">Fonti</h3>
      {form.sources.map((rawSource, index) => { const source = rawSource || {}; return <div key={index} className="break-words"><p>{index === 0 ? 'Principale: ' : ''}{/^https?:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{sourceText(source.title) || sourceText(source.url)}</a> : sourceText(source.title)}</p><p>{sourceText(source.publisher)} · Pubblicazione: {dateLabel(source.published_at)} · Consultazione: {dateLabel(source.retrieved_at)}</p></div> })}
    </div></div> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-w-0 space-y-5">
        <div className={panelClass}>
          <Field label="Titolo"><input className={inputClass} value={form.title} onChange={e => { change('title', e.target.value); if (!slugManual) setForm(previous => ({ ...previous, slug: slugify(e.target.value) })) }} required /></Field>
          <Field label="Slug"><input className={inputClass} value={form.slug} onChange={e => { setSlugManual(true); change('slug', e.target.value) }} required /></Field>
          <Field label="Autore"><input className={inputClass} value={form.author} onChange={e => change('author', e.target.value)} /></Field>
          <Field label="Excerpt"><textarea className={inputClass} rows={3} value={form.excerpt} onChange={e => change('excerpt', e.target.value)} /></Field>
        </div>
        <div className={panelClass}><div className="flex gap-2 mb-3"><button type="button" className={buttonClass} aria-pressed={contentMode === 'visual'} disabled={hasRawHtml(form.content)} onClick={() => setContentMode('visual')}>Visuale</button><button type="button" className={buttonClass} aria-pressed={contentMode === 'markdown'} onClick={() => setContentMode('markdown')}>Markdown</button></div>
          {hasRawHtml(form.content) && <p className="text-xs text-amber-700 mb-3">Questo contenuto include HTML: usa Markdown per preservarlo senza conversioni.</p>}
          {contentMode === 'visual' && !hasRawHtml(form.content) ? <Suspense fallback={<p role="status">Caricamento editor visuale...</p>}><VisualEditor ref={visualRef} value={form.content} onChange={value => change('content', value)} disabled={saving} privateUrls={privateUrls} /></Suspense> : <><div className="flex flex-wrap gap-2" role="toolbar" aria-label="Strumenti di scrittura">{Object.entries(contentTools).map(([label, [before, after]]) => <button key={label} onMouseDown={e => e.preventDefault()} onClick={() => insertContent(before, after)} className={buttonClass}>{label}</button>)}</div><Field label="Contenuto (Markdown)"><textarea ref={contentRef} className={`${inputClass} font-mono resize-y`} rows={20} value={form.content} onChange={e => change('content', e.target.value)} /></Field></>}</div>
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
          <p className="text-xs text-gray-500">Titolo: {form.seo_title.length}/60 · Descrizione: {form.seo_description.length}/160 caratteri consigliati.</p>
          <Field label="SEO Description"><textarea className={inputClass} rows={3} value={form.seo_description} onChange={e => change('seo_description', e.target.value)} /></Field>
          <div className="border-l-4 border-primary/30 pl-4 break-words"><p className="text-xs text-gray-500">Canonical</p><p className="text-xs">https://www.phonepulse.it/articoli/{form.slug}</p><h3 className="text-lg text-blue-800">{form.seo_title || form.title || 'Titolo da compilare'}</h3><p className="text-sm text-gray-600">{form.seo_description || form.excerpt || 'Descrizione da compilare'}</p></div>
          {related?.category === form.category_id && related.items.length > 0 && <section className="space-y-2" aria-label="Link interni suggeriti"><h3 className="text-sm font-semibold">Articoli pubblicati nella categoria</h3>{related.items.slice(0, 3).map(row => <button type="button" key={row.id} className="block text-left text-sm text-primary underline" onClick={() => insertContent(`[${row.title.replace(/[\\[\]]/g, '\\$&')}](/articoli/${row.slug})`)}>{row.title}</button>)}</section>}
          <Field label="Affiliate links (JSON)"><textarea className={`${inputClass} font-mono`} rows={4} value={form.affiliate_links} onChange={e => change('affiliate_links', e.target.value)} /></Field>
        </div>
      </div>
      <div className="space-y-5 min-w-0">
        <div className={panelClass}>
          <Field label="Formato editoriale"><select className={inputClass} value={form.content_format} onChange={e => change('content_format', e.target.value)}><option value="">Seleziona formato</option><option value="news">News</option><option value="guide">Guida</option><option value="comparison">Comparativo</option><option value="review">Recensione</option></select></Field>
          <button disabled={!form.content_format} onClick={applyTemplate} className={buttonClass}>Carica template del formato</button>
          <p className="text-xs text-gray-500">Guide e confronti documentali non attestano prove dirette. Compila metodo e risultati solo per esperienze realmente svolte.</p>
          <Field label="Categoria"><select className={inputClass} value={form.category_id} onChange={e => change('category_id', e.target.value)}><option value="">Seleziona categoria</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></Field>
          <Field label="Voto (0–100)"><input className={inputClass} type="number" min="0" max="100" step="1" value={form.score} onChange={e => change('score', e.target.value)} /></Field>
        </div>
        <div className={panelClass}>
          <PhotoInsert key={id || 'new'} disabled={saving || photos.length >= 20} onInsert={({ figure, url, cover, credit }) => { insertContent(figure); if (cover) { change('cover_image_url', url); change('image_source', credit) } }} />
          {photos.length > 0 && <section aria-label="Ordine delle foto" className="space-y-3"><h3 className="text-sm font-semibold">Foto nell’articolo</h3>{photos.map((photo, index) => <div key={photo.start} className="border border-border rounded-lg p-2 space-y-2"><img src={previewSrc(photo.url)} alt={photo.alt} className="w-full h-24 object-contain" /><p className="text-xs break-words">{photo.alt}</p><div className="flex gap-2"><button type="button" disabled={index === 0} className={buttonClass} onClick={() => change('content', movePhoto(form.content, index, -1))}>Sposta foto {index + 1} su</button><button type="button" disabled={index === photos.length - 1} className={buttonClass} onClick={() => change('content', movePhoto(form.content, index, 1))}>Sposta foto {index + 1} giù</button></div><button type="button" className={buttonClass} onClick={() => change('cover_image_url', photo.url)}>Copertina foto {index + 1}</button></div>)}</section>}
          <Field label="Cover Image URL"><input className={inputClass} type="url" value={form.cover_image_url} onChange={e => change('cover_image_url', e.target.value)} /></Field>
          {form.cover_image_url && <img src={previewSrc(form.cover_image_url)} alt="Cover da verificare" className="w-full h-40 object-cover rounded-xl" onError={() => setCoverError(true)} />}
          {coverError && <p role="alert" className="text-red-700 text-sm">Cover non caricabile: controlla URL e diritti prima di attestare la verifica.</p>}
          <Field label="Provenienza cover"><input className={inputClass} value={form.image_source} onChange={e => change('image_source', e.target.value)} /></Field>
        </div>
        <div className={panelClass}><h2 className="font-semibold text-sm">Tag</h2><Field label="Cerca tag"><input className={inputClass} value={tagSearch} onChange={e => setTagSearch(e.target.value)} /></Field><div className="flex flex-wrap gap-2">{tags.filter(tag => tag.name.toLocaleLowerCase('it').includes(tagSearch.toLocaleLowerCase('it'))).map(tag => <button key={tag.id} aria-pressed={selectedTags.includes(tag.id)} onClick={() => { setSelectedTags(previous => previous.includes(tag.id) ? previous.filter(id => id !== tag.id) : [...previous, tag.id]); setReview({}); setSuccess('') }} className={`text-xs px-3 py-1.5 rounded-full border ${selectedTags.includes(tag.id) ? 'bg-primary text-white border-primary' : 'border-border'}`}>{tag.name}</button>)}</div></div>
      </div>
    </div>}
    <div className="mt-6"><ClaimReviewPanel claims={claimReviews} sources={form.sources} onChange={next => { setClaimReviews(next); setSuccess('') }} /></div>
    <div className={`${panelClass} mt-6`}>
      <h2 className="font-heading font-bold">Revisione umana della versione</h2><p className="text-xs text-gray-500">Leggi il contenuto completo, controlla fonti e preview. Le attestazioni non sono un fact-check automatico.</p>
      {Object.entries(checklist).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm"><input type="checkbox" checked={review[key] === true} onChange={e => setReview(previous => ({ ...previous, [key]: e.target.checked }))} className="mt-1" /><span>{label}</span></label>)}
      {problem && <p className="text-amber-700 text-sm">{problem}</p>}
      {status === 'discarded' && <p className="text-sm">Recupera prima come bozza. Una news storica richiede fatti e fonte aggiornati entro 72 ore per essere approvata di nuovo; la pubblicazione originaria resta conservata.</p>}
      <div className="flex flex-wrap gap-3">
        {status !== 'discarded' && <button disabled={saving || !optionsReady || (status !== 'published' && !claimsReady) || !form.title.trim() || !form.slug.trim() || (status === 'published' && (!completeReview || !!problem))} onClick={() => action('save')} className={buttonClass}>{status === 'published' ? 'Salva correzione pubblicata' : 'Salva bozza'}</button>}
        {status === 'draft' && <button disabled={saving || dirty || isNew || !completeReview || !!problem} onClick={() => action('approve')} className={buttonClass}>Approva</button>}
        {status === 'approved' && <button disabled={saving || dirty || !!problem} onClick={() => action('publish')} className="px-4 py-2.5 rounded-xl bg-primary text-white disabled:opacity-40">Pubblica</button>}
        {!isNew && (status === 'discarded' ? <button onClick={() => action('restore')} className={buttonClass}>Recupera come bozza</button> : <button onClick={() => action('discard')} className={buttonClass}>{status === 'published' ? 'Ritira' : 'Scarta'}</button>)}
      </div>
    </div>
    </fieldset>
  </div>
}
