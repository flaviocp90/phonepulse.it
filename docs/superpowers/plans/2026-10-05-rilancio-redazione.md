# PhonePulse: rilancio della redazione — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Non avviare l'implementazione durante la sola richiesta di pianificazione; nessuna delega automatica.

**Goal:** ripartire con una redazione assistita dall'AI, fonti verificabili e un'unica pubblicazione autorizzata e recuperabile.

**Architecture:** mantenere lo stack esistente. Aggiungere stato/versione/fonti al database e RPC transazionali per le scritture critiche; gli script producono bozze, gli editor le approvano e una sola RPC pubblica. I social sono effetti successivi con esiti persistenti, non una condizione per rendere pubblico l'articolo.

**Tech Stack:** React 18, Vite, Tailwind 3, Supabase/PostgreSQL, Python 3.11, Deno; unittest e Deno.test per i controlli isolati.

**Spec:** [Redazione e rilancio](../specs/2026-10-05-redazione-rilancio-design.md). Piani complementari: [UI e distribuzione](2026-10-05-ui-distribuzione.md), [metriche e report automatici](2026-10-05-metriche-report-automatici.md). Audit storico: [analisi iniziale](../../audit-2026-10-05.md).

## Global Constraints

- Mantenere React/Vite/Tailwind/Supabase; nessuna migrazione totale di stack.
- Una sola fonte dello stato editoriale: `draft`, `approved`, `published`, `discarded`; migrazione additiva e compatibilità temporanea con i booleani esistenti.
- Versione numerica per concorrenza e approvazione, autore/revisore reale e fonti strutturate.
- Scritture critiche transazionali e autorizzate server-side; chiavi privilegiate mai in `VITE_*`.
- Pubblicazione del sito indipendente dall'esito social; esiti per piattaforma persistenti e retry controllato.
- Nessuna promessa di exactly-once su provider esterni senza idempotenza nativa: timeout ambiguo va a controllo manuale.
- Test isolati e staging; nessun invio reale durante i test automatici.
- Mantenere traccia degli articoli legacy senza approvarli retroattivamente.
- Sitemap, contenuto pubblico e metadati devono riflettere la stessa versione; l'admin non attende sincronamente il deploy per considerare riuscita la scrittura DB.
- Nuove dipendenze solo per una necessità verificata; unittest, Deno.test e node:test prima di altri runner.

## Review Focus

1. News vecchia di mesi: nessun recupero o approvazione la rende corrente senza nuove fonti — test task 4 e 6.
2. Due editor o editor/job pubblicano insieme: una sola transizione, prima data conservata — test task 3 e 6.
3. Il provider ha pubblicato ma la risposta va in timeout: stato ambiguo e controllo umano, nessun retry cieco — test task 7.
4. Errore inserimento tag dopo salvataggio articolo: rollback completo, nessun successo parziale — test task 3.
5. Utente autenticato senza ruolo editor o RPC chiamata direttamente: nessuna scrittura, approvazione o invio social — test task 2, 3 e 7.

## Sequenza e tempi

| Fase | Task | Uscita verificabile |
| --- | --- | --- |
| Preparazione | 1 | Ambiente noto, backup e elenco dell'arretrato |
| Base sicura | 2–3 | Stato unico, ruoli e transazioni funzionanti su staging |
| Produzione di bozze | 4–5 | Input validato, fonti conservate e revisione utile |
| Pubblicazione | 6–7 | Solo approvati, esiti recuperabili e nessun invio duplicato noto |
| Continuità | 8 | CI, riepiloghi e controllo indipendente delle esecuzioni |
| Redazione | 9 | Archivio classificato e pilot sostenibile |

Stima orientativa: 8–14 giornate di sviluppo per il nucleo, da rivedere dopo task 1; non comprende la bonifica editoriale stimata in 15–30 ore né il piano pubblico. Non è una promessa di calendario. Prima del pilot servono task 1–6, l'autore/fonti del piano pubblico e un canale di distribuzione verificato; Instagram può restare spento.

