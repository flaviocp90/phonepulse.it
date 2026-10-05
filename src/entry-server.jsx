import { renderToStaticMarkup } from 'react-dom/server'

export function renderProbe(css) {
  return '<!doctype html>' + renderToStaticMarkup(
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>Prova SSR PhonePulse</title>
        {css.map(path => <link key={path} rel="stylesheet" href={`/${path}`} />)}
      </head>
      <body>
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-5xl font-heading text-dark">Prova SSR PhonePulse</h1>
          <p className="font-body mt-6">Pagina fittizia per verificare il pacchetto server. Nessun articolo pubblicato o dato live modificato.</p>
          <a href="/" className="font-body text-dark underline">Torna alla home</a>
        </main>
      </body>
    </html>,
  )
}
