# PhonePulse: piano di rilancio

**Stato:** analisi e proposta, 5 ottobre 2026. Supabase torna a servire contenuti; nessuna modifica applicativa, riattivazione dei job, migrazione o task periodica è stata eseguita durante la pianificazione.

## Valutazione

Il progetto è recuperabile mantenendo lo stack attuale. La priorità è cambiare il contratto editoriale e rendere unica la pubblicazione, prima di aumentare quantità e automazione. L'AI può cercare candidati, produrre bozze e analizzare risultati; recensioni, fonti e affermazioni richiedono responsabilità editoriale reale.

Il controllo da browser dopo il ripristino mostra 90 articoli nella mappa HTML, tutti News; Recensioni è vuota. Nel campione intenzionale di sei articoli emergono liste non mantenute, prove dichiarate senza metodo visibile e fonti assenti dal corpo. Questi risultati non stimano la percentuale di difetti dell'intero archivio e non costituiscono un fact-check completo.

## Documenti operativi

1. [Valutazione della redazione e modello proposto](superpowers/specs/2026-10-05-redazione-rilancio-design.md): evidenze, formati, fonti, checklist, capacità e alternative.
2. [Piano tecnico/editoriale](superpowers/plans/2026-10-05-rilancio-redazione.md): nove task, migrazioni, ruoli, RPC, generazione, revisione, pubblicazione, social, controlli e bonifica.
3. [Piano UI/UX e distribuzione](superpowers/plans/2026-10-05-ui-distribuzione.md): sei task, errori di navigazione, autore/fonti, accessibilità, HTML server, sitemap e prestazioni.
4. [Piano metriche e report automatici](superpowers/plans/2026-10-05-metriche-report-automatici.md): baseline GA4/GSC, eventi utili, integrazione e task cloud in ChatGPT.
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

- Assunzione non ancora confermata: 30 minuti per giorno lavorativo. Partenza con tre news/settimana e una guida ogni due settimane; ridurre se il carico reale sfora.
- Stime: nucleo tecnico 8–14 giornate; UI/distribuzione 4–8; metriche 1–3. Sono ordini di grandezza, con verifiche condivise, non un preventivo o calendario garantito.
- Bonifica archivio: 15–30 ore iniziali stimate, potenzialmente di più per riscritture e fact-check. Procedere per rischio, senza cancellazione collettiva.
- Report proposti: settimanale martedì 09:00 e mensile giorno 5 alle 09:30, Europe/Rome, in ChatGPT. Non richiedono export ricorrenti; serve una configurazione iniziale autorizzata dell'account Google e della task cloud.
- Ad oggi il numero di lettori non è noto perché i dati privati analytics non sono collegati. Nessuna automazione periodica è attiva per effetto di questi documenti.

## Criterio di riuscita

Nuovi articoli con fonti e approvazione della versione, niente prove simulate o liste incompiute, pubblicazione recuperabile, percorsi pubblici affidabili e report automatico verificato. Dopo il pilot decidere cosa ampliare sulla base di qualità, tempo e lettori osservati; il volume di articoli, da solo, non è successo.