## Task 1 — Baseline del progetto ripristinato

**Files:** creare `.env.local.example`, aggiornare `README.md`; creare `docs/operations.md` e `docs/editorial/archive-review.csv`.

**Interfaces:** produce inventario dello schema, ruoli, deploy e decisioni sull'arretrato. Non modifica dati live.

- [ ] Verificare da browser home, categoria News, Recensioni e due articoli; annotare che il ripristino riguarda contenuti e non dimostra lo stato delle automazioni.
- [ ] Leggere lo stato attuale dei workflow; mantenere B disabilitato durante la messa in sicurezza. Esaminare l'arretrato con SELECT e count, senza pubblicarlo.
- [ ] Esportare articoli, tag, relazioni, categorie e policy prima delle migrazioni; conservare l'export fuori dal repository se contiene dati privati. Verificare almeno un ripristino in ambiente isolato.
- [ ] Introspezione SQL, con accesso amministrativo esplicito all'ambiente corretto:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public';
select is_published, needs_review, discarded, count(*)
from public.articles group by 1, 2, 3;
```

- [ ] Documentare endpoint frontend/script/function, ruolo dell'editor esistente, schema effettivo e configurazione JWT; non stampare chiavi nei log.
- [ ] Creare l'esempio di ambiente con soli nomi e valori vuoti:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] Creare il registro iniziale: `url,format,risk,defect,decision,owner,reviewed_at`. Inserire i sei casi della spec, senza attribuire loro un fact-check non eseguito.
- [ ] Eseguire `npm run build` e parsing AST degli script; registrare esiti e warning. Commit: `docs: document restored environment and editorial baseline`.

**Done:** backup verificato, schema noto, nessuna bozza arretrata pubblicata, nessun segreto committato.

## Task 2 — Stato editoriale, versione e autorizzazioni

**Files:** migrazione generata dalla CLI `supabase/migrations/20261005091140_editorial_state.sql`, test `supabase/tests/editorial_security.sql` e `editorial_state.sql`, adapter locale `local_auth_adapter.sql`, fixture sintetica `fixture_baseline.sql` e istruzioni in `supabase/tests/README.md`; aggiornare `docs/operations.md`. I nomi dei successivi file migration sono indicativi: generarli con `supabase migration new`, senza inventare timestamp.

**Interfaces:** `articles.status`, `origin`, `version`, `approved_version`, `approved_at`, `approved_by`, `sources`, `source_key` e `last_verified_at`. Il ruolo attendibile è `app_metadata.phonepulse_role='editor'`, assegnato amministrativamente; user_metadata non attribuisce permessi.

**Aggiornamento da inventario live del 5 ottobre:** 4.784 articoli, dei quali 4.359 bozze con `needs_review`, 334 scartati, una bozza senza flag e 90 pubblicati (41 ancora con `needs_review`). Non azzerare né scartare automaticamente questo arretrato. Aggiungere `origin` con valori `legacy`, `rss`, `manual`: assegnare `legacy` ai record esistenti, poi default `manual` per i nuovi; il generatore imposta `rss`. Separare la coda storica dalla coda RSS attiva. Il limite 20 si applica solo alle bozze RSS, non a tutto l'archivio. Testare esplicitamente che le 4.359 bozze storiche non impediscano un nuovo run e che restino consultabili. L'inventario rileva inoltre una policy `daily_counters` ALL pubblica: preparare una correzione versionata e verificare anon/auth/service role prima di applicarla al live.

- [ ] Scrivere per primo un test SQL transazionale: anonimo non legge draft; autenticato non editor non scrive; editor autorizzato sì. Eseguirlo su staging e osservare il fallimento prima delle nuove policy.
- [ ] Aggiungere le colonne senza eliminare campi legacy:

```sql
alter table public.articles
  add column status text,
  add column origin text not null default 'legacy',
  add column version bigint not null default 1,
  add column approved_version bigint,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users(id),
  add column sources jsonb not null default '[]'::jsonb,
  add column source_key text,
  add column content_updated_at timestamptz,
  add column last_verified_at timestamptz;
