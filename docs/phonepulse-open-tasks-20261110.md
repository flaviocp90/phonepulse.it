# Verifica dei task PhonePulse — 10 novembre 2026

Base di lavoro: `origin/master` al commit `86e6004`. Interventi preparati in un worktree separato; produzione e dati editoriali non modificati durante queste verifiche.

## Audit live e metriche

Controlli HTTP tramite il connettore Vercel, 10 novembre 2026, circa 13:54 UTC:

| Controllo | Evidenza |
| --- | --- |
| `https://www.phonepulse.it/robots.txt` | HTTP 200; pubblico consentito, `/admin` escluso, sitemap canonical www |
| `https://www.phonepulse.it/sitemap.xml` | HTTP 200; 98 URL, dei quali 90 articoli |
| Confronto sitemap ↔ Supabase | 90 articoli `is_published=true`; nessuno slug articolo mancante o aggiuntivo |
| Articolo Spotify presente in sitemap | HTTP 200, HTML con articolo, h1 e canonical senza esecuzione JavaScript |
| Articolo ritirato SmartTag 3 | HTTP 404 |
| Slug inesistente di controllo | HTTP 404 |

Vercel Web Analytics, intervallo restituito dal provider **[2026-10-11T00:00:00Z, 2026-11-10T00:00:00Z)**: produzione, **15 pageview e 15 visitatori del provider**. Non sono persone uniche certe, dati GA4 o traffico organico attribuito. Non sommare breakdown per dedurre persone.

Search Console e GA4 non verificati: manca una sessione disponibile del sito. Nessun numero di impression, click o URL indicizzati viene dedotto dalla sitemap o dalle pageview. L'audit Notion resta aperto finché quei dati non sono verificati.

## Admin e audit reale

Lettura SQL di produzione: nessun bucket Storage esistente e **0 eventi `approved` con `review.claim_evidence`**. Nel profilo Chrome disponibile, `/admin/articoli` rimanda al login. Non è stata simulata un'identità editor nel database remoto né approvato un contenuto reale per costruire una prova artificiale.

La verifica di autenticazione, salvataggio/approvazione e audit reale richiede una sessione editor. I test SQL locali e i test browser con rete simulata non la sostituiscono. Nessun articolo pubblicato e nessun Job A/B avviato.

## Editor: implementazione finale della PR #51

- Editor visuale locale Tiptap MIT con titoli, elenchi, link e tabelle. Markdown resta il formato persistito; HTML legacy resta modificabile in Markdown per evitare conversioni distruttive. Caricamento separato dal sito pubblico.
- Recupero locale per utente/articolo/versione, ripristino esplicito, download e cancellazione dopo salvataggio riuscito. Non sostituisce il salvataggio server.
- Foto JPEG/PNG/WebP fino a 5 MB con alt, didascalia, credito e licenza, riordino e copertina. Bucket privato: preview firmate temporanee, URL stabili senza token nel documento. La route media usa chiave anon e RLS, restituisce solo foto associate a contenuti pubblicati e nega nuove letture dopo ritiro. Upload inutilizzati possono restare orfani; copie scaricate non sono revocabili.
- Claim salvati atomicamente in tabella privata, legati a versione e attore. Modificare testo/fonti conserva le note e azzera gli esiti. I nuovi articoli richiedono evidenze complete anche nelle RPC server; il flag non è modificabile dal client. I contenuti preesistenti mantengono il gate precedente.
- Import con estratti candidati non verificati, provenienza e avvisi per fonti identiche/stesso dominio. Suggerimenti di link interni da articoli pubblicati della stessa categoria. Nessuna approvazione implicita.

Migrazione `20261110134623_guided_editor.sql` testata su dati sintetici, **non applicata a produzione**. Distribuire schema e codice insieme e completare lo smoke test con vera sessione editor prima della chiusura operativa dei task. Vedi [runbook](editorial/admin-editor-runbook.md).

## Pipeline: collegamento al CMS e probe

Nuovo export senza credenziali DB:

```sh
PYTHONPATH=scripts python3 scripts/editorial_export.py \
  --manifest manifest.json --review review.json \
  --experiment experiment.json --output admin-import.json
```

