# Baseline operativa PhonePulse

Rilevazione: 5 ottobre 2026. Baseline locale e ricognizione amministrativa del Task 1: schema public noto e backup ripristinato in isolamento. La readiness di staging Supabase e del ruolo editor resta da completare. Nessuna migrazione, pubblicazione, modifica live, riattivazione, invio social/notifica, commit o deploy eseguito.

## Evidenze e limiti

La spec del 5 ottobre documenta il ripristino pubblico: home con News, 90 articoli nella mappa HTML e Recensioni vuota. Sono osservazioni pubbliche precedenti, non conteggi privati o una prova del corretto stato dei job. La verifica pubblica è stata ripetuta il 5 ottobre 2026 dal coordinatore via Playwright: home `https://www.phonepulse.it` carica l'elenco; `/categoria/news` mostra News, “90 articoli trovati” e 12 card nella prima pagina; `/categoria/recensioni` mostra Recensioni, “0 articoli trovati” e lo stato vuoto. I due URL `/articoli/8-estensioni-chrome-indispensabili-produttivita` e `/articoli/nothing-phone-4a-recensione` caricano rispettivamente gli h1 “8 ESTENSIONI CHROME INDISPENSABILI PER LA PRODUTTIVITÀ” e “NOTHING PHONE 4A: LO SMARTPHONE MEDIO GAMMA CHE STUPISCE”, con titolo SEO corretto. Sono verifiche di caricamento pubblico, non un fact-check o un censimento privato. Il browser CUA del worker era indisponibile (`Browser is not available: iab`, inventario `[]`); il controllo successivo del coordinatore supera questo limite.

Workspace di partenza: branch `feat/social-publishing`, commit `b745fd17e2b646b6d7a51c65b607c0fb7b7e4e50`, nessun tracked modificato. AGENTS.md, documenti del 5 ottobre e `.playwright-mcp/` erano untracked e sono preservati. Incremento isolato: `/private/tmp/phonepulse-implementation-20261005`, branch `codex/phonepulse-rilancio-20261005`; dipendenze inizialmente collegate e successivamente copiate in node_modules indipendente dal coordinatore; nessun `.env.local` copiato.

## Automazioni

Stato GitHub letto con `gh workflow list --all --json id,name,state,path` il 5 ottobre 2026 (lettura autorizzata dopo blocco rete sandbox):

| Workflow | Stato remoto osservato | Trigger nel repository |
| --- | --- | --- |
| Job A — Scraping e generazione bozze | `disabled_inactivity` | `0 2 * * *`, dispatch manuale |
| Job B — Pubblicazione articolo del giorno | `disabled_inactivity` | `0 8-20 * * *`, dispatch manuale |
| Job — Fix Cover Images (manuale) | `active` | dispatch manuale |
| pages-build-deployment | `active` | workflow dinamico GitHub |

I cron sono espressi in UTC. La presenza di schedule nei file non significa che A/B siano attivi. Job B resta disabilitato; nessun dispatch effettuato. Il suo codice seleziona bozze per booleani/modello/provider cover, quindi pubblica senza approvazione umana di versione: non va usato come recupero dell'arretrato. Job A genera e salva bozze/scartati e può notificare Telegram; cover repair modifica articoli. Le ultime esecuzioni, secrets remoti e deploy Vercel non sono stati verificati.

## Endpoint e autorizzazioni — primo controllo storico

