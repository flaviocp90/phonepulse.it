import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from '#app'
import PageNavigation from './components/PageNavigation'
import './index.css'

// The initial HTTP response may already contain SEO metadata from the server.
// Remove those server-only tags before React Helmet takes ownership of the head.
document.querySelectorAll('[data-phonepulse-ssr]').forEach(node => node.remove())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <PageNavigation />
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
