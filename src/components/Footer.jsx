import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-dark border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Col 1: logo + tagline */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Link to="/" className="flex items-center" aria-label="PhonePulse">
            <span className="text-primary font-heading font-bold text-xl leading-none">PHONE</span>
            <span className="text-white font-heading font-bold text-xl leading-none">PULSE</span>
          </Link>
          <p className="text-white/30 text-sm font-body">Recensioni smartphone per scegliere meglio.</p>
        </div>

        {/* Col 2: copyright + social */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/25 text-xs font-body">© PhonePulse {new Date().getFullYear()} — Tutti i diritti riservati</p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/phonepulse.it?igsh=MXc5cmhmeWIyY2xvdA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/30 hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              className="text-white/30 hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Col 3: legal links */}
        <div className="flex items-center gap-4">
          <Link to="/sitemap" className="text-white/25 text-xs font-body hover:text-white/50 transition-colors">
            Sitemap
          </Link>
          <Link to="/privacy" className="text-white/25 text-xs font-body hover:text-white/50 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
