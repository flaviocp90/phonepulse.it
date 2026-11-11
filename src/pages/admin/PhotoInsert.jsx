import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { mediaUrl } from '../../lib/privateMedia'
import { photoMarkdown, validatePhoto } from '../../lib/guidedEditor'

export default function PhotoInsert({ onInsert, disabled }) {
  const [file, setFile] = useState(null)
  const [details, setDetails] = useState({ alt: '', caption: '', credit: '', license: '' })
  const [cover, setCover] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const insertRef = useRef(onInsert)
  insertRef.current = onInsert
  const fileRef = useRef(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function upload() {
    setError(''); setBusy(true)
    try {
      const extension = validatePhoto(file)
      photoMarkdown({ ...details, url: 'https://example.org/validation' })
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || data.user?.app_metadata?.phonepulse_role !== 'editor') throw new Error('Accesso editor da verificare: accedi di nuovo prima di caricare.')
      const path = `${data.user.id}/${window.crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('editorial-media').upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw new Error('Caricamento non riuscito. Controlla connessione e permessi; il testo è conservato.')
      const publicUrl = mediaUrl(path)
      if (!alive.current) return
      insertRef.current({ figure: photoMarkdown({ ...details, url: publicUrl }), url: publicUrl, cover, credit: `${details.credit} · ${details.license}` })
      setFile(null); if (fileRef.current) fileRef.current.value = ''; setDetails({ alt: '', caption: '', credit: '', license: '' })
    } catch (err) { if (alive.current) setError(err.message) }
    finally { if (alive.current) setBusy(false) }
  }

  return <fieldset disabled={disabled || busy} className="space-y-3 min-w-0">
    <legend className="font-heading font-bold mb-2">Inserisci una foto</legend>
    <p className="text-xs text-gray-500">Carica solo foto originali o autorizzate. Le foto restano private durante la bozza e diventano accessibili quando l’articolo viene pubblicato.</p>
    <label className="block text-sm">Foto (JPEG, PNG, WebP, massimo 5 MB)<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs mt-2" onChange={e => { setError(''); const next = e.target.files?.[0]; try { validatePhoto(next); setFile(next) } catch (err) { setFile(null); setError(err.message) } }} /></label>
    {preview && <img src={preview} alt="Anteprima foto da inserire" className="w-full max-h-48 object-contain" />}
    {Object.entries({ alt: 'Testo alternativo', caption: 'Didascalia', credit: 'Autore / credito', license: 'Licenza o autorizzazione' }).map(([key, label]) => <label key={key} className="block text-xs text-gray-600">{label}<input className="block w-full border border-border rounded-lg p-2 mt-1" maxLength={500} value={details[key]} onChange={e => setDetails(previous => ({ ...previous, [key]: e.target.value }))} /></label>)}
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={cover} onChange={e => setCover(e.target.checked)} />Usa anche come copertina</label>
    <p className="text-xs text-gray-500">La foto viene inserita nel punto selezionato del testo. Salva la bozza per conservarne posizione, didascalia e diritti.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" disabled={!file || busy || disabled || Object.values(details).some(value => !value.trim())} onClick={upload} className="px-3 py-2 rounded-xl bg-gray-100 text-sm disabled:opacity-40">{busy ? 'Caricamento foto...' : 'Carica e inserisci foto'}</button>
  </fieldset>
}