update public.articles set status = case
  when is_published then 'published'
  when discarded then 'discarded'
  else 'draft' end;
alter table public.articles
  alter column origin set default 'manual',
  add constraint articles_origin_check check (origin in ('legacy', 'rss', 'manual')),
  alter column status set default 'draft',
  alter column status set not null,
  add constraint articles_status_check
    check (status in ('draft', 'approved', 'published', 'discarded'));
```

- [ ] Prima dell'UPDATE isolare e registrare combinazioni contraddittorie come pubblicato+scartato; la precedenza sopra conserva la visibilità storica, non certifica qualità o approvazione. I pubblicati legacy mantengono `approved_*` null.
- [ ] Implementare un trigger di compatibilità: `is_published=(status='published')`, `discarded=(status='discarded')`, `needs_review=(status='draft')`. Lo stato è autorevole; scritture critiche dirette dei client verranno revocate nel task 3. Durante il deploy della migrazione, bloccare le vecchie scritture admin per evitare che il frontend precedente mostri falsi successi.
- [ ] Versionare le policy effettive dopo inventario; public SELECT solo `status='published'`, lettura completa solo editor. Assegnare il ruolo all'utente reale identificato nel task 1 prima di applicare restrizioni; non scegliere utenti da email contenute nel codice.
- [ ] Creare un indice per `status, created_at`; verificare il vincolo unico dello slug e il voto 0–100. Prima di nuovi vincoli correggere anomalie su staging e registrare come gestirle sul live.
- [ ] Definire `sources` come array di `{url, title, publisher, published_at, retrieved_at}`; date ignote restano null, mai inventate dal modello. `source_key` identifica la fonte principale normalizzata delle news generate: indice unico parziale per valori non null dopo bonifica dei duplicati; guide/comparative possono lasciarlo null.
- [ ] Dopo introspezione aggiungere, se assenti, `content_format` (`news`, `guide`, `comparison`, `review`) e autore reale. Legacy con formato non accertato resta null; approvazione nuova richiede formato e autore. Il controllo di freschezza di pubblicazione si applica a news, non indiscriminatamente alle guide; la categoria non sostituisce il formato.
- [ ] Test SQL minimo su fixture preparate in una transazione:

```sql
do $$ begin
  if exists(select 1 from public.articles
            where is_published is distinct from (status = 'published')) then
    raise exception 'legacy visibility does not match status';
  end if;
end $$;
```

- [ ] Provare ruolo mancante, user_metadata con ruolo finto, draft/published/scartato e record legacy; terminare i test con rollback. Commit: `feat(editorial): add versioned states and editor permissions`.

**Done:** visibilità preservata, nessun articolo approvato retroattivamente, stati/grant verificati. La sola presenza di una sessione React non autorizza una scrittura.

## Task 3 — Salvataggio e pubblicazione transazionali

**Files:** migrazione CLI generata `supabase/migrations/20261005095507_editorial_rpcs.sql`, `supabase/tests/editorial_rpcs.sql`, `supabase/tests/run_editorial_rpcs.py`; modificare `src/pages/admin/AdminArticleEditor.jsx`, `src/pages/admin/AdminReview.jsx`; creare `src/lib/editorial.js` come sottile wrapper delle RPC usate da entrambi nell'incremento frontend. SQL locale verificato separatamente; Task3 non completo né distribuibile senza integrazione UI e gate di rollout.

**Interfaces:**

```text
save_article(p_article jsonb, p_tag_ids uuid[], p_expected_version bigint,
             p_publish_correction boolean default false,
             p_review jsonb default null) → {id, version, status}
approve_article(p_id uuid, p_expected_version bigint, p_review jsonb)
    → {id, version, status}
