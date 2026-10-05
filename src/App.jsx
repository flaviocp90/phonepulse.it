import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import SitemapPage from './pages/SitemapPage.jsx'

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles.jsx'))
const AdminArticleEditor = lazy(() => import('./pages/admin/AdminArticleEditor.jsx'))
const AdminReview = lazy(() => import('./pages/admin/AdminReview.jsx'))

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
        <Route path="/sitemap" element={<SitemapPage />} />

        {/* Admin auth */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="articoli" element={<AdminArticles />} />
          <Route path="articoli/nuovo" element={<AdminArticleEditor />} />
          <Route path="articoli/:id" element={<AdminArticleEditor />} />
          <Route path="review" element={<AdminReview />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
