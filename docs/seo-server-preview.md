# PhonePulse — anteprima HTML server-side degli articoli

**Stato:** esperimento isolato nella PR Draft #43. Non modifica le rotte pubbliche e non è indicizzabile.

## Verifiche reali

Nella preview Vercel del 9 novembre 2026 `/api/seo-preview?slug=samsung-conferma-supporto-android-smarttag-3` ha restituito HTTP 200 con contenuto, link alla fonte, autore, formato, date, canonical e JSON-LD già nell'HTML iniziale. Su slug inesistente HTTP 404 e slug malformato HTTP 400 (verifica sul primo prototipo). La versione aggiornata aggiunge Markdown allowlist e metadati editoriali.

## Contratto implementato

- Query Supabase con **anon key** e filtro `is_published=true`; nessuna service-role key.
- Markdown tramite lexer `marked` e renderer HTML **a lista consentita**: titoli, testo, enfasi, link HTTPS/HTTP sicuri o percorsi relativi, immagini HTTP(S) sicure, liste, citazioni, codice e tabelle. HTML grezzo viene escaped, non eseguito.
- Metadati: titolo SEO, description, canonical www, OpenGraph, Article/Breadcrumb JSON-LD; schema scritto con escaping di caratteri speciali.
- Informazioni reali da `publicEditorial`: autore, formato, date valide, fonti verificate e nota sull'origine legacy/RSS.
- Codici: 200 articolo, 404 inesistente, 400 slug invalido, 503 backend in errore; `Cache-Control: no-store`.
- `X-Robots-Tag: noindex,nofollow` e meta noindex su ogni risposta della preview.

## Limiti e gate ancora aperti

1. La preview **non usa il layout React** e non è un renderer condiviso; manca equivalenza visuale e funzionale (articoli correlati, tag, affiliate link) e verifica editoriale comparativa.
2. I test `tests/seo-preview.test.mjs` esistono, ma non sono stati ancora eseguiti in un runner Node con dipendenze installate. Eseguire `node --test tests/seo-preview.test.mjs` e poi `npm run build`.
3. Provare in preview contenuti di test con payload XSS, Markdown complesso, articolo ritirato, perdita di Supabase e dati incompleti. La risposta 503 va verificata direttamente.
4. Canonical e sitemap usano oggi apex in altri file; serve una decisione coerente apex/www prima di sostituire il sito pubblico.
5. Prima di produzione creare un percorso HTML server completo per le rotte articolo, testare URL diretto, JavaScript disabilitato, navigazione client, 404/410 e analytics non duplicati, packaging e aggiornamenti/ritiri.
6. Nessun merge, cambiamento di `vercel.json`, migrazione, job editoriale o invio social autorizzato da questa preview.

**Decisione:** mantenere la PR Draft; validare test e parità prima di eventuali rewrite pubblici.
