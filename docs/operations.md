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

## Task 2 — stato editoriale, verifica locale del 5 ottobre 2026

Migration generata con CLI Supabase 2.76.9: `supabase/migrations/20261005091140_editorial_state.sql`. Applicata esclusivamente al nuovo clone privato `editorialcheck`, PostgreSQL 16.11, socket Unix senza TCP in `/private/tmp/phonepulse-editorial-tests-20261005`; backup originale intatto. Nessuna migration o assegnazione ruolo Auth live, risorsa cloud, pubblicazione, invio, commit o deploy.

Preservati 4784 record e 90 pubblicati; 4360 draft legacy restano consultabili dall'editor e separati dalla coda RSS (zero iniziali). Tutti i record preesistenti hanno origin=legacy e nessun approved_by/approved_at/approved_version o formato inventato; i nuovi hanno origin=manual. Status ha precedenza sui flag e li sincronizza. Un UPDATE dei soli flag che cambia il valore viene rifiutato con SQLSTATE 23514, impedendo falsi successi del vecchio frontend. Slug unico e score 0–100 erano già vincolati. Sources è un array JSON; la verifica delle singole fonti e l'approvazione completa spettano ai task successivi.

Sostituite le tre policy articles permissive effettive: pubblico legge solo published, editor con auth.uid non null e app_metadata.phonepulse_role=editor legge/scrive; user_metadata non concede accesso. Revocati grant client pericolosi e scritture anon. Rimosse policy pubblica ALL e grant client daily_counters; service_role server mantiene CRUD tramite BYPASSRLS. Nessun'altra tabella modificata.

TDD SQL: baseline RED con `anon can read daily_counters` (exit 3); dopo migration security e suite estesa GREEN (exit 0). Assertion aggregate: 4784 record, 90 pubblicati, 4360 draft legacy, RSS=0 e inserimento RSS riuscito. Verificati CRUD anon/non-editor/falso editor/editor, claim editor privo di uid, contatori client deny/service-role allow, sincronizzazione flag/rifiuto legacy, vincoli stato/origin/version/sources/formato/source_key e assenza di approvazione retroattiva. Tutte le scritture test rollback. Comandi e adapter locale: [supabase/tests/README.md](../supabase/tests/README.md). Nessuna riga privata inclusa nelle evidenze versionate.

**Gate live:** questa migration da sola non è pronta per distribuzione. Task 3 deve introdurre RPC, approvazione/versione/concorrenza e revocare scritture critiche dirette; task 5 deve aggiornare frontend/controllo ruolo; task 6 deve aggiornare i job. Tenere Job A/B e vecchie scritture admin sospesi fino a rollout coordinato e staging verificato. Assegnare amministrativamente il ruolo all'identità editor verificata solo nel rollout autorizzato; rinnovare il JWT dopo modifiche app_metadata. L'adapter locale non prova Auth reale, gateway o PostgREST, né compatibilità PG17; staging e verifica delle policy/grant reali restano necessari. Nessun incremento automatico versione o garanzia di approvazione dichiarati in Task 2.

## Task 3 server — RPC, verifica locale del 5 ottobre 2026

Migration CLI `supabase/migrations/20261005095507_editorial_rpcs.sql`, applicata solo alla fixture sintetica locale PG16.11 dopo Task2. Quattro RPC pubbliche invoker delegano a implementazioni private definer, con search_path fisso, nomi qualificati e verifica del ruolo DB/uid/app_metadata. Non esporre `editorial_private` negli schemi PostgREST. Client anon/authenticated non scrivono direttamente articles/article_tags/article_events; lo storico è leggibile soltanto dagli editor. La chiave service-role conserva poteri amministrativi di piattaforma: la sola RPC non annulla i poteri della chiave.

Salvataggio/tag/eventi transazionali, lock e expected_version, whitelist dei campi, approvazione legata alla versione e sette attestati booleani. Modifiche a approved tornano draft; published richiede correzione esplicita, preservando published_at. Fonti: url/title/publisher/published_at/retrieved_at; date ISO con timezone, retrieved_at consultazione effettiva obbligatoria, data di pubblicazione sconosciuta null. Nuove news richiedono fonte principale non futura entro72h sia in approvazione sia in pubblicazione. Correzioni di news storiche già pubblicate consentono fonte vecchia, senza date inventate. Ritirare conserva published_at ma revoca l'approvazione; una news storica ritirata richiede fonte attuale prima di una nuova approvazione/pubblicazione. Service publisher ammesso alla sola pubblicazione di approvati correnti non legacy; un editor può pubblicare esplicitamente legacy verificato.

