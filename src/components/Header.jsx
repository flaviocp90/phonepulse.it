import { Link } from 'react-router-dom'

export default function Header() {
  return <header className="bg-dark border-b border-white/5 sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 py-3">
      <Link to="/" className="flex items-center gap-2 w-fit text-2xl" aria-label="PhonePulse home">
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-full object-cover" />
        <span className="text-primary font-heading">PHONE<span className="text-white">PULSE</span></span>
      </Link>
    </div>
  </header>
}
