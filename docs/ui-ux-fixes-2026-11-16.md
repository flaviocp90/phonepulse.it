# Correzioni UI/UX — 16 novembre 2026

Implementazione sul ramo `codex/ui-ux-20261116`, basata su `origin/master` (`017bd25`). La copia `phonepulse.it` su develop è precedente alla versione pubblicata: le modifiche sono isolate nel worktree `phonepulse-ui-ux`.

## Copertura della revisione

| Rilievo | Correzione |
|---|---|
| 1. Scroll e orientamento | Navigazioni nuove portano all’inizio del contenuto con focus sul main. Indietro ripristina la posizione dopo il caricamento. I filtri editoriali non sottraggono il focus durante la digitazione. |
| 2. Preferenze privacy fuori schermo | Pannello iniziale prima della pagina; riapertura porta il pannello in vista e ne gestisce il focus. Alla chiusura il focus torna al comando. |
| 3. Errore articolo senza uscita | Pagina server italiana per 404 e 503, con archivio e contatti; Riprova per l’indisponibilità temporanea. |
| 4. Contrasto | Token per azioni separati dall’arancione del logo; link e pulsanti con contrasto verificato. Badge delle categorie con testo scuro o bianco su fondo scuro. |
| 5. Titoli troncati | Titoli delle card completi, con ritorno a capo; due colonne solo da 1024 px. |
| 6. Ricerca e navigazione | Archivio e Contatti nell’header. Ricerca per titolo tramite letture pubbliche esistenti, query e pagina nell’URL, reset e messaggio senza risultati. Categorie ritirate mantenute tali. |
| 7. Retry articolo | Errore annunciabile e pulsante Riprova che ricarica l’articolo senza tornare alla home. |
| 8. Target touch | Social e comandi del footer con area alta almeno 44 CSS px; scelte privacy e trigger menu admin ampliati. |
| 9. Tastiera | Salta al contenuto, main focalizzabile, focus visibile, margine per l’header sticky e gestione dei cambi pagina. Il caricamento iniziale non sottrae il focus. |
| 10. Immagini | Varianti responsive per Pexels e Unsplash, con sizes specifico per le miniature. URL degli altri fornitori conservati. |
| 11. 404 generiche | Fallback Vercel verso una vera risposta 404, mantenendo le rotte pubbliche conosciute sulla shell React e gli admin ritirati separati. |
| 12. Sidebar editoriale | Menu chiuso escluso dalla navigazione, dialogo mobile con Escape e ciclo Tab, ripristino focus, chiusura al passaggio desktop e stato espanso annunciabile. |
| 13. Revisione editoriale | Rimosso Spunta tutto per le attestazioni; indicazione del prossimo requisito vicino alle azioni. Validazioni e controlli server conservati. |
| 14. Tipografia | Figtree per i titoli delle pagine di servizio e del corpo articolo; corpo a 17 px. Font della marca conservato. |
| 15. Movimento e layout | Rispetto di prefers-reduced-motion; mantenuti contenitori delle immagini con spazio riservato. URL lunghi vanno a capo e le tabelle scorrono nel proprio spazio. |

## Sezione Fonti

Rimossa dalla pagina articolo React, dal documento HTML iniziale e dall’anteprima pubblica dell’editor. I campi delle fonti nella redazione, le attestazioni, i dati salvati e le citazioni strutturate SEO restano disponibili. Non sono state modificate o cancellate righe nel database, né i link presenti nel testo degli articoli.

## Verifiche

- `npm run lint`: superato.
- `node --test tests/*.test.mjs`: 42 test superati.
- `npm run test:e2e -- --workers=1 --max-failures=5`: 82 test superati. Include sito pubblico, retry, privacy con attivazione/revoca simulate, HTML senza JavaScript, MFA e lifecycle editoriale su fixture isolate.
- Suite editoriale ripetuta dopo la rifinitura del messaggio per le correzioni pubblicate.
- `npm run build`, `node scripts/check-public-build.mjs`, `npm run build:admin`: superati. Il bundle pubblico non contiene operazioni editoriali.
- Layout controllato su screenshot; nuovi controlli a 320, 375, 768 e 1440 px, testo al 200% e preferenza di movimento ridotto.
- `git diff --check`: superato.

## Limiti

Test eseguiti con browser e servizi simulati, senza pubblicare articoli o modificare account. Mancano prove su dispositivi fisici e screen reader reale. Il routing Vercel è coperto da verifiche della configurazione e degli handler; va confermato sul deployment. Non sono stati misurati Core Web Vitals di campo e non si attribuisce un valore CLS o un risparmio di rete alle modifiche.
