import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const verifiedUser = useRef(null)

  useEffect(() => {
    let active = true
    let generation = 0
    let timer
    async function verify(token) {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!active || token !== generation) return
        if (!data.session) { verifiedUser.current = null; setStatus('anonymous'); return }
        const result = await supabase.auth.getUser()
        if (result.error || !result.data.user) throw result.error || new Error('Utente non disponibile')
        if (active && token === generation) { setError(''); verifiedUser.current = result.data.user.id; setStatus(result.data.user.app_metadata?.phonepulse_role === 'editor' ? 'editor' : 'denied') }
      } catch {
        if (active && token === generation) { if (!verifiedUser.current) setStatus('error'); setError('Impossibile verificare l’accesso. Riprova.') }
      }
    }
    if (!verifiedUser.current) setStatus('loading')
    verify(++generation)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const token = ++generation
      clearTimeout(timer)
      if (event === 'SIGNED_OUT' || !session) { verifiedUser.current = null; setStatus('anonymous'); return }
      if (session.user.id !== verifiedUser.current) { verifiedUser.current = null; setStatus('loading') }
      // SDK calls run after the auth callback releases its lock.
      timer = setTimeout(() => verify(token), 0)
    })
    return () => { active = false; generation++; clearTimeout(timer); subscription.unsubscribe() }
  }, [retry])

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setStatus('anonymous')
    } catch { setError('Logout non riuscito. Riprova.') }
  }

  if (status === 'loading') return <div role="status" className="min-h-screen bg-bg flex items-center justify-center">Verifica accesso...</div>
  if (status === 'anonymous') return <Navigate to="/admin/login" replace />
  if (status === 'editor') return <>{error && <div role="alert" className="bg-red-50 p-4">{error}<button onClick={() => setRetry(value => value + 1)} className="text-primary ml-3">Riprova verifica accesso</button></div>}{children}</>
  return <div className="min-h-screen bg-bg flex items-center justify-center p-6"><div className="max-w-md space-y-4">
    <div role="alert">{status === 'denied' ? 'Questo account non ha il ruolo editor.' : error}{status === 'denied' && error && <p>{error}</p>}</div>
    {status === 'error' && <button onClick={() => setRetry(value => value + 1)} className="text-primary">Riprova</button>}
    <button onClick={logout} className="block text-primary">Logout</button>
  </div></div>
}
