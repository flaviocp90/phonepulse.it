# PhonePulse: UI, affidabilità pubblica e distribuzione — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Nessun redesign o deploy eseguito da questo documento; nessuna delega automatica.

**Goal:** rendere chiara la promessa editoriale, affidabile la navigazione e accessibili contenuti/metadati anche senza eseguire JavaScript.

**Architecture:** conservare React/Vite/Tailwind e Supabase. Prima correggere stati e accessibilità; poi aggiungere un percorso server per gli articoli pubblici e una sitemap dinamica. Nessuna migrazione totale a un framework diverso.

**Dipendenze:** [spec editoriale](../specs/2026-10-05-redazione-rilancio-design.md), [stati/RPC](2026-10-05-rilancio-redazione.md), [metriche](2026-10-05-metriche-report-automatici.md). Le prove iniziali sono nell'[audit](../../audit-2026-10-05.md).

## Sequenza proposta

| Priorità | Intervento | Motivazione |
| --- | --- | --- |
| P0 | Stati/errori pubblici e revisione delle promesse | Evitare contenuti vecchi o affermazioni senza riscontro |
| P0 | Fonti/autore/metodo negli articoli | Rendere verificabile il lavoro editoriale |
| P1 | Menu, login, footer e categorie vuote | Rimuovere gli ostacoli osservati da browser |
| P1 | Sitemap e HTML/metadati server | Pubblicazione effettivamente distribuibile e condivisibile |
| P1 | Eventi di interazione | Baseline misurabile per il pilot |
| P2 | Caricamento admin e asset | Ottimizzare dopo le correzioni, misurando il risultato |

Stima orientativa 4–8 giornate, esclusi riscrittura dell'archivio e tempi d'indicizzazione. Confermare dopo la prova Vercel del task U4; non sommare ciecamente con gli altri piani, che condividono verifiche e componenti.

## Task U1 — Navigazione e caricamenti affidabili

**Files:** modificare `src/pages/ArticlePage.jsx`, `src/pages/CategoryPage.jsx`, `src/pages/Home.jsx`, `src/pages/SitemapPage.jsx`; creare `tests/e2e/public-navigation.spec.js`, `playwright.config.js`; aggiornare `package.json`.

- [ ] Introdurre `@playwright/test` soltanto come dipendenza di sviluppo per le prove browser richieste; script `test:e2e`, server locale e fixture di risposta Supabase intercettate, senza toccare dati live. CI su ambiente controllato.
- [ ] Riprodurre cambio articolo valido → slug inesistente/errore API: il vecchio articolo non deve restare visibile. Cancellare stato precedente all'avvio e distinguere loading, not found, errore temporaneo e contenuto.
- [ ] Riprodurre categoria A lenta → B veloce: ignorare la risposta obsoleta o cancellare la richiesta tramite le API supportate dalla versione Supabase installata. Applicare la stessa regola dove il fetch dipende dalla route.
- [ ] Paginare l'elenco pubblico, evitando di scambiare il limite API per la quantità totale. Mostrare count reale solo dopo una query riuscita; errore non significa zero.
- [ ] Empty state Recensioni: spiegare che non sono ancora disponibili prove pubblicate e suggerire contenuti effettivi. Non spostare automaticamente news in Recensioni per riempirla.
- [ ] Test browser per risposte invertite, errore/recupero, URL diretto, indietro/avanti e categoria vuota. Le asserzioni verificano ciò che vede l'utente, non l'ordine interno dei setter.

**Done:** nessun contenuto precedente durante errore/cambio route e nessun conteggio inventato.

## Task U2 — Promessa editoriale e gerarchia delle informazioni

**Incremento locale 2026-10-05:** layout verificato con articolo pilota sintetico;
autore, formato, fonti e date condividono lo stesso mapping con JSON-LD. Home,
Chi siamo e Contatti aggiornati; voti senza metodo documentato rimossi dalla
presentazione pubblica. Restano pilota reale, decisioni sui testi dell’archivio,
metodo delle prove e integrazione metriche dopo definizione del consenso.
Nessun contenuto live modificato. Il Done completo resta aperto.

