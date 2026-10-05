# PhonePulse: metriche e analisi periodica automatica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Questa stesura non attiva account, invii o calendari; nessuna delega automatica.

**Goal:** sapere quante persone raggiungono il sito, come interagiscono e quali contenuti meritano investimento; ricevere analisi periodiche in ChatGPT senza esportare dati o avviare manualmente ogni report.

**Architecture:** iniziare dal connettore Vercel già collegato per visualizzazioni, percorsi, referrer e dispositivi; GA4 per engagement quando autorizzato, Search Console per ricerca organica. Una task cloud ChatGPT interroga le integrazioni disponibili. Nessun nuovo data warehouse o pannello analytics. Supabase conserva i dati editoriali: usare solo aggregati nel report.

**Dipendenze:** [redazione](2026-10-05-rilancio-redazione.md), [UI/distribuzione](2026-10-05-ui-distribuzione.md). Strumentazione minima prima del pilot; miglioramenti SEO e correzioni editoriali possono procedere in parallelo.

## 1. Situazione verificata e limiti

- `index.html` carica GA4 con measurement ID `G-2RFECSW4XM`; il doppio script Ahrefs rilevato nell'audit è stato rimosso nell'incremento integrato in master.
- `src/main.jsx` monta Vercel Analytics. Non sommare i tre fornitori: definizioni e copertura differiscono.
- Non sono stati trovati eventi editoriali personalizzati nel codice. Le impostazioni GA4 di enhanced measurement non sono state ispezionate.
- Non c'è ancora un accesso autorizzato alla proprietà GA4 o Search Console. Dal 5 ottobre il plugin Vercel funziona: produzione, 5 settembre–4 ottobre UTC, **3 visualizzazioni e 3 visitatori osservati dal provider**; home 2 visualizzazioni, `/privacy` 1, nessuna pagina articolo nel risultato. Questi visitatori non certificano tre persone distinte nell'intero mese e non misurano engagement. Dettagli riproducibili in [analytics-operations](../../analytics-operations.md).
- Il measurement ID pubblico non è il property ID numerico necessario alle interrogazioni GA4.
- Il connettore espone `aggregate_events`, ma la prova sul progetto attuale restituisce 402: gli eventi Vercel richiedono Pro/Enterprise. Non rappresentare il blocco come zero interazioni. Nessun upgrade acquistato; usare GA4 solo dopo accesso e raccolta verificati, altrimenti riportare le sole pageview disponibili.
- È stato individuato GSC Wizard come candidato: dichiara supporto a Search Console e GA4 collegato. Connessione, disponibilità delle metriche ed esecuzione nelle task vanno provate; nessun collegamento o calendario è stato creato.

La misurazione riguarda utenti osservabili dal sistema analytics, non persone identificate con certezza: consenso, blocchi, più dispositivi e cookie possono cambiare la copertura. Non ricostruire dati storici per eventi mai raccolti.

## 2. Dizionario minimo delle metriche

| Domanda | Metrica/fonte | Regola del report |
| --- | --- | --- |
| Quanti visitano? | GA4 totalUsers, activeUsers, newUsers, sessions | Mostrare totali dell'intero intervallo; mai sommare utenti giornalieri per ottenere gli unici settimanali. |
| Interagiscono? | engagedSessions, engagementRate, tempo medio di engagement | Distinguere sessioni da utenti. Una sessione engaged segue la configurazione GA4, non prova la lettura. |
| Leggono gli articoli? | Utenti e conteggi di `article_qualified_read` | Proxy definita sotto, non prova di comprensione né lettura completa. |
| Proseguono? | `related_article_click`, visualizzazioni di più articoli | Il click è un intento; il caricamento della destinazione è un esito diverso. |
| Verificano le fonti? | `article_source_click` | Riportare utenti dell'evento e articoli interessati; non contare come conversione commerciale. |
| Da dove arrivano? | GA4 canale/source/medium, device | Breakdown compatibili con le metriche; categorie non disponibili dichiarate. |
| Google li trova? | GSC click, impression, CTR, posizione, pagine/query | Click non equivalgono a utenti GA4. Le query possono essere incomplete o anonimizzate. |
| Cosa conviene produrre? | Pagine di ingresso, letture qualificate, trend organici | Confrontare articoli per formato/età e dati disponibili, non soltanto per pageview. |
| La redazione regge? | Bozze approvate, tempo di revisione, correzioni | Non dedurre tempo lavorato dai timestamp. Se non misurato, indicare dato non disponibile. |

