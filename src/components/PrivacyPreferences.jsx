import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'

const STORAGE_KEY = 'phonepulse:privacy:v1'

function savedChoice() {
  try {
    const choice = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (typeof choice?.analytics === 'boolean' && Number.isFinite(choice.at) &&
      choice.at <= Date.now() && Date.now() - choice.at < 180 * 86400000) return choice.analytics
  } catch { /* Storage may be unavailable in private browsing. */ }
  return null
}

export default function PrivacyPreferences() {
  const [analytics, setAnalytics] = useState(savedChoice)
  const [open, setOpen] = useState(() => savedChoice() === null)

  useEffect(() => {
    const show = () => setOpen(true)
    const sync = event => { if (event.key === STORAGE_KEY || event.key === null) window.location.reload() }
    window.addEventListener('phonepulse:privacy', show)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('phonepulse:privacy', show)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (analytics !== true || document.getElementById('phonepulse-google-analytics')) return
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', 'G-2RFECSW4XM')
    const google = document.createElement('script')
    google.id = 'phonepulse-google-analytics'
    google.async = true
    google.src = 'https://www.googletagmanager.com/gtag/js?id=G-2RFECSW4XM'
    const ahrefs = document.createElement('script')
    ahrefs.async = true
    ahrefs.src = 'https://analytics.ahrefs.com/analytics.js'
    ahrefs.dataset.key = 'M2UGa6mhx+1V1wi0uA8BoQ'
    document.head.append(google, ahrefs)
  }, [analytics])

  function choose(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: value, at: Date.now() })) } catch { /* Keep the choice for this page. */ }
    if (!value) {
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.trim().split('=')[0]
        if (!/^_ga(?:_|$)/.test(name)) continue
        for (const domain of ['', `; domain=${window.location.hostname}`, '; domain=phonepulse.it']) {
          document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax`
        }
      }
    }
    setAnalytics(value)
    setOpen(false)
    // Reload on withdrawal to stop timers and handlers already installed by providers.
    if (analytics === true && !value) window.location.reload()
  }

  return <>
    {analytics === true && <Analytics />}
    {open && <aside aria-label="Preferenze privacy" className="bg-white border-t border-border px-4 py-5 font-body text-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <p className="flex-1">Usiamo strumenti tecnici per far funzionare il sito. Solo se accetti attiviamo Google Analytics, Ahrefs e Vercel Web Analytics per misurare le visite. Puoi cambiare scelta dal footer. <Link to="/privacy" className="text-primary underline">Informativa privacy</Link>.</p>
        <button onClick={() => choose(false)} className="border border-dark rounded-lg px-4 py-2 text-dark">Rifiuta statistiche</button>
        <button onClick={() => choose(true)} className="border border-dark rounded-lg px-4 py-2 text-dark">Accetta statistiche</button>
      </div>
    </aside>}
  </>
}
