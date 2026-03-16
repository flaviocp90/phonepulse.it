import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-bold text-primary">404</h1>
        <p className="text-dark mt-4 mb-8">Pagina non trovata.</p>
        <Link to="/" className="bg-primary text-white px-6 py-3 rounded font-body font-medium hover:bg-primary-dark transition-colors">
          Torna alla home
        </Link>
      </div>
    </main>
  )
}
