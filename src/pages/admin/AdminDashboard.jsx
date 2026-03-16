import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, color, loading }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-6">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-12" />
        </div>
      ) : (
        <>
          <p className="text-xs font-body font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-3xl font-heading font-bold" style={{ color }}>
            {value ?? '—'}
          </p>
        </>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [total, published, categories] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        total: total.count ?? 0,
        published: published.count ?? 0,
        drafts: (total.count ?? 0) - (published.count ?? 0),
        categories: categories.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-dark">Dashboard</h1>
        <p className="text-sm text-gray-400 font-body mt-1">Panoramica del sito</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Tot. articoli" value={stats?.total} color="#0D0D0D" loading={loading} />
        <StatCard label="Pubblicati" value={stats?.published} color="#22c55e" loading={loading} />
        <StatCard label="Bozze" value={stats?.drafts} color="#f59e0b" loading={loading} />
        <StatCard label="Categorie" value={stats?.categories} color="#FF5C1A" loading={loading} />
      </div>

      {/* Quick links */}
      <h2 className="text-sm font-body font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Azioni rapide
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          to="/admin/articoli/nuovo"
          className="flex items-center gap-3 bg-primary hover:bg-primary-dark text-white px-5 py-4 rounded-xl font-body font-medium text-sm transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="5.5" x2="9" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5.5" y1="9" x2="12.5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nuovo articolo
        </Link>
        <Link
          to="/admin/articoli"
          className="flex items-center gap-3 bg-white border border-border hover:border-gray-300 text-dark px-5 py-4 rounded-xl font-body font-medium text-sm transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="5" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Gestisci articoli
        </Link>
      </div>
    </div>
  )
}
