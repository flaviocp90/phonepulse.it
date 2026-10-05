import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderProbe } from '../server-dist/entry-server.js'

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (process.env.VERCEL_ENV !== 'preview') return response.status(404).send('Non trovato')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).send('Metodo non consentito')
  }
  try {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'dist/.vite/manifest.json'), 'utf8'))
    const entry = manifest['index.html']
    if (!entry?.css?.length) throw new Error('Client CSS missing')
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    return response.status(200).send(renderProbe(entry.css))
  } catch {
    return response.status(503).send('Prova server non disponibile')
  }
}
