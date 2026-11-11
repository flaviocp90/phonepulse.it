import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { readRecovery, recoveryKey, RECOVERY_LIMIT } from '../../lib/draftRecovery'

export default forwardRef(function DraftRecovery({ userId, articleId, version, value, dirty, onRestore }, ref) {
  const key = recoveryKey(userId, articleId)
  const [pending, setPending] = useState(null)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const latest = useRef({ version, value, dirty })
  latest.current = { version, value, dirty }
  const blocked = useRef(true)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        try {
          const copy = readRecovery(raw, userId, articleId)
          if (JSON.stringify(copy.value) !== JSON.stringify(latest.current.value)) { setPending({ ...copy, raw }); blocked.current = true }
          else { window.localStorage.removeItem(key); blocked.current = false }
        } catch { setPending({ raw, invalid: true }); blocked.current = true }
      } else blocked.current = false
    } catch { setMessage('Recupero locale indisponibile: salva la bozza sul server.') }
    setReady(true)
    function flush() {
      if (blocked.current || !latest.current.dirty) return
      try {
        const raw = JSON.stringify({ schema: 1, userId, articleId, version: latest.current.version, savedAt: new Date().toISOString(), value: latest.current.value })
        if (raw.length > RECOVERY_LIMIT) throw new Error('Copia troppo grande')
        window.localStorage.setItem(key, raw)
      } catch { setMessage('Copia locale non salvata: conserva il testo e salva sul server.') }
    }
    window.addEventListener('beforeunload', flush)
    return () => { flush(); window.removeEventListener('beforeunload', flush) }
  }, [key, userId, articleId])

  useImperativeHandle(ref, () => ({ clear() {
    blocked.current = true
    try { window.localStorage.removeItem(key); setPending(null); setMessage('Salvataggio server confermato.') }
    catch { setMessage('Salvataggio server confermato; rimozione della copia locale non riuscita.') }
  } }), [key])

  useEffect(() => {
    if (!ready || pending || !dirty) return
    blocked.current = false
    const timer = window.setTimeout(() => {
      if (blocked.current) return
      try {
        const raw = JSON.stringify({ schema: 1, userId, articleId, version, savedAt: new Date().toISOString(), value })
        if (raw.length > RECOVERY_LIMIT) throw new Error('Copia troppo grande')
        window.localStorage.setItem(key, raw)
        setMessage('Copia di recupero salvata su questo browser. La bozza sul server richiede Salva bozza.')
      } catch { setMessage('Copia locale non salvata: conserva il testo e salva sul server.') }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [ready, pending, dirty, key, userId, articleId, version, value])

  function discard() {
    try { window.localStorage.removeItem(key); blocked.current = false; setPending(null); setMessage('Copia locale rimossa.') }
    catch { setMessage('Rimozione della copia locale non riuscita.') }
  }
  function download() {
    const url = URL.createObjectURL(new window.Blob([pending.raw], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'phonepulse-recupero.json'; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (!pending) return message ? <p className="text-xs text-gray-600 mb-4" aria-live="polite">{message}</p> : null
  const matches = !pending.invalid && pending.version === version
  return <aside className="border border-amber-300 bg-amber-50 rounded-xl p-4 mb-4 space-y-2" aria-label="Recupero bozza">
    <p className="text-sm">{matches ? 'Esiste una copia locale non salvata sul server.' : 'La copia locale appartiene a una versione diversa o non è leggibile. Scaricala per recuperare il testo senza sovrascrivere il server.'}</p>
    <div className="flex flex-wrap gap-3 text-sm"><button type="button" disabled={!matches} className="disabled:opacity-40 underline" onClick={() => { if (!dirty || window.confirm('Sostituire le modifiche attuali con la copia di recupero?')) { onRestore(pending.value); discard() } }}>Ripristina copia locale</button><button type="button" onClick={download} className="underline">Scarica copia locale</button><button type="button" onClick={discard} className="underline">Scarta copia locale</button></div>
  </aside>
})
