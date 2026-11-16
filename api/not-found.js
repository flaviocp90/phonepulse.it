export function errorDocument(status = 404) {
  const unavailable = status === 503
  const title = unavailable ? 'Articolo temporaneamente non disponibile' : 'Pagina non trovata'
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title} — PhonePulse</title>
<style>body{margin:0;background:#F5F4F1;color:#0D0D0D;font:1rem/1.6 system-ui,sans-serif}header{background:#0D0D0D;padding:1rem}header a{color:white;font-weight:700}main{max-width:42rem;margin:4rem auto;padding:0 1rem}h1{line-height:1.2}a{color:#B93808;display:inline-block;padding:.75rem}a:focus-visible{outline:3px solid #B93808;outline-offset:4px}header a:focus-visible{outline-color:#FF5C1A}</style></head>
<body><header><a href="/" aria-label="PhonePulse home">PHONEPULSE</a></header><main><h1>${title}</h1><p>${unavailable ? 'Non riusciamo a caricare l’articolo in questo momento. Riprova tra poco.' : 'La pagina che cerchi non esiste o non è più disponibile.'}</p>${unavailable ? '<a href="">Riprova</a>' : ''}<a href="/">Torna all’archivio</a><a href="/contatti">Segnala un problema</a></main></body></html>`
}

export function sendError(res, status) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Robots-Tag', 'noindex, follow')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).send(errorDocument(status))
}

export default function handler(req, res) { return sendError(res, 404) }