**Files:** modificare `src/pages/{Home,ArticlePage,AboutPage,ContactPage}.jsx`, `src/components/{ArticleCard,NewsCard,SchemaMarkup,SEO}.jsx`; eventuali campi mancanti in migrazione additiva successiva al task editoriale 2.

**Interfaces:** render pubblico di fonti, autore responsabile, formato reale, pubblicato/aggiornato; voto e dati di prova soltanto quando documentati. Riutilizzare `content_format` e autore del task editoriale 2; non dedurli dal titolo e non creare una seconda migrazione per gli stessi campi.

- [ ] Scrivere home/Chi siamo coerenti con il modello “smartphone e app, news verificate e guide pratiche”; rimuovere promesse di laboratorio o esperienza diretta dove non esistono riscontri.
- [ ] Nell'articolo mostrare formato, autore, prima pubblicazione e aggiornamento sostanziale; collegare le fonti strutturate. Spiegare il ruolo dell'AI e la responsabilità editoriale senza autori inventati.
- [ ] Per review/comparison: metodo, dispositivi/versioni/condizioni, vantaggi, limiti e distinzione tra dati del produttore e prove. Se mancano, correggere il formato e il testo prima di promuoverli.
- [ ] Mantenere titoli promessi e contenuti coerenti: una lista di otto elementi ne mostra otto identificabili; niente voto “testato” derivato da generazione automatica. Questa è revisione editoriale, non una regex capace di certificare il testo.
- [ ] Collegamenti correlati pertinenti e disponibili, fonti cliccabili e ritorno alla categoria. Non introdurre newsletter, account lettore o pubblicità prima di un bisogno confermato.
- [ ] Schema JSON-LD usa date/autore/formato reali; niente review rating senza review autentica. I campi legacy mancanti non ricevono default ingannevoli.
- [ ] Coordinare i tre eventi del piano metriche, evitando due implementazioni per lo stesso click.

**Done:** un articolo pilota completo e verificato prima di applicare il layout all'archivio. Le nuove fonti devono essere pubblicamente visibili, non soltanto salvate nell'admin.

## Task U3 — Accessibilità e layout osservati da browser

**Files:** modificare `src/components/{Header,Footer,ArticleCard,NewsCard}.jsx`, `src/pages/admin/AdminLogin.jsx`, `src/index.css`, `src/App.jsx`; creare `src/pages/PrivacyPage.jsx` dopo definizione dei trattamenti reali e `tests/e2e/accessibility.spec.js`.

- [ ] Header a 768 px: evitare contatto tra logo e prima voce; usare il breakpoint che mantiene spazio verificato anche con testo ingrandito. Prove 390, 768 e 1200 px.
- [ ] Menu mobile con `aria-expanded`, `aria-controls`, focus visibile, chiusura Escape e gestione coerente dopo navigazione. Navigabile da tastiera senza intrappolare il focus.
- [ ] Label reali associate ai campi login e messaggi di errore leggibili; non usare il placeholder come unica etichetta.
- [ ] Footer: migliorare contrasto e leggibilità dei testi piccoli, verificare rapporto di contrasto con colori effettivi. Privacy deve portare a un percorso funzionante e coerente con analytics/consenso; Chi siamo e Contatti reperibili.
- [ ] Immagini con dimensioni/aspect-ratio stabili, alt pertinente e fallback se falliscono; non nascondere un errore reale con un'immagine casuale. Lazy loading per immagini sotto la piega.
- [ ] Test tastiera e viewport, nessun overflow orizzontale, link footer e immagini fallite; screenshot di articolo/home/categoria vuota. Verifica manuale del contrasto e zoom 200% oltre alle asserzioni automatiche.