Comando riproducibile: `python3 supabase/tests/run_editorial_rpcs.py --pg-bin /opt/homebrew/opt/postgresql@16/bin`. Run finale privato `/private/tmp/phonepulse-editorial-rpcs-w7d112wj/manifest.json`, SHA256 `e50ee714d4fa71ec6068e3650f4363b4183e52bd63bf335e499f1bdcd6d21f8c`:16 passi con exit attesi, RED3 RPC assenti, GREEN0 lifecycle, probe a due sessioni con lock osservato, changed true/false, timestamp identico e un solo evento; cluster arrestato. Reviewer indipendente ha verificato digest di input/output e permessi0600. Prove solo sintetiche, nessuna lettura contenuti privati o modifica live.

**Non distribuire questo incremento da solo.** La UI aggiornata localmente usa le RPC (vedi sezione Task3 frontend/5 sotto); generazione e publisher dei Task4/6, staging e rollout coordinato restano aperti. Mantenere automazioni sospese. Prima del rollout: backup privato durevole, staging PG17/Auth/JWT/PostgREST verificato, identità editor confermata e JWT rinnovato. Nessun ruolo reale, deploy, pubblicazione o invio social eseguito. Test: [istruzioni locali](../supabase/tests/README.md).

## GitHub Pages — incidente separato, 5 ottobre 2026

Il coordinatore ha verificato Pages configurato come build legacy da master `/`, cname null: Jekyll interpreta JSX nei documenti e il build fallisce con errore Liquid. Vercel produzione `dpl_4UoL48h7PY45wZUn4dDr7pZ68fqm` è READY sui domini PhonePulse. Il tentativo DELETE Pages ha restituito 404; GET conferma ancora enabled. Il token CLI non ha permessi admin/maintain/push: il problema non risulta risolto. Utente indirizzato a Settings → Pages → Branch None; nessun file applicativo modificato per questo incidente.

## U6 — caricamento admin, verifica locale 5 ottobre 2026

Le sei pagine admin sono importate con React.lazy, con attesa annunciata tramite role=status. ProtectedRoute resta all'esterno di AdminLayout e conserva il controllo sessione/redirect; le route e il login non cambiano. La seconda inclusione identica Ahrefs è rimossa da index.html; restano la prima inclusione e il meta di verifica. La gestione consenso resta un prerequisito separato.

Build Vite prima/dopo sullo stesso worktree, con dipendenze invariate: JavaScript iniziale pubblico **513,99 → 472,55 kB** minificato (**149,28 → 140,85 kB gzip**), CSS **30,63 kB**, invariato. Sei chunk admin differiti, da 2,89 a 13,24 kB; non sono trasferiti sulle route pubbliche. Il costo admin viene differito, non eliminato. Sono dimensioni del build, non una misura di rete reale, Lighthouse o Core Web Vitals.

`npm run test:e2e -- --workers=1`: 15/15 passati, inclusi caricamento differito login e redirect anonimo per tutte le route admin; `npm run build` passato. Test con Supabase simulato e host esterni bloccati, senza credenziali reali. Sessioni reali, RLS/ruoli editor e distribuzione chunk in produzione non certificati da questa prova. Nessuna modifica dipendenze/CI/lint/DB o deploy in questo incremento.

## Task 3 frontend / Task 5 — admin verificabile locale

L’admin verifica `getUser()` e il ruolo editor nei metadata attendibili, distingue anonimo, account senza ruolo ed errore di verifica. Una rivalidazione dello stesso account conserva l’editor montato e il testo locale; il callback Auth non attende chiamate SDK. Logout fallito non viene presentato come uscita riuscita. Questo è controllo UX: il server resta autorità.

Tutte le scritture articolo/tag passano dalle quattro RPC approvate, con `expected_version`. Fonti strutturate, formato distinto dalla categoria, preview sanificata, sette attestazioni, approvazione della versione salvata, pubblicazione separata e correzione pubblicata esplicita. Ritiro confermato → discarded, recupero → draft; nessuna DELETE o invocazione social. Le nuove fonti richiedono HTTPS e consultazione effettiva; date sconosciute non sono inventate e HTTP storico è preservato. Fonti storiche restano valide per correggere un articolo già pubblico; una News recuperata necessita nuova fonte fresca per nuova approvazione.

