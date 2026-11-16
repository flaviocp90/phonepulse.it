import { useLocation } from 'react-router-dom'
import App from './App'
import AdminApp from './AdminApp'

export default function DevelopmentApp() {
  const { pathname } = useLocation()
  return pathname === '/admin' || pathname.startsWith('/admin/') ? <AdminApp /> : <App />
}
