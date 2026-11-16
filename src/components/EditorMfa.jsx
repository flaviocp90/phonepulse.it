import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EditorMfa({ onVerified }) {
  const [factors, setFactors] = useState(null)
  const [selected, setSelected] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return
      if (error) throw error
      const verified = data.totp.filter(factor => factor.status === 'verified')
      setFactors(verified); setSelected(verified[0]?.id || ''); setError('')
    }).catch(() => { if (active) setError('Impossibile caricare i fattori. Riprova.') })
    return () => { active = false }
  }, [retry])

  async function enroll() {
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `PhonePulse ${new Date().toISOString()}` })
      if (error) throw error
      setEnrollment(data); setSelected(data.id); setCode('')
    } catch { setError('Registrazione non riuscita. Riprova.') }
    finally { setBusy(false) }
  }
  async function verify(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: selected, code })
      if (error) throw error
      setEnrollment(null); setCode(''); onVerified()
    } catch { setError('Codice non valido o scaduto. Inserisci il codice corrente e riprova.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md w-full space-y-5">
    <h1 className="font-body font-bold text-2xl">Verifica in due passaggi</h1>
    <p>Per accedere alla redazione serve un codice dalla tua app di autenticazione.</p>
    {error && <p role="alert" className="text-red-700">{error} {factors === null && <button className="underline" onClick={() => setRetry(value => value + 1)}>Riprova</button>}</p>}
    {factors === null ? !error && <p role="status">Caricamento fattori…</p> : <>
      {factors.length > 0 && !enrollment && <label className="block">Dispositivo<select className="block border rounded p-2 w-full" value={selected} onChange={e => setSelected(e.target.value)}>{factors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendly_name || 'App di autenticazione'}</option>)}</select></label>}
      {!factors.length && !enrollment && <><p>Registra l’app e conserva una copia del segreto in un luogo sicuro, separato dal telefono. Se perdi l’accesso, il recupero richiede la verifica dell’identità da parte dell’amministratore Supabase.</p><button disabled={busy} className="bg-primary text-white px-4 py-3 rounded" onClick={enroll}>Configura app di autenticazione</button></>}
      {enrollment && <><img src={enrollment.totp.qr_code} alt="Codice QR da scansionare nell’app di autenticazione" className="w-56 h-56" /><details><summary>Chiave per inserimento manuale e backup</summary><code className="break-all select-all">{enrollment.totp.secret}</code></details><p>Scansiona il QR, conserva il backup e conferma con il primo codice.</p></>}
      {selected && <form onSubmit={verify} className="space-y-4"><label className="block">Codice di autenticazione<input className="block border rounded p-3 w-full" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label><button disabled={busy || code.length !== 6} className="bg-primary text-white px-4 py-3 rounded disabled:opacity-50">Verifica codice</button></form>}
    </>}
    <button className="underline" disabled={busy} onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) setError('Uscita non riuscita. Riprova.') }}>Esci</button>
  </div></main>
}