**Done:** difetti osservati risolti e schermate controllate. Nessuna grande riscrittura visiva prima di sapere quali contenuti e interazioni funzionano.

## Task U4 — HTML pubblico e metadati coerenti

**Preparazione 2026-10-05:** prova SSR con dati fittizi e CSS build disponibile
in preview; Vercel READY, controlli locali passati. Lettura HTTP protetta bloccata
da403 del connettore, riconnessione richiesta. Il refactor generale resta al gate
della prima prova remota; nessun rewrite pubblico articolo attivato.

**Files:** prova su branch: creare `src/components/PublicArticle.jsx`, `src/entry-server.jsx`, `api/article.js`; modificare `src/pages/ArticlePage.jsx`, `src/components/{SEO,SchemaMarkup}.jsx`, `vite.config.js`, `package.json`, `vercel.json`; creare `tests/article-render.test.mjs`.

**Interfaces:** `PublicArticle({article})` componente pubblico condiviso; `renderArticle(article)` produce HTML dell'articolo e metadati. Handler GET `/articoli/:slug` legge soltanto published via anon/RLS. Rendering identico per utenti e crawler; nessuna selezione per user-agent.

- [ ] Prima eseguire una prova minima su preview Vercel: build Vite client + bundle SSR server, includere l'output server nell'artefatto della function con configurazione compatibile con Vercel. Verificare import, CSS e route; se la piattaforma non lo include correttamente, risolvere questo prima del refactor generale. Non presumere che un build locale dimostri packaging serverless corretto.
- [ ] Estrarre il corpo pubblico condiviso senza dipendenze da `window`, fetch client o strumenti admin. L'handler restituisce document HTML completo con titolo, descrizione, canonical www coerente, OG/Twitter, JSON-LD e testo reale. Se non serve idratazione per la prima versione, link nativi e piccoli script di misura bastano; non costruire un secondo router.
- [ ] Sicurezza: escape di titolo/metadati e serializzazione JSON-LD; sanitizzazione coerente dell'HTML prima del rendering anche server-side, riutilizzando una soluzione server compatibile dopo verifica delle dipendenze. Testare payload con script/event handler; non affidarsi alla sola pulizia del client.
- [ ] Mettere rewrite articolo prima del catch-all SPA, conservando admin e percorsi già funzionanti. Slug non pubblicato restituisce 404 reale; errore Supabase temporaneo 503, non 404 né HTTP 200 con articolo vuoto.
- [ ] Cache iniziale breve con limite di staleness documentato; articoli ritirati/corretti invalidati o resi visibili entro il limite dichiarato. Non promettere consistenza istantanea con cache attiva. Niente post social finché l'URL pubblico non è verificato per la versione pubblicata. Contratto Task7: meta `name="phonepulse:article-version" content="{version}"` prodotto dalla riga DB pubblicata e canonical www corrispondente; mai un marker statico nel guscio SPA.
- [ ] Test senza JavaScript: HTML contiene testo, fonti e metadati articolo corretti; direct link/refresh/404; client navigation mostra la stessa versione e registra una sola pageview. Evitare due richieste analytics tra documento server e bootstrap client.
- [ ] Gestire ritiri e merge con decisione editoriale esplicita: 301 solo verso sostituto pertinente; 404/410 per ritiro senza sostituto. Registrare redirect nella configurazione distribuita; nessun redirect indiscriminato alla home.

**Done:** prova browser + risposta HTTP grezza su preview verificata. Solo dopo questo risultato stimare/refinire l'estensione server agli altri percorsi pubblici; non migrare il progetto per anticipazione.

## Task U5 — Sitemap aggiornata dalla fonte pubblica

**Preparazione 2026-10-05:** endpoint solo preview, controlli locali per1002record,
limite API500, errori e slug dot-segment passati. Categorie e articoli paginati fino
alla pagina vuota. `/sitemap.xml`, robots e job B invariati fino alla prova remota.

