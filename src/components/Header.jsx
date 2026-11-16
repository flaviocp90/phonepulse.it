import { Link } from 'react-router-dom'

export default function Header() {
  return <header className="bg-dark border-b border-white/5 sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <Link to="/" className="flex items-center gap-2 w-fit text-2xl" aria-label="PhonePulse home">
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-full object-cover" />
        <span className="text-primary font-heading">PHONE<span className="text-white">PULSE</span></span>
      </Link>
      <nav aria-label="Navigazione principale" className="flex flex-wrap gap-x-4 text-sm text-white">
        <Link to="/" className="inline-flex min-h-11 items-center hover:underline">Archivio</Link>
        <Link to="/contatti" className="inline-flex min-h-11 items-center hover:underline">Contatti</Link>
      </nav>
    </div>
  </header>
}
