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

## Editor guidato: tranche implementata

- Template modificabili per news, guida documentale, confronto e prova diretta; strumenti per titoli, grassetto, elenchi, citazioni, link e tabelle nell'editor esistente.
- Ricerca tag, canonical derivato dallo slug, snippet SEO, anteprima mobile/desktop.
- Upload JPEG/PNG/WebP fino a 5 MB, con alt, didascalia, credito e licenza obbligatori. Metadata e posizione sono salvati nel Markdown dell'articolo, compatibile con entrambi i renderer esistenti; copertina opzionale e credito nel campo già disponibile.
- Bucket `editorial-media` pubblico con INSERT riservato a editor autenticato e cartella del proprio utente. Nessun overwrite o delete client. Il file è pubblico già dopo l'upload: avviso esplicito in UI. Non caricare immagini riservate; i file non inseriti in bozze salvate possono restare orfani.
- Claim incompleti salvati atomicamente con la bozza in `article_review_drafts`, tabella separata non pubblica, legata a versione e attore. Le revisioni per versioni diverse non vengono ricaricate. Nessuna trasformazione di una bozza claim in approvazione.
- Import manuale di una ricerca esportata dal writer, con controlli di dimensione/schema, claim nuovamente `unknown` e provenienza registrata nell'audit del primo salvataggio. Nessun import diretto di stati approvati/pubblicati.

Migrazione `20261110134623_guided_editor.sql` preparata e testata su PostgreSQL locale con fixture sintetiche. **Non applicata a Supabase remoto.** Distribuire schema e frontend insieme, dopo verifica della migrazione e smoke test autenticato.

L'editor resta basato su Markdown con strumenti guidati: non è un editor WYSIWYG completo. Riordino visuale dei media, suggerimenti di link interni e revisione autenticata della nuova UI rimangono da completare prima della chiusura globale di #46.

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

## Verifiche della tranche

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
