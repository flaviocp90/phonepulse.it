import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mediaPaths, mediaUrl } from './privateMedia'

export function usePrivateMedia(content, cover) {
  const key = mediaPaths(content, cover).join(',')
  const [result, setResult] = useState({ key: '', urls: {}, error: '' })
  useEffect(() => {
    if (!key) return
    let active = true
    async function sign() {
      try {
        const { data, error } = await supabase.storage.from('editorial-media').createSignedUrls(key.split(','), 300)
        if (error || !data || data.some(row => row.error || !row.signedUrl)) throw error || new Error('Foto indisponibili')
        if (active) setResult({ key, urls: Object.fromEntries(data.map(row => [mediaUrl(row.path), row.signedUrl])), error: '' })
      } catch { if (active) setResult({ key, urls: {}, error: 'Anteprima foto private indisponibile. Controlla accesso e connessione prima di pubblicare.' }) }
    }
    sign()
    const timer = window.setInterval(sign, 240000)
    return () => { active = false; window.clearInterval(timer) }
  }, [key])
  return result.key === key ? result : { urls: {}, error: '' }
}