Per ogni tasso specificare numeratore e denominatore. Il tasso di lettura per articolo usa utenti con evento / utenti che hanno visto quell'articolo nello stesso intervallo, non eventi / utenti del sito. Se l'integrazione non supporta questa query, riportare i conteggi separati. Utenti tra pagine e canali non sono necessariamente additivi.

## Task M1 — Collegamento e baseline senza sviluppo superfluo

**Files:** creare `docs/analytics-operations.md`; nessuna credenziale nel repository.

- [ ] Installare e collegare GSC Wizard con l'account Google autorizzato alla proprietà del sito; usare il minimo accesso necessario. Verificare che la proprietà GA4 sia collegata a Search Console e selezionare il dominio corretto, con/senza www e timezone dichiarati.
- [x] Collegare Vercel e leggere una baseline reale di produzione tramite aggregati; usare questa fonte per il primo report, dichiarando engagement e ricerca organica non disponibili. L'accesso GA4/GSC resta un arricchimento, non un requisito per contare le pageview già raccolte.
- [ ] Eseguire una lettura reale: ultimi 28 giorni completi e 28 precedenti, utenti, sessioni, engagement, top landing page, dispositivi, canali, click e impression organiche. Registrare proprietà, intervalli, unità, timezone, data/ora dell'estrazione e limitazioni.
- [ ] Confrontare almeno utenti/sessioni/click con i report nativi nello stesso intervallo e con gli stessi filtri. Se differiscono, spiegare la causa prima di utilizzare i numeri come baseline.
- [x] Verificare il contratto Vercel: breakdown pageview reali disponibili, eventi custom negati con402. GA4/GSC restano da verificare separatamente; il blocco eventi non soddisfa il requisito engagement.
- [ ] Salvare la baseline nel contesto accessibile alla task cloud. Il repository contiene le istruzioni, non dati privati o token. Nessun export manuale settimanale.

**Done:** una risposta reale alla domanda “quanti utenti interagiscono?”, con intervallo e limiti. Se l'accesso non è disponibile, il task resta aperto: non sostituire con stime dal sito pubblico.

## Task M2 — Misurazione SPA e tre eventi utili

**Files:** modificare `index.html`, `src/App.jsx`, `src/pages/ArticlePage.jsx` e il componente articolo pubblico del piano UI; creare `src/lib/analytics.js`, `tests/analytics.test.mjs`, `tests/e2e/analytics.spec.js`. Riutilizzare il runner browser del piano UI.

**Interfaces:** `track(name, {article_id, article_category, article_format})`; nomi ammessi `article_qualified_read`, `related_article_click`, `article_source_click`. Aggiungere parametri specifici soltanto quando servono, come `target_article_id` o dominio della fonte. Niente email, testo libero, credenziali o query string contenenti dati personali.

