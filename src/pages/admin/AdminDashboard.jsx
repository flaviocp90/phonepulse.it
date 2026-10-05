import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { articleCount } from '../../lib/editorial'

const labels = { all: 'Tot. articoli', published: 'Pubblicati', draft: 'Bozze', approved: 'Approvati', discarded: 'Scartati', new: 'Nuove bozze', legacy: 'Archivio legacy' }
export default function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    const keys = Object.keys(labels)
    Promise.allSettled(keys.map(key => articleCount(key))).then(results => {
      if (!active) return
      setStats(Object.fromEntries(keys.map((key, index) => [key, results[index].status === 'fulfilled' ? results[index].value : null])))
      setError(results.some(result => result.status === 'rejected')); setLoading(false)
    })
    return () => { active = false }
  }, [retry])
  return <div>
    <div className="mb-8"><h1 className="text-2xl font-heading font-bold text-dark">Dashboard</h1><p className="text-sm text-gray-500 mt-1">Stati editoriali e coda nuova separata dall’archivio</p></div>
    {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 mb-5">Alcuni conteggi sono indisponibili (—).<button onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Riprova</button></div>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">{Object.entries(labels).map(([key, label]) => <div key={key} className="bg-white border border-border rounded-2xl p-5"><p className="text-xs text-gray-500 mb-2">{label}</p><p className="text-3xl font-heading font-bold text-dark">{loading ? '…' : stats[key] ?? '—'}</p></div>)}</div>
    <div className="flex flex-wrap gap-4"><Link to="/admin/review" className="bg-white border border-border px-5 py-4 rounded-xl text-primary">Apri coda di revisione</Link><Link to="/admin/articoli/nuovo" className="bg-primary text-white px-5 py-4 rounded-xl">Nuovo articolo</Link><Link to="/admin/articoli" className="bg-white border border-border px-5 py-4 rounded-xl">Tutti gli articoli</Link></div>
  </div>
}
