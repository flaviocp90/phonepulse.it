# Metriche: accessi, baseline e attivazione

## Fonti verificate il 5 ottobre 2026

Vercel: progetto `phonepulse-it`, ID `prj_aS7CrnM0AuIAFJp7NMhEYtHoOtNJ`. Le query funzionano con lo scope predefinito del connettore, senza `teamId`. Supabase: progetto PhonePulse `rwvtvzdabdgtglsablcw`; nel report usare conteggi aggregati, mai righe editoriali private, utenti o credenziali. GA4 e Search Console non ancora accessibili.

Baseline Vercel: produzione, **[2026-09-05 00:00, 2026-10-05 00:00) UTC**, cioè 30 giorni completi. Query `aggregate_pageviews`, `since=2026-09-05T00:00:00Z`, `until=2026-10-04T23:59:59Z`; l'endpoint normalizza la fine al 5 ottobre. Conservare sempre l'intervallo restituito, non presumere che tutti gli endpoint normalizzino allo stesso modo.

| Query `by` | Risultato |
| --- | --- |
| `environment` | produzione: 3 pageview, 3 visitatori del provider |
| `requestPath` | `/`: 2/2; `/privacy`: 1/1, pageview/visitatori |
| `day` | 6, 11 e 25 settembre: una pageview ciascuno; altri giorni zero |
| `referrerHostname`, `deviceType` | referrer vuoto desktop: 2/2; `m.facebook.com` mobile: 1/1 |

Non sommare visitatori per giorno o percorso. Vercel usa un identificatore con durata limitata: il totale non identifica persone distinte su 30 giorni. Blocchi e copertura possono ridurre i dati osservati. Nessuna pagina articolo nel risultato, nessun evento di lettura qualificata disponibile. `/privacy` è ancora una route mancante: una visualizzazione non prova il click di provenienza. [Definizioni e privacy Vercel](https://vercel.com/docs/analytics/privacy-policy).

Verifica eventi personalizzati: `aggregate_events`, `by=["eventName"]`, stesso progetto e intervallo richiesto, scope predefinito, restituisce **402 Payment Required**: accesso riservato a Pro/Enterprise. Il risultato è **non disponibile**, non zero eventi. Non sono stati abilitati eventi, acquistati piani o modificati gli abbonamenti. Il primo report resta sulle pageview; per engagement e letture qualificate occorre prima verificare accesso GA4 e raccolta/consenso. [Requisiti degli eventi Vercel](https://vercel.com/docs/analytics/custom-events).

## Report automatico

Prompt pronto in [analytics-report-prompt.md](analytics-report-prompt.md). Calendario proposto: martedì 09:00 e giorno 5 del mese 09:30, `Europe/Rome`; consegna nella conversazione ChatGPT del progetto. Nessun invio a terzi.

**Stato: non attivo.** Il plugin è utilizzabile qui, ma questa sessione non espone un comando per creare task ChatGPT; l'app Codex non è accessibile tramite computer-use. Serve salvare il prompt nella funzione Scheduled del workspace web e verificare che Vercel sia disponibile anche alla task. Il repository locale non deve essere una dipendenza delle esecuzioni cloud.

Accettazione: registrare ID task, prossima esecuzione e timezone; eseguire Run now con dati nuovi; verificare il primo run programmato a Mac spento. In caso di accesso negato il report deve indicare la fonte indisponibile, senza sostituire errori con zero. Non è stato configurato un watchdog per report mancanti. [Task cloud ChatGPT](https://learn.chatgpt.com/docs/automations).
