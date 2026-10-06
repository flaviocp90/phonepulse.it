# PhonePulse: piano di rilancio

**Stato aggiornato:** 5 ottobre 2026. Le quattro migrazioni editoriali Supabase sono applicate al progetto live e il ruolo editor è assegnato a `phonepulse.it@gmail.com`. I 4.784 articoli risultano preservati (90 pubblicati, 4.360 bozze, 334 scartati); nessuna bozza è stata approvata retroattivamente. Non sono stati creati servizi a pagamento. Resta da verificare la UI dopo logout/login.

## Valutazione

Il progetto è recuperabile mantenendo lo stack attuale. La priorità è cambiare il contratto editoriale e rendere unica la pubblicazione, prima di aumentare quantità e automazione. L'AI può cercare candidati, produrre bozze e analizzare risultati; recensioni, fonti e affermazioni richiedono responsabilità editoriale reale.

Il controllo da browser dopo il ripristino mostra 90 articoli nella mappa HTML, tutti News; Recensioni è vuota. Nel campione intenzionale di sei articoli emergono liste non mantenute, prove dichiarate senza metodo visibile e fonti assenti dal corpo. Questi risultati non stimano la percentuale di difetti dell'intero archivio e non costituiscono un fact-check completo.

## Documenti operativi

1. [Valutazione della redazione e modello proposto](superpowers/specs/2026-10-05-redazione-rilancio-design.md): evidenze, formati, fonti, checklist, capacità e alternative.
2. [Piano tecnico/editoriale](superpowers/plans/2026-10-05-rilancio-redazione.md): nove task, migrazioni, ruoli, RPC, generazione, revisione, pubblicazione, social, controlli e bonifica.
3. [Piano UI/UX e distribuzione](superpowers/plans/2026-10-05-ui-distribuzione.md): sei task, errori di navigazione, autore/fonti, accessibilità, HTML server, sitemap e prestazioni.
4. [Piano metriche e report automatici](superpowers/plans/2026-10-05-metriche-report-automatici.md): baseline Vercel disponibile, integrazione futura GA4/GSC, eventi utili e task cloud in ChatGPT. [Accessi e baseline](analytics-operations.md), [prompt pronto](analytics-report-prompt.md).
5. [Audit iniziale](audit-2026-10-05.md): fotografia tecnica precedente al ripristino; i problemi di connessione Supabase non descrivono più lo stato corrente.

## Ordine di esecuzione

| Passaggio | Lavoro | Condizione per proseguire |
| --- | --- | --- |
| 1. Baseline | Backup/schema/workflow, account analytics, dati iniziali | Ambiente noto e nessuna pubblicazione arretrata automatica |
| 2. Fiducia | Sei casi editoriali prioritari, promessa pubblica, ruolo/fonti/stati | Nuove bozze verificabili e autore responsabile |
| 3. Pubblicazione | RPC atomiche e review completa, job sugli approvati | Versione approvata indispensabile e conflitti gestiti |
| 4. Esperienza pubblica | Errori/layout, autore/fonti, HTML/metadati/sitemap, eventi | Articolo accessibile e misurabile, anche da URL diretto |
| 5. Continuità | CI, esiti social, monitoraggio, report ChatGPT | Fallimenti visibili e primo report cloud consegnato |
| 6. Pilot | Quattro settimane con calendario ridotto | Qualità verificata, carico sostenibile, decisioni dai dati |

Lettura analytics e configurazione del report possono iniziare subito, senza attendere il refactor del database. Correzioni editoriali urgenti possono precedere il nuovo editor; ogni cambiamento ai contenuti deve avere una decisione tracciata. Non riattivare job B per smaltire automaticamente bozze vecchie.

## Risorse e limiti

- Disponibilità confermata: 30 minuti al giorno; autore responsabile Flavio Coppola. Pianificazione iniziale prudente su cinque giorni (150 minuti/settimana): tre news/settimana e una guida ogni due settimane; ridurre se il carico reale sfora. Data di avvio subordinata alle verifiche operative del [pilot](editorial/pilot.md).
- Stime: nucleo tecnico 8–14 giornate; UI/distribuzione 4–8; metriche 1–3. Sono ordini di grandezza, con verifiche condivise, non un preventivo o calendario garantito.
- Bonifica archivio: 15–30 ore iniziali stimate, potenzialmente di più per riscritture e fact-check. Procedere per rischio, senza cancellazione collettiva.
- Report proposti: settimanale martedì 09:00 e mensile giorno 5 alle 09:30, Europe/Rome, in ChatGPT. Il primo report può usare Vercel senza account Google; serve salvare e verificare una task cloud. GA4/GSC arricchiranno engagement e ricerca organica quando collegati.
- Vercel osserva tre pageview in produzione nei 30 giorni 5 settembre–4 ottobre UTC; non dimostra tre persone distinte o letture qualificate. Nessuna automazione periodica è attiva per effetto di questi documenti.

## Stato Supabase aggiornato — 5 ottobre 2026

Le migrazioni `editorial_state`, `editorial_rpcs`, `social_delivery` e `automation_runs` risultano applicate e registrate sul progetto live. RLS e policy di lettura pubblica/editor, RPC editoriali e revoca delle scritture dirette sono state verificate via SQL. Il ruolo attendibile è `app_metadata.phonepulse_role='editor'`; serve una nuova sessione Auth affinché il JWT recepisca il claim. La UI amministrativa non è stata verificata nel browser dopo il rollout: fare logout/login e riaprire `/admin/articoli`.

Il vincolo di costo è **zero**: non è stato creato uno staging branch Supabase, che avrebbe un costo orario. Gli advisor Supabase mostrano avvisi su performance e protezione delle password compromesse disattivata; restano da valutare. Job A/B, invio social, pubblicazione di articoli e report periodici non sono stati attivati.

## Evidenze successive all'accesso amministrativo

Supabase contiene 4.784 articoli: 90 pubblicati, 334 scartati e 4.360 bozze; nessuna cancellazione collettiva. La nuova coda RSS è distinta dall'arretrato tramite `origin`. `daily_counters` non ha policy e resta inaccessibile ai client; verificare gli usi leciti prima di aggiungere una policy dedicata. L'account editor è stato assegnato come descritto sopra.

Backup delle sette tabelle public verificato su PostgreSQL locale: copertura applicativa, non backup completo Supabase Auth/Storage o staging certificato. Conservazione temporanea privata da rendere durevole prima di migrazioni. [Runbook e limiti](operations.md). Le correzioni UI locali e il caricamento differito delle pagine admin hanno superato 15 test browser e build. JavaScript iniziale ridotto da 513,99 a 472,55 kB; script Ahrefs duplicato rimosso. Queste modifiche non sono ancora sul sito pubblico.

## Criterio di riuscita

Nuovi articoli con fonti e approvazione della versione, niente prove simulate o liste incompiute, pubblicazione recuperabile, percorsi pubblici affidabili e report automatico verificato. Dopo il pilot decidere cosa ampliare sulla base di qualità, tempo e lettori osservati; il volume di articoli, da solo, non è successo.
