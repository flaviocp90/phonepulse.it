import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'Home', exact: true },
  { to: '/categoria/recensioni', label: 'Recensioni' },
  { to: '/categoria/comparativi', label: 'Comparativi' },
  { to: '/categoria/guide', label: 'Guide' },
  { to: '/categoria/news', label: 'News' },
  { to: '/categoria/offerte', label: 'Offerte' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-dark border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="PhonePulse home">
          <img src="/logo.png" alt="PhonePulse logo" className="h-10 w-10 rounded-full object-cover ring-1 ring-primary/40" />
          <span className="text-primary text-2xl font-heading font-bold tracking-tight leading-none">PHONE</span>
          <span className="text-white text-2xl font-heading font-bold tracking-tight leading-none">PULSE</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `text-sm font-body font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-white/60 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-5">
            <a
              href="https://www.instagram.com/phonepulse.it?igsh=MXc5cmhmeWIyY2xvdA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/40 hover:text-primary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a
              href="https://t.me/PhonePulseIT"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="text-white/40 hover:text-primary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
              </svg>
            </a>
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white/60 hover:text-white p-1.5 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {menuOpen ? (
              <path d="M4 4L18 18M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-white/10 bg-dark px-4 py-4 flex flex-col gap-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `text-sm font-body font-medium py-2.5 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-primary bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="flex items-center gap-4 pt-3 mt-1 border-t border-white/10 px-3">
            <a
              href="https://www.instagram.com/phonepulse.it?igsh=MXc5cmhmeWIyY2xvdA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-body text-white/50 hover:text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
              Instagram
            </a>
            <a
              href="https://t.me/PhonePulseIT"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-body text-white/50 hover:text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
              </svg>
              Telegram
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
