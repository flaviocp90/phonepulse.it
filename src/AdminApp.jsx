import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import NotFound from './pages/NotFound.jsx'
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles.jsx'))
const AdminArticleEditor = lazy(() => import('./pages/admin/AdminArticleEditor.jsx'))

export default function AdminApp() {
  return <Suspense fallback={<div role="status">Caricamento...</div>}><Routes>
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
          <Route index element={<Navigate to="/admin/articoli?view=review" replace />} />
          <Route path="dashboard" element={<Navigate to="/admin/articoli?view=review" replace />} />
          <Route path="articoli" element={<AdminArticles />} />
          <Route path="articoli/nuovo" element={<AdminArticleEditor />} />
          <Route path="articoli/:id" element={<AdminArticleEditor />} />
          <Route path="review" element={<Navigate to="/admin/articoli?view=review" replace />} />
        </Route>

    <Route path="/" element={<Navigate to="/admin" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense>
}