**Files:** creare `api/sitemap.js`, `tests/sitemap.test.mjs`; modificare `vercel.json`, `public/robots.txt`, `scripts/news_automation.py`; sostituire il vecchio `public/sitemap.xml` dopo preview riuscita.

- [ ] GET `/sitemap.xml` interroga published con pagination stabile e genera XML usando primitive standard; `Content-Type: application/xml`, escape URL, host canonical e `lastmod` dalla modifica editoriale sostanziale, non dal semplice run del job.
- [ ] Usare `content_updated_at` del contratto core per lastmod e data di aggiornamento pubblico; prima pubblicazione usa `published_at`. Date legacy di modifica sono da verificare: omettere lastmod quando non affidabile, senza inventare la data del giorno.
- [ ] Includere pagine pubbliche valide e articoli pubblicati; non draft/admin/errori. Paginare oltre il limite API; se si supera il limite del protocollo sitemap, dividere con indice, solo quando realmente necessario.
- [ ] Rewrite specifico prima del catch-all; cache coerente con U4. Fallimento query non sovrascrive una sitemap valida con zero URL: errore esplicito e monitoraggio, eventuale cache precedente documentata.
- [ ] Rimuovere produzione/commit/push della sitemap dal job B soltanto dopo verifica endpoint; pubblicazione manuale e job devono avere lo stesso risultato pubblico senza commit automatici.
- [ ] Test con oltre 1.000 record mock, XML escape, date, slug ritirato, errore sorgente e nessun draft. Browser/HTTP verifica l'XML su preview e dopo deploy.

**Done:** inserimento, correzione e ritiro manuali riflessi entro il limite cache; sitemap e HTML coerenti. Indicizzazione Google resta un processo esterno, senza garanzia di tempi o ranking.

## Task U6 — Ottimizzazioni e dipendenze con misure

**Files:** modificare `src/App.jsx`, `package.json`, lockfile e workflow CI di progetto; aggiornare `docs/operations.md`.

- [ ] Lazy import delle pagine admin con fallback semplice, preservando autenticazione/route. Misurare bundle pubblico prima/dopo; non frammentare ogni card o componente piccolo.
- [ ] Valutare peso/copertura immagini e query sui dati reali; scegliere pochi campi nelle liste e paginazione prima di introdurre cache client generiche o librerie di stato.
- [ ] Riesaminare gli advisories dell'audit, distinguendo dipendenze runtime/dev e percorsi raggiungibili. Aggiornamenti compatibili mirati; niente `npm audit fix --force` alla cieca. Pin versioni Python riproducibili e rivedere modello/provider Google separatamente.
- [ ] Lint focalizzato sui file toccati e regole React hooks/accessibilità utili, senza una riformattazione dell'intero repository. Build, test Python/Deno del piano core, node:test e prove browser critiche in CI.
- [ ] Lighthouse su mobile rappresentativo e confronto dei Core Web Vitals reali quando c'è campione sufficiente. Un punteggio di laboratorio non dimostra esperienza di tutti i visitatori.

**Done:** controlli passati, miglioramento misurato e nessuna regressione critica di articolo/login. Successo dell'ottimizzazione espresso in numeri osservati, non in percentuali preventivate.

## Verifica finale e rilascio

- [ ] Anteprima: home, categoria piena/vuota, articolo, inesistente, privacy, login; 390/768/1200 px, tastiera e rete lenta.
- [ ] Risposta grezza articolo contiene contenuto/metadati; 404/503 corretti; sitemap XML aggiornata.
- [ ] Autore/fonti/formato corrispondono alla versione approvata; eventuali cache hanno un limite dichiarato.
- [ ] GA4 una pageview per percorso e nessun evento doppio; esecuzione cloud report verificata nel piano metriche.
- [ ] Deploy coordinato con migrazioni core: nessun vecchio editor con scritture incompatibili; backup e rollback provati. Non ripristinare il vecchio percorso di pubblicazione automatica per risolvere un problema estetico.