Liste Review/Articoli con count exact, paginazione server dieci righe, ordine created_at/id stabile, ricerca titolo letterale e filtri status/origin. La coda nuova comprende draft rss/manual, l’archivio draft legacy è separato. Dashboard e sidebar rappresentano conteggi sconosciuti con —, senza false cifre zero. Errori/stale non sovrascrivono testo locale; metadata non disponibili dopo RPC confermata sono un warning separato.

Avviso beforeunload e conferma dei link interni nella stessa scheda; limite BrowserRouter per Indietro/Avanti e navigazioni programmatiche documentato nella [checklist](editorial/review-checklist.md). Nessun polling mentre si scrive. La verifica browser è sintetica e isolata; staging PG17/Auth/gateway, identità editor reale, aggiornamento job e rollout Task6 restano aperti. Nessun deploy, ruolo reale, articolo reale, workflow o provider social modificato.

Verifica locale finale UI: `npm run test:e2e -- --workers=1 --reporter=line` **33/33 passati** (18 editoriali +15 regressioni), `npm run build` e `git diff --check` exit0. Dopo l’ultimo testo di conferma no-opapproved: prova mirata no-op passata e build finale exit0. Screenshot sintetici375/1280 senza overflow, visionati dal reviewer. Auth refresh mantiene il testo dirty; fonti draft malformate non causano crash; no-op preserva null, versione e approvazione; risposta RPC ritardata A→B→A ignorata. Artifact stdout/exit/hash/screenshot privati nello scratch SDD, non versionati. Nessun account o network reale usato. I test UI non sostituiscono suite SQL, staging Auth o gateway.

### Compatibilità affiliate legacy — verifica finale aggiornata

SELECT live soltanto aggregata del coordinatore: `jsonb_typeof(affiliate_links)` è `object` su tutti i **4784 record**, non necessariamente oggetti vuoti; il generatore esistente inserisce `{}`. L’editor mostra ora JSON legacy completo. Su un articolo esistente, se il controllo affiliate è invariato, il payload omette soltanto quel campo: la RPC sparse conserva DBraw, stato e versione nei no-op. Nessuna conversione automatica a array; nuovi valori e modifiche esplicite devono essere array JSON validi. SQL/whitelist restano invariati. Aggiornamento dei generatori nei Task4/6 ancora aperto.

Dopo il fix compatibilità, suite browser completa **35/35 passata** (20 editoriali +15regressioni),20.7s, exit0; build finale1.42s exit0; diffcheck0. REDmirato due fixture legacy fallite, GREEN2/2 e suite35 successive. Oggetto vuoto/nonvuoto visibili e preservati, approved no-op stabile, correzione published senza falsa conversione o errore. Questi esiti superano i precedenti33 come verifica UI finale; sicurezza SQL sparse-preserve verificata separatamente dal coordinatore. Nessun dato individuale affiliate letto o modificato live dall’implementer; nessun deploy o ruolo reale.

Verifica SQL compatibilità eseguita separatamente dal coordinatore, migration invariate: nuovo manifest privato `/private/tmp/phonepulse-editorial-rpcs-x8c_1bnc/manifest.json`, SHA256 `94ce9bb98743e645ea921e07e285a267c93cc231efdc971d14d3df20264799aa`. La suite verifica save sparse unchanged approved che conserva `{}`, versione e approvazione, e sparse published correction che conserva un object popolato. Lifecycle, concorrenza reale a due sessioni e stop cluster exit0. L’evidenza e la precedente review approvata Task3 server restano conservate sopra; la review mirata ha approvato le assertion e il payload UI: nessun rilievo residuo sul gate locale. I gate staging e rollout restano aperti.

Ulteriore verifica SQL: aggiunto il rifiuto esplicito di un nuovo payload `affiliate_links: {}` (SQLSTATE22023), oltre alla preservazione sparse dei vecchi oggetti. Nuovo run `/private/tmp/phonepulse-editorial-rpcs-z0itionu/manifest.json`, SHA256 `5aaa42055f0f98f231054a89a8d3c3c7244be01cea554ab33b39c2ca8716a090`:16 passi con exit attesi, lifecycle/concorrenza/stop0, migration invariate.