- [ ] Verificare in GA4 DebugView home → articolo → categoria → indietro: un solo `page_view` per navigazione, URL/titolo/referrer corretti. Per una SPA History API, usare enhanced measurement se funziona; aggiungere tracking manuale solo se necessario, disabilitando il corrispondente automatico. [Documentazione Google](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).
- [ ] Escludere admin, staging e traffico interno dalla baseline con configurazione verificata. Il tracker non emette eventi articolo nell'admin. Consolidare caricamento/configurazione in un unico punto; togliere il duplicato Ahrefs. Tenere Vercel per verifica tecnica se utile, senza un secondo rapporto commerciale.
- [ ] Collegare il tracker alla gestione del consenso effettivamente scelta: niente nuovo invio prima dell'abilitazione prevista; revoca interrompe timer e nuovi eventi. Documentare raccolta e copertura nel percorso privacy, oggi mancante. Non aggirare ad blocker o consenso.
- [ ] Definire `article_qualified_read`: almeno 30 secondi cumulativi con documento visibile e almeno 50% di avanzamento nel corpo dell'articolo. Soglie editoriali iniziali, modificabili solo annotando la data. Usare Page Visibility e geometria del corpo, senza SDK aggiuntivi; non il solo scroll dell'intera pagina.
- [ ] Emissione al massimo una volta per visualizzazione dell'articolo; reset e cleanup su cambio articolo/unmount, pausa quando nascosto. Gli articoli molto brevi possono non raggiungere la soglia: dichiarare questo limite e confrontare anche i dati GA4 standard.
- [ ] Tracciare i click effettivi ai correlati e alle fonti. Registrare in GA4 le dimensioni custom necessarie, mantenendo i report per URL per evitare dimensioni inutili ad alta cardinalità.
- [ ] Test con `gtag` mock: nessun evento senza consenso o in admin; niente lettura a 29 s, niente lettura con poco avanzamento, un solo evento dopo entrambe le condizioni, niente tempo accumulato in tab nascosta, reset su route change. E2E intercetta le chiamate senza inviarle alla proprietà live.

**Done:** eventi verificati in ambiente di test e una sessione di controllo in DebugView. La disponibilità nei report aggregati può arrivare dopo: non dichiarare un guasto dal solo ritardo iniziale.

## Task M3 — Prompt e report periodico gestito da ChatGPT

**Files:** creare `docs/analytics-report-prompt.md`; salvare lo stesso testo nella task cloud, che non deve dipendere dalla lettura del Mac.

**Proposta di calendario:** martedì 09:00 Europe/Rome, report settimanale; giorno 5 del mese alle 09:30, riepilogo del mese precedente. Conservare gli orari locali anche al cambio di ora legale. Consegna nella conversazione ChatGPT dedicata al progetto; nessuna email o messaggio esterno previsto.

- [ ] Provare il prompt in una chat web con integrazione collegata. Interrogare GA4 per sette giorni completi fino a due giorni prima dell'esecuzione e sette precedenti; indicare le date esatte. GSC usa l'ultimo intervallo completo disponibile, dichiarato separatamente; se differisce, niente confronto implicito su date identiche.
- [ ] Per il mensile usare il mese di calendario completo e il precedente; differenze di durata richiedono anche medie giornaliere per conteggi additivi, non per utenti unici.
- [ ] Ogni report contiene: stato della raccolta; tabella KPI con valori e variazioni; cinque pagine/argomenti da capire; differenze mobile/desktop e canali; tre interventi ordinati per impatto e sforzo; verifica degli interventi precedenti. Prima i dati, poi interpretazione e ipotesi.
- [ ] Se il valore precedente è zero, usare differenza assoluta e “percentuale non definita”. Dati mancanti, soglie privacy o errore API diventano `non disponibile`, non zero. Pochi dati: preferire finestre 28 giorni e non attribuire causalità al rumore di una settimana.
- [ ] Per ciascuna raccomandazione riportare evidenza, interpretazione, limite e azione verificabile. Nessuna previsione garantita di traffico; nessuna pubblicazione, modifica al sito o campagna automatica derivata dal report.
- [ ] Copiare i totali dalle interrogazioni aggregate, senza ricostruirli sommando righe non additive. Calcolare differenze e percentuali con uno strumento di calcolo disponibile alla task; se non disponibile, mantenere valori grezzi e descrivere la direzione senza percentuali non verificate. Registrare le query/filtri usati per poter ripetere il controllo.
- [ ] Il report distingue problemi editoriali da problemi di misurazione: pochi lettori di un contenuto non dimostrano che sia falso o inutile; molti click non certificano qualità.

Prompt operativo iniziale:

