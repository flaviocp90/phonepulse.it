import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function AdminArticles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function fetchArticles() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('articles')
      .select('id, title, slug, is_published, published_at, created_at, categories(name, color)')
      .order('created_at', { ascending: false })

    if (err) {
      setError('Errore nel caricamento degli articoli.')
    } else {
      setArticles(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchArticles() }, [])

  async function handleDelete(id) {
    setDeletingId(id)
    // Delete article_tags first (FK)
    await supabase.from('article_tags').delete().eq('article_id', id)
    const { error: err } = await supabase.from('articles').delete().eq('id', id)
    if (err) {
      alert('Errore durante l\'eliminazione.')
    } else {
      setArticles(prev => prev.filter(a => a.id !== id))
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-dark">Articoli</h1>
          <p className="text-sm text-gray-400 font-body mt-1">
            {loading ? '...' : `${articles.length} articoli`}
          </p>
        </div>
        <Link
          to="/admin/articoli/nuovo"
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-body font-medium text-sm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="8" y1="5" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nuovo
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-body mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-pulse">
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-gray-100 rounded-lg" />
                <div className="h-8 w-16 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <p className="text-gray-400 font-body mb-4">Nessun articolo ancora.</p>
          <Link to="/admin/articoli/nuovo" className="text-primary font-body text-sm font-medium hover:underline">
            Crea il primo →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          {/* Table header (hidden on mobile) */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-border text-xs font-body font-semibold text-gray-400 uppercase tracking-wide">
            <span>Titolo</span>
            <span className="w-28">Categoria</span>
            <span className="w-24 text-center">Stato</span>
            <span className="w-28">Data</span>
            <span className="w-28 text-right">Azioni</span>
          </div>

          {articles.map(article => (
            <div
              key={article.id}
              className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center gap-2 md:gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-body font-medium text-dark line-clamp-1">{article.title}</p>
                <p className="text-xs text-gray-400 font-body mt-0.5 md:hidden">/{article.slug}</p>
              </div>

              <div className="w-28">
                {article.categories ? (
                  <span
                    className="text-xs font-body font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: article.categories.color ? `${article.categories.color}18` : '#FF5C1A18',
                      color: article.categories.color || '#FF5C1A',
                    }}
                  >
                    {article.categories.name}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>

              <div className="w-24 text-center">
                <span
                  className={`inline-block text-xs font-body font-semibold px-2.5 py-1 rounded-full ${
                    article.is_published
                      ? 'bg-green-50 text-green-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {article.is_published ? 'Pubblicato' : 'Bozza'}
                </span>
              </div>

              <div className="w-28 text-xs text-gray-400 font-body">
                {formatDate(article.published_at || article.created_at)}
              </div>

              <div className="w-28 flex items-center justify-end gap-2">
                <Link
                  to={`/admin/articoli/${article.id}`}
                  className="text-xs font-body font-medium text-gray-500 hover:text-primary bg-gray-100 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Modifica
                </Link>

                {confirmDeleteId === article.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
                      className="text-xs font-body font-medium text-white bg-red-500 hover:bg-red-600 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {deletingId === article.id ? '...' : 'Sì'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs font-body font-medium text-gray-500 bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(article.id)}
                    className="text-xs font-body font-medium text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Elimina
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