publish_article(p_id uuid, p_expected_version bigint) → {id, version, status, changed}
set_article_status(p_id uuid, p_expected_version bigint, p_status text)
    → {id, version, status}   // solo draft/discarded; niente pubblicazione indiretta
```

- [ ] Scrivere test che falliscono per RPC assenti: rollback articolo/tag, versione obsoleta, voto fuori intervallo, slug whitespace, utente non editor, tentativo di pubblicare via save/status.
- [ ] Implementare RPC con ricerca della riga e lock `FOR UPDATE`, verifica ruolo/expected_version, validazione campi, update e sincronizzazione tag nella stessa transazione. SECURITY DEFINER richiede search_path fisso, nomi qualificati e verifica del chiamante prima di ogni scrittura.
- [ ] `version` conta le modifiche al contenuto/fonti/tag, non i semplici passaggi di stato. Definire `p_review` con i sette controlli booleani della spec, validati e registrati server-side insieme a versione e attore. Approvazione e correzione pubblicata richiedono tutti i controlli; il server imposta `last_verified_at`, non accetta un timestamp fittizio dal client.
- [ ] `content_updated_at` viene impostato dal server solo su modifica editoriale sostanziale; non cambia per approvazione, retry, contatori o esiti social. Separarlo dal normale updated_at se quest'ultimo cambia per ogni update; il renderer/sitemap usano il timestamp editoriale. Date legacy non certificate restano mancanti.
- [ ] Revocare INSERT/UPDATE/DELETE diretti agli utenti frontend sulle tabelle interessate; concedere EXECUTE alle RPC controllate. Anche il generatore service-role costruisce una whitelist di campi: non accetta stato, approvatore o autore forniti dall'LLM.
- [ ] `save_article`: editor salva draft; una modifica a un approved lo riporta a draft e azzera approvazione. Un articolo published richiede l'azione esplicita `p_publish_correction=true`, che registra revisore/data/verifica della nuova versione; nessuna normale “Salva bozza” lo ritira accidentalmente.
- [ ] `approve_article`: richiede draft, fonti e checklist corrente; imposta approvatore/versione. `publish_article`: richiede approved con versione corrispondente e freshness; una seconda richiesta sulla stessa versione già pubblicata restituisce `changed=false` e conserva `published_at`. Il service-role del job è ammesso alla sola RPC di pubblicazione prevista, senza creare approvazioni automatiche.
- [ ] Il ritorno di `publish_article` deve permettere di programmare gli effetti anche dopo un timeout del client: il recupero degli effetti mancanti legge gli articoli published, non dipende dal solo `changed=true` ricevuto dal browser.
- [ ] Aggiornare UI e wrapper; eliminare toggle ridondante. Pulsanti: “Salva bozza”, “Approva”, “Pubblica”, “Salva correzione pubblicata”, “Ritira”; ciascuno usa una transizione esplicita. Pubblica non aggira Approva.
- [ ] Verificare errore tag FK: articolo invariato; due pubblicazioni parallele: una sola transizione; client con versione vecchia: conflitto visibile, contenuto locale conservato. Commit: `fix(editorial): make saves and publication atomic`.

**Done:** un solo contratto di pubblicazione; UI mostra successo solo dopo esito verificato. Storico di approvazioni/correzioni registrato in una tabella `article_events` con articolo, azione, versione, attore e timestamp; lettura solo editor, scrittura solo dalle RPC.

## Task 4 — Generazione limitata alle evidenze

**Files:** creare `scripts/editorial_rules.py`, `scripts/tests/test_editorial_rules.py`; modificare `scripts/news_automation.py`, `scripts/fix_cover_images.py`; creare `docs/editorial/prompt-news.md`.

**Interfaces:** funzioni pure senza env/API al momento dell'import:

```python
validate_generated_article(article: object, source_urls: set[str]) -> list[str]
is_fresh(source_published_at: str | None, now, max_age_hours: int) -> bool
normalize_source_url(url: str) -> str
```

- [ ] Test iniziali (rappresentano il contratto, da eseguire prima dell'implementazione):

```python
import unittest
from editorial_rules import validate_generated_article

