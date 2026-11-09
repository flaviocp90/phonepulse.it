import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import './index.css'

// The initial HTTP response may already contain SEO metadata from the server.
// Remove those server-only tags before React Helmet takes ownership of the head.
document.querySelectorAll('[data-phonepulse-ssr]').forEach(node => node.remove())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
        <Analytics />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