| Percorso | Configurazione osservata | Limite della verifica |
| --- | --- | --- |
| Frontend | `src/lib/supabase.js`: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; sito pubblico `https://phonepulse.it` | Valori non copiati o stampati; progetto runtime non confrontato con quello amministrativo |
| Script Python | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`; SDK Supabase per tabelle | Nessuna credenziale amministrativa disponibile nel processo |
| Setup DB | Management API `/v1/projects/{project_ref}/database/query`, da `SUPABASE_PROJECT_REF` (default nel codice) e `SUPABASE_MANAGEMENT_KEY` | Script mutativo non eseguito; il default non identifica con certezza l'ambiente live |
| Social | Frontend invoca `post-to-social`; funzione usa Telegram `sendPhoto` e Graph Instagram `media`/`media_publish` v19.0 | Nessun invio; secrets, deploy e validità API non verificati |
| Pubblicazione Python | Scrive articoli, aggiorna `public/sitemap.xml`, può commit/push e notificare Telegram | Script non eseguito |

`ProtectedRoute` controlla solo l'esistenza di una sessione Supabase; login tramite password. Non è un controllo di ruolo editor. Nessuna identità reale o assegnazione di ruolo è stata verificata. `post-to-social` controlla solo la presenza dell'header Authorization nel sorgente: la configurazione JWT del gateway distribuito è **ignota**, non deducibile dal commento nel codice. Non esiste `supabase/config.toml` locale. Policy RLS, grant, ruoli e utenti effettivi non sono introspezionati.

## Inventario inferito dal codice — primo controllo storico, superato dall’introspezione

| Tabella referenziata | Campi utilizzati o dichiarati nel sorgente |
| --- | --- |
| `articles` | `id`, `title`, `slug`, `category_id`, `excerpt`, `content`, `cover_image_url`, `score`, `seo_title`, `seo_description`, `affiliate_links`, `author`, `is_published`, `needs_review`, `discarded`, `created_at`, `updated_at`, `published_at`, `llm_model`, `image_source` |
| `categories` | `id`, `name`, `slug`, `description`, `color` |
| `tags` | `id`, `name` |
| `article_tags` | `article_id`, `tag_id` |
| `news_hashes` | `id`, `hash`, `source_url`, `created_at` (DDL in setup_db.py) |
| `daily_counters` | `id`, `date`, `gemini_calls`, `updated_at` (DDL); `google_cse_calls` usato dall'automazione ma non presente nel DDL locale |

Le relazioni `categories(...)` e `article_tags(...)` sono consumate dal frontend; tipi, nullable, vincoli, indici, trigger, policy e corrispondenza con produzione restano sconosciuti. Non sono presenti migration versionate. Il disallineamento `google_cse_calls` richiede introspezione, non una migrazione basata su supposizioni.

## Accessi e prerequisiti — primo controllo storico, stati superati

Disponibili localmente: `gh`, `psql`, Node 24.21.0, npm 11.19.0, Python 3.12.5 e dipendenze JS esistenti. Workflow Python: 3.11. Supabase CLI assente; `.vercel` assente. Nel checkout iniziale `.env.local` contiene i soli nomi frontend previsti; non sono state lette/stampate credenziali. Nel processo non sono presenti nomi di variabili Supabase/DB/GitHub/Vercel amministrative. L'accesso read-only GitHub è provato; non implica accesso al database o staging.

La tabella seguente registra i blocchi del primo controllo; non rappresenta lo stato corrente. Introspezione, export e restore public sono ora completati come descritto nella verifica amministrativa finale.

| Prerequisito | Stato storico | Evidenza allora mancante |
| --- | --- | --- |
| Browser pubblico, cinque rotte | Verificato dal coordinatore via Playwright il 5 ottobre 2026 | Home, News, Recensioni e due articoli caricati; nessun fact-check nuovo |
| Introspezione schema/policy e conteggio arretrato | Bloccato | Accesso amministrativo esplicito al progetto corretto, identificato e confrontato con frontend/script/function |
| Export dati e schema/policy | Bloccato | Destinazione privata esterna al repo e accesso DB/backup del progetto confermato |
| Ripristino verificato | Bloccato | Database isolato disponibile, export completo e confronto di tabelle, relazioni e policy |
| Ruolo editor reale/JWT | Bloccato | Lettura amministrativa utenti, metadata attendibili, grant/policy e configurazione effettiva della funzione |
| Deploy e staging | Non verificati | Identificazione progetto Vercel/Supabase, ultimo deploy e ambiente isolato separato |

Prima delle migrazioni esportare almeno articoli, categorie, tag, relazioni, schema, policy e grant; includere altre tabelle necessarie emerse dall'inventario. Conservare dump e dati privati **fuori dal repository**, registrando percorso privato, data, progetto, versione strumenti e checksum senza credenziali. Ripristinare in un DB isolato, senza job o provider esterni abilitati; confrontare conteggi, relazioni, vincoli e policy. Annotare il risultato effettivo: un export non ripristinato non è un backup verificato. Al primo controllo non era stato effettuato alcun export o restore; entrambi sono ora verificati per public, come riportato sotto.

Query read-only previste dal piano, da eseguire solo dopo conferma amministrativa dell'ambiente:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public';

select is_published, needs_review, discarded, count(*)
from public.articles group by 1, 2, 3;

select count(*) as drafts, min(created_at) as oldest, max(created_at) as newest
from public.articles
where is_published = false and needs_review = true and discarded = false;
```

Esaminare anche stati contraddittori e coda eleggibile del vecchio Job B con SELECT, senza invocare il publisher. Al primo controllo non erano disponibili conteggi privati; il censimento amministrativo successivo riportato sotto comprende anche le bozze arretrate.

## Registro e verifiche

`docs/editorial/archive-review.csv` contiene sei casi della spec: formato promesso/inferito, rischio e difetto osservato allora, decisione **proposta**, owner e reviewed_at vuoti. Nessun fact-check completo nuovo, ritiro, cambio slug o approvazione eseguito. Assegnare un editor reale e registrare data solo dopo revisione effettiva; non attribuire autore/revisore dal codice.

Verifiche locali del 5 ottobre 2026: `npm run build` nel worktree senza `.env.local` termina con exit 0 (Vite 6.4.1, 101 moduli); warning caniuse-lite vecchio di sette mesi e chunk JS 512.43 kB, oltre 500 kB. Parsing con `ast.parse` su tutti i quattro `scripts/*.py`: 4/4 OK senza import o esecuzione. Assertion stdlib: template con due valori vuoti, `.env.local` assente, CSV con header previsto, sei URL unici, decisioni proposte e owner/reviewed_at vuoti: passate. `git diff --check` finale: exit 0. Questi controlli non certificano autenticazione, schema o runtime admin.