class GeneratedArticleTests(unittest.TestCase):
    def test_rejects_null_and_empty_title(self):
        self.assertTrue(validate_generated_article(None, set()))
        self.assertTrue(validate_generated_article({
            'title': '', 'slug': '', 'excerpt': '', 'content': 'word ' * 300
        }, set()))

    def test_rejects_unknown_source(self):
        article = {'title': 'Aggiornamento app', 'slug': 'aggiornamento-app',
                   'excerpt': 'Nuova funzione documentata.',
                   'content': 'La funzione è descritta dalla fonte.',
                   'source_urls': ['https://invented.invalid/page']}
        self.assertTrue(validate_generated_article(article,
                        {'https://example.com/official'}))
```

Run: `PYTHONPATH=scripts python3 -m unittest discover -s scripts/tests -v`. Prima fallisce per modulo assente; dopo passa, aggiungendo anche almeno una breve valida.

- [ ] Validare oggetto JSON e campi stringa non vuoti; slug con pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`; excerpt <=155; URL HTTPS appartenenti alle fonti fornite. Non usare 300 parole come condizione di qualità. Bloccare prima persona di prova nelle bozze automatiche come segnale di revisione, senza fingere che una regex certifichi tutte le affermazioni.
- [ ] Raccogliere link/data/publisher dal feed; HTML summary pulito con strumenti già disponibili o stdlib; richieste feed tramite requests con timeout e limiti di risposta. Data futura o ignota richiede controllo, non conversione in data odierna.
- [ ] Filtro su pertinenza e 48 ore, prima di LLM/cover. Normalizzare URL eliminando fragment e soli parametri tracking noti (`utm_*`, `fbclid`), preservando parametri funzionali; conservare URL originale nelle fonti. Dedupe permanente con unique source key per la notizia principale; link uguali non vengono cancellati dopo 30 giorni. Guide/aggiornamenti che riusano fonti passano dalla redazione manuale, non dalla deduplica RSS.
- [ ] Prompt da `docs/editorial/prompt-news.md`: output title/slug/excerpt/content/source_urls; soltanto fatti forniti; nessuna prova, voto, data inventata, prezzo o garanzia dedotti; breve quando i dati sono pochi; omissione o dato ignoto quando manca evidenza. Link alle fonti conosciute. L'LLM non decide se l'articolo è approvato.
- [ ] Conservare `sources` costruite dal server, non metadata inventati dal modello; il modello può citare solo URL già forniti. Se il titolo promette una lista senza elementi nel materiale, non generare la lista.
- [ ] Gate prima della cover; conteggio richieste per ogni tentativo, incluse ricerche senza risultato e fix-cover. Migrazione del campo `google_cse_calls` solo se mancante nello schema rilevato. `aggiorna_cover` restituisce un booleano verificato; contatori non incrementano su fallimento DB.
- [ ] Limiti `MAX_DRAFTS_PER_RUN=5`, `MAX_OPEN_DRAFTS=20` sulle sole bozze `origin='rss'`; coda piena interrompe il run senza consumo LLM. I record legacy restano separati e non vengono cancellati. Errori critici iniziali/DB fanno fallire il job; nessun feed disponibile o tutti i tentativi falliti non diventa un successo silenzioso. Zero candidati pertinenti è invece un esito valido.
- [ ] Workflow A con concurrency dedicata e senza cancellazione del run in corso; vincolo source_key risolve duplicati anche in caso di retry. Il generatore assegna solo formato news e un autore responsabile configurato, mai un nome inventato dal modello.
- [ ] Test mock: JSON array/null, due frasi valide, fonte ignota, data ignota/futura/scaduta, title con N elementi assenti, duplicate URL, cover fail, contatore su retry. Commit: `fix(automation): generate sourced bounded drafts`.

