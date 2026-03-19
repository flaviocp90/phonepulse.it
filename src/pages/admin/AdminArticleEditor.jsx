import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { supabase } from '../../lib/supabase'

marked.setOptions({ breaks: true, gfm: true })

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  category_id: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  score: '',
  seo_title: '',
  seo_description: '',
  affiliate_links: '',
  is_published: false,
  author: '',
}

export default function AdminArticleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuovo'

  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [preview, setPreview] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  // Fetch categories and tags
  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('tags').select('id, name').order('name'),
    ]).then(([cats, tgs]) => {
      setCategories(cats.data || [])
      setTags(tgs.data || [])
    })
  }, [])

  // Fetch article for edit
  useEffect(() => {
    if (isNew) return
    setLoading(true)

    async function fetchArticle() {
      const { data, error: err } = await supabase
        .from('articles')
        .select('*, article_tags(tag_id)')
        .eq('id', id)
        .single()

      if (err || !data) {
        setError('Articolo non trovato.')
        setLoading(false)
        return
      }

      setForm({
        title: data.title || '',
        slug: data.slug || '',
        category_id: data.category_id || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        cover_image_url: data.cover_image_url || '',
        score: data.score != null ? String(data.score) : '',
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
        affiliate_links: data.affiliate_links ? JSON.stringify(data.affiliate_links, null, 2) : '',
        is_published: data.is_published || false,
        author: data.author || '',
      })
      setSelectedTagIds((data.article_tags || []).map(at => at.tag_id))
      setSlugManual(true) // Don't auto-overwrite slug in edit mode
      setLoading(false)
    }

    fetchArticle()
  }, [id, isNew])

  // Auto-generate slug from title
  const handleTitleChange = useCallback((value) => {
    setForm(prev => ({
      ...prev,
      title: value,
      ...(slugManual ? {} : { slug: slugify(value) }),
    }))
  }, [slugManual])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tagId) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  async function handleSave(publish) {
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Validate affiliate_links JSON
    let parsedAffLinks = null
    if (form.affiliate_links.trim()) {
      try {
        parsedAffLinks = JSON.parse(form.affiliate_links)
      } catch {
        setError('Il campo "Affiliate links" non è un JSON valido.')
        setSaving(false)
        return
      }
    }

    const payload = {
      title: form.title,
      slug: form.slug,
      category_id: form.category_id || null,
      excerpt: form.excerpt || null,
      content: form.content || null,
      cover_image_url: form.cover_image_url || null,
      score: form.score !== '' ? parseInt(form.score, 10) : null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      affiliate_links: parsedAffLinks,
      is_published: publish ?? form.is_published,
      author: form.author || null,
      updated_at: new Date().toISOString(),
      ...(publish && !isNew && !form.is_published
        ? { published_at: new Date().toISOString() }
        : {}),
      ...(isNew
        ? {
            created_at: new Date().toISOString(),
            published_at: publish ? new Date().toISOString() : null,
          }
        : {}),
    }

    let articleId = id

    if (isNew) {
      const { data, error: err } = await supabase.from('articles').insert(payload).select('id').single()
      if (err) {
        setError(`Errore: ${err.message}`)
        setSaving(false)
        return
      }
      articleId = data.id
    } else {
      const { error: err } = await supabase.from('articles').update(payload).eq('id', id)
      if (err) {
        setError(`Errore: ${err.message}`)
        setSaving(false)
        return
      }
    }

    // Sync tags
    await supabase.from('article_tags').delete().eq('article_id', articleId)
    if (selectedTagIds.length > 0) {
      await supabase.from('article_tags').insert(
        selectedTagIds.map(tag_id => ({ article_id: articleId, tag_id }))
      )
    }

    setSaving(false)
    setSuccess(publish ? 'Articolo pubblicato!' : 'Bozza salvata.')

    if (isNew) {
      navigate(`/admin/articoli/${articleId}`, { replace: true })
    } else {
      // Update is_published in form
      setForm(prev => ({ ...prev, is_published: publish ?? prev.is_published }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/articoli" className="text-xs text-gray-400 font-body hover:text-gray-600 transition-colors">
              Articoli
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs text-gray-600 font-body">{isNew ? 'Nuovo' : 'Modifica'}</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-dark">
            {isNew ? 'Nuovo articolo' : 'Modifica articolo'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <button
            onClick={() => setPreview(p => !p)}
            className={`text-xs font-body font-medium px-3 py-2 rounded-lg border transition-colors ${
              preview ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border text-gray-500 hover:border-gray-300'
            }`}
          >
            {preview ? 'Editor' : 'Preview'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-body mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 text-sm font-body mb-6">
          {success}
        </div>
      )}

      {preview ? (
        /* Markdown preview */
        <div className="bg-white border border-border rounded-2xl p-8">
          <h2 className="text-3xl font-heading font-bold text-dark mb-3">{form.title || 'Titolo'}</h2>
          {form.excerpt && <p className="text-gray-500 text-base mb-6 border-l-4 border-primary/30 pl-4">{form.excerpt}</p>}
          <div className="article-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(form.content || '_Nessun contenuto ancora._')) }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
              <Field label="Titolo *">
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Il titolo dell'articolo"
                  className={inputClass}
                />
              </Field>

              <Field label="Slug *">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => { setSlugManual(true); handleChange('slug', e.target.value) }}
                  placeholder="url-dell-articolo"
                  className={inputClass}
                />
              </Field>

              <Field label="Autore">
                <input
                  type="text"
                  value={form.author}
                  onChange={e => handleChange('author', e.target.value)}
                  placeholder="Nome autore"
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Excerpt */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <Field label="Excerpt">
                <textarea
                  value={form.excerpt}
                  onChange={e => handleChange('excerpt', e.target.value)}
                  placeholder="Breve descrizione dell'articolo (max 200 caratteri)"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            {/* Content */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <Field label="Contenuto (Markdown)">
                <textarea
                  value={form.content}
                  onChange={e => handleChange('content', e.target.value)}
                  placeholder="Scrivi qui il contenuto in Markdown..."
                  rows={20}
                  className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
                />
              </Field>
            </div>

            {/* SEO */}
            <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
              <p className="text-xs font-body font-semibold text-gray-400 uppercase tracking-wide">SEO</p>
              <Field label="SEO Title">
                <input
                  type="text"
                  value={form.seo_title}
                  onChange={e => handleChange('seo_title', e.target.value)}
                  placeholder="Titolo per i motori di ricerca (lascia vuoto per usare il titolo)"
                  className={inputClass}
                />
              </Field>
              <Field label="SEO Description">
                <textarea
                  value={form.seo_description}
                  onChange={e => handleChange('seo_description', e.target.value)}
                  placeholder="Descrizione per i motori di ricerca (max 160 caratteri)"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            {/* Affiliate links */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <Field label='Affiliate links (JSON — es: [{"label":"Amazon","url":"https://..."}])'>
                <textarea
                  value={form.affiliate_links}
                  onChange={e => handleChange('affiliate_links', e.target.value)}
                  placeholder='[{"label": "Amazon", "url": "https://amzn.to/..."}]'
                  rows={5}
                  className={`${inputClass} resize-none font-mono text-xs`}
                />
              </Field>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Publish */}
            <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
              <p className="text-xs font-body font-semibold text-gray-400 uppercase tracking-wide">Pubblicazione</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => handleChange('is_published', !form.is_published)}
                  className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${
                    form.is_published ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  style={{ height: '22px' }}
                >
                  <div
                    className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                      form.is_published ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                    style={{ width: '18px', height: '18px' }}
                  />
                </div>
                <span className="text-sm font-body text-dark">
                  {form.is_published ? 'Pubblicato' : 'Bozza'}
                </span>
              </label>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || !form.title || !form.slug}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-dark font-body font-medium text-sm py-2.5 rounded-xl transition-colors disabled:opacity-40"
                >
                  {saving ? 'Salvataggio...' : 'Salva bozza'}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !form.title || !form.slug}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-body font-medium text-sm py-2.5 rounded-xl transition-colors disabled:opacity-40"
                >
                  {saving ? 'Salvataggio...' : 'Pubblica'}
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <Field label="Categoria">
                <select
                  value={form.category_id}
                  onChange={e => handleChange('category_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleziona categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Score */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <Field label="Voto (0–100)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.score}
                  onChange={e => handleChange('score', e.target.value)}
                  placeholder="Es: 87"
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Cover image */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <label className="block text-sm font-medium mb-1">Cover Image URL</label>

              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt="Preview cover"
                  className="w-full h-40 object-cover rounded mb-2 border border-[#E5E2DB]"
                  onError={e => { e.target.style.display = 'none' }}
                />
              )}

              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={form.cover_image_url || ''}
                onChange={e => handleChange('cover_image_url', e.target.value)}
                className="w-full border border-[#E5E2DB] rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Incolla l&apos;URL diretto da Unsplash o da qualsiasi fonte. La preview si aggiorna
                automaticamente.
              </p>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-body font-semibold text-gray-400 uppercase tracking-wide mb-3">Tag</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const selected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`text-xs font-body font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          selected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-500 border-border hover:border-gray-300'
                        }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputClass =
  'w-full bg-gray-50 border border-border rounded-xl px-3.5 py-2.5 text-sm font-body text-dark placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors'

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-body font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
