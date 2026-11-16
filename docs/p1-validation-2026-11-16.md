# P1 PhonePulse: implementazione e verifica

Branch `codex/resolve-p1-20261116`, base `master` `6fbcff0`. Questo documento descrive il candidato della [PR #79](https://github.com/flaviocp90/phonepulse.it/pull/79): il blog pubblico non è stato aggiornato. La proiezione additiva e il lettore privato sono stati applicati; il gate MFA e i grant restrittivi restano da applicare dopo i prerequisiti. Le prove Auth con account reali in staging restano aperte.

## Modifiche

| Issue | Risultato nel candidato |
| --- | --- |
| #65 | Archivio unico nella home, paginazione `?page=`, refresh e Indietro; redirect di News e mappa HTML. Testata con il solo logo; collegamenti istituzionali e social nel footer. Sitemap XML conservata. |
| #66 | Ultimo articolo in evidenza, titoli Figtree senza trasformazione in maiuscolo, sommari e date leggibili. Formato nell’articolo una volta sola; raccomandazioni cronologiche chiamate Ultimi articoli. Resa server coerente. |
| #67 | Lista unica con viste Da revisionare, Pubblicati, Archivio. Ricerca, stato e pagina nell’URL. Dashboard e review reindirizzate; pulizia RSS nell’archivio. Azioni e distribuzione social conservate. |
| #68 | Nuova bozza senza checklist o approvazione prima del salvataggio; SEO e importazione comprimibili. Anteprima con questa etichetta; recupero server visibile in caso di errore. Audit e controllo delle versioni conservati. |
| #70 | Registrazione e challenge TOTP; controllo AAL2 nelle RPC, policy editoriali e Storage, e invii social. La migrazione rifiuta editor senza TOTP verificato. Recupero reale ancora da verificare. |
| #71 | Header per tutte le rotte private: anti-iframe, nosniff, referrer esplicito e CSP completa Report-Only. La CSP applicata ora limita iframe, oggetti e base URL; quella completa resta da misurare sul deployment. |
| #72 | Build pubblico senza moduli/operazioni editoriali, 404 HTTP delle vecchie rotte admin, build privato distinto. Progetto Vercel dedicato `phonepulse-editorial` creato con Authentication `all` e Node 24. |
| #73 | Vista `published_articles` con `security_invoker`, grant per le sole colonne pubbliche; letture editoriali tramite RPC protetta. Aggiornamento, stato archivio e revisione pubblica sono campi di presentazione calcolati dal database. Home, categorie, articolo, SSR e sitemap migrati; Storage continua a seguire pubblicazione e ritiro. |
| #75 | Suite browser e PostgreSQL eseguite su fixture; dipendenze aggiornate e audit npm senza vulnerabilità. CI estesa a entrambi i build, assenza di admin nel pubblico, audit e controlli SQL P1. |

## Verifiche riproducibili

- `npm run lint`
- `node --test tests/*.test.mjs`: 41 test.
- `npm run build && node scripts/check-public-build.mjs && npm run build:admin`
- `npm run test:e2e -- --workers=1`: 73 test, incluso il caso di resa con titolo lungo e copertina assente. Screenshot controllati a 390 e 1280 px.
- `PYTHONPATH=scripts python -m unittest discover -s scripts/tests -v`: 54 test nel venv locale.
- `deno test supabase/functions/post-to-social/*_test.ts`: 10 test, incluso rifiuto AAL1 prima di leggere dati o inviare.
- `python3 supabase/tests/run_editorial_rpcs.py --guided --social --automation`: cluster nuovo con soli dati sintetici; nessuna URL remota accettata. Riproduce il fallimento prima della proiezione e il rifiuto dell’attivazione MFA senza fattore; verifica poi anonimo, ruolo contraffatto in user_metadata, non editor AAL2, editor AAL1/AAL2, bozze, audit, colonne operative, foto pubbliche/private, upload, ritiro e regressione completa Luna dopo le nuove restrizioni. Il manifest contiene comandi, exit code e hash degli input.

Nessun test ha pubblicato articoli reali o inviato post ai canali social.

## Stato delle risorse e limiti

Il progetto Supabase `phonepulse` è PostgreSQL 17 sul piano Free. C’è un editor e, all’ispezione, nessun suo TOTP verificato. Non ci sono branch di staging configurati. La [protezione password compromesse](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) richiede Pro: non è stata attivata e non è stato cambiato il piano.

Il progetto Vercel privato è `prj_RqDxFqkCzi6QATKPWp7BgeFKjSAq`, team `team_AFDrK3bXiOEX5tbGU51F6W8O`; Authentication configurata su tutti i deployment. Sono configurate solo URL Supabase e chiave anon frontend. Non contiene credenziali service-role. Il progetto pubblico resta `phonepulse-it`.

## Ordine di rilascio

1. Verificare in ambiente isolato Auth, PostgREST e Storage effettivi, inclusi gli embed categorie/tag della RPC `editor_articles`, i quattro ruoli e Luna. I test SQL locali non coprono il gateway Supabase.
2. Pubblicare e provare il pannello protetto; controllare che dominio privato, URL Vercel e preview richiedano autenticazione anche per asset e sottorotte. Misurare CSP Report-Only con login, TOTP, API, foto e anteprima; correggere le violazioni prima di applicare la policy completa.
3. Verificare con il titolare l’accesso amministrativo a Supabase e la procedura di recupero se perde il dispositivo: verifica dell’identità, rimozione amministrativa del fattore perso, revoca delle sessioni e nuova registrazione TOTP. Conservare il segreto di backup separatamente dal dispositivo e provarne il ripristino. Non rimuovere fattori reali per un test.
4. Registrare e verificare TOTP per ogni editor prima della migrazione MFA. Un login con sola password non deve leggere la redazione.
5. Coordinare database e applicazioni: applicare prima `20261116161433_public_article_projection.sql` e `20261116165453_harden_editor_reader.sql` (compatibili con il sito precedente), pubblicare i due build, verificare il recupero/registrazione TOTP, applicare `20261116161935_editor_mfa.sql` e infine `20261116164445_public_article_column_grants.sql`. Non applicare i grant restrittivi prima di aver aggiornato le applicazioni: il vecchio sito usa ancora `articles.select('*')`.
6. Distribuire anche la funzione `post-to-social` aggiornata. Verificare i soli stati prima di qualsiasi invio e poi il controllo della revisione presente nell’HTML pubblico.
7. Controllare in HTTP gli header privati e il 404 delle vecchie rotte sul dominio pubblico, senza redirect o riferimenti al dominio privato. Provare home, archivio, articoli, sitemap, correzione e ritiro. Chiudere le issue solo dopo i rispettivi criteri reali.

Rollback applicativo e grant devono essere coordinati: ripristinare soltanto il vecchio build dopo la restrizione delle colonne rompe le sue letture. Nessun contenuto viene eliminato dalle migrazioni.

## Evidenze remote sul candidato 82112e5

- [Critical checks](https://github.com/flaviocp90/phonepulse.it/actions/runs/43911874897) e [suite editoriale](https://github.com/flaviocp90/phonepulse.it/actions/runs/43911874942): success. Le esecuzioni identificano SHA e ambiente Ubuntu con Node 24, Python 3.11 e PostgreSQL isolato.
- [Pannello protetto](https://phonepulse-editorial.vercel.app/admin/login): deployment `dpl_Gb334VXC6gAtfY4PKe16njT6V4vx` READY. Richiesta senza autenticazione: 302 verso autenticazione Vercel. Richiesta autorizzata: 200 con DENY, nosniff, referrer esplicito, CSP Report-Only e no-store/noindex.
- Preview pubblica `dpl_GdZzdCFU8RNsEmADoyV2JZruAaE1` READY: `/admin/login` restituisce 404 senza redirect o destinazione privata; `/sitemap.xml` 200 con 106 URL di articoli; redirect News torna alla home.
- API anonima reale della vista: 106 pubblicati, embed categorie/tag disponibili, sole colonne dichiarate. La RPC editoriale rifiuta anonimo con HTTP 401 e SQLSTATE 42501. Questo non sostituisce le prove con account AAL1/AAL2.
- La logica con privilegi del lettore è nello schema non esposto `editorial_private`; l’endpoint pubblico usa SECURITY INVOKER e mantiene il controllo attendibile del chiamante.

Le migrazioni additive sono state applicate senza revocare i grant esistenti. Le restrizioni finali delle colonne, l’obbligo MFA, il rilascio della funzione social e il passaggio del blog restano da completare dopo recupero e staging. Non eseguire automaticamente tutte le migrazioni pendenti senza rispettare questi prerequisiti.