**Done:** nessuna API esterna nei test; nuove bozze tracciabili, limitate e non autoapprovate.

## Task 5 — Review che consente davvero di verificare

**Files:** modificare `src/pages/admin/AdminReview.jsx`, `src/pages/admin/AdminArticleEditor.jsx`, `src/pages/admin/AdminArticles.jsx`, `src/pages/admin/AdminDashboard.jsx`, `src/pages/admin/AdminLayout.jsx`; aggiornare `docs/editorial/review-checklist.md`.

**Interfaces:** legge status/version/sources/approval delle RPC; checklist legata alla versione, non a una card che si aggiorna senza avviso.

- [ ] Preparare su staging draft breve, lista incompleta, fonte mancante, news vecchia e approved modificato. Riprodurre l'impossibilità attuale di distinguere questi casi nella preview ridotta.
- [ ] Review con corpo completo in preview sanificata, fonti cliccabili, data fonte/verifica, formato, warning e cover; la preview di 150 parole resta solo riepilogo.
- [ ] Paginazione server-side (10 record), filtri draft/approved/discarded e ricerca sul titolo; caricare il corpo quando si apre la revisione. Contatori con le stesse definizioni; errori come dati indisponibili, mai zero.
- [ ] Checklist della spec: completamento esplicito abilita Approva; il server verifica ruolo, versione e presenza degli attestati essenziali. Non presentarla come fact-check automatico.
- [ ] Polling sospeso mentre l'editor scrive/rivede; risposta vecchia ignorata; modifica concorrente segnala conflitto prima di approvare. Dopo scarto/pubblicazione ricalcolare pagina se diventa vuota.
- [ ] Review fonte mancante → Approva bloccato; fonte verificata+checklist → approved; modifica → draft; chiusura senza salvataggio → avviso. Commit: `feat(review): add source-aware versioned approval`.

**Done:** l'editor può valutare l'intero pezzo prima della transizione e non confonde scarti, bozze e approvati.

## Task 6 — Job B soltanto sugli approvati

**Files:** modificare `scripts/publish_article.py`, `.github/workflows/job-b-publish.yml`; creare `scripts/tests/test_publish_article.py`.

**Interfaces:** consuma `status='approved'`, version e fonte; chiama esclusivamente `publish_article`. `--dry-run` legge e descrive ID/esiti candidati senza UPDATE, social, git o notifiche.

- [ ] Fake Supabase con un draft, un approved fresco e un approved scaduto; test che solo il secondo è candidato e che dry-run non modifica nulla.
- [ ] Eliminare filtri model/image_source/needs_review e UPDATE diretto. Chiamare RPC per candidato con expected_version, preservare data originaria su retry e riconoscere il conflitto.
- [ ] Il criterio 72 ore viene ricontrollato server-side alla transizione; non basta la SELECT iniziale. Recupero/scarto non azzera la data della fonte.
- [ ] Workflow con `concurrency` dedicata, `cancel-in-progress: false`, timeout 15 minuti e `PUBLISH_COUNT=1` iniziale. Registrare approvati pubblicati, scaduti, conflitti e fallimenti. La schedulazione è disattivata fino al superamento dei test e della verifica manuale.
- [ ] Rimuovere git add/commit/push dalla logica di pubblicazione solo dopo attivazione della sitemap del task U5. L'articolo risulta scritto anche se la distribuzione non è riuscita: esito distinto e recuperabile.
- [ ] Comandi previsti dopo implementazione: `python3 scripts/publish_article.py --dry-run`, poi test fake con `PYTHONPATH=scripts python3 -m unittest discover -s scripts/tests -p 'test_publish_article.py' -v`.
- [ ] Verifica staging di doppio run e revisione cambiata fra SELECT e RPC; nessuna pubblicazione legacy. Commit: `fix(publishing): schedule only approved current articles`.

**Done:** approvazione umana indispensabile; dry-run realmente senza scritture.

