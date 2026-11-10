export const templates = {
  news: '## Cosa è successo\n\n\n## Cosa cambia per chi legge\n\n\n## Disponibilità e limiti\n\n',
  guide: '## Il problema e a chi serve questa guida\n\n\n## Prima di iniziare\n\n\n## Procedura\n\n1. \n2. \n\n## Se non funziona\n\n\n## Limiti della guida documentale\n\n',
  comparison: '## Criteri del confronto documentale\n\n\n## Specifiche verificate\n\n| Caratteristica | Dispositivo A | Dispositivo B |\n| --- | --- | --- |\n| | | |\n\n## Differenze utili nella scelta\n\n\n## Cosa non abbiamo provato\n\n',
  review: '## Dispositivo e condizioni della prova\n\n\n## Metodo e durata\n\n\n## Risultati osservati\n\n\n## Limiti della prova\n\n\n## A chi lo consigliamo\n\n',
}

export const contentTools = {
  Titolo: ['## ', ''], Grassetto: ['**', '**'], Elenco: ['- ', ''], Citazione: ['> ', ''],
  Link: ['[', '](https://)'], Tabella: ['\n| Voce | Dettaglio |\n| --- | --- |\n| ', ' | |\n'],
}

const escapeMarkdown = value => value.replace(/[\\`*_[\]{}()<>#+.!|~-]/g, '\\$&')

export function photoMarkdown({ url, alt, caption, credit, license }) {
  if (![alt, caption, credit, license].every(value => typeof value === 'string' && value.trim() && value.length <= 500)) throw new Error('Completa testo alternativo, didascalia, credito e licenza (massimo 500 caratteri).')
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Immagine HTTPS richiesta.')
  return `\n\n![${escapeMarkdown(alt.trim())}](<${parsed.href}>)\n\n_${escapeMarkdown(caption.trim())} — ${escapeMarkdown(credit.trim())} · ${escapeMarkdown(license.trim())}_\n\n`
}

export function validatePhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error('Scegli una foto JPEG, PNG o WebP fino a 5 MB.')
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
}

export function readResearchImport(value) {
  if (!value || value.schema !== 'phonepulse_review_import_v1' || value.publish_allowed !== false) throw new Error('File di ricerca non valido o pubblicabile: importazione rifiutata.')
  const article = value.article
  if (!article || ['title', 'excerpt', 'content'].some(key => typeof article[key] !== 'string' || !article[key].trim()) || article.title.length > 250 || article.excerpt.length > 2000 || article.content.length > 18000 || /<[^>]+>/.test(article.content) || article.content_format !== 'guide') throw new Error('Contenuto della ricerca non valido.')
  const sources = article.sources
  if (!Array.isArray(sources) || !sources.length || sources.length > 12) throw new Error('Fonti della ricerca non valide.')
  const cleanSources = sources.map(source => {
    if (!source || ['url', 'title', 'publisher', 'retrieved_at'].some(key => typeof source[key] !== 'string' || !source[key].trim() || source[key].length > 2048)) throw new Error('Fonte incompleta.')
    const url = new URL(source.url)
    const stamp = Date.parse(source.retrieved_at)
    if (url.protocol !== 'https:' || url.username || url.password || !Number.isFinite(stamp) || stamp > Date.now()) throw new Error('URL o data della fonte non validi.')
    return { url: url.href, title: source.title, publisher: source.publisher, retrieved_at: source.retrieved_at, published_at: null }
  })
  const provenance = value.provenance
  if (!provenance || !/^[a-f0-9]{64}$/.test(provenance.manifest_sha256) || typeof provenance.model !== 'string' || provenance.model.length > 100) throw new Error('Provenienza della ricerca mancante.')
  return {
    article: { title: article.title, excerpt: article.excerpt, content: article.content, content_format: 'guide', sources: cleanSources },
    provenance: { manifest_sha256: provenance.manifest_sha256, model: provenance.model, authentication_verified: false, review_required: true },
  }
}