## Task 4 — generazione RSS locale

Implementazione nel ramo `codex/editorial-state-20261005`; nessun run remoto o invio effettuato.
Il generatore richiede prima le migrazioni Task 2/3 e la variabile GitHub Actions
`PHONEPULSE_EDITOR_AUTHOR` con il nome del responsabile reale, deciso dalla redazione.
Se manca, termina con errore prima delle API. Non inventa autori o approvazioni.

Coda attiva: `origin=rss`, `status=draft`, massimo venti bozze aperte e cinque nuovi
inserimenti per esecuzione. L'arretrato legacy resta intatto. Fonte RSS con data
ignota, futura o oltre 48 ore è esclusa dal flusso automatico e richiede scouting
manuale. Pertinenza e promesse numeriche sono filtri conservativi, non fact-check.
Il riepilogo RSS viene pulito e conservato in `sources[].facts`; title, publisher,
date e URL originale vengono dal feed, mai dal modello. La chiave permanente
`source_key` rimuove fragment e tracking, conservando parametri funzionali.
Non vengono più cancellati gli hash storici; le nuove dedupliche usano l'indice
unico degli articoli. Le bozze invalide non vengono inserite né cercano cover.
Una cover assente lascia una bozza da revisionare; non autorizza la pubblicazione.

Gemini e Google CSE conteggiano ciascun tentativo prima della richiesta, inclusi
retry, errori ed esiti vuoti. OpenRouter registra ogni tentativo nei log (nessun
nuovo contatore DB o limite giornaliero viene introdotto). Errori DB/contatore
interrompono il job; tutti i feed indisponibili o tutte le generazioni fallite
producono errore. Zero candidati pertinenti è un esito valido. Le eccezioni dei
provider con token nell'URL non vengono riportate integralmente nei log.

A e fix-cover condividono `phonepulse-provider-writes`, `cancel-in-progress=false`:
i contatori read/write presuppongono questi workflow serializzati. Evitare script
manuali contemporanei; se si aggiungono writer, usare incrementi atomici via RPC.
GitHub concurrency conserva al massimo un'esecuzione pending, non è una coda
illimitata. Fix-cover riutilizza il titolo come query senza LLM e aggiorna solo
bozze ancora alla versione letta, incrementando versione/timestamp editoriale;
nessun approved/published viene modificato. Un update senza righe non è successo.

Verifica senza credenziali/API esterne, con le dipendenze già in requirements:

```sh
PYTHONPATH=scripts python3 -m unittest discover -s scripts/tests -v
```

