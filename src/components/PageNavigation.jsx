import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export default function PageNavigation() {
  const { key, pathname, search } = useLocation()
  const navigation = useNavigationType()
  const positions = useRef(new Map())
  const first = useRef(true)
  const initialLocation = useRef({ key, pathname, search })
  const previousPath = useRef(pathname)

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    const initial = first.current && key === initialLocation.current.key && pathname === initialLocation.current.pathname && search === initialLocation.current.search
    first.current = initial
    const editingFilters = pathname.startsWith('/admin/') && previousPath.current === pathname
    previousPath.current = pathname
    let restored = false
    const position = navigation === 'POP' ? positions.current.get(key) : null
    const remember = () => { if (restored) positions.current.set(key, window.scrollY) }
    const restore = () => {
      const main = document.querySelector('main')
      if (!main || main.getAttribute('aria-busy') === 'true') return
      if (!initial && !editingFilters) {
        main.focus({ preventScroll: true })
        window.scrollTo(0, position ?? 0)
      }
      restored = true
      observer.disconnect()
    }
    // Wait for fetched content before restoring a position below the loading screen.
    const observer = new window.MutationObserver(restore)
    observer.observe(document.getElementById('root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] })
    restore()
    window.addEventListener('scroll', remember)
    return () => { observer.disconnect(); window.removeEventListener('scroll', remember) }
  }, [key, pathname, search, navigation])

  return <a href="#main-content" className="skip-link">Salta al contenuto</a>
}
