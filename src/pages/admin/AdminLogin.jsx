import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError('Impossibile verificare la sessione. Riprova.')
      else if (data.session) navigate('/admin/dashboard', { replace: true })
    }).catch(() => { if (active) setError('Impossibile verificare la sessione. Riprova.') })
    return () => { active = false }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Email o password non corretti.'); return }
      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('Accesso non riuscito. Controlla le credenziali e riprova.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-primary text-3xl font-heading font-bold leading-none">PHONE</span>
          <span className="text-white text-3xl font-heading font-bold leading-none">PULSE</span>
          <p className="text-white/30 text-xs font-body mt-2 uppercase tracking-widest">Pannello admin</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-body font-medium text-white/70 uppercase tracking-wide">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-body font-medium text-white/70 uppercase tracking-wide">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-body font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
