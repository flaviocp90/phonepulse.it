# Test SQL editoriali locali

Usare esclusivamente un clone isolato, mai un URL di produzione. Richiedono PostgreSQL e `psql`, senza framework aggiuntivo. Il clone verificato usa PostgreSQL 16.11; produzione usa 17.6. I test non certificano Supabase Auth, gateway JWT o PostgREST.

Bootstrap di un nuovo cluster privato (directory inesistente; non sovrascrivere un cluster già inizializzato). Assicurarsi che `initdb`, `pg_ctl`, `createdb` e `psql` della stessa installazione PostgreSQL siano nel PATH. Su questa macchina sono in `/opt/homebrew/opt/postgresql@16/bin`.

```sh
umask 077
mkdir -m 700 /private/tmp/phonepulse-editorial-tests-20261005
mkdir -m 700 /private/tmp/phonepulse-editorial-tests-20261005/socket
initdb -D /private/tmp/phonepulse-editorial-tests-20261005/cluster -A trust -U restore_admin
pg_ctl -D /private/tmp/phonepulse-editorial-tests-20261005/cluster -l /private/tmp/phonepulse-editorial-tests-20261005/server.log -o "-k /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -h ''" start
```

`-h ''` disabilita TCP; trust è limitato al socket nella directory privata 0700. Usare un percorso privato diverso se quello indicato esiste già; aggiornare tutti i comandi di conseguenza.

Per riprodurre da un checkout senza backup privato, creare un database locale vuoto `editorialfixture` e caricare `fixture_baseline.sql`: contiene soltanto lo schema delle tre tabelle coinvolte e record sintetici generati con generate_series, con gli stessi conteggi. Eseguire RED, poi adapter/migration/GREEN con `-d editorialfixture` al posto di `editorialcheck` nei comandi sotto. La fixture richiede un utente amministratore locale per creare i ruoli simulati; non usare un database contenente dati o Auth reali.

```sh
createdb -h /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -U restore_admin editorialfixture
psql -h /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -U restore_admin -d editorialfixture -v ON_ERROR_STOP=1 -f supabase/tests/fixture_baseline.sql
```

Ripristinare schema, grant, policy e dati del backup privato Task 1 in un nuovo cluster senza TCP, con socket privato e porta 55440. I ruoli simulati `anon` e `authenticated` non devono avere BYPASSRLS; `service_role` deve averlo. Il restore Task 1 include `auth.role()`, ma nessun dato Auth reale. Non versionare o stampare i dati del clone.

Nel clone baseline, il comando seguente deve fallire con `anon can read daily_counters` (RED). Dopo la migration deve passare (GREEN):

```sh
psql -h /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -U restore_admin -d editorialcheck -v ON_ERROR_STOP=1 -f supabase/tests/editorial_security.sql
```

Preparare il simulatore Auth **solo nel clone locale**, applicare la migration, quindi eseguire i test:

```sh
psql -h /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -U restore_admin -d editorialcheck -v ON_ERROR_STOP=1 -f supabase/tests/local_auth_adapter.sql
psql -h /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -U restore_admin -d editorialcheck -v ON_ERROR_STOP=1 -f supabase/migrations/20261005091140_editorial_state.sql
psql -h /private/tmp/phonepulse-editorial-tests-20261005/socket -p 55440 -U restore_admin -d editorialcheck -v ON_ERROR_STOP=1 -f supabase/tests/editorial_security.sql -f supabase/tests/editorial_state.sql
```

`local_auth_adapter.sql` crea una tabella auth.users vuota e legge `request.jwt.claims` per simulare `auth.uid()`/`auth.jwt()`: non distribuirlo su Supabase. `editorial_state.sql` verifica i conteggi del backup Task 1 (4784/90/4360); la fixture sintetica genera gli stessi conteggi. Ogni scrittura test è transazionale e termina con rollback; un errore interrompe psql e chiude la transazione. Arrestare il cluster al termine:

```sh
pg_ctl -D /private/tmp/phonepulse-editorial-tests-20261005/cluster stop -m fast
```

## Task 3: RPC e pubblicazione concorrente

La suite include oggetti legacy in `affiliate_links`: un salvataggio senza modifiche che omette il campo preserva oggetto, versione e approvazione; una correzione pubblicata preserva anche un oggetto popolato. I nuovi valori esplicitamente forniti restano limitati ad array o null.

Il runner crea un cluster nuovo con soli dati sintetici, socket privato senza TCP; non accetta URL remoti. Richiede Python3 e PostgreSQL16 o successivo, senza pacchetti Python aggiuntivi:

```sh
python3 supabase/tests/run_editorial_rpcs.py --pg-bin /opt/homebrew/opt/postgresql@16/bin
```

Sostituire `--pg-bin` con la directory dei binari della propria installazione. Per la sola prova iniziale usare `--red-only`. Il runner verifica Task2 prima di applicare le revoche Task3, prova RPC assenti (exit3 atteso), applica `20261005095507_editorial_rpcs.sql` e verifica lifecycle/permessi (exit0). I test Task2 che consentono scritture dirette editor descrivono lo stato intermedio: non eseguirli dopo Task3, che revoca quelle scritture.

La prova concorrente usa due sessioni: prima transazione aperta dopo publish, seconda osservata in attesa del lock tramite `pg_stat_activity` e `pg_blocking_pids`. Dopo commit deve restituire changed=false, stessa data e un solo evento. Nessun criterio basato soltanto su una pausa temporale. I test lifecycle terminano con rollback; la probe scrive soltanto fixture nel cluster temporaneo, arrestato in finally.

Il runner stampa il percorso delle evidenze private `/private/tmp/phonepulse-editorial-rpcs-*`: manifest, comandi, input SQL, stdout/stderr/exit e SHA256, permessi0600. Conserva la directory per la revisione; non contiene dati reali. Non importare `local_auth_adapter.sql` su Supabase. Queste prove non sostituiscono staging con Auth/JWT/PostgREST reali. Migrazioni e frontend/job aggiornati devono essere distribuiti insieme dopo i gate del runbook.

## Task 7: esiti social senza provider reali

```sh
python3 supabase/tests/run_editorial_rpcs.py --social
```

Aggiunge RED delle RPC social assenti, applicazione della migrazione social_delivery,
GREEN di permessi/lifecycle e una seconda probe con due sessioni. La prima claim
mantiene la transazione aperta, la seconda viene osservata in attesa del lock e
restituisce claimed=false dopo commit. Verifica nessun repost dopo una correzione,
ID conservato, retry solo failed, rifiuto del completamento di un vecchio attempt,
sending scaduto→unknown e ruolo finto in user_metadata. `--social --social-red-only`
si ferma dopo RED, prima della nuova migrazione. Il runner arresta sempre il cluster.

I test Edge usano soltanto Web APIs native, fetch finto e dati sintetici. Nessun
permesso Deno rete/env è necessario, nessuna dipendenza remota viene importata:

```sh
deno test supabase/functions/post-to-social/*_test.ts
deno check supabase/functions/post-to-social/index.ts
```

La concorrenza del DB è provata dal runner PostgreSQL, non dal fake fetch Deno.
Auth/JWT/PostgREST e invii di staging restano una verifica distinta.