## Task 7 — Social autorizzati, esiti e retry

**Files:** modificare `supabase/functions/post-to-social/index.ts`; creare `supabase/functions/post-to-social/validation.ts`, `validation_test.ts`, `supabase/migrations/202610050003_social_delivery.sql`; modificare `AdminReview.jsx` e `AdminArticles.jsx` per stato/retry.

**Interfaces:** input `{article_id, platforms}`; testo/slug/cover letti dal server dalla versione pubblicata. Tabella `social_deliveries`: article_id, platform, article_version, status, provider_id, attempted_at, last_error; unique article_id/platform per il primo post. Status `pending`, `sending`, `sent`, `failed`, `unknown`. Un cambiamento dell'articolo non crea automaticamente un secondo post.

- [ ] Validatore puro e test Deno senza framework esterno:

```ts
import { validateRequest } from './validation.ts'
Deno.test('reject null and unsupported platform', () => {
  if (validateRequest(null).length === 0) throw new Error('null accepted')
  if (validateRequest({ article_id: 'not-a-uuid', platforms: ['x'] }).length === 0)
    throw new Error('invalid request accepted')
})
```

Run: `deno test supabase/functions/post-to-social/validation_test.ts`; nessun permesso rete per il validatore. Le prove dei provider usano fetch finto e secrets finti.

- [ ] Solo POST/OPTIONS; body invalido →400, JWT assente/invalido →401, non editor →403, articolo non published →409. Verificare JWT e ruolo server-side anche se il gateway effettua la propria verifica.
- [ ] Upsert/claim della delivery prima dell'invio, con lock/condizione atomica: non reinviare sent o sending. Ogni piattaforma indipendente, timeout e controllo status/body.
- [ ] Persistenza dell'ID restituito. Errore esplicito senza post →failed ritentabile. Timeout dopo invio o risposta non verificabile →unknown, da riconciliare manualmente; nessuna promessa exactly-once.
- [ ] Delivery `sending` rimasta oltre il timeout operativo passa a unknown dopo controllo, mai direttamente a failed: il processo può essere morto dopo aver pubblicato. Verificare la versione pubblica prima dell'invio come nel task U4. Job B non invia automaticamente ai social nel primo pilot: l'editor seleziona e avvia i canali; aggiungere un worker server solo se necessario e con autorizzazione di servizio separata.
- [ ] Telegram senza cover può usare sendMessage; con cover valida sendPhoto. Conservare link entro il limite della caption, non troncarlo alla cieca. Instagram richiede immagine idonea e canale configurato; verificare versione API supportata e readiness del container prima di media_publish.
- [ ] UI mostra stati durevoli e “Riprova Telegram/Instagram” solo per failed. Unknown richiede controllo del canale. Social deselezionati non sono errori; canale non configurato resta disabilitato.
- [ ] Test: body null, ruolo fake in user_metadata, due chiamate contemporanee, Telegram ok/Instagram fail, ID persistito, timeout ambiguo e modifica published senza repost. Commit: `fix(social): authorize and persist recoverable deliveries`.

**Done:** nessun payload client arbitrario, nessun retry cieco; articolo pubblicato conservato anche se un social fallisce.

## Task 8 — CI e continuità osservabile

**Files:** creare `.github/workflows/ci.yml`, `supabase/migrations/202610050004_automation_runs.sql`; modificare workflow A/fix-cover; creare `scripts/check_operations.py` e `scripts/tests/test_check_operations.py`; aggiornare `docs/operations.md`, `scripts/requirements.txt` e lock npm con aggiornamenti mirati.

**Interfaces:** tabella `automation_runs` con job, started_at, finished_at, status e conteggi; SELECT per editor, scrittura service-role. Un controllo esterno consulta gli ultimi run e l'API pubblica; non scrive articoli.

