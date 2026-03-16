import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'auth' | 'unauth'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'auth' : 'unauth')
    })
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauth') {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
