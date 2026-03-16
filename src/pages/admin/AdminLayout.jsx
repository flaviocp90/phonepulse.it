import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const navItems = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    to: '/admin/articoli',
    label: 'Articoli',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/admin/articoli/nuovo',
    label: 'Nuovo articolo',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
        <line x1="9" y1="5.5" x2="9" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5.5" y1="9" x2="12.5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function AdminLayout() {
  const [userEmail, setUserEmail] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const navigate = useNavigate()

  const fetchPendingCount = useCallback(async () => {
    const { count } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('needs_review', true)
      .eq('discarded', false)
      .eq('is_published', false)
    setPendingCount(count ?? 0)
  }, [])

  useEffect(() => {
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 60000)
    return () => clearInterval(interval)
  }, [fetchPendingCount])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email || '')
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-screen z-30 w-60 bg-dark flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ height: '100vh' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link to="/" target="_blank" className="flex items-center gap-0.5 w-fit">
            <span className="text-primary font-heading font-bold text-xl leading-none">PHONE</span>
            <span className="text-white font-heading font-bold text-xl leading-none">PULSE</span>
          </Link>
          <p className="text-white/25 text-xs font-body mt-1">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/articoli/nuovo' ? false : item.to !== '/admin/articoli'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          {/* Review bozze */}
          <NavLink
            to="/admin/review"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="flex-1">Review bozze</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-body font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
                {pendingCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          {userEmail && (
            <p className="text-white/30 text-xs font-body px-3 mb-3 truncate">{userEmail}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 12l3-3-3-3M15 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden bg-dark border-b border-white/10 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white p-1.5 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <span className="flex items-center gap-0.5">
            <span className="text-primary font-heading font-bold text-lg leading-none">PHONE</span>
            <span className="text-white font-heading font-bold text-lg leading-none">PULSE</span>
          </span>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