Il report dettagliato `.superpowers/sdd/2026-10-05-rilancio-redazione/task-1-report.md` è scratch locale ignorato da Git e non sarà disponibile in un nuovo checkout; le evidenze durevoli sono riportate qui e i comandi riproducibili nel README. Non eseguire/importare gli script per controllare la sintassi. Schema public e backup ripristinato sono ora verificati, insieme alle rotte pubbliche e al censimento arretrato; restano i limiti Auth e staging dichiarati sotto.


## Verifica amministrativa successiva del 5 ottobre 2026

Questa rilevazione supera i blocchi amministrativi e le dichiarazioni di schema/ruoli/backup ignoti sopra, che descrivono il primo controllo locale. Integrazione Supabase collegata a phonepulse (`rwvtvzdabdgtglsablcw`, ACTIVE_HEALTHY, PostgreSQL 17.6.1.084). Inventario reale: sette tabelle public, 52 colonne, 17 vincoli (3 FK), 20 indici, nove policy, RLS attiva e non forced su tutte; nessun trigger utente. `google_cse_calls` esiste. Tabelle e conteggi: categories 5, tags/products/article_tags 0, articles 4784, news_hashes 1873, daily_counters 89. Articoli pubblicati 90 (49 non review, 41 needs_review); 4359 non pubblicati needs_review, 334 scartati, uno non pubblicato non review. Nessun arretrato pubblicato. Auth: uno user, zero assegnazioni app_metadata.phonepulse_role=editor; nessun dato Auth esportato. Liste migration, branch, Edge Functions e funzioni public vuote: la configurazione JWT di una funzione distribuita non è certificabile dal sorgente.

Policy effettive: public legge solo articoli is_published=true; authenticated legge e aggiorna tutti gli articoli. Categories/tags/products/article_tags hanno lettura pubblica. News_hashes limita ALL tramite auth.role()=service_role. Daily_counters concede ALL a public con qual/check true, nonostante il nome “Allow all for service role”; grant anon/authenticated ALL confermano il rischio. Nessuna policy o grant live modificati.

Export integrale delle sette tabelle via SELECT client in batch ordinati per PK, inventario SQL/policy/grant, in `/private/tmp/phonepulse-private-backup-20261005` (directory 0700, file 0600), fuori dal repository. Nessuna password/token/email/credenziale Auth inclusa. Conteggi e checksum aggregati per riga coincidono prima/dopo e dopo restore; aggregati stabili, non snapshot transazionale unica. Restore public completato in database backupcheck su PostgreSQL locale 16.11, socket Unix privato senza TCP, con schema, dati, 17 vincoli validati/3 FK, 20 indici, nove policy e grant tabella. Test RLS read-only: anon legge 90 articles, 89 daily_counters, zero news_hashes; authenticated 4784 articles. Cluster arrestato. Helper auth.role() e ruoli locali sono emulati: non certificano Auth, JWT/gateway o staging Supabase; owner/grantor amministrativi non ricreati. Differenza sorgente PG17/destinazione PG16 dichiarata.

Dump finale public-restored.sql SHA256 `bd58e49244f6847e4e32d7e31cd4898f473c35f23b516799a465f592116b823d`; manifest sha256.json SHA256 `fc304dbca15ce4e1b66121e1df53bd09660eea6856c18174389e7756bd395768`. Il dump public necessita dei ruoli/helper contenuti nel restore SQL privato. Trasferire il backup temporaneo in conservazione privata durevole prima di migrazioni. Nessuna risorsa cloud creata o modifica live. Report amministrativo scratch: `.superpowers/sdd/2026-10-05-rilancio-redazione/task-1-admin-report.md`; evidenze durevoli sintetizzate qui.

Per la ricognizione Vercel e la baseline analytics verificate dal coordinatore, consultare [analytics-operations.md](analytics-operations.md).

## U6 — caricamento admin, verifica locale 5 ottobre 2026

Le sei pagine admin sono importate con React.lazy, con attesa annunciata tramite role=status. ProtectedRoute resta all'esterno di AdminLayout e conserva il controllo sessione/redirect; le route e il login non cambiano. La seconda inclusione identica Ahrefs è rimossa da index.html; restano la prima inclusione e il meta di verifica. La gestione consenso resta un prerequisito separato.

Build Vite prima/dopo sullo stesso worktree, con dipendenze invariate: JavaScript iniziale pubblico **513,99 → 472,55 kB** minificato (**149,28 → 140,85 kB gzip**), CSS **30,63 kB**, invariato. Sei chunk admin differiti, da 2,89 a 13,24 kB; non sono trasferiti sulle route pubbliche. Il costo admin viene differito, non eliminato. Sono dimensioni del build, non una misura di rete reale, Lighthouse o Core Web Vitals.

`npm run test:e2e -- --workers=1`: 15/15 passati, inclusi caricamento differito login e redirect anonimo per tutte le route admin; `npm run build` passato. Test con Supabase simulato e host esterni bloccati, senza credenziali reali. Sessioni reali, RLS/ruoli editor e distribuzione chunk in produzione non certificati da questa prova. Nessuna modifica dipendenze/CI/lint/DB o deploy in questo incremento.
