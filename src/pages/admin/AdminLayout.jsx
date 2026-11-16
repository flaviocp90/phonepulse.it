import { useEffect, useState, useCallback, useRef } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { articleCount } from '../../lib/editorial'

const navItems = [
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
  const sidebar = useRef(null)
  const menuButton = useRef(null)
  const [pendingCount, setPendingCount] = useState(null)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const close = () => { if (desktop.matches) setSidebarOpen(false) }
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    const trigger = menuButton.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebar.current.querySelector('button').focus()
    const handleKey = event => {
      if (event.key === 'Escape') setSidebarOpen(false)
      if (event.key !== 'Tab') return
      const controls = [...sidebar.current.querySelectorAll('a, button:not(:disabled)')].filter(node => node.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      trigger?.focus({ preventScroll: true })
    }
  }, [sidebarOpen])

  const fetchPendingCount = useCallback(async () => {
    try { setPendingCount(await articleCount('new')) }
    catch { setPendingCount(null) }
  }, [])

  useEffect(() => {
    let active = true
    const refresh = () => { if (active) fetchPendingCount() }
    refresh()
    window.addEventListener('editorial-updated', refresh)
    supabase.auth.getUser().then(({ data, error }) => { if (active && !error) setUserEmail(data.user?.email || '') }).catch(() => {})
    return () => { active = false; window.removeEventListener('editorial-updated', refresh) }
  }, [fetchPendingCount])

  async function handleLogout() {
    setLogoutError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigate('/admin/login', { replace: true })
    } catch { setLogoutError('Logout non riuscito. Riprova.') }
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
        ref={sidebar}
        id="admin-navigation"
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen || undefined}
        aria-label="Menu redazione"
        className={`fixed md:sticky md:top-0 md:h-screen z-30 w-60 bg-dark flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0 visible' : '-translate-x-full invisible md:visible md:translate-x-0'
        }`}
        style={{ height: '100vh' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <button className="md:hidden min-h-11 text-white underline mb-3" onClick={() => setSidebarOpen(false)}>Chiudi menu</button>
          <a href="https://www.phonepulse.it/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 w-fit">
            <span className="text-primary font-heading font-bold text-xl leading-none">PHONE</span>
            <span className="text-white font-heading font-bold text-xl leading-none">PULSE</span>
          </a>
          <p className="text-white/70 text-xs font-body mt-1">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors ${
                  isActive
                    ? 'bg-action text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.icon}
              {item.label}{item.to === '/admin/articoli' && <span className="ml-auto" aria-label="Bozze da revisionare">{pendingCount ?? '—'}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          {userEmail && (
            <p className="text-white/70 text-xs font-body px-3 mb-3 truncate">{userEmail}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
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
            aria-label="Apri menu admin"
            ref={menuButton}
            aria-expanded={sidebarOpen}
            aria-controls="admin-navigation"
            onClick={() => setSidebarOpen(true)}
            className="text-white/80 hover:text-white p-3 min-w-11 min-h-11 transition-colors"
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

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6">
          {logoutError && <p role="alert" className="bg-red-50 text-red-700 p-4 mb-4 rounded-xl">{logoutError}</p>}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
