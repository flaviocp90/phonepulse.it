import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminArticles from './pages/admin/AdminArticles.jsx'
import AdminArticleEditor from './pages/admin/AdminArticleEditor.jsx'
import AdminReview from './pages/admin/AdminReview.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import SitemapPage from './pages/SitemapPage.jsx'

function App() {
  return (
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
  )
}

export default App