Controlla ledger, fingerprint del manifest, riferimenti e stato `review_draft`; rifiuta `skip`, claim non approvati e versioni discordanti. Converte i riferimenti ai claim in link alle fonti. L'identità del reviewer locale non viene dichiarata autenticata. Importare `admin-import.json` in Nuovo articolo, completare autore, controllare fonti e salvare; approvazione separata nel CMS.

Tre input riproducibili in `docs/editorial/pilots/*-probe-input.json`:

| Argomento | Retrieval Python reale | Decisione |
| --- | --- | --- |
| Health Connect | `unavailable`, `HTTPS connection failed` | `needs_research` |
| Photo picker | `unavailable`, `HTTPS connection failed` | `needs_research` |
| App Links | `unavailable`, `HTTPS connection failed` | `needs_research` |

Primo tentativo nel sandbox: DNS non disponibile. Ripetizione fuori dal sandbox: connessione HTTPS diretta non riuscita per tutti e tre. Non modificati TLS, robots o regole SSRF per aggirare il limite. Le pagine sono consultabili con il motore web, ma ciò non certifica il fetcher Python. Le fonti degli input sono documentazione Android Developers; i claim restano candidati, non attestazioni di revisione umana.

Manifest locali in `/private/tmp/phonepulse-{health-connect,photo-picker,app-links}-manifest.json`. Nessun testo integrale di terzi persistito. Nessuna chiamata Gemini, consumo API o scrittura CMS: manca una prova live del provider con brief realmente revisionato e credenziale/quota autorizzata. Le prove end-to-end editoriali restano aperte.

## Accesso admin per IP

La richiesta è consentire `/admin` solo a determinati IP, non sostituire il login. Lista IP/CIDR e stabilità dell'IP ancora da specificare. Non applicato un filtro vuoto o un IP dedotto dalla rete attuale: potrebbe escludere l'editor dal pannello. Rimane da decidere il punto di enforcement e verificare accesso consentito/negato senza indebolire Auth/RLS.

## Verifiche della prima tranche (storiche)

- `npm run lint` e `npm run build`: superati.
- `node --test tests/*.test.mjs`: 28 test superati, inclusa parità del testo alternativo delle foto nel renderer server.
- Playwright: 52 test superati, incluse persistenza claim, import non approvato, conservazione testo durante upload e rifiuto di sovrascrivere revisioni non caricabili. Rete Supabase simulata.
- `python3 -m unittest discover -s tests -p 'test_editorial_*.py' -v`: 52 test superati, provider simulati.
- Suite `scripts/tests` con dipendenze del repository in venv temporaneo e `PYTHONPATH=scripts`: 43 test superati; log di pubblicazione/provider sono fixture, non operazioni reali.
- `python3 supabase/tests/run_editorial_rpcs.py --guided`: migrazione, RLS, upload policy, audit della provenienza, conflitti, regressioni e concorrenza superati su dati sintetici PostgreSQL 16.11. Manifest locale: `/private/tmp/phonepulse-editorial-rpcs-0fq7nmvz/manifest.json`, SHA256 `a6b77456d575a348ac9f10b91aadf5455171699fd73e118b2a9021e17385efef`.
- Screenshot desktop sintetico verificato visivamente; test esistenti includono larghezze 375 e 1280 e navigazione responsive.
- Test Deno non eseguiti localmente: eseguibile assente, nessuna modifica al codice Edge/social. Rimangono nei controlli CI del repository.


## Replica sul runner GitHub

