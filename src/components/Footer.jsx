import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-dark border-t border-white/10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center" aria-label="PhonePulse">
          <span className="text-primary font-heading font-bold text-xl leading-none">PHONE</span>
          <span className="text-white font-heading font-bold text-xl leading-none">PULSE</span>
        </Link>
        <p className="text-white/30 text-sm font-body">© PhonePulse {new Date().getFullYear()} — Tutti i diritti riservati</p>
        <Link
          to="/privacy"
          className="text-white/30 text-sm font-body hover:text-white/60 transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}
