import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { marked } from 'marked'
import { useToast, ToastContainer } from '../../components/Toast'

function markdownToPlainText(md) {
  if (!md) return ''
  const html = marked.parse(md)
  const div = document.createElement('div')
  div.innerHTML = html
  const text = div.textContent || div.innerText || ''
  const words = text.trim().split(/\s+/)
  if (words.length <= 150) return text.trim()
  return words.slice(0, 150).join(' ') + '…'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="flex gap-3 pt-2">
        <div className="h-9 bg-gray-200 rounded-lg w-24" />
        <div className="h-9 bg-gray-200 rounded-lg w-20" />
        <div className="h-9 bg-gray-200 rounded w-16" />
      </div>
    </div>
  )
}

function DiscardConfirm({ onConfirm, onCancel }) {
  return (
    <span className="flex items-center gap-2 ml-1">
      <span className="text-xs font-body text-gray-500">Sei sicuro?</span>
      <button
        onClick={onConfirm}
        className="text-xs font-body font-medium text-red-600 hover:text-red-800"
      >
        Scarta
      </button>
      <button
        onClick={onCancel}
        className="text-xs font-body text-gray-500 hover:text-gray-700"
      >
        Annulla
      </button>
    </span>
  )
}

function DraftCard({ article, onPublish, onDiscard }) {
  const navigate = useNavigate()
  const [seoOpen, setSeoOpen] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const plainPreview = markdownToPlainText(article.content)

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6">
      {/* Category badge */}
      <div className="flex items-center gap-3 mb-3">
        {article.categories && (
          <span
            className="text-xs font-body font-semibold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: article.categories.color + '20',
              color: article.categories.color,
            }}
          >
            {article.categories.name}
          </span>
        )}
        <span className="text-xs font-body text-gray-400">{formatDate(article.created_at)}</span>
      </div>

      {/* Title */}
      <h2 className="font-heading font-bold text-dark text-xl leading-tight mb-2">
        {article.title}
      </h2>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">{article.excerpt}</p>
      )}

      {/* Content preview */}
      {plainPreview && (
        <p className="font-body text-xs text-gray-400 line-clamp-3 mb-4 border-l-2 border-border pl-3">
          {plainPreview}
        </p>
      )}

      {/* SEO accordion */}
      <div className="mb-5">
        <button
          onClick={() => setSeoOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs font-body font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform ${seoOpen ? 'rotate-90' : ''}`}
          >
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dettagli SEO
        </button>
        {seoOpen && (
          <div className="mt-3 space-y-2 bg-gray-50 rounded-lg p-3">
            <div>
              <span className="text-xs font-body text-gray-400 uppercase tracking-wide">SEO Title</span>
              <p className="text-sm font-body text-dark mt-0.5">{article.seo_title || '—'}</p>
            </div>
            <div>
              <span className="text-xs font-body text-gray-400 uppercase tracking-wide">SEO Description</span>
              <p className="text-sm font-body text-dark mt-0.5">{article.seo_description || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onPublish(article.id)}
          className="bg-primary hover:bg-primary-dark text-white font-body font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Pubblica
        </button>
        <button
          onClick={() => navigate(`/admin/articoli/${article.id}`)}
          className="border border-border text-dark hover:bg-gray-50 font-body font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Modifica
        </button>
        {confirmDiscard ? (
          <DiscardConfirm
            onConfirm={() => onDiscard(article.id)}
            onCancel={() => setConfirmDiscard(false)}
          />
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="text-red-500 hover:text-red-700 font-body text-sm px-2 py-1 transition-colors"
          >
            Scarta
          </button>
        )}
      </div>
    </div>
  )
}

function ScartatiCard({ article, onRecover, onDelete }) {
  const excerpt = article.excerpt
    ? article.excerpt.slice(0, 120) + (article.excerpt.length > 120 ? '…' : '')
    : ''

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-5">
      <h2 className="font-heading font-bold text-dark text-lg leading-tight mb-1">
        {article.title}
      </h2>
      {excerpt && (
        <p className="font-body text-sm text-gray-500 mb-2">{excerpt}</p>
      )}
      <p className="font-body text-xs text-gray-400 mb-4">{formatDateShort(article.created_at)}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onRecover(article.id)}
          className="font-body font-medium text-sm px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#FF5C1A' }}
        >
          Recupera
        </button>
        <button
          onClick={() => onDelete(article.id)}
          className="text-red-500 hover:text-red-700 font-body text-sm px-2 py-1 transition-colors"
        >
          Elimina
        </button>
      </div>
    </div>
  )
}

export default function AdminReview() {
  const [drafts, setDrafts] = useState([])
  const [scartati, setScartati] = useState([])
  const [activeTab, setActiveTab] = useState('review')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toasts, addToast } = useToast()

  const fetchAll = useCallback(async () => {
    setError(null)
    const [draftsRes, scartatiRes] = await Promise.all([
      supabase
        .from('articles')
        .select('*, categories(id, name, slug, color)')
        .eq('needs_review', true)
        .eq('discarded', false)
        .eq('is_published', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('articles')
        .select('id, title, excerpt, created_at')
        .eq('discarded', true)
        .order('created_at', { ascending: false }),
    ])

    if (draftsRes.error) {
      setError(draftsRes.error.message)
    } else {
      setDrafts(draftsRes.data || [])
    }
    setScartati(scartatiRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  async function handlePublish(id) {
    setDrafts(prev => prev.filter(d => d.id !== id))
    const { error: err } = await supabase
      .from('articles')
      .update({ is_published: true, needs_review: false, published_at: new Date().toISOString() })
      .eq('id', id)

    if (err) {
      addToast('Errore durante la pubblicazione', 'error')
      fetchAll()
    } else {
      addToast('✓ Articolo pubblicato')
    }
  }

  async function handleDiscard(id) {
    setDrafts(prev => prev.filter(d => d.id !== id))
    const { error: err } = await supabase
      .from('articles')
      .update({ discarded: true, needs_review: false })
      .eq('id', id)

    if (err) {
      addToast('Errore durante lo scarto', 'error')
      fetchAll()
    } else {
      addToast('Bozza scartata')
      fetchAll()
    }
  }

  async function handleRecover(id) {
    const { error: err } = await supabase
      .from('articles')
      .update({ discarded: false, needs_review: true })
      .eq('id', id)

    if (err) {
      addToast('Errore durante il recupero', 'error')
    } else {
      addToast('Articolo recuperato')
      fetchAll()
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eliminare definitivamente questo articolo?')) return
    const { error: err } = await supabase.from('articles').delete().eq('id', id)

    if (err) {
      addToast("Errore durante l'eliminazione", 'error')
    } else {
      addToast('Articolo eliminato')
      fetchAll()
    }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-dark">Review articoli</h1>
          <p className="text-sm text-gray-400 font-body mt-1">Gestisci le bozze generate dal bot</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-8 border-b border-border">
        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-4 py-2.5 font-body font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'review'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Da revisionare
          {!loading && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'review' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {drafts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('scartati')}
          className={`flex items-center gap-2 px-4 py-2.5 font-body font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'scartati'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Scartati
          {!loading && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'scartati' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {scartati.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4 max-w-3xl">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-3xl">
          <p className="font-body text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchAll() }}
            className="text-sm font-body font-medium text-red-600 hover:text-red-800 underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Tab: Da revisionare */}
      {!loading && !error && activeTab === 'review' && (
        drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-3xl">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 text-gray-200">
              <rect x="8" y="8" width="32" height="32" rx="6" stroke="currentColor" strokeWidth="2" />
              <path d="M16 20h16M16 26h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M30 32l4 4M34 32l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-heading font-bold text-dark text-lg">Nessuna bozza in attesa</p>
            <p className="font-body text-sm text-gray-400 mt-1">
              Tutte le bozze sono state gestite
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {drafts.map(article => (
              <DraftCard
                key={article.id}
                article={article}
                onPublish={handlePublish}
                onDiscard={handleDiscard}
              />
            ))}
          </div>
        )
      )}

      {/* Tab: Scartati */}
      {!loading && !error && activeTab === 'scartati' && (
        scartati.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-3xl">
            <p className="font-body text-gray-400 text-sm">
              Nessun articolo scartato dal quality gate.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {scartati.map(article => (
              <ScartatiCard
                key={article.id}
                article={article}
                onRecover={handleRecover}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