- [ ] CI con `npm ci`, `npm run build`, unittest e test Deno. Introdurre lint per problemi reali (errori React/hooks, variabili inutilizzate), evitando una riformattazione globale nello stesso commit.
- [ ] Aggiornare prima dipendenze compatibili; ogni major che cambia Tailwind/router ha commit e verifica separati. Fissare versioni Python dopo aver verificato import e test in Python 3.11.
- [ ] Un run distingue completed/failed/skipped_queue_full/no_candidates; status failed se database o tutti i provider indispensabili falliscono. Riepilogo unico a fine run, non un messaggio Telegram per ogni bozza.
- [ ] `check_operations.py`: allerta se nessun completamento A entro 36 ore, contenuti pubblici non leggibili o delivery failed/unknown in attesa; test con clock passato come argomento e database finto.
- [ ] Eseguire il controllo da un monitor indipendente dal workflow che sorveglia; configurazione concreta del servizio nel runbook. Un cron nello stesso repository può essere utile ma non risolve da solo la disabilitazione per inattività.
- [ ] Test simulando A assente e B disabilitato; confermare allerta senza inviare a destinatari non autorizzati. Commit: `chore: add critical checks and automation observability`.

**Done:** uno script che termina bene non viene confuso con articoli prodotti; un job che non parte può essere rilevato.

## Task 9 — Bonifica e pilot editoriale

**Files:** aggiornare `docs/editorial/archive-review.csv`, `review-checklist.md`; creare `docs/editorial/pilot.md`; modifiche ai contenuti solo dopo decisione editoriale esplicita per ciascun lotto.

- [ ] Primo lotto: i sei casi della spec. Poi tutte le promesse di test/liste/sicurezza, quindi temi estranei e news datate. Non ritirare automaticamente articoli per una semplice keyword.
- [ ] Registro decisioni con fonti e motivazioni; conservare URL per correzioni, redirect per unioni, data di pubblicazione originaria. Ogni correzione pubblica significativa ha nota datata.
- [ ] Allineare posizionamento home/Chi siamo/menu secondo task pubblico 2; non promuovere categorie vuote come contenuto principale.
- [ ] Calendarizzare, come assunzione: tre news/settimana e una guida/fortnight, con 135 minuti/settimana medi. Se la disponibilità confermata è inferiore, usare il calendario alternativo nella spec prima della riattivazione.
- [ ] Pilot di quattro settimane: registrare minuti, completezza delle fonti, approvazioni/versione, scarti, correzioni, errori di pubblicazione e social. Nessun obiettivo di visite presentato come garantito.
- [ ] Collegare il report automatico del piano metriche: GA4/GSC misurano lettori e scoperta, lo storico editoriale misura qualità del flusso. Il report propone priorità, senza sostituire l'approvazione umana o inventare minuti non registrati.
- [ ] Review settimanale: se la coda cresce, il tempo sfora o i pezzi richiedono ricostruzione, ridurre candidati/uscite e correggere fonti/prompt prima di aumentare automazione.
- [ ] Commit documentale per settimana: `docs(editorial): record pilot quality and workload`.

**Done:** soglie della spec soddisfatte per almeno tre settimane su quattro; prosecuzione, riduzione o cambio formato motivati dai dati.

## Deploy, rollback e handoff

- Migrazioni e nuove RPC prima in staging, poi deploy coordinato script/admin/function. Non riattivare vecchi worker su schema nuovo senza compatibilità verificata.
- Preservare booleani per il lettore pubblico durante la transizione; rimuoverli soltanto quando tutti i consumer sono migrati e i test lo confermano.
- Se il rilascio fallisce: mantenere generazione/pubblicazione sospese, leggere il sito dai record già published e correggere in avanti. Un rollback del frontend precedente non deve riaprire scritture dirette o pubblicazione senza approvazione.
- Backup, migrazione, eventuale ritiro articoli, deploy, riattivazione cron e invii social reali sono azioni distinte dalla stesura di questo piano.
- Esecuzione consigliata: nativa, una task verificata per volta; nessuna parallelizzazione necessaria dei contratti DB/editorial.