Il [probe live #42831331448](https://github.com/flaviocp90/phonepulse.it/actions/runs/42831331448), eseguito sul commit `bbaf46a`, è SUCCESS. La differenza di esito conferma che la prova su questo runner funziona, mentre la connessione HTTPS diretta dal Mac resta indisponibile; non identifica da sola il motivo di rete locale.

| Fonte del nuovo caso | Esito retrieval CI | Caratteri estratti |
| --- | --- | --- |
| Health Connect Get started | ok | 15.578 |
| Photo picker | ok | 15.130 |
| Verify App Links | ok | 13.074 |

Anche il probe multi-fonte preesistente ha recuperato Samsung Health FAQ (5.025 caratteri), Android Track steps (14.478) e Android Get started (15.578). Tutti i claim restano `unknown` e le decisioni `needs_research`, con pubblicazione disabilitata: retrieval riuscito non equivale a verifica editoriale. La motivazione automatica “Unretrieved or missing supporting sources” non distingue il caso di claim recuperati ma non ancora revisionati; in questi run la mancanza è la revisione, non il download.

Nessuna chiamata Gemini, bozza finale approvata o prova hardware. Rimangono i gate reali già descritti. Le prove CI offline e SEO sul medesimo commit sono SUCCESS; i link ai run sono nella PR #51.

## Verifiche dell’implementazione finale

- Lint e build superati. Node: 35 test; pipeline Python: 57; automazione Python: 43; Playwright: 58. Browser con rete Supabase simulata; provider/pubblicazione simulati nei test.
- PostgreSQL 16: migrazione, RLS, gate claim, storage privato/pubblicato/ritirato, audit, regressioni e concorrenza superati. Manifest locale `/private/tmp/phonepulse-editorial-rpcs-yyjb8_9b/manifest.json`, SHA256 `b1acfc8bd9c6fad5e44bf528b065f19dad4047e81a1043777077d21012e02235`.
- DOMPurify aggiornato a 3.4.17. Restano due avvisi moderati della dipendenza React Router 6 preesistente; migrazione major fuori ambito.
- CI estesa ai test Node completi, gate SQL e tre artefatti di ricerca `--research-only`: nessun modello, database o pubblicazione. Nessuna fonte disponibile significa nessun import generato, conservando il manifest.
- Nessuna chiamata a pagamento o modifica alla produzione. Auth/PostgREST reale e distribuzione restano da verificare; i test sintetici non li sostituiscono.

## Chiusura operativa — 11 novembre 2026

Inventario completo della fonte dati Notion `954ad1b9-045f-4554-bcee-f1ada5f34358`: cinque task PhonePulse non completati (editor, pipeline multi-fonte, verifica admin, audit analytics, allowlist IP). Gli altri otto task risultano già completati.

Verifiche rieseguite sulla tranche finale: lint/build, 35 Node, 57 Python pipeline, 43 Python automazione e 58 Playwright superati. Il test SEO aveva un timeout di navigazione locale riproducibile; adesso usa il contesto gestito dalla fixture Playwright per il caso senza JavaScript e blocca risorse esterne nel caso React. Due casi mirati e suite completa verdi; la latenza locale della navigazione rimane variabile, senza prova di regressione del sito pubblico.

SQL sintetico PostgreSQL 16 superato, incluse migrazione, RLS, claim, storage e concorrenza. Manifest `/private/tmp/phonepulse-editorial-rpcs-6zfdwxqk/manifest.json`, SHA256 `f87b44918022c721a15875d58c86390e8c75510ac3a91b56a8f278766da16425`.

Controlli live read-only: robots e sitemap HTTP 200, 98 URL/90 articoli; database con 90 published, 4.359 draft e 357 discarded. Migrazione guided editor ancora assente e nessun bucket. Advisor invariati: daily_counters senza policy (accesso negato intenzionalmente) e protezione password compromesse disabilitata. Nessuna modifica a permessi Auth.

Prima del merge, l'issue #46 richiede smoke autenticato. Il collegamento CUA a Chrome è andato in timeout due volte; mancano sessione editor utilizzabile, audit reale e verifica Storage tramite Auth/PostgREST. Il backup temporaneo storico non è più presente al percorso documentato: ripetere backup e restore in destinazione privata durevole prima di applicare la migrazione. Non eseguire un rilascio del solo frontend.

Richiesti all'utente IP pubblici/CIDR e stabilità per l'allowlist, oltre a sessioni Search Console/GA4. Nessun firewall configurato sul progetto Vercel; task IP bloccato in attesa dei dati. Per la pipeline restano review editoriale reale, tre prove editoriali complete e quota Gemini gratuita verificata prima di qualsiasi chiamata provider. Nessuna nuova pubblicazione, Job A/B o spesa API.
