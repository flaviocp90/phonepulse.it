# PhonePulse — prova isolata di HTML server per articoli

Stato: **esperimento non destinato a pubblicazione**. Endpoint `/api/seo-preview?slug=...` non modifica le rotte `/articoli/:slug`, non riattiva workflow e non modifica dati.

## Evidenza che motiva il lavoro

Il 9 novembre 2026 la risposta HTTP di un articolo pubblicato era un guscio Vite con `<div id="root"></div>` e titolo di sito generico. Il contenuto viene recuperato dal client. Da solo questo non prova la mancata indicizzazione Google.

## Esperimento

- Legge esclusivamente `is_published=true` da Supabase REST usando **anon key**, senza service role.
- Produce HTML autonomo con titolo, canonical, descrizione, H1 e testo escaped.
- Risponde 404 per un articolo inesistente, 503 per errore backend e 400 per slug invalido.
- Ha `noindex` sia nel markup sia nell'header: **non usarlo come pagina SEO vera**.
- Converte Markdown in testo piatto: formattazione, collegamenti e fonti strutturate **non ancora equivalenti** al frontend.
- Nessuna riscrittura Vercel verso il nuovo endpoint; nessun deploy/merge previsto senza test.

## Prossimi gate per produzione

1. Verificare la presenza delle variabili runtime pubbliche su una preview Vercel senza stamparle.
2. Eseguire `node --test tests/seo-preview.test.mjs` e build/frontend smoke test.
3. Costruire un renderer condiviso e sicuro per il corpo articolo, fonti reali e JSON-LD; controllare equivalenza editoriale con React e il gate di approvazione.
4. Verificare endpoint con JavaScript disabilitato, pagine assenti e temporanea indisponibilità Supabase; testare XSS e canonical, redirect www e caching.
5. Solo dopo, su preview, aggiungere una rewrite prima del catch-all SPA verso un handler di produzione. Considerare la navigazione client e analytics una sola volta.
6. Richiedere revisione di deploy; nessun merge automatico.

## Decisione architetturale

Conservare Vite/React e Supabase. Non introdurre Next.js o prerender massivo dell'archivio. L'endpoint di prova serve a isolare prima i rischi di accesso ai dati, HTML, status HTTP e packaging delle funzioni.
