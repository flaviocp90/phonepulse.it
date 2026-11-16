import PrivacyPreferences from './components/PrivacyPreferences.jsx'
import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'

function App() {
  return (
    <Suspense fallback={<div role="status" className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/articoli/:slug" element={<ArticlePage />} />
        <Route path="/categoria/:slug" element={<CategoryPage />} />
        <Route path="/chi-siamo" element={<AboutPage />} />
        <Route path="/contatti" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/sitemap" element={<Navigate to="/" replace />} />
        <Route path="/categoria/news" element={<Navigate to="/" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <PrivacyPreferences />
    </Suspense>
  )
}

export default App