Riferimenti consultati: [Supabase Python insert](https://supabase.com/docs/reference/python/insert),
[select/count](https://supabase.com/docs/reference/python/select),
[changelog](https://supabase.com/changelog).
I test isolano rete/DB; staging Supabase/PostgreSQL 17 e rollout restano da verificare.
Workflow A/B restano disabilitati in remoto: questa modifica locale non li riattiva.


## Task 6 — Job B locale, solo approvati

`publish_article.py` seleziona status approved con versione approvata corrente,
esclude legacy e fonti news ignote/future/oltre 72 ore. Usa soltanto la RPC
`publish_article(id, expected_version)`; il server ricontrolla stato, versione e
freschezza con lock. Nessuna approvazione automatica e nessun UPDATE degli articoli.
Le guide mantengono una semantica distinta dalle news. I risultati distinguono
pubblicati, retry invariati, esclusi/scaduti, conflitti e fallimenti.

```sh
python3 scripts/publish_article.py --dry-run
```

Richiede credenziali server dell'ambiente voluto: legge candidati e ID senza RPC,
notifiche, file sitemap, git o social. Non eseguito sul live in questa fase;
comportamento verificato con fake Supabase e senza accesso rete.

Workflow B: solo dispatch manuale, cron rimosso, concurrency dedicata senza
cancellazione, timeout 15 minuti, PUBLISH_COUNT=1. Non dispatchare prima del rollout
coordinato delle migrazioni, ruolo editor e verifica staging PG17/Auth.
Il repository remoto non è modificato da questo incremento locale.

Sitemap git mantenuta fino all'attivazione U5: ogni run non dry-run riprova la
distribuzione anche senza nuovi candidati. Un push fallito produce errore separato:
l'articolo resta published nel DB. Retry senza nuovi cambiamenti prova comunque il
push di un commit locale già creato. Le notifiche sono inviate solo per changed=true;
la consegna persistente/recuperabile sarà gestita dal Task 7, non è certificata qui.

Verifiche di questo incremento: suite Python isolata, build e 35 regressioni browser.
Nessuna generazione/provider/invio reale, migrazione live, push o deploy effettuati.

## Task 7 — social locali con stati persistenti

Migrazione `20261005143854_social_delivery.sql`, da applicare dopo Task2/3 e prima
del deploy coordinato della funzione/UI. Nessuna migrazione o funzione live è stata
applicata. La funzione usa Web APIs native, senza nuovi pacchetti runtime. Input
ammesso: `{article_id, platforms}`; campi contenuto/slug/cover client sono respinti.
POST con platforms=[] restituisce stati e readiness senza invii. OPTIONS gestisce
CORS, altri metodi restituiscono405. Auth verifica il bearer tramite `/auth/v1/user`;
il ruolo viene soltanto da app_metadata verificata, mai user_metadata. Segreti del
service-role restano nel server. Public/anon non leggono le delivery, editor legge,
nessun utente frontend può claim/finish/scrivere; le RPC sono solo service_role.

La chiave articolo/piattaforma conserva il primo post anche se l'articolo cambia.
Claim blocca articolo e delivery, richiede published e approvazione corrente,
verifica expected_version e genera attempt_id. Pending/failed possono essere
claimed; sent/sending/unknown mai. Finish richiede lo stesso attempt ancora sending.
Scadenza operativa di cinque minuti: sending passa a unknown quando si ricaricano
stati o si tenta una claim. Non diventa failed automaticamente. Errori DB dopo
l'invio restituiscono503 e lasciano lo stato conservativo da rileggere; la UI blocca
nuovi tentativi finché gli stati non sono stati ricaricati.

Readiness server: `SOCIAL_PUBLIC_HTML_READY=true` soltanto dopo U4 verificato.
La funzione controlla inoltre l'HTML dell'URL canonico `https://www.phonepulse.it/articoli/{slug}`:
meta `name="phonepulse:article-version" content="{version}"` e link canonical
corrispondente, risposta200 senza redirect. Senza questa evidenza nessuna claim né
richiesta social. U4 deve produrre questo marker dalla stessa riga pubblicata;
non aggiungerlo a index.html statico. La verifica usa uno snapshot seguito dalla
claim/version check DB: non è una transazione distribuita fra sito, DB e provider.
I canali sono spenti di default finché readiness non è configurata.

Telegram richiede TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID. Senza cover pubblica HTTPS
usa sendMessage; con cover usa sendPhoto. Il link articolo resta intero entro il
budget1024/4096. Successo richiede status/body valido e message_id persistito.
Rifiuto esplicito4xx→failed, risposta ambigua/timeout→unknown; niente retry cieco.

Instagram richiede INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID,
INSTAGRAM_GRAPH_VERSION e `INSTAGRAM_READY=true`. Nessun default APIv19 viene
riutilizzato. La versione supportata e i permessi dell'account vanno confermati
sull'app Meta reale prima di abilitare il canale: accesso diretto alle pagine Meta
non riuscito in questa verifica, perciò nessuna versione è dichiarata certificata.
Container creato, status_code FINISHED verificato, poi media_publish. Preparazione
fallita/not-ready→failed senza publish; timeout dopo media_publish→unknown.
Tipo/formato idoneo dell'immagine resta validato dal provider e dalla review cover;
un URL HTTPS da solo non certifica diritti o conformità JPEG/dimensioni.

L'editor avvia separatamente i canali dalla lista Pubblicati in Articoli o Review.
La UI conserva sent/failed/unknown, offre retry soltanto per failed e disabilita
canali non pronti. Nessun social viene avviato da Job B. Le notifiche Telegram del
publisher/generatore sono riepiloghi operativi separati, non delivery social.

Riconciliazione unknown: controllare il canale reale e l'orario/article_version.
Se il post esiste, un amministratore può registrare sent con provider_id verificato.
Solo se l'assenza del post è accertata può impostare failed per consentire retry.
Non azzerare sent per ripubblicare una correzione; non impostare failed sulla sola
assenza di una risposta. Nessuna riconciliazione manuale eseguita in questa fase.

Fonti tecniche consultate: [Supabase Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser),
[Telegram Bot API](https://core.telegram.org/bots/api),
[collezione ufficiale Meta Instagram](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api).
Queste fonti documentano i contratti, non provano readiness dei canali PhonePulse.


## Task 8 — CI e registro delle esecuzioni

Implementazione locale; migrazione `20261005162723_automation_runs.sql` da applicare
prima in staging e prima di aggiornare gli script A/fix-cover. I vecchi run non
vengono ricostruiti. Tabella con RLS: anon senza accesso, editor solo SELECT via
app_metadata, service-role INSERT/UPDATE/SELECT. Nessuna nuova scrittura pubblica.

Ogni avvio registra `running`, poi `completed`, `failed`, `skipped_queue_full` o
`no_candidates`, con data di fine e conteggi. Inizio e fine sono registrati dallo stesso clock
del worker, così il disallineamento rispetto al DB non fa fallire run brevi. Le ultime due condizioni attestano
un controllo riuscito, non articoli prodotti. Errori DB/feed o tutte le generazioni
fallite terminano con errore. Se il processo viene ucciso, il run resta `running`;
il monitor non lo considera un completamento. Un errore nel salvataggio del run
non viene trasformato in successo. Un riepilogo JSON nei log e, per A riuscito,
una sola notifica Telegram al destinatario già configurato sostituiscono le
notifiche per ogni bozza. Nessuna notifica viene eseguita dai test o dal monitor.

CI su PR e push develop/master, permesso contents:read, nessun secret live:
`npm ci`, lint focalizzato su errori/React hooks, build, 37 test browser con
Supabase sintetico, unittest Python 3.11, Deno check/test. Python diretto fissato
alle versioni provate: feedparser 6.0.14, requests 2.34.2, supabase 2.32.0.
Nessun cambio major di React/Tailwind/router/Vite. ESLint 10 e plugin hooks 7
sono soltanto strumenti di sviluppo. Il lint ignora nomi PascalCase per evitare
falsi positivi JSX nel controllo core delle variabili; non certifica l'utilizzo
di ogni import di componente. La build verifica gli import e le prove browser
verificano le pagine, senza aggiungere un altro plugin incompatibile con ESLint10.

Aggiornamento Supabase JS 2.117.2 provato ma differito: cinque regressioni browser
(retry/gestione risposta maybeSingle/logout) e bundle pubblico maggiore.
Conservato e fissato 2.99.1; gestire l'upgrade Auth/PostgREST in un incremento
separato con test delle nuove semantiche. Gli altri aggiornamenti compatibili
sono nel lockfile. Audit dopo gli aggiornamenti: sette segnalazioni residue
(cinque high nella catena Tailwind3/braces e due moderate router6); npm propone
major Tailwind4/router7, non forzati in questo incremento. Nessun risultato
“audit pulito” dichiarato. [Retry Supabase](https://supabase.com/changelog/45071-automatic-postgrest-retries-for-transient-errors).

### Monitor indipendente, configurazione pronta ma non attivata

Proposta aggiornata: **Uptime Kuma**, open source e installabile con Docker su un
server Linux sempre acceso, esterno a GitHub Actions e alle piattaforme monitorate.
Un unico servizio copre HTTP/HTTPS del sito e monitor Push per la presenza delle
esecuzioni del controllo. Il timer sotto esegue lo script read-only; l’opzione
`--push` ora può inviare a Kuma esito positivo o negativo, e l'assenza del segnale sarà
un guasto distinto. Alert verso il destinatario scelto e controllo esterno della
disponibilità di Kuma vanno provati prima dell'attivazione. Software gratuito;
hosting e gestione del server sono risorse da confermare. Nessuna istanza creata.
Fonte: [repository ufficiale Uptime Kuma](https://github.com/louislam/uptime-kuma).

`scripts/check_operations.py` legge soltanto: ultimi completamenti A entro36h,
un articolo via API anon pubblica e conteggio delivery failed/unknown o sending
oltre5min. B è manuale: la sua assenza non è un guasto. Nessuna modifica ad
articoli/delivery e nessun retry/invio. Output JSON `alerts`, exit0 sano, exit1
attenzione/errore/configurazione assente. Un API200 senza contenuto non è sano.
`--now` accetta un timestamp ISO con timezone per verifiche controllate.
Le eccezioni non stampano credenziali o risposte private.

Integrazione locale verificata: `python scripts/check_operations.py --push` usa
`KUMA_PUSH_URL` server-only, copiato dal monitor Push di Kuma. URL HTTPS senza
credenziali HTTP o fragment; lo status precompilato nell’URL viene sostituito
con `up` per controllo sano e `down` per qualsiasi anomalia. Messaggi generici,
timeout10s, redirect disabilitati; consegna confermata solo con HTTP200 e
`{"ok":true}`. Errore/configurazione assente aggiunge `monitor_delivery_failed`
e restituisce exit1 senza stampare URL/token. Senza `--push` nessun invio,
anche se la variabile esiste. Contratto: [API Push ufficiale](https://github.com/louislam/uptime-kuma/wiki/Internal-API#push-endpoint).

Configurazione da applicare sul server scelto, non attivata qui: monitor Push
con intervallo4500s (75min) per il timer orario; destinazione allerta autorizzata
e controllo esterno della disponibilità di Kuma. Conservare URL/token nel file
environment0600, mai in Git o nei comandi condivisi. Aggiungere `--push` a
ExecStart soltanto dopo prova controllata di `up`, `down`, mancata esecuzione e
consegna allerta. Test locali con richieste simulate:38/38 Python passati;
nessun heartbeat o allarme reale inviato, nessuna istanza creata.

Variabili server-only: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`SUPABASE_ANON_KEY`. La verifica pubblica usa il client anon, non il service-role.
Il service-role non va distribuito al browser né incluso nei file versionati.

Configurazione concreta proposta per un **server Linux esistente esterno a
GitHub Actions**, da confermare dall'utente prima di installare/attivare:
checkout verificato in `/opt/phonepulse-monitor`, venv Python3.11 in `.venv`,
utente locale `phonepulse-monitor`, environment file `/etc/phonepulse-monitor.env`
leggibile solo dall'amministratore (0600). Non serve acquistare un nuovo servizio.

`/etc/systemd/system/phonepulse-monitor.service`:

```ini
[Unit]
Description=PhonePulse read-only operations monitor
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=phonepulse-monitor
WorkingDirectory=/opt/phonepulse-monitor
EnvironmentFile=/etc/phonepulse-monitor.env
ExecStart=/opt/phonepulse-monitor/.venv/bin/python scripts/check_operations.py
TimeoutStartSec=120
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
```

`/etc/systemd/system/phonepulse-monitor.timer`:

```ini
[Unit]
Description=PhonePulse hourly operations check

[Timer]
OnBootSec=5min
OnUnitActiveSec=1h

[Install]
WantedBy=timers.target
```

Prima dell'attivazione: installare requirements, applicare la migrazione in
staging, provare API/RLS/Auth reali e far leggere JSON/exitcode al monitor già
scelto. La consegna dell'allerta va provata verso un destinatario autorizzato;
la sola unit systemd produce stato/log, non una notifica consegnata. Controllare
anche la presenza del monitor (heartbeat dal servizio esterno scelto), altrimenti
un server spento resta invisibile. GitHub cron nello stesso repository non è
un sostituto: può smettere di partire per inattività insieme ad A.

Host, servizio di allerta/heartbeat, destinatario e attivazione non sono ancora
confermati. Task8 globale rimane aperto finché c'è una prova reale di esecuzione
indipendente e consegna; nessun cron o provider reale riattivato da questo commit.

Verifica locale SQL completa:

```sh
python3 supabase/tests/run_editorial_rpcs.py --social --automation
```

Il runner usa soltanto fixture sintetiche PG16, prova ruolo anon/editor/fake e
vincolo data di fine, poi arresta il cluster. Non sostituisce staging PG17/Auth.
CI e cache seguono la [documentazione GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
lint la [configurazione ESLint](https://eslint.org/docs/latest/use/configure/configuration-files).

### Presentazione editoriale pubblica — U2, incremento locale

Autore e formato vengono dal record; nessuna attribuzione automatica dell’archivio
al responsabile Flavio Coppola. Fonti HTTP(S) senza credenziali sono cliccabili,
schemi non sicuri e righe malformate vengono ignorati. UI e JSON-LD usano lo stesso
mapping. Prima pubblicazione valida da published_at; aggiornamento sostanziale da
content_updated_at solo se successivo. Per legacy richiede last_verified_at e
approvazione della versione corrente: updated_at tecnico non diventa dateModified.

Origin rss dichiara assistenza AI; legacy segnala che le informazioni incomplete
non attestano prove dirette. Voti e giudizi automatici rimossi da articolo e card:
il campo score resta nell’editor/database, ma un metodo pubblico verificabile
serve prima di renderlo nuovamente. I suggerimenti leggono fino a tre articoli
pubblicati nella stessa categoria; un errore dei suggerimenti non nasconde
l’articolo. Le liste conservano query compatibili con lo schema precedente;
il formato è esposto nel dettaglio quando presente, non inventato dalla categoria.

Verifica: pilota sintetico browser con autore/fonti/date, legacy incompleto,
URL fonte pericoloso, firma PhonePulse Organization e disclosure AI; schermata
mobile390px controllata. Nessuna riscrittura di testi live, nuovo evento analytics
o attivazione monitor. Pilota reale, consenso, HTML server U4 e rollout coordinato
restano aperti; questa verifica locale non autorizza l’attivazione dei job.

Review indipendente: nessun Critical; contrasto dei nuovi link corretto con il
colore scuro esistente e test sul rapporto effettivo (prima2.81:1, minimo4.5:1).
Lint, build e41/41 prove browser passate. Nota minore differita: aggiungere casi
browser legacy con data valida e versioni approvate coincidenti/diverse per
rendere più specifica la regressione del guard, già verificato direttamente.

### U4/U5 — preparazione server e gate preview

Branch di implementazione: prima prova89f9cce, preview Vercel READY
[ispezione deployment](https://vercel.com/flaviocp90s-projects/phonepulse-it/6Ry2fZZaQBcbCxB9QYkFJYZ282CM).
`/_ssr-check` è una pagina fittizia resa da ViteSSR/React senza bootstrap client;
CSS letto dal manifest build, artefatti generati inclusi nella funzione con
[includeFiles](https://vercel.com/docs/project-configuration/vercel-json#functions).
GET solo in preview,404 fuori preview,405 per altri metodi,503 se mancano artefatti.
Nessuna dipendenza aggiunta, nessun database consultato da questa prova.

Il connettore riesce a leggere progetto/deployment nello scope predefinito, ma
la lettura della preview protetta fallisce403 al passo protection bypass
(`/v2/deployments/.../aliases`). Nessun browser CUA disponibile. Richiesta
riconnessione Vercel con progetto phonepulse-it e team flaviocp90s-projects.
**READY del build non dimostra HTTP/render/CSS corretti:** il refactor generale
PublicArticle e il rewrite pubblico articoli restano fermi al gate U4.

Sitemap preparata indipendentemente, disponibile solo come `/_sitemap-check`
in preview. Legge API anon con id.asc e cursorid>ultimo, mille righe per pagina;
inserisce pagine statiche valide, categorie dal DB e articoli published. Mapping
lastmod condiviso con UI: aggiornamento sostanziale verificato oppure prima
pubblicazione valida, nessuna data del run. URL codificati/XML escape, errori503
espliciti con no-store. Cache iniziale zero: ogni richiesta legge Supabase;
misurare il traffico prima di aggiungere cache. Limite singolo50.000URL/50MB,
oltre cui503 richiede un indice: archivio attuale molto inferiore.

Il gate VERCEL_ENV=preview resta finché la prova remota e il rollout schema core
sono verificati. `/sitemap.xml`, robots, XML statico e generazione/git del job B
restano invariati. Controlli locali: lint src+api, build client+server,
node:test prova server e sitemap1002record/errore,41/41 browser su dati fittizi.
U4/U5 non dichiarati completi né attivati in produzione.

Review indipendente della preparazione: nessun Critical. Due Important corretti
con RED→GREEN: paginare entrambe le tabelle fino alla pagina vuota anche quando
il limite server è500, e rifiutare slug `.`/`..` che normalizzano alla home.
Controllo server ampliato passa; lint passa. Preview codice76101da READY
[ispezione](https://vercel.com/flaviocp90s-projects/phonepulse-it/2WDSFRTf4wdX96znBFDFwVoAF7Zs).
Minor differito: il limite50MB dopo assemblaggio non limita la memoria durante
l’accumulo di slug enormi; prevedere budget incrementale nel contratto input.