```text
Analizza PhonePulse usando il progetto Vercel phonepulse-it e, quando autorizzate, GA4 e Search Console.
Leggi i dati ad ogni esecuzione; non riutilizzare numeri precedenti come attuali.
Indica proprietà, timezone, date e disponibilità. Usa periodi completi comparabili.
Riporta utenti, sessioni, engagement, letture qualificate quando disponibili,
canali, dispositivi e risultati organici. Non sommare utenti tra giorni/pagine.
Segnala errori e dati mancanti, senza convertirli in zero. Separa fatti e ipotesi.
Consegna qui tabella KPI, tre priorità concrete e verifica del report precedente.
Non modificare il sito, approvare articoli o inviare messaggi a terzi.
```

**Done:** report campione confrontato con la baseline, comprensibile e riproducibile con le stesse interrogazioni.

## Task M4 — Attivazione cloud e controllo delle esecuzioni

**Files:** aggiornare `docs/analytics-operations.md` con identificativi non segreti delle task, calendario, proprietà, istruzioni di recupero e data di prova.

- [ ] Verificare che il piano/workspace ChatGPT consenta task web e l'integrazione sia disponibile alla task, non solo alla chat interattiva. La documentazione prevede strumenti collegati nelle task web; il funzionamento di questo specifico connettore va provato. [Scheduled tasks](https://learn.chatgpt.com/docs/automations).
- [ ] Creare le due task con prompt, timezone e destinazione espliciti; verificare gli identificativi e la prossima esecuzione in Scheduled. Nessuna dichiarazione di attivazione senza questi riscontri.
- [ ] Eseguire “Run now”, verificare una lettura nuova, consegna e storico; poi verificare il primo run programmato con computer spento. Una task locale che richiede app e Mac accesi non soddisfa il requisito.
- [ ] Testare un errore di accesso: report breve che identifica la sorgente non disponibile, senza numeri inventati. Eventuali riautorizzazioni restano interventi eccezionali; la manutenzione degli accessi non può essere garantita assente per sempre.
- [ ] Documentare come rilevare un report mancato da Scheduled e come recuperarlo. Per una garanzia operativa di allarme sul mancato run serve un watchdog indipendente: non prometterlo se la piattaforma non lo offre e non è stato configurato.

**Done:** calendario salvato, report consegnato, esecuzione cloud provata. Il connettore Vercel è stato verificato nella chat; non sono disponibili strumenti di creazione task. L'accesso computer-use all'app Codex è negato dalla piattaforma. Il prompt è preparato ma nessun calendario è attivo: non promettere report periodici finché creazione e primo run cloud non sono verificati.

## Fallback, solo se la task nativa non regge

Se account o connettore non supportano l'esecuzione cloud, non costruire subito un MCP proprietario. Prima cercare un'altra integrazione che copra GA4/GSC con accesso read-only. Se anche questa strada fallisce, minimo fallback: scheduler cloud esistente → estrazione GA4 Data API/Search Console → aggregati validati → OpenAI Responses API → report conservato e consegnato nel canale autorizzato.

Questa seconda soluzione è un servizio basato su API OpenAI, **non automaticamente una task nella conversazione ChatGPT**. Credenziali, consumo API e consegna devono essere configurati separatamente. Se il requisito rimane rigorosamente “qui in ChatGPT”, il fallback non è equivalente e non va attivato fingendo che lo sia. Solo dopo un blocco verificato definire file, secret, budget, output strutturato, controlli e delivery del fallback.

## Ordine, effort e accettazione

1. M1 prima: misura l'esistente e verifica la strada nativa, senza sviluppo.
2. M2 durante i primi fix UI; M3 dopo la baseline, M4 dopo un report campione valido.
3. Stima iniziale: 1–3 giornate per strumentazione e verifica, oltre a configurazione account/task e attesa dei primi dati; fallback escluso.
4. Successo: raccolta coerente, nessun doppio pageview noto, eventi con definizione stabile, nessun export ricorrente richiesto all'utente, report autonomo con date e limiti.
5. Dopo quattro settimane valutare utilità delle tre priorità; togliere eventi e indicatori che non cambiano decisioni. Nessun dashboard custom finché i report bastano.
