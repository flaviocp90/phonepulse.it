import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Pagina non trovata" />
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-sm">
          <span className="text-8xl font-heading font-bold text-primary/20 block leading-none mb-6">404</span>
          <h1 className="text-2xl font-heading font-bold text-dark mb-3">Pagina non trovata</h1>
          <p className="text-gray-500 font-body text-sm leading-relaxed mb-8">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-body font-medium hover:bg-primary-dark transition-colors text-sm"
          >
            ← Torna alla home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
